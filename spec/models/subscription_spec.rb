require 'rails_helper'

RSpec.describe Subscription, type: :model do
  describe 'associations' do
    it { should belong_to(:team) }
  end

  describe 'validations' do
    it { should validate_presence_of(:plan) }
  end

  describe 'factory' do
    it 'has a valid factory' do
      expect(build(:subscription)).to be_valid
    end
  end
end
