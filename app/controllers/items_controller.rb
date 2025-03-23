class ItemsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_item, only: [:edit, :update, :destroy]

  def index
    @items = @team.items
    @categories = @team.items.pluck(:category).uniq
  end

  def new
    @item = @team.items.build
  end

  def create
    @item = @team.items.build(item_params)

    if @item.save
      redirect_to team_items_path(@team), notice: 'Item was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
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
    params.require(:item).permit(:sku, :name, :barcode, :cost, :price, :type, :brand, :location, :initial_quantity)
  end
end 