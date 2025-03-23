class SettingsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team

  def show
    @current_plan = "Free Plan" # This should come from your subscription logic
    @subscription_status = "Gratuito" # This should come from your subscription logic
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end
end 