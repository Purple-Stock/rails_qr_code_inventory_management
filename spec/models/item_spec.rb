require 'rails_helper'

RSpec.describe Item, type: :model do
  describe 'associations' do
    it { should belong_to(:team) }
    it { should belong_to(:location).optional }
    it { should have_many(:stock_transactions).dependent(:destroy) }
  end

  describe 'validations' do
    subject { build(:item) }

    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:sku) }
    it { should validate_uniqueness_of(:sku).scoped_to(:team_id) }
    it { should validate_presence_of(:item_type) }
    it { should validate_presence_of(:initial_quantity) }
    it { should validate_numericality_of(:initial_quantity).is_greater_than_or_equal_to(0) }
    it { should validate_presence_of(:price) }
    it { should validate_numericality_of(:price).is_greater_than_or_equal_to(0) }
    it { should validate_presence_of(:cost) }
    it { should validate_numericality_of(:cost).is_greater_than_or_equal_to(0) }
  end

  describe 'location validation' do
    it 'is invalid if location belongs to another team' do
      other_team = create(:team)
      item = build(:item, team: create(:team), location: create(:location, team: other_team))
      expect(item).not_to be_valid
      expect(item.errors[:location_id]).to be_present
    end
  end

  describe '#current_stock' do
    it 'calculates the sum of transaction quantities' do
      item = create(:item, initial_quantity: 0)
      loc = item.location
      create(:stock_transaction, item: item, team: item.team, user: item.team.user, quantity: 10, destination_location: loc)
      create(:stock_transaction, :stock_out, item: item, team: item.team, user: item.team.user, source_location: loc)
      create(:stock_transaction, :adjust, item: item, team: item.team, user: item.team.user, quantity: 3, destination_location: loc)
      expect(item.current_stock).to eq(12)
    end
  end
end
