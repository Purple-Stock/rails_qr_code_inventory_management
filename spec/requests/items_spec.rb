require 'rails_helper'

RSpec.describe "Items", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location) { create(:location, team: team) }

  before do
    sign_in user
  end

  describe "GET /teams/:team_id/items" do
    it "returns success" do
      get team_items_path(team)
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /teams/:team_id/items" do
    it "creates an item" do
      expect {
        post team_items_path(team), params: { item: attributes_for(:item, location_id: location.id, team_id: team.id) }
      }.to change(Item, :count).by(1)
      expect(response).to redirect_to(team_items_path(team))
    end

    it "renders errors with invalid params" do
      expect {
        post team_items_path(team), params: { item: { name: "" } }
      }.not_to change(Item, :count)
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
