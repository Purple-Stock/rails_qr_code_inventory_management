require 'rails_helper'

RSpec.describe "Stock Transaction Views", type: :view do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location) { create(:location, team: team) }

  before do
    assign(:team, team)
    allow(view).to receive(:current_user).and_return(user)
  end

  describe "stock_in.html.erb" do
    it "renders successfully with shared components" do
      expect { render template: "stock_transactions/stock_in" }.not_to raise_error
      expect(rendered).to include("Stock In")
      expect(rendered).to include("text-green-600")
    end
  end

  describe "stock_out.html.erb" do
    it "renders successfully with shared components" do
      expect { render template: "stock_transactions/stock_out" }.not_to raise_error
      expect(rendered).to include("Stock Out")
      expect(rendered).to include("text-red-600")
    end
  end

  describe "adjust.html.erb" do
    it "renders successfully with shared components" do
      expect { render template: "stock_transactions/adjust" }.not_to raise_error
      expect(rendered).to include("Adjust Stock")
      expect(rendered).to include("text-blue-600")
    end
  end

  describe "move.html.erb" do
    it "renders successfully with shared components" do
      expect { render template: "stock_transactions/move" }.not_to raise_error
      expect(rendered).to include("Move Stock")
      expect(rendered).to include("text-purple-600")
    end
  end

  describe "shared components integration" do
    it "includes all necessary shared components" do
      render template: "stock_transactions/stock_in"
      
      # Check for location selector
      expect(rendered).to include("location")
      
      # Check for item search
      expect(rendered).to include("search")
      
      # Check for item table
      expect(rendered).to include("table")
      
      # Check for barcode modal
      expect(rendered).to include("barcode")
      
      # Check for notes section
      expect(rendered).to include("notes")
    end
  end
end