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
