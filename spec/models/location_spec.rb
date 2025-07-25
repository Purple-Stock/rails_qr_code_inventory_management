# == Schema Information
#
# Table name: locations
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  team_id     :bigint           not null
#
# Indexes
#
#  index_locations_on_team_id           (team_id)
#  index_locations_on_team_id_and_name  (team_id,name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (team_id => teams.id)
#
require 'rails_helper'

RSpec.describe Location, type: :model do
  describe 'associations' do
    it { should belong_to(:team) }
    it { should have_many(:items).dependent(:nullify) }
    it { should have_many(:source_transactions).class_name('StockTransaction').with_foreign_key('source_location_id') }
    it { should have_many(:destination_transactions).class_name('StockTransaction').with_foreign_key('destination_location_id') }
  end

  describe 'validations' do
    subject { build(:location) }

    it { should validate_presence_of(:name) }
    it { should validate_uniqueness_of(:name).scoped_to(:team_id).with_message("must be unique within the team") }
  end

  describe '.ordered' do
    it 'returns locations ordered by name' do
      l1 = create(:location, name: 'B')
      l2 = create(:location, name: 'A')
      expect(Location.where(id: [ l1.id, l2.id ]).ordered.to_a).to eq([ l2, l1 ])
    end
  end
end
