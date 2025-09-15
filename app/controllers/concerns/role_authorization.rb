module RoleAuthorization
  extend ActiveSupport::Concern

  class UnauthorizedError < StandardError; end

  included do
    rescue_from UnauthorizedError, with: :render_forbidden
    helper_method :team_membership_for, :can_view_team?, :can_edit_team?, :can_admin_team?, :is_owner?
  end

  def team_membership_for(team)
    return nil unless current_user && team
    @__team_memberships_cache ||= {}
    @__team_memberships_cache[team.id] ||= TeamMembership.find_by(team: team, user: current_user)
  end

  def require_role!(team, required_role)
    membership = team_membership_for(team)
    raise UnauthorizedError unless membership&.at_least?(required_role)
  end

  def can_view_team?(team)
    membership = team_membership_for(team)
    membership.present?
  end

  def can_edit_team?(team)
    membership = team_membership_for(team)
    membership&.at_least?(:editor)
  end

  def can_admin_team?(team)
    membership = team_membership_for(team)
    membership&.at_least?(:admin)
  end

  def is_owner?(team)
    membership = team_membership_for(team)
    membership&.role == "owner"
  end

  private

  def render_forbidden
    respond_to do |format|
      format.html { redirect_back fallback_location: root_path, alert: t("errors.forbidden", default: "You are not authorized to perform this action.") }
      format.json { render json: { error: "forbidden" }, status: :forbidden }
    end
  end
end

