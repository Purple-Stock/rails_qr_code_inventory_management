require 'rails_helper'

RSpec.describe WebhooksController, type: :controller do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:webhook) { create(:webhook, team: team) }
  let(:valid_attributes) { { url: 'https://example.com/webhook', event: 'item.created', secret: 'secret123' } }
  let(:invalid_attributes) { { url: 'invalid-url', event: '', secret: '' } }

  before do
    sign_in user
  end

  describe 'GET #index' do
    it 'returns a success response' do
      get :index, params: { team_id: team.id }
      expect(response).to be_successful
    end

    it 'assigns @webhooks' do
      webhook = create(:webhook, team: team)
      get :index, params: { team_id: team.id }
      expect(assigns(:webhooks)).to include(webhook)
    end

    it 'only shows webhooks for the current team' do
      other_team = create(:team)
      other_webhook = create(:webhook, team: other_team)
      team_webhook = create(:webhook, team: team)

      get :index, params: { team_id: team.id }
      expect(assigns(:webhooks)).to include(team_webhook)
      expect(assigns(:webhooks)).not_to include(other_webhook)
    end
  end

  describe 'GET #new' do
    it 'returns a success response' do
      get :new, params: { team_id: team.id }
      expect(response).to be_successful
    end

    it 'assigns a new webhook' do
      get :new, params: { team_id: team.id }
      expect(assigns(:webhook)).to be_a_new(Webhook)
    end
  end

  describe 'POST #create' do
    context 'with valid params' do
      it 'creates a new Webhook' do
        expect {
          post :create, params: { team_id: team.id, webhook: valid_attributes }
        }.to change(Webhook, :count).by(1)
      end

      it 'assigns a newly created webhook as @webhook' do
        post :create, params: { team_id: team.id, webhook: valid_attributes }
        expect(assigns(:webhook)).to be_a(Webhook)
        expect(assigns(:webhook)).to be_persisted
      end

      it 'redirects to the webhooks index' do
        post :create, params: { team_id: team.id, webhook: valid_attributes }
        expect(response).to redirect_to(team_webhooks_path(team))
      end

      it 'sets the correct team' do
        post :create, params: { team_id: team.id, webhook: valid_attributes }
        expect(assigns(:webhook).team).to eq(team)
      end
    end

    context 'with invalid params' do
      it 'assigns a newly created but unsaved webhook as @webhook' do
        post :create, params: { team_id: team.id, webhook: invalid_attributes }
        expect(assigns(:webhook)).to be_a_new(Webhook)
      end

      it "re-renders the 'new' template" do
        post :create, params: { team_id: team.id, webhook: invalid_attributes }
        expect(response).to render_template(:new)
      end
    end
  end

  describe 'GET #edit' do
    it 'returns a success response' do
      get :edit, params: { team_id: team.id, id: webhook.id }
      expect(response).to be_successful
    end

    it 'assigns the requested webhook as @webhook' do
      get :edit, params: { team_id: team.id, id: webhook.id }
      expect(assigns(:webhook)).to eq(webhook)
    end
  end

  describe 'PUT #update' do
    context 'with valid params' do
      let(:new_attributes) { { url: 'https://new-example.com/webhook', event: 'stock.updated' } }

      it 'updates the requested webhook' do
        put :update, params: { team_id: team.id, id: webhook.id, webhook: new_attributes }
        webhook.reload
        expect(webhook.url).to eq('https://new-example.com/webhook')
        expect(webhook.event).to eq('stock.updated')
      end

      it 'assigns the requested webhook as @webhook' do
        put :update, params: { team_id: team.id, id: webhook.id, webhook: valid_attributes }
        expect(assigns(:webhook)).to eq(webhook)
      end

      it 'redirects to the webhooks index' do
        put :update, params: { team_id: team.id, id: webhook.id, webhook: valid_attributes }
        expect(response).to redirect_to(team_webhooks_path(team))
      end
    end

    context 'with invalid params' do
      it 'assigns the webhook as @webhook' do
        put :update, params: { team_id: team.id, id: webhook.id, webhook: invalid_attributes }
        expect(assigns(:webhook)).to eq(webhook)
      end

      it "re-renders the 'edit' template" do
        put :update, params: { team_id: team.id, id: webhook.id, webhook: invalid_attributes }
        expect(response).to render_template(:edit)
      end
    end
  end

  describe 'DELETE #destroy' do
    it 'destroys the requested webhook' do
      webhook_to_delete = create(:webhook, team: team)
      expect {
        delete :destroy, params: { team_id: team.id, id: webhook_to_delete.id }
      }.to change(Webhook, :count).by(-1)
    end

    it 'redirects to the webhooks index' do
      delete :destroy, params: { team_id: team.id, id: webhook.id }
      expect(response).to redirect_to(team_webhooks_path(team))
    end
  end

  describe 'authorization' do
    let(:other_user) { create(:user) }
    let(:other_team) { create(:team, user: other_user) }
    let(:other_webhook) { create(:webhook, team: other_team) }

    it 'prevents access to webhooks from other teams' do
      expect {
        get :index, params: { team_id: other_team.id }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'prevents editing webhooks from other teams' do
      expect {
        get :edit, params: { team_id: other_team.id, id: other_webhook.id }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'prevents updating webhooks from other teams' do
      expect {
        put :update, params: { team_id: other_team.id, id: other_webhook.id, webhook: valid_attributes }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end

    it 'prevents destroying webhooks from other teams' do
      expect {
        delete :destroy, params: { team_id: other_team.id, id: other_webhook.id }
      }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end
end
