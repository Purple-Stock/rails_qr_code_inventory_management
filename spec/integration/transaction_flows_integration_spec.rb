require 'rails_helper'

RSpec.describe 'Transaction Flows Integration', type: :system do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location1) { create(:location, team: team, name: 'Warehouse A') }
  let(:location2) { create(:location, team: team, name: 'Warehouse B') }
  let(:item1) { create(:item, team: team, location: location1, name: 'Test Item 1', sku: 'TEST-001', current_stock: 10) }
  let(:item2) { create(:item, team: team, location: location1, name: 'Test Item 2', sku: 'TEST-002', current_stock: 5) }

  before do
    sign_in user
    # Ensure locations and items exist
    location1
    location2
    item1
    item2
  end

  shared_examples 'a complete transaction flow' do |transaction_type|
    let(:config) { StockTransaction.transaction_config(transaction_type) }
    
    it "completes #{transaction_type} transaction successfully" do
      visit send("#{transaction_type}_team_stock_transactions_path", team)
      
      # Verify page loads with correct configuration
      expect(page).to have_content(config.title)
      expect(page).to have_css(".#{config.css_color_class}")
      
      # Verify shared components are rendered
      expect(page).to have_css('[data-controller="stock-transaction"]')
      expect(page).to have_css('[data-stock-transaction-target="itemsList"]')
      expect(page).to have_css('[data-stock-transaction-target="totalQuantity"]')
      
      # Configure locations based on transaction type
      configure_locations_for_transaction(transaction_type)
      
      # Add items using search functionality
      add_items_to_transaction(transaction_type)
      
      # Verify items appear in the table
      expect(page).to have_css('tbody tr', count: 2)
      expect(page).to have_content('Test Item 1')
      expect(page).to have_content('Test Item 2')
      
      # Verify total quantity is calculated
      expect(page).to have_content('Total items: 3') # 2 + 1
      
      # Add notes
      fill_in 'notes', with: "Integration test for #{transaction_type}"
      
      # Submit transaction
      click_button config.save_button_text
      
      # Verify redirect to transactions index
      expect(current_path).to eq(team_stock_transactions_path(team))
      expect(page).to have_content('Transaction completed successfully')
      
      # Verify transaction was created
      transaction = team.stock_transactions.last
      expect(transaction.transaction_type).to eq(transaction_type.to_s)
      expect(transaction.notes).to include("Integration test for #{transaction_type}")
      
      # Verify stock changes based on transaction type
      verify_stock_changes_for_transaction(transaction_type)
    end
  end

  describe 'Stock In Flow' do
    it_behaves_like 'a complete transaction flow', :stock_in
    
    it 'increases item stock levels' do
      initial_stock_1 = item1.current_stock
      initial_stock_2 = item2.current_stock
      
      visit stock_in_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 3)
      add_item_with_quantity(item2, 2)
      
      click_button 'Add to Stock'
      
      item1.reload
      item2.reload
      
      expect(item1.current_stock).to eq(initial_stock_1 + 3)
      expect(item2.current_stock).to eq(initial_stock_2 + 2)
    end
    
    it 'validates positive quantities only' do
      visit stock_in_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, -5)
      
      click_button 'Add to Stock'
      
      expect(page).to have_content('Quantity must be positive')
    end
  end

  describe 'Stock Out Flow' do
    it_behaves_like 'a complete transaction flow', :stock_out
    
    it 'decreases item stock levels' do
      initial_stock_1 = item1.current_stock
      initial_stock_2 = item2.current_stock
      
      visit stock_out_team_stock_transactions_path(team)
      
      select location1.name, from: 'source_location_id'
      add_item_with_quantity(item1, 2)
      add_item_with_quantity(item2, 1)
      
      click_button 'Remove from Stock'
      
      item1.reload
      item2.reload
      
      expect(item1.current_stock).to eq(initial_stock_1 - 2)
      expect(item2.current_stock).to eq(initial_stock_2 - 1)
    end
    
    it 'validates stock availability' do
      visit stock_out_team_stock_transactions_path(team)
      
      select location1.name, from: 'source_location_id'
      add_item_with_quantity(item1, 15) # More than available (10)
      
      click_button 'Remove from Stock'
      
      expect(page).to have_content('Not enough stock available')
    end
  end

  describe 'Adjust Stock Flow' do
    it_behaves_like 'a complete transaction flow', :adjust
    
    it 'adjusts stock to specified levels' do
      visit adjust_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 15) # Adjust from 10 to 15
      add_item_with_quantity(item2, 3)  # Adjust from 5 to 3
      
      click_button 'Adjust Stock'
      
      item1.reload
      item2.reload
      
      expect(item1.current_stock).to eq(15)
      expect(item2.current_stock).to eq(3)
    end
    
    it 'allows negative adjustments' do
      visit adjust_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 0) # Adjust to zero
      
      click_button 'Adjust Stock'
      
      item1.reload
      expect(item1.current_stock).to eq(0)
    end
  end

  describe 'Move Stock Flow' do
    it_behaves_like 'a complete transaction flow', :move
    
    it 'requires different source and destination locations' do
      visit move_team_stock_transactions_path(team)
      
      select location1.name, from: 'source_location_id'
      select location1.name, from: 'destination_location_id' # Same location
      
      add_item_with_quantity(item1, 2)
      
      click_button 'Move Stock'
      
      expect(page).to have_content('Source and destination locations must be different')
    end
    
    it 'validates stock availability at source location' do
      # Mock stock_at_location to return limited stock
      allow(item1).to receive(:stock_at_location).with(location1.id).and_return(1)
      
      visit move_team_stock_transactions_path(team)
      
      select location1.name, from: 'source_location_id'
      select location2.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 5) # More than available at source
      
      click_button 'Move Stock'
      
      expect(page).to have_content('Not enough stock available at source location')
    end
  end

  describe 'Barcode Scanner Integration' do
    before do
      # Mock barcode scanning functionality
      allow_any_instance_of(ApplicationController).to receive(:barcode_scanner_enabled?).and_return(true)
    end
    
    it 'opens and closes barcode scanner modal', js: true do
      visit stock_in_team_stock_transactions_path(team)
      
      # Open barcode modal
      click_button 'Scan Barcode'
      
      expect(page).to have_css('[data-stock-transaction-target="barcodeModal"]:not(.hidden)')
      expect(page).to have_content('Barcode Scanner')
      
      # Close modal
      find('[data-action="stock-transaction#closeBarcodeModal"]').click
      
      expect(page).to have_css('[data-stock-transaction-target="barcodeModal"].hidden')
    end
    
    it 'processes manual barcode input', js: true do
      # Create item with barcode
      item_with_barcode = create(:item, team: team, sku: 'BARCODE-123', barcode: 'BARCODE-123')
      
      visit stock_in_team_stock_transactions_path(team)
      
      click_button 'Scan Barcode'
      
      # Enter barcode manually
      fill_in 'barcodeInput', with: 'BARCODE-123'
      click_button 'Search'
      
      # Verify item is added
      expect(page).to have_content(item_with_barcode.name)
      expect(page).to have_css('tbody tr', count: 1)
    end
    
    it 'handles barcode not found', js: true do
      visit stock_in_team_stock_transactions_path(team)
      
      click_button 'Scan Barcode'
      fill_in 'barcodeInput', with: 'NONEXISTENT-BARCODE'
      click_button 'Search'
      
      expect(page).to have_content('No item found with that barcode')
    end
  end

  describe 'Item Search Integration' do
    it 'searches items by name', js: true do
      visit stock_in_team_stock_transactions_path(team)
      
      # Focus on search input to trigger search
      find('[data-stock-transaction-target="searchInput"]').click
      fill_in 'searchInput', with: 'Test Item 1'
      
      # Wait for search results
      expect(page).to have_css('[data-stock-transaction-target="searchResults"]:not(.hidden)')
      expect(page).to have_content('Test Item 1')
      
      # Click on search result
      click_on 'Test Item 1'
      
      # Verify item is added
      expect(page).to have_css('tbody tr', count: 1)
      expect(page).to have_content('Test Item 1')
    end
    
    it 'searches items by SKU', js: true do
      visit stock_in_team_stock_transactions_path(team)
      
      find('[data-stock-transaction-target="searchInput"]').click
      fill_in 'searchInput', with: 'TEST-002'
      
      expect(page).to have_content('Test Item 2')
      
      click_on 'Test Item 2'
      
      expect(page).to have_css('tbody tr', count: 1)
      expect(page).to have_content('TEST-002')
    end
  end

  describe 'Form Validation Integration' do
    it 'prevents submission without location selection' do
      visit stock_in_team_stock_transactions_path(team)
      
      add_item_with_quantity(item1, 2)
      
      # Don't select location
      click_button 'Add to Stock'
      
      expect(page).to have_content('Please select a location')
      expect(current_path).to eq(stock_in_team_stock_transactions_path(team))
    end
    
    it 'prevents submission without items' do
      visit stock_in_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      
      # Don't add any items
      click_button 'Add to Stock'
      
      expect(page).to have_content('Please add items and quantities')
    end
    
    it 'validates quantity inputs in real-time', js: true do
      visit stock_out_team_stock_transactions_path(team)
      
      select location1.name, from: 'source_location_id'
      add_item_with_quantity(item1, 15) # More than available
      
      # Check that input shows validation error
      quantity_input = find('[data-quantity]')
      expect(quantity_input[:class]).to include('border-red-500')
    end
  end

  describe 'Error Handling Integration' do
    it 'handles server errors gracefully' do
      # Mock server error
      allow_any_instance_of(StockTransactionsController).to receive(:process_transaction).and_raise(StandardError.new('Server error'))
      
      visit stock_in_team_stock_transactions_path(team)
      
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 2)
      
      click_button 'Add to Stock'
      
      expect(page).to have_content('Server error')
      expect(current_path).to eq(stock_in_team_stock_transactions_path(team))
    end
    
    it 'handles network errors during item search', js: true do
      # Mock network failure
      page.execute_script("
        window.fetch = function() {
          return Promise.reject(new Error('Network error'));
        };
      ")
      
      visit stock_in_team_stock_transactions_path(team)
      
      find('[data-stock-transaction-target="searchInput"]').click
      fill_in 'searchInput', with: 'Test'
      
      expect(page).to have_content('Error searching for items')
    end
  end

  describe 'Responsive Design Integration' do
    it 'works on mobile viewport', js: true do
      page.driver.browser.manage.window.resize_to(375, 667) # iPhone size
      
      visit stock_in_team_stock_transactions_path(team)
      
      # Verify mobile-friendly layout
      expect(page).to have_css('.max-w-7xl') # Responsive container
      expect(page).to have_css('.px-4.sm\\:px-6.lg\\:px-8') # Responsive padding
      
      # Test mobile interactions
      select location1.name, from: 'destination_location_id'
      add_item_with_quantity(item1, 2)
      
      click_button 'Add to Stock'
      
      expect(current_path).to eq(team_stock_transactions_path(team))
    end
  end

  private

  def configure_locations_for_transaction(transaction_type)
    case transaction_type
    when :stock_in, :adjust
      select location1.name, from: 'destination_location_id'
    when :stock_out
      select location1.name, from: 'source_location_id'
    when :move
      select location1.name, from: 'source_location_id'
      select location2.name, from: 'destination_location_id'
    end
  end

  def add_items_to_transaction(transaction_type)
    case transaction_type
    when :stock_in, :stock_out, :move
      add_item_with_quantity(item1, 2)
      add_item_with_quantity(item2, 1)
    when :adjust
      add_item_with_quantity(item1, 15) # Adjust to 15
      add_item_with_quantity(item2, 3)  # Adjust to 3
    end
  end

  def add_item_with_quantity(item, quantity)
    # Simulate item search and selection
    find('[data-stock-transaction-target="searchInput"]').click
    fill_in 'searchInput', with: item.name
    
    # Wait for and click search result
    expect(page).to have_content(item.name)
    click_on item.name
    
    # Set quantity
    within("tr[data-item-id='#{item.id}']") do
      fill_in 'quantity', with: quantity
    end
  end

  def verify_stock_changes_for_transaction(transaction_type)
    case transaction_type
    when :stock_in
      # Stock should increase
      item1.reload
      item2.reload
      expect(item1.current_stock).to be > 10
      expect(item2.current_stock).to be > 5
    when :stock_out
      # Stock should decrease
      item1.reload
      item2.reload
      expect(item1.current_stock).to be < 10
      expect(item2.current_stock).to be < 5
    when :adjust
      # Stock should be set to specific values
      item1.reload
      item2.reload
      expect(item1.current_stock).to eq(15)
      expect(item2.current_stock).to eq(3)
    when :move
      # Move doesn't change total stock, but creates transaction record
      transaction = team.stock_transactions.last
      expect(transaction.source_location).to eq(location1)
      expect(transaction.destination_location).to eq(location2)
    end
  end
end