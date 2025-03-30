class ItemsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_item, only: [:edit, :update, :destroy]

  def index
    @items = @team.items
    @categories = @team.items.pluck(:item_type).uniq
  end

  def new
    @item = @team.items.build
  end

  def create
    ActiveRecord::Base.transaction do
      @item = @team.items.build(item_params.except(:initial_quantity))

      if @item.save
        # Create stock_in transaction
        @team.stock_transactions.create!(
          item: @item,
          transaction_type: 'stock_in',
          quantity: item_params[:initial_quantity],
          destination_location: item_params[:location],
          user: current_user,
          notes: "Initial stock for item creation"
        )

        redirect_to team_items_path(@team), notice: 'Item was successfully created.'
      else
        render :new, status: :unprocessable_entity
      end
    end
  rescue ActiveRecord::RecordInvalid
    render :new, status: :unprocessable_entity
  end

  def edit
  end

  def update
    if @item.update(item_params)
      redirect_to team_items_path(@team), notice: 'Item atualizado com sucesso.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @item.destroy
    redirect_to team_items_path(@team), notice: 'Item removido com sucesso.'
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

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_item
    @item = @team.items.find(params[:id])
  end

  def item_params
    params.require(:item).permit(:sku, :name, :barcode, :cost, :price, :item_type, :brand, :location, :initial_quantity)
  end
end 