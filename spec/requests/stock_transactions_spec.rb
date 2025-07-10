require 'rails_helper'

RSpec.describe "StockTransactions", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location) { create(:location, team: team) }
  let(:item) { create(:item, team: team, location: location) }

  before do
    sign_in user
  end

  describe "POST /teams/:team_id/transactions/stock_in" do
    it "creates a stock transaction" do
      expect {
        post stock_in_team_stock_transactions_path(team), params: { location: location.id, items: [{ id: item.id, quantity: 2 }], notes: "" }, as: :json
      }.to change(StockTransaction, :count).by(1)
      expect(response).to have_http_status(:ok)
    end
  end
end
