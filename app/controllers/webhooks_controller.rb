class WebhooksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_team
  before_action :set_webhook, only: [ :edit, :update, :destroy ]

  def index
    @webhooks = @team.webhooks
  end

  def new
    @webhook = @team.webhooks.build
  end

  def create
    @webhook = @team.webhooks.build(webhook_params)
    if @webhook.save
      redirect_to team_webhooks_path(@team), notice: "Webhook was successfully created."
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @webhook.update(webhook_params)
      redirect_to team_webhooks_path(@team), notice: "Webhook was successfully updated."
    else
      render :edit
    end
  end

  def destroy
    @webhook.destroy
    redirect_to team_webhooks_path(@team), notice: "Webhook was successfully destroyed."
  end

  private

  def set_team
    @team = current_user.teams.find(params[:team_id])
  end

  def set_webhook
    @webhook = @team.webhooks.find(params[:id])
  end

  def webhook_params
    params.require(:webhook).permit(:url, :event, :secret)
  end
end
