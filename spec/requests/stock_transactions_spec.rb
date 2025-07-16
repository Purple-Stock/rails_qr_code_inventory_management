require 'rails_helper'

RSpec.describe "StockTransactions", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location1) { create(:location, team: team, name: 'Warehouse A') }
  let(:location2) { create(:location, team: team, name: 'Warehouse B') }
  let(:item) { create(:item, team: team, location: location1, current_stock: 10) }

  before do
    sign_in user
  end

  # Shared examples for common transaction behavior
  shared_examples 'a transaction endpoint' do |transaction_type|
    let(:config) { StockTransaction.transaction_config(transaction_type) }
    
    context 'GET request' do
      it 'renders the transaction form' do
        get send("#{transaction_type}_team_stock_transactions_path", team)
        
        expect(response).to have_http_status(:ok)
        expect(assigns(:transaction_config)).to be_present
        expect(assigns(:transaction_config).type).to eq(transaction_type)
        expect(assigns(:transaction)).to be_a_new(StockTransaction)
      end
      
      it 'assigns correct transaction type to new record' do
        get send("#{transaction_type}_team_stock_transactions_path", team)
        
        expect(assigns(:transaction).transaction_type).to eq(transaction_type.to_s)
      end
    end
    
    context 'POST request' do
      it 'processes transaction successfully with valid data' do
        params = build_valid_params_for(transaction_type)
        
        expect {
          post send("#{transaction_type}_team_stock_transactions_path", team), 
               params: params, as: :json
        }.to change(StockTransaction, :count).by(params[:items].length)
        
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['success']).to be true
        expect(JSON.parse(response.body)['redirect_url']).to be_present
      end
      
      it 'returns error with invalid data' do
        params = { items: [] } # Empty items
        
        post send("#{transaction_type}_team_stock_transactions_path", team), 
             params: params, as: :json
        
        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)['error']).to be_present
      end
      
      it 'returns error when item not found' do
        params = build_valid_params_for(transaction_type)
        params[:items][0][:id] = 99999 # Non-existent item
        
        post send("#{transaction_type}_team_stock_transactions_path", team), 
             params: params, as: :json
        
        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)['error']).to include('not found')
      end
    end
  end

  # Shared examples for transactions requiring locations
  shared_examples 'a transaction requiring locations' do |transaction_type, location_requirements|
    context 'location validation' do
      location_requirements.each do |location_type|
        it "returns error when #{location_type} location is missing" do
          params = build_valid_params_for(transaction_type)
          params.delete("#{location_type}_location_id".to_sym)
          
          post send("#{transaction_type}_team_stock_transactions_path", team), 
               params: params, as: :json
          
          expect(response).to have_http_status(:unprocessable_entity)
          expect(JSON.parse(response.body)['error']).to include('location is required')
        end
        
        it "returns error when #{location_type} location doesn't belong to team" do
          other_team = create(:team)
          other_location = create(:location, team: other_team)
          params = build_valid_params_for(transaction_type)
          params["#{location_type}_location_id".to_sym] = other_location.id
          
          post send("#{transaction_type}_team_stock_transactions_path", team), 
               params: params, as: :json
          
          expect(response).to have_http_status(:not_found)
        end
      end
    end
  end

  # Shared examples for stock availability checks
  shared_examples 'a transaction with stock validation' do |transaction_type|
    it 'returns error when insufficient stock' do
      item.update!(current_stock: 1)
      params = build_valid_params_for(transaction_type)
      params[:items][0][:quantity] = 5 # More than available
      
      post send("#{transaction_type}_team_stock_transactions_path", team), 
           params: params, as: :json
      
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['error']).to include('Not enough stock')
    end
  end

  describe 'stock_in endpoint' do
    it_behaves_like 'a transaction endpoint', :stock_in
    it_behaves_like 'a transaction requiring locations', :stock_in, [:destination]
    
    it 'increases item stock' do
      initial_stock = item.current_stock
      params = build_valid_params_for(:stock_in)
      
      post stock_in_team_stock_transactions_path(team), params: params, as: :json
      
      item.reload
      expect(item.current_stock).to eq(initial_stock + params[:items][0][:quantity])
    end
    
    it 'creates transaction with correct attributes' do
      params = build_valid_params_for(:stock_in)
      
      post stock_in_team_stock_transactions_path(team), params: params, as: :json
      
      transaction = StockTransaction.last
      expect(transaction.transaction_type).to eq('stock_in')
      expect(transaction.quantity).to eq(params[:items][0][:quantity])
      expect(transaction.destination_location).to eq(location1)
      expect(transaction.source_location).to be_nil
      expect(transaction.notes).to eq(params[:notes])
    end
  end

  describe 'stock_out endpoint' do
    it_behaves_like 'a transaction endpoint', :stock_out
    it_behaves_like 'a transaction requiring locations', :stock_out, [:source]
    it_behaves_like 'a transaction with stock validation', :stock_out
    
    it 'decreases item stock' do
      initial_stock = item.current_stock
      params = build_valid_params_for(:stock_out)
      
      post stock_out_team_stock_transactions_path(team), params: params, as: :json
      
      item.reload
      expect(item.current_stock).to eq(initial_stock - params[:items][0][:quantity])
    end
    
    it 'creates transaction with negative quantity' do
      params = build_valid_params_for(:stock_out)
      
      post stock_out_team_stock_transactions_path(team), params: params, as: :json
      
      transaction = StockTransaction.last
      expect(transaction.transaction_type).to eq('stock_out')
      expect(transaction.quantity).to eq(-params[:items][0][:quantity])
      expect(transaction.source_location).to eq(location1)
      expect(transaction.destination_location).to be_nil
    end
  end

  describe 'adjust endpoint' do
    it_behaves_like 'a transaction endpoint', :adjust
    it_behaves_like 'a transaction requiring locations', :adjust, [:destination]
    
    it 'adjusts item stock to specified quantity' do
      target_stock = 15
      params = build_valid_params_for(:adjust)
      params[:items][0][:quantity] = target_stock
      
      post adjust_team_stock_transactions_path(team), params: params, as: :json
      
      item.reload
      expect(item.current_stock).to eq(target_stock)
    end
    
    it 'creates transaction with adjustment quantity' do
      initial_stock = item.current_stock
      target_stock = 15
      params = build_valid_params_for(:adjust)
      params[:items][0][:quantity] = target_stock
      
      post adjust_team_stock_transactions_path(team), params: params, as: :json
      
      transaction = StockTransaction.last
      expect(transaction.transaction_type).to eq('adjust')
      expect(transaction.quantity).to eq(target_stock - initial_stock)
    end
  end

  describe 'move endpoint' do
    it_behaves_like 'a transaction endpoint', :move
    it_behaves_like 'a transaction requiring locations', :move, [:source, :destination]
    it_behaves_like 'a transaction with stock validation', :move
    
    it 'moves stock between locations' do
      # Set up item stock at source location
      item.update!(location: location1)
      
      params = build_valid_params_for(:move)
      
      post move_team_stock_transactions_path(team), params: params, as: :json
      
      transaction = StockTransaction.last
      expect(transaction.transaction_type).to eq('move')
      expect(transaction.source_location).to eq(location1)
      expect(transaction.destination_location).to eq(location2)
    end
    
    it 'validates stock availability at source location' do
      # Mock stock_at_location method
      allow(item).to receive(:stock_at_location).with(location1.id).and_return(1)
      
      params = build_valid_params_for(:move)
      params[:items][0][:quantity] = 5 # More than available at source
      
      post move_team_stock_transactions_path(team), params: params, as: :json
      
      expect(response).to have_http_status(:unprocessable_entity)
      expect(JSON.parse(response.body)['error']).to include('Not enough stock')
    end
  end

  describe 'index endpoint' do
    let!(:transactions) { create_list(:stock_transaction, 3, team: team, item: item) }
    
    it 'returns paginated transactions' do
      get team_stock_transactions_path(team)
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:transactions)).to be_present
      expect(assigns(:transactions).count).to eq(3)
    end
    
    it 'includes associated records' do
      get team_stock_transactions_path(team)
      
      # Verify includes are working (no N+1 queries)
      expect(assigns(:transactions).first.association(:item)).to be_loaded
      expect(assigns(:transactions).first.association(:user)).to be_loaded
    end
    
    context 'CSV export' do
      it 'generates CSV file' do
        get team_stock_transactions_path(team, format: :csv)
        
        expect(response).to have_http_status(:ok)
        expect(response.content_type).to include('text/csv')
        expect(response.headers['Content-Disposition']).to include('attachment')
      end
    end
  end

  describe 'search endpoint' do
    let!(:searchable_item) { create(:item, team: team, name: 'Searchable Item', sku: 'SEARCH123') }
    
    it 'returns matching items by name' do
      get search_team_stock_transactions_path(team), params: { q: 'Searchable' }
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:items)).to include(searchable_item)
    end
    
    it 'returns matching items by SKU' do
      get search_team_stock_transactions_path(team), params: { q: 'SEARCH123' }
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:items)).to include(searchable_item)
    end
    
    it 'returns empty results for non-matching query' do
      get search_team_stock_transactions_path(team), params: { q: 'NonExistent' }
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:items)).to be_empty
    end
  end

  describe 'report endpoint' do
    let!(:low_stock_item) { create(:item, team: team, current_stock: 1, minimum_stock: 5) }
    let!(:zero_stock_item) { create(:item, team: team, current_stock: 0) }
    
    it 'calculates report statistics' do
      get report_team_stock_transactions_path(team)
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:total_items)).to be > 0
      expect(assigns(:low_stock_items)).to be >= 1
      expect(assigns(:zero_stock_items)).to be >= 1
    end
    
    it 'includes recent transactions' do
      create(:stock_transaction, team: team, item: item)
      
      get report_team_stock_transactions_path(team)
      
      expect(assigns(:recent_transactions)).to be_present
      expect(assigns(:recent_transactions).count).to be <= 5
    end
  end

  describe 'stock_by_location endpoint' do
    it 'shows stock levels by location' do
      get stock_by_location_team_stock_transactions_path(team)
      
      expect(response).to have_http_status(:ok)
      expect(assigns(:locations)).to be_present
      expect(assigns(:items)).to be_present
      expect(assigns(:stock_levels)).to be_present
    end
  end

  describe 'destroy endpoint' do
    let!(:transaction) { create(:stock_transaction, team: team, item: item) }
    
    it 'deletes transaction successfully' do
      expect {
        delete team_stock_transaction_path(team, transaction)
      }.to change(StockTransaction, :count).by(-1)
      
      expect(response).to redirect_to(team_stock_transactions_path(team))
      expect(flash[:notice]).to be_present
    end
    
    it 'handles deletion errors gracefully' do
      allow_any_instance_of(StockTransaction).to receive(:destroy).and_return(false)
      
      delete team_stock_transaction_path(team, transaction)
      
      expect(response).to redirect_to(team_stock_transactions_path(team))
      expect(flash[:alert]).to be_present
    end
  end

  describe 'webhook integration' do
    let!(:webhook) { create(:webhook, team: team, event: 'stock.updated') }
    
    it 'triggers webhook on successful transaction' do
      expect(WebhookService).to receive(:new).and_call_original
      allow_any_instance_of(WebhookService).to receive(:deliver)
      
      params = build_valid_params_for(:stock_in)
      post stock_in_team_stock_transactions_path(team), params: params, as: :json
    end
    
    it 'continues processing even if webhook fails' do
      allow(WebhookService).to receive(:new).and_raise(StandardError.new('Webhook error'))
      
      params = build_valid_params_for(:stock_in)
      
      expect {
        post stock_in_team_stock_transactions_path(team), params: params, as: :json
      }.to change(StockTransaction, :count).by(1)
      
      expect(response).to have_http_status(:ok)
    end
  end

  private

  def build_valid_params_for(transaction_type)
    case transaction_type
    when :stock_in
      {
        destination_location_id: location1.id,
        items: [{ id: item.id, quantity: 2 }],
        notes: 'Test transaction'
      }
    when :stock_out
      {
        source_location_id: location1.id,
        items: [{ id: item.id, quantity: 2 }],
        notes: 'Test transaction'
      }
    when :adjust
      {
        destination_location_id: location1.id,
        items: [{ id: item.id, quantity: 15 }],
        notes: 'Test adjustment'
      }
    when :move
      {
        source_location_id: location1.id,
        destination_location_id: location2.id,
        items: [{ id: item.id, quantity: 2 }],
        notes: 'Test move'
      }
    else
      raise ArgumentError, "Unknown transaction type: #{transaction_type}"
    end
  end
end
