require 'rails_helper'

RSpec.describe "Webhooks", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:webhook) { create(:webhook, team: team) }

  before do
    sign_in user
  end

  describe "GET /teams/:team_id/webhooks" do
    it "returns a successful response" do
      get team_webhooks_path(team)
      expect(response).to have_http_status(:success)
    end

    it "displays webhooks for the team" do
      webhook = create(:webhook, team: team)
      get team_webhooks_path(team)
      expect(response.body).to include(webhook.url)
      expect(response.body).to include(webhook.event)
    end

    it "does not display webhooks from other teams" do
      other_team = create(:team)
      other_webhook = create(:webhook, team: other_team)
      team_webhook = create(:webhook, team: team)

      get team_webhooks_path(team)
      expect(response.body).to include(team_webhook.url)
      expect(response.body).not_to include(other_webhook.url)
    end

    it "redirects to sign in if not authenticated" do
      sign_out user
      get team_webhooks_path(team)
      expect(response).to redirect_to(new_user_session_path)
    end
  end

  describe "GET /teams/:team_id/webhooks/new" do
    it "returns a successful response" do
      get new_team_webhook_path(team)
      expect(response).to have_http_status(:success)
    end

    it "displays the webhook form" do
      get new_team_webhook_path(team)
      expect(response.body).to include('New Webhook')
      expect(response.body).to include('url')
      expect(response.body).to include('event')
      expect(response.body).to include('secret')
    end
  end

  describe "POST /teams/:team_id/webhooks" do
    let(:valid_attributes) do
      {
        webhook: {
          url: 'https://example.com/webhook',
          event: 'item.created',
          secret: 'secret123'
        }
      }
    end

    let(:invalid_attributes) do
      {
        webhook: {
          url: 'invalid-url',
          event: '',
          secret: ''
        }
      }
    end

    context "with valid parameters" do
      it "creates a new webhook" do
        expect {
          post team_webhooks_path(team), params: valid_attributes
        }.to change(Webhook, :count).by(1)
      end

      it "redirects to the webhooks index" do
        post team_webhooks_path(team), params: valid_attributes
        expect(response).to redirect_to(team_webhooks_path(team))
      end

      it "sets the correct team" do
        post team_webhooks_path(team), params: valid_attributes
        expect(Webhook.last.team).to eq(team)
      end

      it "sets the correct attributes" do
        post team_webhooks_path(team), params: valid_attributes
        webhook = Webhook.last
        expect(webhook.url).to eq('https://example.com/webhook')
        expect(webhook.event).to eq('item.created')
        expect(webhook.secret).to eq('secret123')
      end
    end

    context "with invalid parameters" do
      it "does not create a webhook" do
        expect {
          post team_webhooks_path(team), params: invalid_attributes
        }.not_to change(Webhook, :count)
      end

      it "renders the new template" do
        post team_webhooks_path(team), params: invalid_attributes
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include('New Webhook')
      end

      it "displays validation errors" do
        post team_webhooks_path(team), params: invalid_attributes
        expect(response.body).to include('error')
      end
    end
  end

  describe "GET /teams/:team_id/webhooks/:id/edit" do
    it "returns a successful response" do
      get edit_team_webhook_path(team, webhook)
      expect(response).to have_http_status(:success)
    end

    it "displays the edit form with webhook data" do
      get edit_team_webhook_path(team, webhook)
      expect(response.body).to include('Edit Webhook')
      expect(response.body).to include(webhook.url)
      expect(response.body).to include(webhook.event)
    end
  end

  describe "PUT /teams/:team_id/webhooks/:id" do
    let(:new_attributes) do
      {
        webhook: {
          url: 'https://new-example.com/webhook',
          event: 'stock.updated',
          secret: 'new_secret'
        }
      }
    end

    let(:invalid_attributes) do
      {
        webhook: {
          url: 'invalid-url',
          event: '',
          secret: ''
        }
      }
    end

    context "with valid parameters" do
      it "updates the webhook" do
        put team_webhook_path(team, webhook), params: new_attributes
        webhook.reload
        expect(webhook.url).to eq('https://new-example.com/webhook')
        expect(webhook.event).to eq('stock.updated')
        expect(webhook.secret).to eq('new_secret')
      end

      it "redirects to the webhooks index" do
        put team_webhook_path(team, webhook), params: new_attributes
        expect(response).to redirect_to(team_webhooks_path(team))
      end
    end

    context "with invalid parameters" do
      it "does not update the webhook" do
        original_url = webhook.url
        put team_webhook_path(team, webhook), params: invalid_attributes
        webhook.reload
        expect(webhook.url).to eq(original_url)
      end

      it "renders the edit template" do
        put team_webhook_path(team, webhook), params: invalid_attributes
        expect(response).to have_http_status(:unprocessable_entity)
        expect(response.body).to include('Edit Webhook')
      end
    end
  end

  describe "DELETE /teams/:team_id/webhooks/:id" do
    it "destroys the webhook" do
      webhook_to_delete = create(:webhook, team: team)
      expect {
        delete team_webhook_path(team, webhook_to_delete)
      }.to change(Webhook, :count).by(-1)
    end

    it "redirects to the webhooks index" do
      delete team_webhook_path(team, webhook)
      expect(response).to redirect_to(team_webhooks_path(team))
    end
  end

  describe "authorization" do
    let(:other_user) { create(:user) }
    let(:other_team) { create(:team, user: other_user) }
    let(:other_webhook) { create(:webhook, team: other_team) }

    it "prevents access to webhooks from other teams" do
      expect {
        get team_webhooks_path(other_team)
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "prevents creating webhooks for other teams" do
      expect {
        post team_webhooks_path(other_team), params: {
          webhook: { url: 'https://example.com', event: 'item.created', secret: 'secret' }
        }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "prevents editing webhooks from other teams" do
      expect {
        get edit_team_webhook_path(other_team, other_webhook)
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "prevents updating webhooks from other teams" do
      expect {
        put team_webhook_path(other_team, other_webhook), params: {
          webhook: { url: 'https://example.com', event: 'item.created', secret: 'secret' }
        }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it "prevents destroying webhooks from other teams" do
      expect {
        delete team_webhook_path(other_team, other_webhook)
      }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
