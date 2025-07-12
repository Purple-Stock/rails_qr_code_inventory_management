require 'rails_helper'

RSpec.describe Webhook, type: :model do
  describe 'associations' do
    it { should belong_to(:team) }
  end

  describe 'validations' do
    it { should validate_presence_of(:url) }
    it { should validate_presence_of(:event) }

    describe 'url format validation' do
      let(:webhook) { build(:webhook) }

      it 'is valid with a proper URL' do
        webhook.url = 'https://example.com/webhook'
        expect(webhook).to be_valid
      end

      it 'is valid with an HTTP URL' do
        webhook.url = 'http://localhost:3000/webhook'
        expect(webhook).to be_valid
      end

      it 'is invalid with an invalid URL' do
        webhook.url = 'not-a-url'
        expect(webhook).not_to be_valid
        expect(webhook.errors[:url]).to include('is invalid')
      end

      it 'is invalid with an empty URL' do
        webhook.url = ''
        expect(webhook).not_to be_valid
        expect(webhook.errors[:url]).to include("can't be blank")
      end

      it 'is invalid with a nil URL' do
        webhook.url = nil
        expect(webhook).not_to be_valid
        expect(webhook.errors[:url]).to include("can't be blank")
      end
    end

    describe 'event validation' do
      let(:webhook) { build(:webhook) }

      it 'is invalid with an empty event' do
        webhook.event = ''
        expect(webhook).not_to be_valid
        expect(webhook.errors[:event]).to include("can't be blank")
      end

      it 'is invalid with a nil event' do
        webhook.event = nil
        expect(webhook).not_to be_valid
        expect(webhook.errors[:event]).to include("can't be blank")
      end
    end
  end

  describe 'factory' do
    it 'has a valid factory' do
      expect(build(:webhook)).to be_valid
    end

    it 'has a valid factory with stock_updated trait' do
      expect(build(:webhook, :stock_updated)).to be_valid
    end

    it 'has a valid factory with item_created trait' do
      expect(build(:webhook, :item_created)).to be_valid
    end
  end

  describe 'scopes' do
    let(:team) { create(:team) }
    let!(:item_created_webhook) { create(:webhook, :item_created, team: team) }
    let!(:stock_updated_webhook) { create(:webhook, :stock_updated, team: team) }

    describe '.where(event: event)' do
      it 'filters webhooks by event' do
        expect(team.webhooks.where(event: 'item.created')).to contain_exactly(item_created_webhook)
        expect(team.webhooks.where(event: 'stock.updated')).to contain_exactly(stock_updated_webhook)
      end
    end
  end
end
