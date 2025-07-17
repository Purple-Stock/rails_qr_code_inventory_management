# == Schema Information
#
# Table name: stock_transactions
#
#  id                      :bigint           not null, primary key
#  notes                   :text
#  quantity                :decimal(10, 2)   not null
#  transaction_type        :enum             not null
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  destination_location_id :bigint
#  item_id                 :bigint           not null
#  source_location_id      :bigint
#  team_id                 :bigint           not null
#  user_id                 :bigint           not null
#
# Indexes
#
#  index_stock_transactions_on_destination_location_id  (destination_location_id)
#  index_stock_transactions_on_item_id                  (item_id)
#  index_stock_transactions_on_item_id_and_created_at   (item_id,created_at)
#  index_stock_transactions_on_source_location_id       (source_location_id)
#  index_stock_transactions_on_team_id                  (team_id)
#  index_stock_transactions_on_transaction_type         (transaction_type)
#  index_stock_transactions_on_user_id                  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (destination_location_id => locations.id)
#  fk_rails_...  (item_id => items.id)
#  fk_rails_...  (source_location_id => locations.id)
#  fk_rails_...  (team_id => teams.id)
#  fk_rails_...  (user_id => users.id)
#
require 'rails_helper'

RSpec.describe StockTransaction, type: :model do
  describe 'TransactionConfig concern' do
    it 'includes TransactionConfig module' do
      expect(StockTransaction.included_modules).to include(TransactionConfig)
    end

    describe 'class methods' do
      it 'responds to transaction_config' do
        expect(StockTransaction).to respond_to(:transaction_config)
      end

      it 'responds to available_transaction_types' do
        expect(StockTransaction).to respond_to(:available_transaction_types)
      end

      it 'responds to valid_transaction_type?' do
        expect(StockTransaction).to respond_to(:valid_transaction_type?)
      end

      it 'returns correct configuration for transaction types' do
        config = StockTransaction.transaction_config(:stock_in)
        expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
        expect(config.title).to eq('Stock In')
        expect(config.color).to eq('green')
      end
    end

    describe 'instance methods' do
      let(:transaction) { build(:stock_transaction, transaction_type: 'stock_in') }

      it 'responds to config' do
        expect(transaction).to respond_to(:config)
      end

      it 'returns configuration for the transaction type' do
        config = transaction.config
        expect(config).to be_a(TransactionConfig::TransactionConfigStruct)
        expect(config.type).to eq(:stock_in)
        expect(config.title).to eq('Stock In')
      end

      context 'with different transaction types' do
        it 'returns correct config for stock_out' do
          transaction.transaction_type = 'stock_out'
          config = transaction.config
          expect(config.type).to eq(:stock_out)
          expect(config.title).to eq('Stock Out')
          expect(config.requires_source_location?).to be true
          expect(config.requires_destination_location?).to be false
        end

        it 'returns correct config for move' do
          transaction.transaction_type = 'move'
          config = transaction.config
          expect(config.type).to eq(:move)
          expect(config.title).to eq('Move Stock')
          expect(config.requires_both_locations?).to be true
        end

        it 'returns correct config for adjust' do
          transaction.transaction_type = 'adjust'
          config = transaction.config
          expect(config.type).to eq(:adjust)
          expect(config.title).to eq('Adjust Stock')
          expect(config.requires_adjustment_calculation?).to be true
        end
      end
    end
  end

  describe 'associations' do
    it { should belong_to(:item) }
    it { should belong_to(:team) }
    it { should belong_to(:user) }
    it { should belong_to(:source_location).class_name('Location').optional }
    it { should belong_to(:destination_location).class_name('Location').optional }
  end

  describe 'validations' do
    subject { build(:stock_transaction) }

    it { should validate_presence_of(:quantity) }
    it { should validate_presence_of(:transaction_type) }
  end

  context 'stock_in' do
    let(:transaction) { build(:stock_transaction) }

    it 'requires destination_location' do
      transaction.destination_location = nil
      expect(transaction).not_to be_valid
    end
  end

  context 'stock_out' do
    let(:transaction) { build(:stock_transaction, :stock_out) }

    it 'requires source_location' do
      transaction.source_location = nil
      expect(transaction).not_to be_valid
    end

    it 'requires negative quantity' do
      transaction.quantity = 1
      expect(transaction).not_to be_valid
    end
  end
end
