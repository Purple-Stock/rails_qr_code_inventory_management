class Api::V1::ItemsController < Api::V1::BaseController
  before_action :set_team

  def index
    render json: @team.items
  end

  def show
    item = @team.items.find(params[:id])
    render json: item
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end
end
