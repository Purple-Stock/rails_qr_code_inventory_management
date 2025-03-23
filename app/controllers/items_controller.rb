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