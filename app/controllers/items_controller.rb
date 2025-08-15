class ItemsController < ApplicationController
  require "csv"
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_item, only: [ :edit, :update, :destroy ]

  def index
    @categories = @team.items.pluck(:item_type).uniq
    @items = @team.items.order(:name)

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

    # Enhanced pagination for infinite scroll
    page = params[:page]&.to_i || 1
    per_page = params[:per_page]&.to_i || 20
    
    # Get total count before pagination for accurate has_more calculation
    total_count = @items.count
    @items = @items.limit(per_page).offset((page - 1) * per_page)
    @has_more = total_count > page * per_page
    @total_pages = (total_count.to_f / per_page).ceil

    respond_to do |format|
      format.html
      format.turbo_stream do
        if request.xhr?
          # Return partial for infinite scroll
          render partial: 'items_list', locals: { 
            items: @items, 
            has_more: @has_more,
            page: page,
            per_page: per_page
          }
        else
          render :index
        end
      end
      format.json do
        render json: {
          items: @items.as_json(
            only: [:id, :name, :sku, :barcode, :current_stock, :item_type, :brand, :price, :cost, :minimum_stock],
            include: {
              location: { only: [:id, :name] }
            },
            methods: [:stock_status, :value_category]
          ),
          has_more: @has_more,
          page: page,
          per_page: per_page,
          total_count: total_count,
          total_pages: @total_pages,
          query: params[:query],
          suggestions: generate_search_suggestions(@items, params[:query])
        }
      end
    end
  end

  def new
    @item = @team.items.build
  end

  def create
    @item = @team.items.build(item_params)
    @locations = @team.locations.ordered

    if @item.save
      trigger_webhook("item.created", @item)
      redirect_to team_items_path(@team), notice: t("items.form.success.create")
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
    @locations = @team.locations.ordered
  end

  def update
    if @item.update(item_params)
      redirect_to team_items_path(@team), notice: t("items.form.success.update")
    else
      @locations = @team.locations.ordered
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @item = @team.items.find(params[:id])
    @item.destroy

    respond_to do |format|
      format.html { redirect_to team_items_path(@team), notice: t("items.form.success.destroy") }
      format.turbo_stream { redirect_to team_items_path(@team), notice: t("items.form.success.destroy") }
    end
  end

  def show
    @item = @team.items.find(params[:id])
    @transactions = @item.stock_transactions.order(created_at: :desc)
  end

  def search
    @items = @team.items.where("name ILIKE ? OR sku ILIKE ?", "%#{params[:q]}%", "%#{params[:q]}%")
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

  def import
    return unless request.post?

    if params[:file].blank?
      redirect_to import_team_items_path(@team), alert: t("items.import.no_file")
      return
    end

    begin
      CSV.foreach(params[:file].path, headers: true) do |row|
        attrs = {
          name:          row["Name"],
          sku:           row["SKU"],
          barcode:       row["Barcode"],
          item_type:     row["Type"],
          current_stock: row["Current Stock"],
          price:         row["Price"],
          cost:          row["Cost"],
          brand:         row["Brand"]
        }

        item = @team.items.find_or_initialize_by(sku: attrs[:sku])
        item.update(attrs)
      end
      redirect_to team_items_path(@team), notice: t("items.import.success")
    rescue StandardError => e
      Rails.logger.error("Item import failed: #{e.message}")
      redirect_to import_team_items_path(@team), alert: t("items.import.invalid")
    end
  end

  def export
    @items = @team.items

    respond_to do |format|
      format.csv do
        headers["Content-Disposition"] = "attachment; filename=\"items-#{Date.today}.csv\""
        headers["Content-Type"] ||= "text/csv"

        csv_data = CSV.generate do |csv|
          # Header row - removed Location
          csv << [ "Name", "SKU", "Barcode", "Type", "Current Stock", "Price", "Cost", "Brand" ]

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

  def reorder
    item_ids = params[:item_ids]
    
    if item_ids.present?
      item_ids.each_with_index do |id, index|
        item = @team.items.find(id)
        item.update_column(:sort_order, index + 1) if item
      end
      
      render json: { success: true, message: 'Items reordered successfully' }
    else
      render json: { success: false, message: 'No item IDs provided' }, status: :bad_request
    end
  end

  private

  def generate_search_suggestions(items, query)
    return [] unless query.present?
    
    suggestions = Set.new
    query_lower = query.downcase
    
    # Add category suggestions
    items.pluck(:item_type).compact.uniq.each do |type|
      suggestions.add(type) if type.downcase.include?(query_lower)
    end
    
    # Add brand suggestions  
    items.pluck(:brand).compact.uniq.each do |brand|
      suggestions.add(brand) if brand.downcase.include?(query_lower)
    end
    
    # Add contextual suggestions
    if query_lower.include?('low') || query_lower.include?('stock')
      suggestions.add('low stock items')
    end
    
    if query_lower.include?('out') || query_lower.include?('zero')
      suggestions.add('out of stock items')
    end
    
    suggestions.to_a.first(6)
  end

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_item
    @item = @team.items.find(params[:id])
  end

  def item_params
    params.require(:item).permit(:sku, :name, :barcode, :cost, :price,
                               :item_type, :brand, :location_id)
  end

  def trigger_webhook(event, item)
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

  # Helper methods for generating unique SKUs and barcodes
  def generate_unique_sku(original_sku)
    base_sku = original_sku.gsub(/-COPY\d*$/, "")
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
    base_barcode = original_barcode.gsub(/COPY\d*$/, "")
    counter = 1
    new_barcode = "#{base_barcode}COPY"

    while @team.items.exists?(barcode: new_barcode)
      counter += 1
      new_barcode = "#{base_barcode}COPY#{counter}"
    end

    new_barcode
  end
end
