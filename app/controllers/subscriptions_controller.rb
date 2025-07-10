class SubscriptionsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team

  def create
    price_id = ENV['STRIPE_PRO_PLAN_PRICE_ID']
    session = Stripe::Checkout::Session.create(
      mode: 'subscription',
      customer_email: current_user.email,
      line_items: [
        { price: price_id, quantity: 1 }
      ],
      metadata: { team_id: @team.id },
      success_url: team_settings_url(@team, section: 'billing', session_id: '{CHECKOUT_SESSION_ID}'),
      cancel_url: team_settings_url(@team, section: 'billing')
    )

    redirect_to session.url, allow_other_host: true, status: 303
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end
end
