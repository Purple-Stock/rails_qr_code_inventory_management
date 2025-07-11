class DashboardController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team

  def index
    @total_items = @team.items.count
    @total_stock_value = @team.items.sum("price * current_stock")
    @low_stock_items = @team.items.where("current_stock <= minimum_stock").count
    @zero_stock_items = @team.items.where(current_stock: 0).count
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id] || params[:id])
  end
end
