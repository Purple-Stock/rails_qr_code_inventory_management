require 'rails_helper'

RSpec.describe "Teams", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }

  before do
    sign_in user
  end

  describe "GET /teams" do
    it "works! (now write some real specs)" do
      get teams_path
      expect(response).to have_http_status(200)
    end
  end

  describe "GET /team_selection" do
    it "shows the team selection page" do
      get team_selection_path
      expect(response).to have_http_status(200)
    end
  end
end
