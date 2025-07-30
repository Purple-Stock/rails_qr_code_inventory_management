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

    context "with infinite scroll pagination" do
      let!(:items) { create_list(:item, 25, team: team, location: location) }

      it "returns paginated items with has_more flag" do
        get team_items_path(team), params: { page: 1, per_page: 20 }
        expect(response).to have_http_status(:ok)
        expect(assigns(:items).count).to eq(20)
        expect(assigns(:has_more)).to be true
      end

      it "returns remaining items on second page" do
        get team_items_path(team), params: { page: 2, per_page: 20 }
        expect(response).to have_http_status(:ok)
        expect(assigns(:items).count).to eq(5)
        expect(assigns(:has_more)).to be false
      end

      it "returns JSON format for AJAX requests" do
        get team_items_path(team), params: { page: 1, per_page: 10 }, 
            headers: { 'Accept' => 'application/json' }
        
        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response['items'].count).to eq(10)
        expect(json_response['has_more']).to be true
        expect(json_response['page']).to eq(1)
        expect(json_response['per_page']).to eq(10)
        expect(json_response['total_count']).to eq(25)
      end

      it "returns turbo_stream format for infinite scroll" do
        get team_items_path(team), params: { page: 1, per_page: 10 },
            headers: { 'Accept' => 'text/html', 'X-Requested-With' => 'XMLHttpRequest' }
        
        expect(response).to have_http_status(:ok)
        expect(response.content_type).to include('text/html')
      end
    end

    context "with search query" do
      let!(:item1) { create(:item, name: "Apple iPhone", team: team, location: location) }
      let!(:item2) { create(:item, name: "Samsung Galaxy", team: team, location: location) }
      let!(:item3) { create(:item, sku: "APPLE-001", team: team, location: location) }

      it "filters items by name" do
        get team_items_path(team), params: { query: "Apple" }
        expect(assigns(:items)).to include(item1)
        expect(assigns(:items)).not_to include(item2)
      end

      it "filters items by SKU" do
        get team_items_path(team), params: { query: "APPLE-001" }
        expect(assigns(:items)).to include(item3)
        expect(assigns(:items)).not_to include(item1, item2)
      end

      it "returns paginated search results" do
        # Create more items with "Apple" in the name
        create_list(:item, 25, name: "Apple Product", team: team, location: location)
        
        get team_items_path(team), params: { query: "Apple", page: 1, per_page: 20 }
        expect(assigns(:items).count).to eq(20)
        expect(assigns(:has_more)).to be true
      end
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
