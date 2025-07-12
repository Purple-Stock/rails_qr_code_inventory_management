require 'rails_helper'

RSpec.describe 'API V1 Transactions', type: :request do
  let(:user) { create(:user) }
  let(:api_key) { create(:api_key, user: user) }
  let(:team) { create(:team, user: user) }
  let!(:location) { create(:location, team: team) }
  let!(:item) { create(:item, team: team, location: location) }

  describe 'POST /api/v1/teams/:team_id/transactions' do
    it 'creates transaction' do
      expect {
        post api_v1_team_transactions_path(team),
          params: { transaction: { item_id: item.id, quantity: 1, transaction_type: 'stock_in', destination_location_id: location.id } },
          headers: { 'X-Api-Key' => api_key.token }
      }.to change(StockTransaction, :count).by(1)
      expect(response).to have_http_status(:created)
    end
  end
end
