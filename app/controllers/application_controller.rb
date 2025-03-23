class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern
  
  # Require authentication for all pages
  before_action :authenticate_user!

  layout :determine_layout

  def after_sign_in_path_for(resource)
    team_selection_path
  end

  private
  
  def determine_layout
    if current_user
      'authenticated'
    else
      'application'
    end
  end
end
