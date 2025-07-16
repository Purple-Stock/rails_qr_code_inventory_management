class ApplicationController < ActionController::Base
  # Only allow modern browsers supporting webp images, web push, badges, import maps, CSS nesting, and CSS :has.
  allow_browser versions: :modern

  # Enable CSRF protection
  protect_from_forgery with: :exception

  # Require authentication for all pages
  before_action :authenticate_user!

  before_action :set_locale

  layout :determine_layout

  def after_sign_in_path_for(resource)
    team_selection_path
  end

  private

  def determine_layout
    if current_user
      "authenticated"
    else
      "application"
    end
  end

  def set_locale
    I18n.locale = extract_locale || I18n.default_locale
  end

  def extract_locale
    # Priority: 1. URL parameter, 2. User preference, 3. Accept-Language header, 4. Default locale
    locale = params[:locale] || cookies[:locale] || extract_locale_from_header

    if locale && I18n.available_locales.map(&:to_s).include?(locale)
      cookies[:locale] = locale unless cookies[:locale] == locale
      locale.to_sym
    end
  end

  def extract_locale_from_header
    accept_language = request.env["HTTP_ACCEPT_LANGUAGE"]
    return unless accept_language

    locale = accept_language.scan(/^[a-z]{2}/).first

    # Special case for Brazilian Portuguese
    if locale == "pt" && accept_language.include?("pt-BR")
      "pt-BR"
    else
      locale
    end
  end

  # Store current locale in URL
  def default_url_options
    { locale: I18n.locale == I18n.default_locale ? nil : I18n.locale }
  end

  # Check if barcode scanner is enabled for the current team/user
  def barcode_scanner_enabled?
    # For now, enable barcode scanner for all users
    # This can be made configurable per team/user in the future
    true
  end
end
