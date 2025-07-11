class ItemsController < ApplicationController
  require 'csv'
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_item, only: [:edit, :update, :destroy]

  def index
    @categories = @team.items.pluck(:item_type).uniq
    @items = @team.items
    
    if params[:query].present?
      query = "%#{params[:query]}%"
      @items = @items.where("LOWER(name) ILIKE :query OR 
                            LOWER(sku) ILIKE :query OR 
                            LOWER(barcode) ILIKE :query", 
                            query: query)
    end
    
    if params[:category].present? && params[:category] != "Todas as Categorias"
      @items = @items.where(item_type: params[:category])
    end

    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end

  def new
    @item = @team.items.build
  end

  def create
    @item = @team.items.build(item_params.except(:initial_quantity))
    @locations = @team.locations.ordered

    if @item.save
      redirect_to team_items_path(@team), notice: t('items.form.success.create')
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @locations = @team.locations.ordered
  end

  def update
    if @item.update(item_params)
      redirect_to team_items_path(@team), notice: t('items.form.success.update')
    else
      @locations = @team.locations.ordered
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @item = @team.items.find(params[:id])
    @item.destroy

    respond_to do |format|
      format.html { redirect_to team_items_path(@team), notice: t('items.form.success.destroy') }
      format.turbo_stream { redirect_to team_items_path(@team), notice: t('items.form.success.destroy') }
    end
  end

  def show
    @item = @team.items.find(params[:id])
    @transactions = @item.stock_transactions.order(created_at: :desc)
  end

  def search
    @items = @team.items.where("name ILIKE ? OR sku ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%")

    if params[:location_id].present?
      location_id = params[:location_id].to_i
      @items = @items.select { |item| item.stock_at_location(location_id) > 0 }
    end

    render partial: "stock_transactions/search_results", layout: false
  end

  # New action to find item by barcode and return JSON
  def find_by_barcode
    barcode = params[:barcode]
    
    @item = @team.items.find_by(barcode: barcode) || 
            @team.items.find_by(sku: barcode) || 
            @team.items.where("barcode LIKE ? OR sku LIKE ?", "%#{barcode}%", "%#{barcode}%").first
    
    if @item
      render json: {
        success: true,
        item: {
          id: @item.id,
          name: @item.name,
          sku: @item.sku,
          barcode: @item.barcode,
          current_stock: @item.current_stock
        }
      }
    else
      render json: { success: false, message: "No item found with barcode: #{barcode}" }, status: :not_found
    end
  end

  def duplicate
    @original_item = @team.items.find(params[:id])
    
    # Create a new item with attributes from the original
    @new_item = @team.items.build(
      name: "#{@original_item.name} (Copy)",
      sku: generate_unique_sku(@original_item.sku),
      barcode: generate_unique_barcode(@original_item.barcode),
      cost: @original_item.cost,
      price: @original_item.price,
      item_type: @original_item.item_type,
      brand: @original_item.brand,
      location: @original_item.location,
      current_stock: 0.0,  # Start with zero stock
      minimum_stock: @original_item.minimum_stock
    )
    
    if @new_item.save
      redirect_to edit_team_item_path(@team, @new_item), notice: "Item duplicated successfully! Please review the details."
    else
      redirect_to team_items_path(@team), alert: "Failed to duplicate item: #{@new_item.errors.full_messages.join(', ')}"
    end
  end

  def export
    @items = @team.items
    
    respond_to do |format|
      format.csv do
        headers['Content-Disposition'] = "attachment; filename=\"items-#{Date.today}.csv\""
        headers['Content-Type'] ||= 'text/csv'
        
        csv_data = CSV.generate do |csv|
          # Header row - removed Location
          csv << ['Name', 'SKU', 'Barcode', 'Type', 'Current Stock', 'Price', 'Cost', 'Brand']
          
          # Data rows - removed location
          @items.each do |item|
            csv << [
              item.name,
              item.sku,
              item.barcode,
              item.item_type,
              item.current_stock,
              item.price,
              item.cost,
              item.brand
            ]
          end
        end
        
        render plain: csv_data
      end
    end
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_item
    @item = @team.items.find(params[:id])
  end

  def item_params
    params.require(:item).permit(:sku, :name, :barcode, :cost, :price, 
                               :item_type, :brand, :location_id, :initial_quantity)
  end

  # Helper methods for generating unique SKUs and barcodes
  def generate_unique_sku(original_sku)
    base_sku = original_sku.gsub(/-COPY\d*$/, '')
    counter = 1
    new_sku = "#{base_sku}-COPY"
    
    while @team.items.exists?(sku: new_sku)
      counter += 1
      new_sku = "#{base_sku}-COPY#{counter}"
    end
    
    new_sku
  end

  def generate_unique_barcode(original_barcode)
    return SecureRandom.uuid if original_barcode.blank?
    
    # Try to create a unique barcode based on the original
    base_barcode = original_barcode.gsub(/COPY\d*$/, '')
    counter = 1
    new_barcode = "#{base_barcode}COPY"
    
    while @team.items.exists?(barcode: new_barcode)
      counter += 1
      new_barcode = "#{base_barcode}COPY#{counter}"
    end
    
    new_barcode
  end
end 