# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TransactionConfig, type: :model do
  # Create a test class that includes the concern
  let(:test_class) do
    Class.new do
      include TransactionConfig
      attr_accessor :transaction_type
      
      def initialize(transaction_type)
        @transaction_type = transaction_type
      end
    end
  end

  describe 'TRANSACTION_CONFIGS constant' do
    it 'defines configurations for all transaction types' do
      expect(TransactionConfig::TRANSACTION_CONFIGS).to be_a(Hash)
      expect(TransactionConfig::TRANSACTION_CONFIGS).to be_frozen
      
      expected_types = [:stock_in, :stock_out, :adjust, :move, :count]
      expect(TransactionConfig::TRANSACTION_CONFIGS.keys).to match_array(expected_types)
    end

    it 'has complete configuration for each transaction type' do
      TransactionConfig::TRANSACTION_CONFIGS.each do |type, config|
        expect(config).to have_key(:title)
        expect(config).to have_key(:color)
        expect(config).to have_key(:locations)
        expect(config).to have_key(:validation_rules)
        expect(config).to have_key(:quantity_behavior)
        expect(config).to have_key(:description)
        expect(config).to be_frozen
      end
    end

    describe 'stock_in configuration' do
      let(:config) { TransactionConfig::TRANSACTION_CONFIGS[:stock_in] }

      it 'has correct configuration values' do
        expect(config[:title]).to eq('Stock In')
        expect(config[:color]).to eq('green')
        expect(config[:locations]).to eq([:destination])
        expect(config[:validation_rules]).to eq([:positive_quantity])
        expect(config[:quantity_behavior]).to eq(:positive)
        expect(config[:description]).to be_present
      end
    end

    describe 'stock_out configuration' do
      let(:config) { TransactionConfig::TRANSACTION_CONFIGS[:stock_out] }

      it 'has correct configuration values' do
        expect(config[:title]).to eq('Stock Out')
        expect(config[:color]).to eq('red')
        expect(config[:locations]).to eq([:source])
        expect(config[:validation_rules]).to eq([:negative_quantity, :stock_availability])
        expect(config[:quantity_behavior]).to eq(:negative)
        expect(config[:description]).to be_present
      end
    end

    describe 'adjust configuration' do
      let(:config) { TransactionConfig::TRANSACTION_CONFIGS[:adjust] }

      it 'has correct configuration values' do
        expect(config[:title]).to eq('Adjust Stock')
        expect(config[:color]).to eq('blue')
        expect(config[:locations]).to eq([:destination])
        expect(config[:validation_rules]).to eq([:adjustment_calculation])
        expect(config[:quantity_behavior]).to eq(:adjustment)
        expect(config[:description]).to be_present
      end
    end

    describe 'move configuration' do
      let(:config) { TransactionConfig::TRANSACTION_CONFIGS[:move] }

      it 'has correct configuration values' do
        expect(config[:title]).to eq('Move Stock')
        expect(config[:color]).to eq('purple')
        expect(config[:locations]).to eq([:source, :destination])
        expect(config[:validation_rules]).to eq([:positive_quantity, :stock_availability])
        expect(config[:quantity_behavior]).to eq(:positive)
        expect(config[:description]).to be_present
      end
    end

    describe 'count configuration' do
      let(:config) { TransactionConfig::TRANSACTION_CONFIGS[:count] }

      it 'has correct configuration values' do
        expect(config[:title]).to eq('Stock Count')
        expect(config[:color]).to eq('yellow')
        expect(config[:locations]).to eq([:destination])
        expect(config[:validation_rules]).to eq([:positive_quantity])
        expect(config[:quantity_behavior]).to eq(:positive)
        expect(config[:description]).to be_present
      end
    end
  end

  describe 'class methods' do
    describe '.transaction_config' do
      it 'returns a TransactionConfigStruct for valid transaction types' do
        config = test_class.transaction_config(:stock_in)
        expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
        expect(config.type).to eq(:stock_in)
        expect(config.title).to eq('Stock In')
      end

      it 'accepts string transaction types' do
        config = test_class.transaction_config('stock_out')
        expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
        expect(config.type).to eq(:stock_out)
      end

      it 'raises ArgumentError for invalid transaction types' do
        expect {
          test_class.transaction_config(:invalid_type)
        }.to raise_error(ArgumentError, 'Unknown transaction type: invalid_type')
      end
    end

    describe '.available_transaction_types' do
      it 'returns all available transaction types' do
        types = test_class.available_transaction_types
        expect(types).to match_array([:stock_in, :stock_out, :adjust, :move, :count])
      end
    end

    describe '.valid_transaction_type?' do
      it 'returns true for valid transaction types' do
        expect(test_class.valid_transaction_type?(:stock_in)).to be true
        expect(test_class.valid_transaction_type?('stock_out')).to be true
      end

      it 'returns false for invalid transaction types' do
        expect(test_class.valid_transaction_type?(:invalid)).to be false
        expect(test_class.valid_transaction_type?('invalid')).to be false
      end
    end
  end

  describe 'instance methods' do
    describe '#config' do
      it 'returns configuration for the instance transaction type' do
        instance = test_class.new('stock_in')
        config = instance.config
        
        expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
        expect(config.type).to eq(:stock_in)
        expect(config.title).to eq('Stock In')
      end
    end
  end

  describe TransactionConfig::TransactionConfigStruct do
    let(:stock_in_config) { test_class.transaction_config(:stock_in) }
    let(:stock_out_config) { test_class.transaction_config(:stock_out) }
    let(:move_config) { test_class.transaction_config(:move) }
    let(:adjust_config) { test_class.transaction_config(:adjust) }

    describe 'initialization' do
      it 'sets all attributes correctly' do
        expect(stock_in_config.type).to eq(:stock_in)
        expect(stock_in_config.title).to eq('Stock In')
        expect(stock_in_config.color).to eq('green')
        expect(stock_in_config.locations).to eq([:destination])
        expect(stock_in_config.validation_rules).to eq([:positive_quantity])
        expect(stock_in_config.quantity_behavior).to eq(:positive)
        expect(stock_in_config.description).to be_present
      end
    end

    describe 'location requirement helper methods' do
      describe '#requires_source_location?' do
        it 'returns true for transactions that require source location' do
          expect(stock_out_config.requires_source_location?).to be true
          expect(move_config.requires_source_location?).to be true
        end

        it 'returns false for transactions that do not require source location' do
          expect(stock_in_config.requires_source_location?).to be false
          expect(adjust_config.requires_source_location?).to be false
        end
      end

      describe '#requires_destination_location?' do
        it 'returns true for transactions that require destination location' do
          expect(stock_in_config.requires_destination_location?).to be true
          expect(move_config.requires_destination_location?).to be true
          expect(adjust_config.requires_destination_location?).to be true
        end

        it 'returns false for transactions that do not require destination location' do
          expect(stock_out_config.requires_destination_location?).to be false
        end
      end

      describe '#requires_both_locations?' do
        it 'returns true only for move transactions' do
          expect(move_config.requires_both_locations?).to be true
          expect(stock_in_config.requires_both_locations?).to be false
          expect(stock_out_config.requires_both_locations?).to be false
          expect(adjust_config.requires_both_locations?).to be false
        end
      end

      describe '#requires_single_location?' do
        it 'returns true for transactions that require only one location' do
          expect(stock_in_config.requires_single_location?).to be true
          expect(stock_out_config.requires_single_location?).to be true
          expect(adjust_config.requires_single_location?).to be true
        end

        it 'returns false for transactions that require multiple locations' do
          expect(move_config.requires_single_location?).to be false
        end
      end
    end

    describe 'validation rule helper methods' do
      describe '#requires_positive_quantity?' do
        it 'returns true for transactions that require positive quantities' do
          expect(stock_in_config.requires_positive_quantity?).to be true
          expect(move_config.requires_positive_quantity?).to be true
        end

        it 'returns false for transactions that do not require positive quantities' do
          expect(stock_out_config.requires_positive_quantity?).to be false
          expect(adjust_config.requires_positive_quantity?).to be false
        end
      end

      describe '#requires_negative_quantity?' do
        it 'returns true for stock_out transactions' do
          expect(stock_out_config.requires_negative_quantity?).to be true
        end

        it 'returns false for other transaction types' do
          expect(stock_in_config.requires_negative_quantity?).to be false
          expect(move_config.requires_negative_quantity?).to be false
          expect(adjust_config.requires_negative_quantity?).to be false
        end
      end

      describe '#requires_stock_availability_check?' do
        it 'returns true for transactions that need stock availability checks' do
          expect(stock_out_config.requires_stock_availability_check?).to be true
          expect(move_config.requires_stock_availability_check?).to be true
        end

        it 'returns false for transactions that do not need stock checks' do
          expect(stock_in_config.requires_stock_availability_check?).to be false
          expect(adjust_config.requires_stock_availability_check?).to be false
        end
      end

      describe '#requires_adjustment_calculation?' do
        it 'returns true for adjust transactions' do
          expect(adjust_config.requires_adjustment_calculation?).to be true
        end

        it 'returns false for other transaction types' do
          expect(stock_in_config.requires_adjustment_calculation?).to be false
          expect(stock_out_config.requires_adjustment_calculation?).to be false
          expect(move_config.requires_adjustment_calculation?).to be false
        end
      end
    end

    describe 'quantity behavior helper methods' do
      describe '#quantity_should_be_positive?' do
        it 'returns true for transactions with positive quantity behavior' do
          expect(stock_in_config.quantity_should_be_positive?).to be true
          expect(move_config.quantity_should_be_positive?).to be true
        end

        it 'returns false for transactions with other quantity behaviors' do
          expect(stock_out_config.quantity_should_be_positive?).to be false
          expect(adjust_config.quantity_should_be_positive?).to be false
        end
      end

      describe '#quantity_should_be_negative?' do
        it 'returns true for stock_out transactions' do
          expect(stock_out_config.quantity_should_be_negative?).to be true
        end

        it 'returns false for other transaction types' do
          expect(stock_in_config.quantity_should_be_negative?).to be false
          expect(move_config.quantity_should_be_negative?).to be false
          expect(adjust_config.quantity_should_be_negative?).to be false
        end
      end

      describe '#quantity_is_adjustment?' do
        it 'returns true for adjust transactions' do
          expect(adjust_config.quantity_is_adjustment?).to be true
        end

        it 'returns false for other transaction types' do
          expect(stock_in_config.quantity_is_adjustment?).to be false
          expect(stock_out_config.quantity_is_adjustment?).to be false
          expect(move_config.quantity_is_adjustment?).to be false
        end
      end
    end

    describe 'UI helper methods' do
      describe '#css_color_class' do
        it 'returns correct CSS color classes' do
          expect(stock_in_config.css_color_class).to eq('text-green-600')
          expect(stock_out_config.css_color_class).to eq('text-red-600')
          expect(adjust_config.css_color_class).to eq('text-blue-600')
          expect(move_config.css_color_class).to eq('text-purple-600')
        end
      end

      describe '#bg_color_class' do
        it 'returns correct background color classes' do
          expect(stock_in_config.bg_color_class).to eq('bg-green-50')
          expect(stock_out_config.bg_color_class).to eq('bg-red-50')
          expect(adjust_config.bg_color_class).to eq('bg-blue-50')
          expect(move_config.bg_color_class).to eq('bg-purple-50')
        end
      end

      describe '#border_color_class' do
        it 'returns correct border color classes' do
          expect(stock_in_config.border_color_class).to eq('border-green-200')
          expect(stock_out_config.border_color_class).to eq('border-red-200')
          expect(adjust_config.border_color_class).to eq('border-blue-200')
          expect(move_config.border_color_class).to eq('border-purple-200')
        end
      end

      describe '#button_color_class' do
        it 'returns correct button color classes' do
          expect(stock_in_config.button_color_class).to eq('bg-green-600 hover:bg-green-700')
          expect(stock_out_config.button_color_class).to eq('bg-red-600 hover:bg-red-700')
          expect(adjust_config.button_color_class).to eq('bg-blue-600 hover:bg-blue-700')
          expect(move_config.button_color_class).to eq('bg-purple-600 hover:bg-purple-700')
        end
      end
    end

    describe 'serialization methods' do
      describe '#to_h' do
        it 'returns a hash representation of the configuration' do
          hash = stock_in_config.to_h
          
          expect(hash).to be_a(Hash)
          expect(hash[:type]).to eq(:stock_in)
          expect(hash[:title]).to eq('Stock In')
          expect(hash[:color]).to eq('green')
          expect(hash[:locations]).to eq([:destination])
          expect(hash[:validation_rules]).to eq([:positive_quantity])
          expect(hash[:quantity_behavior]).to eq(:positive)
          expect(hash[:description]).to be_present
        end
      end

      describe '#to_json' do
        it 'returns a JSON representation of the configuration' do
          json = stock_in_config.to_json
          parsed = JSON.parse(json)
          
          expect(parsed['type']).to eq('stock_in')
          expect(parsed['title']).to eq('Stock In')
          expect(parsed['color']).to eq('green')
          expect(parsed['locations']).to eq(['destination'])
          expect(parsed['validation_rules']).to eq(['positive_quantity'])
          expect(parsed['quantity_behavior']).to eq('positive')
          expect(parsed['description']).to be_present
        end
      end
    end
  end
end