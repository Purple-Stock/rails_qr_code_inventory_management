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

  describe "GET /teams/:team_id/items/import" do
    it "shows the import form" do
      get import_team_items_path(team)
      expect(response).to have_http_status(:ok)
    end
  end

  describe "POST /teams/:team_id/items/import" do
    let(:csv_content) do
      "Name,SKU,Barcode,Type,Current Stock,Price,Cost,Brand\n" \
        "CSV Item,CSV1,BC1,Type,1,2,1,Brand"
    end

    it "imports items" do
      file = Tempfile.new(%w[items csv])
      file.write(csv_content)
      file.rewind

      expect {
        post import_team_items_path(team), params: { file: fixture_file_upload(file.path, 'text/csv') }
      }.to change(Item, :count).by(1)

      expect(response).to redirect_to(team_items_path(team))
    ensure
      file.close
      file.unlink
    end

    it "rejects request without file" do
      post import_team_items_path(team)
      expect(response).to redirect_to(import_team_items_path(team))
    end
  end
end
