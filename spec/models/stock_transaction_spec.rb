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
