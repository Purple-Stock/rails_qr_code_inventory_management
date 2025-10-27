# == Schema Information
#
# Table name: items
#
#  id               :bigint           not null, primary key
#  barcode          :string
#  brand            :string
#  cost             :decimal(10, 2)
#  current_stock    :decimal(10, 2)   default(0.0)
#  initial_quantity :integer          default(0)
#  item_type        :string
#  minimum_stock    :decimal(10, 2)   default(0.0)
#  name             :string
#  price            :decimal(10, 2)
#  sku              :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  location_id      :bigint
#  team_id          :bigint           not null
#
# Indexes
#
#  index_items_on_barcode      (barcode)
#  index_items_on_location_id  (location_id)
#  index_items_on_sku          (sku)
#  index_items_on_team_id      (team_id)
#
# Foreign Keys
#
#  fk_rails_...  (location_id => locations.id)
#  fk_rails_...  (team_id => teams.id)
#
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

    describe 'barcode' do
      it 'generates automatically when blank' do
        item = build(:item, barcode: nil)
        expect(item.barcode).to be_nil
        item.valid?
        expect(item.barcode).to be_present
      end

      it 'must be unique' do
        team = create(:team)
        location = create(:location, team: team)
        create(:item, team: team, location: location, barcode: '1234567890123')
        duplicate = build(:item, team: team, location: location, barcode: '1234567890123')
        expect(duplicate).not_to be_valid
      end
    end

    it { should validate_numericality_of(:price).is_greater_than_or_equal_to(0).allow_nil }
    it { should validate_numericality_of(:cost).is_greater_than_or_equal_to(0).allow_nil }
    it { should validate_uniqueness_of(:sku).scoped_to(:team_id).allow_blank }
  end

  describe 'location validation' do
    it 'is invalid if location belongs to another team' do
      team1 = create(:team)
      team2 = create(:team)
      location = create(:location, team: team2)
      item = build(:item, team: team1, location: location)
      expect(item).not_to be_valid
      expect(item.errors[:location_id]).to be_present
    end
  end

  describe '#current_stock' do
    it 'calculates the sum of transaction quantities' do
      team = create(:team)
      location = create(:location, team: team)
      item = create(:item, team: team, location: location, initial_quantity: 0)
      create(:stock_transaction, item: item, team: team, user: team.user, quantity: 10, destination_location: location)
      create(:stock_transaction, :stock_out, item: item, team: team, user: team.user, source_location: location)
      create(:stock_transaction, :adjust, item: item, team: team, user: team.user, quantity: 3, destination_location: location)
      expect(item.current_stock).to eq(12)
    end
  end
end
