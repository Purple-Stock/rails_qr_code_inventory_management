class StockTransactionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_transaction, only: [ :destroy ]

  # Custom exception for transaction validation errors
  class TransactionValidationError < StandardError; end

  def index
    @transactions = @team.stock_transactions
                        .includes(:item, :user, :source_location, :destination_location)
                        .order(created_at: :desc)
                        .page(params[:page])
                        .per(25)

    respond_to do |format|
      format.html
      format.csv do
        send_data generate_csv,
                  filename: "transactions-#{Time.current.strftime('%Y%m%d%H%M%S')}.csv",
                  type: "text/csv"
      end
    end
  end

  def stock_in
    if request.post?
      process_transaction(:stock_in)
    else
      render_transaction_form(:stock_in)
    end
  end

  def stock_out
    if request.post?
      process_transaction(:stock_out)
    else
      render_transaction_form(:stock_out)
    end
  end

  def adjust
    if request.post?
      process_transaction(:adjust)
    else
      render_transaction_form(:adjust)
    end
  end

  def move
    if request.post?
      process_transaction(:move)
    else
      render_transaction_form(:move)
    end
  end

  def count
    if request.post?
      process_transaction(:count)
    else
      render_transaction_form(:count)
    end
  end

  def create
    transaction_type = (params[:transaction_type] || "stock_in").to_sym
    process_transaction(transaction_type)
  end

  def destroy
    @transaction = @team.stock_transactions.find(params[:id])

    if @transaction.destroy
      redirect_to team_stock_transactions_path(@team), notice: t("stock_transactions.destroy.success")
    else
      redirect_to team_stock_transactions_path(@team), alert: t("stock_transactions.destroy.error")
    end
  end

  def report
    @total_items = @team.items.count
    @total_stock_value = @team.items.sum("price * current_stock")
    @low_stock_items = @team.items.where("current_stock <= minimum_stock").count
    @zero_stock_items = @team.items.where(current_stock: 0).count

    @recent_transactions = @team.stock_transactions
                               .includes(:item, :user)
                               .order(created_at: :desc)
                               .limit(5)

    @most_active_items = @team.items
                              .joins(:stock_transactions)
                              .select("items.*, COUNT(stock_transactions.id) as transaction_count")
                              .group("items.id")
                              .order("transaction_count DESC")
                              .limit(5)
  end

  def search
    @items = @team.items.where("name ILIKE ? OR sku ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%")
    render partial: "search_results", layout: false
  end

  def stock_by_location
    @locations = @team.locations.order(:name)
    @items = @team.items.order(:name)
    @stock_levels = {}

    @items.each do |item|
      @stock_levels[item.id] = {}
      @locations.each do |location|
        @stock_levels[item.id][location.id] = item.stock_at_location(location.id)
      end
    end
  end

  private

  # Shared transaction processing method
  def process_transaction(transaction_type)
    config = StockTransaction.transaction_config(transaction_type)
    
    ActiveRecord::Base.transaction do
      locations = resolve_locations(config)
      items_data = params[:items] || []
      
      validate_transaction_data(config, locations, items_data)
      
      items_data.each do |item_data|
        item = @team.items.find(item_data[:id])
        quantity = calculate_quantity(config, item, item_data[:quantity])
        
        validate_item_transaction(config, item, quantity, locations)
        
        create_transaction_record(config, item, quantity, locations)
        trigger_stock_webhook("stock.updated", item)
      end
      
      render_success_response
    end
  rescue TransactionValidationError => e
    render_error_response(e.message, :unprocessable_entity)
  rescue ActiveRecord::RecordNotFound => e
    render_error_response("Location or item not found", :not_found)
  rescue StandardError => e
    Rails.logger.error "Transaction error: #{e.message}"
    Rails.logger.error "Backtrace: #{e.backtrace.join("\n")}"
    render_error_response(e.message, :unprocessable_entity)
  end

  # Resolve locations based on transaction configuration
  def resolve_locations(config)
    locations = {}
    
    if config.requires_source_location?
      locations[:source] = find_location_from_params(:source_location_id, :location)
    end
    
    if config.requires_destination_location?
      locations[:destination] = find_location_from_params(:destination_location_id, :location)
    end
    
    # Special handling for move transactions with fallback destination
    if config.type == :move && locations[:destination].nil?
      locations[:destination] = @team.locations.where.not(id: locations[:source]&.id).first
      raise TransactionValidationError, "No destination location available" unless locations[:destination]
    end
    
    locations
  end

  # Find location from multiple possible parameter keys
  def find_location_from_params(*param_keys)
    param_keys.each do |key|
      location_id = params[key]
      return @team.locations.find(location_id) if location_id.present?
    end
    nil
  end

  # Validate transaction data before processing
  def validate_transaction_data(config, locations, items_data)
    raise TransactionValidationError, "No items provided" if items_data.empty?
    
    if config.requires_source_location? && locations[:source].nil?
      raise TransactionValidationError, "Source location is required"
    end
    
    if config.requires_destination_location? && locations[:destination].nil?
      raise TransactionValidationError, "Destination location is required"
    end
  end

  # Calculate the actual quantity based on transaction type
  def calculate_quantity(config, item, input_quantity)
    quantity = input_quantity.to_i
    
    case config.quantity_behavior
    when :negative
      -quantity.abs # Ensure negative for stock_out
    when :adjustment
      quantity - item.current_stock # Calculate adjustment difference
    else
      quantity.abs # Ensure positive for stock_in, move, count
    end
  end

  # Validate individual item transaction
  def validate_item_transaction(config, item, quantity, locations)
    if config.requires_stock_availability_check?
      required_stock = config.quantity_behavior == :negative ? quantity.abs : quantity
      
      if config.type == :move
        # For move, check stock at source location
        available_stock = item.stock_at_location(locations[:source].id)
        if available_stock < required_stock
          raise TransactionValidationError, "Not enough stock for #{item.name} at #{locations[:source].name}"
        end
      else
        # For stock_out, check total current stock
        if item.current_stock < required_stock
          raise TransactionValidationError, "Not enough stock for #{item.name}"
        end
      end
    end
    
    if config.requires_positive_quantity? && quantity <= 0
      raise TransactionValidationError, "Quantity must be positive for #{item.name}"
    end
  end

  # Create the actual transaction record
  def create_transaction_record(config, item, quantity, locations)
    transaction_attrs = {
      item: item,
      transaction_type: config.type.to_s,
      quantity: quantity,
      notes: params[:notes],
      user: current_user
    }
    
    transaction_attrs[:source_location] = locations[:source] if locations[:source]
    transaction_attrs[:destination_location] = locations[:destination] if locations[:destination]
    
    @team.stock_transactions.create!(transaction_attrs)
  end

  # Render success response
  def render_success_response
    render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
  end

  # Render error response with consistent format
  def render_error_response(message, status)
    render json: { error: message }, status: status
  end

  # Render transaction form with configuration
  def render_transaction_form(transaction_type)
    @transaction_config = StockTransaction.transaction_config(transaction_type)
    @transaction = @team.stock_transactions.new(transaction_type: transaction_type)
    
    render transaction_type.to_s
  end

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_transaction
    @transaction = @team.stock_transactions.find(params[:id])
  end

  def transaction_params
    params.require(:stock_transaction).permit(
      :item_id,
      :transaction_type,
      :quantity,
      :source_location,
      :destination_location,
      :notes
    )
  end

  def action_for_transaction_type
    case @transaction.transaction_type
    when "stock_in" then :stock_in
    when "stock_out" then :stock_out
    when "adjust" then :adjust
    when "move" then :move
    when "count" then :count
    else :new
    end
  end

  def move_params
    params.require(:stock_transaction).permit(
      :source_location_id,
      :destination_location_id,
      :notes,
      items: [ :id, :quantity ]
    )
  end

  def generate_csv
    require "csv"

    headers = [ "Date", "Type", "Item", "SKU", "Quantity", "Location", "User", "Notes" ]

    CSV.generate(headers: true) do |csv|
      csv << headers

      @team.stock_transactions
           .includes(:item, :user, :source_location, :destination_location)
           .order(created_at: :desc)
           .each do |transaction|
        csv << [
          transaction.created_at.strftime("%Y-%m-%d %H:%M"),
          transaction.transaction_type.titleize,
          transaction.item.name,
          transaction.item.sku,
          number_with_sign(transaction.quantity),
          format_location(transaction),
          transaction.user.email,
          transaction.notes
        ]
      end
    end
  end

  def format_location(transaction)
    if transaction.transaction_type_move?
      "#{transaction.source_location&.name} → #{transaction.destination_location&.name}"
    else
      transaction.source_location&.name || transaction.destination_location&.name
    end
  end

  def number_with_sign(number)
    return number if number.nil?
    number.positive? ? "+#{number}" : number.to_s
  end

  def trigger_stock_webhook(event, item)
    webhooks = @team.webhooks.where(event: event)
    payload = { event: event, item: item.as_json }

    webhooks.each do |webhook|
      begin
        WebhookService.new(webhook, payload).deliver
      rescue => e
        Rails.logger.error "Webhook delivery failed for #{webhook.url}: #{e.message}"
        # Don't re-raise the error to prevent it from affecting the main flow
      end
    end
  end
end
