require 'rails_helper'

RSpec.describe Team, type: :model do
  describe 'associations' do
    it { should belong_to(:user) }
    it { should have_many(:items).dependent(:destroy) }
  end

  describe 'validations' do
    it { should validate_presence_of(:name) }
  end

  describe 'factory' do
    it 'has a valid factory' do
      expect(build(:team)).to be_valid
    end
  end
end 