# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'TransactionConfig Integration', type: :integration do
  let(:team) { create(:team) }
  let(:user) { create(:user, teams: [team]) }
  let(:location) { create(:location, team: team) }
  let(:item) { create(:item, team: team, location: location) }

  describe 'StockTransaction with TransactionConfig' do
    context 'stock_in transaction' do
      let(:transaction) do
        create(:stock_transaction, 
               transaction_type: 'stock_in',
               item: item,
               team: team,
               user: user,
               destination_location: location)
      end

      it 'provides correct configuration through config method' do
        config = transaction.config
        
        expect(config.type).to eq(:stock_in)
        expect(config.title).to eq('Stock In')
        expect(config.color).to eq('green')
        expect(config.requires_destination_location?).to be true
        expect(config.requires_source_location?).to be false
        expect(config.quantity_should_be_positive?).to be true
      end

      it 'provides correct CSS classes for UI' do
        config = transaction.config
        
        expect(config.css_color_class).to eq('text-green-600')
        expect(config.bg_color_class).to eq('bg-green-50')
        expect(config.button_color_class).to eq('bg-green-600 hover:bg-green-700')
      end
    end

    context 'stock_out transaction' do
      let(:transaction) do
        create(:stock_transaction, :stock_out,
               item: item,
               team: team,
               user: user,
               source_location: location)
      end

      it 'provides correct configuration through config method' do
        config = transaction.config
        
        expect(config.type).to eq(:stock_out)
        expect(config.title).to eq('Stock Out')
        expect(config.color).to eq('red')
        expect(config.requires_source_location?).to be true
        expect(config.requires_destination_location?).to be false
        expect(config.requires_stock_availability_check?).to be true
      end
    end

    context 'move transaction' do
      let(:source_location) { create(:location, team: team) }
      let(:destination_location) { create(:location, team: team) }
      let(:transaction) do
        create(:stock_transaction,
               transaction_type: 'move',
               item: item,
               team: team,
               user: user,
               source_location: source_location,
               destination_location: destination_location)
      end

      it 'provides correct configuration for dual-location transaction' do
        config = transaction.config
        
        expect(config.type).to eq(:move)
        expect(config.title).to eq('Move Stock')
        expect(config.requires_both_locations?).to be true
        expect(config.requires_single_location?).to be false
      end
    end

    context 'adjust transaction' do
      let(:transaction) do
        create(:stock_transaction,
               transaction_type: 'adjust',
               item: item,
               team: team,
               user: user,
               destination_location: location)
      end

      it 'provides correct configuration for adjustment transaction' do
        config = transaction.config
        
        expect(config.type).to eq(:adjust)
        expect(config.title).to eq('Adjust Stock')
        expect(config.requires_adjustment_calculation?).to be true
        expect(config.quantity_is_adjustment?).to be true
      end
    end
  end

  describe 'Class-level configuration access' do
    it 'allows accessing configuration without instance' do
      config = StockTransaction.transaction_config(:stock_in)
      
      expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
      expect(config.title).to eq('Stock In')
    end

    it 'provides list of available transaction types' do
      types = StockTransaction.available_transaction_types
      
      expect(types).to include(:stock_in, :stock_out, :adjust, :move, :count)
      expect(types.length).to eq(5)
    end

    it 'validates transaction types correctly' do
      expect(StockTransaction.valid_transaction_type?(:stock_in)).to be true
      expect(StockTransaction.valid_transaction_type?('stock_out')).to be true
      expect(StockTransaction.valid_transaction_type?(:invalid)).to be false
    end
  end

  describe 'JSON serialization for API usage' do
    it 'serializes configuration to JSON correctly' do
      config = StockTransaction.transaction_config(:stock_in)
      json = config.to_json
      parsed = JSON.parse(json)
      
      expect(parsed['type']).to eq('stock_in')
      expect(parsed['title']).to eq('Stock In')
      expect(parsed['color']).to eq('green')
      expect(parsed['locations']).to eq(['destination'])
      expect(parsed['validation_rules']).to eq(['positive_quantity'])
      expect(parsed['quantity_behavior']).to eq('positive')
    end

    it 'converts to hash for view helpers' do
      config = StockTransaction.transaction_config(:move)
      hash = config.to_h
      
      expect(hash[:type]).to eq(:move)
      expect(hash[:locations]).to eq([:source, :destination])
      expect(hash[:validation_rules]).to eq([:positive_quantity, :stock_availability])
    end
  end
end