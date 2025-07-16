require 'rails_helper'

RSpec.describe 'Stock Transaction Shared Components', type: :view do
  let(:team) { create(:team) }
  let(:location1) { create(:location, team: team, name: 'Warehouse A') }
  let(:location2) { create(:location, team: team, name: 'Warehouse B') }
  
  before do
    assign(:team, team)
    allow(view).to receive(:t).and_call_original
  end

  describe '_transaction_form partial' do
    let(:config) { TransactionConfig.new('stock_in') }
    
    before do
      team.locations << [location1, location2]
    end

    it 'renders the main transaction form structure' do
      render partial: 'stock_transactions/transaction_form', locals: { config: config }
      
      expect(rendered).to have_css('.min-h-screen.bg-gray-50')
      expect(rendered).to have_css('[data-controller="stock-transaction"]')
      expect(rendered).to have_css('[data-stock-transaction-team-id-value]')
      expect(rendered).to have_css('[data-stock-transaction-type-value]')
      expect(rendered).to have_css('[data-stock-transaction-config-value]')
    end

    it 'includes all required sections' do
      render partial: 'stock_transactions/transaction_form', locals: { config: config }
      
      # Should render location selector
      expect(rendered).to have_css('select[name*="location_id"]')
      
      # Should render search input
      expect(rendered).to have_css('input[data-stock-transaction-target="searchInput"]')
      
      # Should render item table
      expect(rendered).to have_css('table')
      expect(rendered).to have_css('[data-stock-transaction-target="itemsList"]')
      
      # Should render notes section
      expect(rendered).to have_css('textarea[name="notes"]')
      
      # Should render save button
      expect(rendered).to have_css('button[data-action="stock-transaction#save"]')
    end

    it 'renders item template with correct structure' do
      render partial: 'stock_transactions/transaction_form', locals: { config: config }
      
      expect(rendered).to have_css('template[data-stock-transaction-target="itemTemplate"]')
      expect(rendered).to have_css('template input[data-quantity]')
      expect(rendered).to have_css('template button[data-action="stock-transaction#removeItem"]')
    end

    it 'applies correct styling classes based on config' do
      render partial: 'stock_transactions/transaction_form', locals: { config: config }
      
      expect(rendered).to have_css(".#{config.css_color_class}")
      expect(rendered).to have_css(".#{config.button_color_class}")
    end
  end

  describe '_location_selector partial' do
    context 'with single location mode' do
      let(:config) { TransactionConfig.new('stock_in') }
      
      before do
        team.locations << location1
      end

      it 'renders single location selector' do
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        expect(rendered).to have_css('select[name="destination_location_id"]')
        expect(rendered).to have_css('option', text: location1.name)
        expect(rendered).not_to have_css('select[name="source_location_id"]')
      end

      it 'shows error when no locations exist' do
        team.locations.clear
        
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        expect(rendered).not_to have_css('select')
        # Should render location error partial
        expect(rendered).to include('stock_transactions/location_error')
      end
    end

    context 'with dual location mode (move)' do
      let(:config) { TransactionConfig.new('move') }
      
      before do
        team.locations << [location1, location2]
      end

      it 'renders both source and destination selectors' do
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        expect(rendered).to have_css('select[name="source_location_id"]')
        expect(rendered).to have_css('select[name="destination_location_id"]')
        
        expect(rendered).to have_css('option', text: location1.name)
        expect(rendered).to have_css('option', text: location2.name)
      end

      it 'shows error when insufficient locations for move' do
        team.locations = [location1] # Only one location
        
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        expect(rendered).not_to have_css('select')
        # Should render location error partial twice (for both selectors)
        expect(rendered).to include('stock_transactions/location_error')
      end

      it 'pre-selects different locations by default' do
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        # First location should be selected in source
        expect(rendered).to have_css('select[name="source_location_id"] option[selected]', text: location1.name)
        # Second location should be selected in destination  
        expect(rendered).to have_css('select[name="destination_location_id"] option[selected]', text: location2.name)
      end
    end

    context 'with stock_out configuration' do
      let(:config) { TransactionConfig.new('stock_out') }
      
      before do
        team.locations << location1
      end

      it 'uses source_location_id for stock_out' do
        render partial: 'stock_transactions/location_selector', locals: { config: config, team: team }
        
        expect(rendered).to have_css('select[name="source_location_id"]')
        expect(rendered).not_to have_css('select[name="destination_location_id"]')
      end
    end
  end

  describe '_item_search partial' do
    let(:config) { TransactionConfig.new('stock_in') }

    it 'renders search input with correct attributes' do
      render partial: 'stock_transactions/item_search', locals: { config: config, team: team }
      
      expect(rendered).to have_css('input[data-stock-transaction-target="searchInput"]')
      expect(rendered).to have_css('input[data-action*="stock-transaction#handleSearch"]')
      expect(rendered).to have_css('input[data-action*="stock-transaction#showAllItems"]')
    end

    it 'renders search results dropdown' do
      render partial: 'stock_transactions/item_search', locals: { config: config, team: team }
      
      expect(rendered).to have_css('[data-stock-transaction-target="searchResults"]')
      expect(rendered).to have_css('.hidden') # Initially hidden
    end

    it 'renders barcode scanner button' do
      render partial: 'stock_transactions/item_search', locals: { config: config, team: team }
      
      expect(rendered).to have_css('button[data-action="stock-transaction#openBarcodeModal"]')
      expect(rendered).to have_css('svg') # Barcode icon
    end

    it 'includes team id in search container' do
      render partial: 'stock_transactions/item_search', locals: { config: config, team: team }
      
      expect(rendered).to have_css("[data-team-id='#{team.id}']")
    end
  end

  describe '_item_table partial' do
    let(:config) { TransactionConfig.new('stock_in') }

    it 'renders table structure with correct headers' do
      render partial: 'stock_transactions/item_table', locals: { config: config }
      
      expect(rendered).to have_css('table.min-w-full')
      expect(rendered).to have_css('thead.bg-gray-50')
      expect(rendered).to have_css('tbody[data-stock-transaction-target="itemsList"]')
      
      # Check for required column headers
      expect(rendered).to have_css('th', text: /item/i)
      expect(rendered).to have_css('th', text: /current.stock/i)
      expect(rendered).to have_css('th', text: /quantity/i)
    end

    it 'includes transaction type in tbody' do
      render partial: 'stock_transactions/item_table', locals: { config: config }
      
      expect(rendered).to have_css("tbody[data-transaction-type='#{config.type}']")
    end

    it 'renders empty state section' do
      render partial: 'stock_transactions/item_table', locals: { config: config }
      
      expect(rendered).to have_css('[data-stock-transaction-target="emptyState"]')
      expect(rendered).to have_css('.hidden') # Initially hidden
      expect(rendered).to have_css('svg') # Empty state icon
    end

    it 'shows required indicator on quantity column' do
      render partial: 'stock_transactions/item_table', locals: { config: config }
      
      expect(rendered).to have_css('th .text-red-500', text: '*')
    end
  end

  describe '_barcode_modal partial' do
    let(:config) { TransactionConfig.new('stock_in') }

    it 'renders modal with correct structure' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css('#barcodeModal')
      expect(rendered).to have_css('[data-stock_transaction_target="barcodeModal"]')
      expect(rendered).to have_css('.fixed.inset-0.z-50')
      expect(rendered).to have_css('.hidden') # Initially hidden
    end

    it 'includes modal header with close button' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css('button[data-action="stock-transaction#closeBarcodeModal"]')
      expect(rendered).to have_css('h3', text: /barcode.scanner/i)
    end

    it 'renders scanner container and controls' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css('[data-stock_transaction_target="scannerContainer"]')
      expect(rendered).to have_css('[data-stock_transaction_target="qrReader"]')
      expect(rendered).to have_css('button[data-action="stock-transaction#toggleScanner"]')
      expect(rendered).to have_css('input[type="file"][data-action*="stock-transaction#handleFileSelect"]')
    end

    it 'renders barcode input field' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css('[data-stock_transaction_target="barcodeInput"]')
      expect(rendered).to have_css('input[data-action*="stock-transaction#handleBarcodeKeypress"]')
    end

    it 'renders action buttons' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css('button[data-action="stock-transaction#processScannedItem"]')
      expect(rendered).to have_css('button[data-action="stock-transaction#closeBarcodeModal"]')
    end

    it 'applies config-based styling' do
      render partial: 'stock_transactions/barcode_modal', locals: { config: config }
      
      expect(rendered).to have_css(".#{config.button_color_class}")
      expect(rendered).to have_css(".#{config.bg_color_class}")
      expect(rendered).to have_css(".#{config.css_color_class}")
    end

    context 'with custom modal_id and controller_name' do
      it 'uses custom parameters' do
        render partial: 'stock_transactions/barcode_modal', 
               locals: { 
                 config: config, 
                 modal_id: 'customModal', 
                 controller_name: 'custom-controller' 
               }
        
        expect(rendered).to have_css('#customModal')
        expect(rendered).to have_css('[data-custom_controller_target="barcodeModal"]')
        expect(rendered).to have_css('button[data-action="custom-controller#closeBarcodeModal"]')
      end
    end
  end
end