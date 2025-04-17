class StockTransactionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_transaction, only: [:destroy]

  def index
    @transactions = @team.stock_transactions
                        .includes(:item, :user)
                        .order(created_at: :desc)
                        .page(params[:page])
                        .per(25)
  end

  def stock_in
    if request.post?
      ActiveRecord::Base.transaction do
        # Find the location first
        destination_location = @team.locations.find(params[:location])
        
        params[:items].each do |item_data|
          item = @team.items.find(item_data[:id])
          @team.stock_transactions.create!(
            item: item,
            transaction_type: 'stock_in',
            quantity: item_data[:quantity],
            destination_location: destination_location, # Use the found location object
            notes: params[:notes],
            user: current_user
          )
        end
        
        render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
      end
    else
      # Handle GET request - show the form
      @transaction = @team.stock_transactions.new(transaction_type: :stock_in)
    end
  rescue ActiveRecord::RecordNotFound => e
    render json: { error: "Location or item not found" }, status: :not_found
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def stock_out
    if request.post?
      ActiveRecord::Base.transaction do
        # Find the location first
        source_location = @team.locations.find(params[:location])
        
        params[:items].each do |item_data|
          item = @team.items.find(item_data[:id])
          
          # Validate stock availability
          if item.current_stock < item_data[:quantity].to_i
            raise StandardError, "Not enough stock for #{item.name}"
          end
          
          @team.stock_transactions.create!(
            item: item,
            transaction_type: 'stock_out',
            quantity: -item_data[:quantity].to_i, # Make quantity negative for stock out
            source_location: source_location,
            notes: params[:notes],
            user: current_user
          )
        end
        
        render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
      end
    else
      @transaction = @team.stock_transactions.new(transaction_type: :stock_out)
    end
  rescue ActiveRecord::RecordNotFound => e
    render json: { error: "Location or item not found" }, status: :not_found
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def adjust
    if request.post?
      ActiveRecord::Base.transaction do
        # Find the location first
        destination_location = @team.locations.find(params[:location])
        
        params[:items].each do |item_data|
          item = @team.items.find(item_data[:id])
          new_quantity = item_data[:quantity].to_i
          adjustment = new_quantity - item.current_stock
          
          @team.stock_transactions.create!(
            item: item,
            transaction_type: 'adjust',
            quantity: adjustment,
            destination_location: destination_location,
            notes: params[:notes],
            user: current_user
          )
        end
        
        render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
      end
    else
      @transaction = @team.stock_transactions.new(transaction_type: :adjust)
    end
  rescue ActiveRecord::RecordNotFound => e
    render json: { error: "Location or item not found" }, status: :not_found
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def move
    if request.post?
      begin
        Rails.logger.info "=== Starting Move Transaction ==="
        Rails.logger.info "Raw params: #{params.inspect}"
        
        ActiveRecord::Base.transaction do
          # Find both locations - handle both formats
          source_location = if params[:source_location_id]
            @team.locations.find(params[:source_location_id])
          else
            @team.locations.find(params[:location])
          end
          
          destination_location = if params[:destination_location_id]
            @team.locations.find(params[:destination_location_id])
          else
            # If no destination_location_id, use the next location in sequence
            next_location = @team.locations.where.not(id: params[:location]).first
            raise StandardError, "No destination location available" unless next_location
            next_location
          end
          
          Rails.logger.info "Processing move with: source=#{source_location.id}, dest=#{destination_location.id}"
          Rails.logger.info "Items to process: #{params[:items].inspect}"
          
          params[:items].each do |item_data|
            Rails.logger.info "Processing item: #{item_data.inspect}"
            
            item = @team.items.find(item_data[:id])
            Rails.logger.info "Found item: #{item.inspect}"
            
            quantity = item_data[:quantity].to_i
            Rails.logger.info "Quantity to move: #{quantity}"
            
            if item.current_stock < quantity
              error_message = "Not enough stock for #{item.name} at #{source_location.name}"
              Rails.logger.error error_message
              raise StandardError, error_message
            end
            
            transaction = @team.stock_transactions.create!(
              item: item,
              transaction_type: 'move',
              quantity: quantity,
              source_location: source_location,
              destination_location: destination_location,
              notes: params[:notes],
              user: current_user
            )
            Rails.logger.info "Created transaction: #{transaction.inspect}"
          end
          
          Rails.logger.info "Move transaction completed successfully"
          render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
        end
      rescue ActiveRecord::RecordNotFound => e
        Rails.logger.error "Record not found error: #{e.message}"
        Rails.logger.error "Backtrace: #{e.backtrace.join("\n")}"
        Rails.logger.error "Params that caused error: #{params.inspect}"
        render json: { error: "Location or item not found" }, status: :not_found
      rescue StandardError => e
        Rails.logger.error "Standard error: #{e.message}"
        Rails.logger.error "Backtrace: #{e.backtrace.join("\n")}"
        Rails.logger.error "Params that caused error: #{params.inspect}"
        render json: { error: e.message }, status: :unprocessable_entity
      end
    else
      @transaction = @team.stock_transactions.new(transaction_type: :move)
      Rails.logger.info "Rendering move form for new transaction"
    end
  end

  def count
    @transaction = @team.stock_transactions.new(transaction_type: :count)
  end

  def create
    @transaction_type = params[:transaction_type] || 'stock_in'
    @notes = params[:notes]
    items_params = params[:items] || []
    
    begin
      ActiveRecord::Base.transaction do
        # Find the location first
        location = @team.locations.find(params[:location])
        
        # Process each item as its own transaction record
        items_params.each do |item_data|
          item_id = item_data[:id]
          quantity = item_data[:quantity].to_f
          
          item = @team.items.find(item_id)
          
          # Create a separate transaction for each item
          if @transaction_type == 'adjust'
            # For adjust, calculate the difference
            difference = quantity - item.current_stock
            @team.stock_transactions.create!(
              item: item,
              transaction_type: 'adjust',
              quantity: difference,
              destination_location: location,
              notes: @notes,
              user: current_user
            )
          elsif @transaction_type == 'stock_out'
            # For stock out
            @team.stock_transactions.create!(
              item: item,
              transaction_type: 'stock_out',
              quantity: quantity * -1, # Make negative for stock out
              source_location: location,
              notes: @notes,
              user: current_user
            )
          else
            # For stock in
            @team.stock_transactions.create!(
              item: item,
              transaction_type: 'stock_in',
              quantity: quantity,
              destination_location: location,
              notes: @notes,
              user: current_user
            )
          end
        end
        
        render json: { success: true, redirect_url: team_stock_transactions_path(@team) }
      end
    rescue ActiveRecord::RecordNotFound => e
      Rails.logger.error("Error creating transaction: #{e.message}")
      render json: { error: "Location or item not found" }, status: :not_found
    rescue => e
      Rails.logger.error("Error creating transaction: #{e.message}")
      render json: { error: e.message }, status: :unprocessable_entity
    end
  end

  def destroy
    @transaction.destroy
    redirect_to team_stock_transactions_path(@team), notice: 'Transaction was successfully deleted.'
  end

  def report
    @total_items = @team.items.count
    @total_stock_value = @team.items.sum('price * current_stock')
    @low_stock_items = @team.items.where('current_stock <= minimum_stock').count
    @zero_stock_items = @team.items.where(current_stock: 0).count
    
    @recent_transactions = @team.stock_transactions
                               .includes(:item, :user)
                               .order(created_at: :desc)
                               .limit(5)
    
    @most_active_items = @team.items
                              .joins(:stock_transactions)
                              .select('items.*, COUNT(stock_transactions.id) as transaction_count')
                              .group('items.id')
                              .order('transaction_count DESC')
                              .limit(5)
  end

  def search
    @items = @team.items.where("name ILIKE ? OR sku ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%")
    render partial: "search_results", layout: false
  end

  private

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
    when 'stock_in' then :stock_in
    when 'stock_out' then :stock_out
    when 'adjust' then :adjust
    when 'move' then :move
    when 'count' then :count
    else :new
    end
  end

  def move_params
    params.require(:stock_transaction).permit(
      :source_location_id,
      :destination_location_id,
      :notes,
      items: [:id, :quantity]
    )
  end
end 