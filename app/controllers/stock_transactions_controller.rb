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
            source_location: params[:location],
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
    render json: { error: "Item not found" }, status: :not_found
  rescue StandardError => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def adjust
    if request.post?
      ActiveRecord::Base.transaction do
        params[:items].each do |item_data|
          item = @team.items.find(item_data[:id])
          new_quantity = item_data[:quantity].to_i
          adjustment = new_quantity - item.current_stock
          
          @team.stock_transactions.create!(
            item: item,
            transaction_type: 'adjust',
            quantity: adjustment,
            destination_location: params[:location],
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
    render json: { error: "Item not found" }, status: :not_found
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def move
    @transaction = @team.stock_transactions.new(transaction_type: :move)
    @items = @team.items.order(:name)
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
end 