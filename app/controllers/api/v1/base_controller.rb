class Api::V1::BaseController < ActionController::API
  before_action :authenticate_api_key!

  attr_reader :current_user

  private

  def authenticate_api_key!
    token = request.headers["X-Api-Key"]
    api_key = ApiKey.find_by(token: token)
    return head :unauthorized unless api_key

    @current_user = api_key.user
  end

  def team_membership_for(team)
    return nil unless current_user && team
    TeamMembership.find_by(team: team, user: current_user)
  end

  def require_role!(team, required_role)
    membership = team_membership_for(team)
    head :forbidden and return unless membership&.at_least?(required_role)
  end
end
