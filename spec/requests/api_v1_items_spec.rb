require 'rails_helper'

RSpec.describe 'API V1 Items', type: :request do
  let(:user) { create(:user) }
  let(:api_key) { create(:api_key, user: user) }
  let(:team) { create(:team, user: user) }
  let!(:location) { create(:location, team: team) }
  let!(:items) { create_list(:item, 2, team: team, location: location) }

  describe 'GET /api/v1/teams/:team_id/items' do
    it 'returns items' do
      get api_v1_team_items_path(team), headers: { 'X-Api-Key' => api_key.token }
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.size).to eq(2)
    end
  end
end
