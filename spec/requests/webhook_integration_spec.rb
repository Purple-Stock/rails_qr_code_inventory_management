require 'rails_helper'

RSpec.describe "Webhook Integration", type: :request do
  let(:user) { create(:user) }
  let(:team) { create(:team, user: user) }
  let(:location) { create(:location, team: team) }
  let(:item) { create(:item, team: team, location: location) }

  before do
    sign_in user
  end

  describe "webhook triggering on item creation" do
    let!(:webhook) { create(:webhook, :item_created, team: team) }
    let(:webhook_service_double) { instance_double(WebhookService) }

    before do
      allow(WebhookService).to receive(:new).and_return(webhook_service_double)
      allow(webhook_service_double).to receive(:deliver)
    end

    it "triggers webhook when item is created" do
      item_attributes = {
        item: {
          sku: 'TEST-001',
          name: 'Test Item',
          barcode: '123456789',
          cost: 10.0,
          price: 20.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      post team_items_path(team), params: item_attributes

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'item.created', item: kind_of(Hash) }
      )
      expect(webhook_service_double).to have_received(:deliver)
    end

    it "does not trigger webhook for other events" do
      other_webhook = create(:webhook, :stock_updated, team: team)

      item_attributes = {
        item: {
          sku: 'TEST-002',
          name: 'Test Item 2',
          barcode: '987654321',
          cost: 15.0,
          price: 30.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      post team_items_path(team), params: item_attributes

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'item.created', item: kind_of(Hash) }
      )
      expect(WebhookService).not_to have_received(:new).with(
        other_webhook,
        anything
      )
    end

    it "triggers multiple webhooks for the same event" do
      webhook2 = create(:webhook, :item_created, team: team, url: 'https://example2.com/webhook')

      item_attributes = {
        item: {
          sku: 'TEST-003',
          name: 'Test Item 3',
          barcode: '111222333',
          cost: 25.0,
          price: 50.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      post team_items_path(team), params: item_attributes

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'item.created', item: kind_of(Hash) }
      )
      expect(WebhookService).to have_received(:new).with(
        webhook2,
        { event: 'item.created', item: kind_of(Hash) }
      )
      expect(webhook_service_double).to have_received(:deliver).twice
    end

    it "does not trigger webhooks from other teams" do
      other_team = create(:team)
      other_webhook = create(:webhook, :item_created, team: other_team)

      item_attributes = {
        item: {
          sku: 'TEST-004',
          name: 'Test Item 4',
          barcode: '444555666',
          cost: 30.0,
          price: 60.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      post team_items_path(team), params: item_attributes

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'item.created', item: kind_of(Hash) }
      )
      expect(WebhookService).not_to have_received(:new).with(
        other_webhook,
        anything
      )
    end
  end

  describe "webhook triggering on stock transactions" do
    let!(:webhook) { create(:webhook, :stock_updated, team: team) }
    let(:webhook_service_double) { instance_double(WebhookService) }

    before do
      allow(WebhookService).to receive(:new).and_return(webhook_service_double)
      allow(webhook_service_double).to receive(:deliver)
    end

    context "stock in transaction" do
      it "triggers webhook when stock is added" do
        stock_in_params = {
          location: location.id,
          items: [ { id: item.id, quantity: 10 } ],
          notes: 'Stock in test'
        }

        post stock_in_team_stock_transactions_path(team), params: stock_in_params

        expect(WebhookService).to have_received(:new).with(
          webhook,
          { event: 'stock.updated', item: kind_of(Hash) }
        )
        expect(webhook_service_double).to have_received(:deliver)
      end
    end

    context "stock out transaction" do
      before do
        # Add some stock first
        create(:stock_transaction,
          team: team,
          item: item,
          transaction_type: 'stock_in',
          quantity: 20,
          destination_location: location,
          user: user
        )
      end

      it "triggers webhook when stock is removed" do
        stock_out_params = {
          location: location.id,
          items: [ { id: item.id, quantity: 5 } ],
          notes: 'Stock out test'
        }

        post stock_out_team_stock_transactions_path(team), params: stock_out_params

        expect(WebhookService).to have_received(:new).with(
          webhook,
          { event: 'stock.updated', item: kind_of(Hash) }
        )
        expect(webhook_service_double).to have_received(:deliver)
      end
    end

    context "stock adjustment transaction" do
      it "triggers webhook when stock is adjusted" do
        adjustment_params = {
          location: location.id,
          items: [ { id: item.id, quantity: 15 } ],
          notes: 'Stock adjustment test'
        }

        post adjust_team_stock_transactions_path(team), params: adjustment_params

        expect(WebhookService).to have_received(:new).with(
          webhook,
          { event: 'stock.updated', item: kind_of(Hash) }
        )
        expect(webhook_service_double).to have_received(:deliver)
      end
    end

    context "stock move transaction" do
      let(:destination_location) { create(:location, team: team, name: 'Warehouse B') }

      before do
        # Add some stock first
        create(:stock_transaction,
          team: team,
          item: item,
          transaction_type: 'stock_in',
          quantity: 20,
          destination_location: location,
          user: user
        )
      end

      it "triggers webhook when stock is moved" do
        move_params = {
          source_location_id: location.id,
          destination_location_id: destination_location.id,
          items: [ { id: item.id, quantity: 10 } ],
          notes: 'Stock move test'
        }

        post move_team_stock_transactions_path(team), params: move_params

        expect(WebhookService).to have_received(:new).with(
          webhook,
          { event: 'stock.updated', item: kind_of(Hash) }
        )
        expect(webhook_service_double).to have_received(:deliver)
      end
    end

    it "triggers webhook for each item in batch operations" do
      item2 = create(:item, team: team, location: location)

      stock_in_params = {
        location: location.id,
        items: [
          { id: item.id, quantity: 10 },
          { id: item2.id, quantity: 15 }
        ],
        notes: 'Batch stock in test'
      }

      post stock_in_team_stock_transactions_path(team), params: stock_in_params

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'stock.updated', item: kind_of(Hash) }
      ).twice
      expect(webhook_service_double).to have_received(:deliver).twice
    end

    it "does not trigger webhooks for other events" do
      other_webhook = create(:webhook, :item_created, team: team)

      stock_in_params = {
        location: location.id,
        items: [ { id: item.id, quantity: 10 } ],
        notes: 'Stock in test'
      }

      post stock_in_team_stock_transactions_path(team), params: stock_in_params

      expect(WebhookService).to have_received(:new).with(
        webhook,
        { event: 'stock.updated', item: kind_of(Hash) }
      )
      expect(WebhookService).not_to have_received(:new).with(
        other_webhook,
        anything
      )
    end
  end

  describe "webhook payload content" do
    let!(:webhook) { create(:webhook, :item_created, team: team) }
    let(:webhook_service_double) { instance_double(WebhookService) }

    before do
      allow(WebhookService).to receive(:new).and_return(webhook_service_double)
      allow(webhook_service_double).to receive(:deliver)
    end

    it "includes correct event and item data in payload" do
      item_attributes = {
        item: {
          sku: 'TEST-PAYLOAD',
          name: 'Payload Test Item',
          barcode: '999888777',
          cost: 40.0,
          price: 80.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      post team_items_path(team), params: item_attributes

      expect(WebhookService).to have_received(:new) do |webhook_arg, payload|
        expect(payload[:event]).to eq('item.created')
        expect(payload[:item]).to include(
          'sku' => 'TEST-PAYLOAD',
          'name' => 'Payload Test Item',
          'barcode' => '999888777',
          'cost' => '40.0',
          'price' => '80.0',
          'item_type' => 'Electronics',
          'brand' => 'Test Brand'
        )
        expect(payload[:item]).to have_key('id')
        expect(payload[:item]).to have_key('created_at')
        expect(payload[:item]).to have_key('updated_at')
      end
    end

    it "includes correct stock data in stock update payload" do
      # Create a webhook for stock updates
      stock_webhook = create(:webhook, :stock_updated, team: team)
      
      stock_in_params = {
        location: location.id,
        items: [ { id: item.id, quantity: 25 } ],
        notes: 'Stock payload test'
      }

      post stock_in_team_stock_transactions_path(team), params: stock_in_params

      expect(WebhookService).to have_received(:new) do |webhook_arg, payload|
        expect(payload[:event]).to eq('stock.updated')
        expect(payload[:item]).to include(
          'id' => item.id,
          'name' => item.name,
          'sku' => item.sku,
          'current_stock' => '25.0'
        )
        expect(payload[:item]).to have_key('created_at')
        expect(payload[:item]).to have_key('updated_at')
      end
    end
  end

  describe "webhook error handling" do
    let!(:webhook) { create(:webhook, :item_created, team: team) }

    it "continues processing when webhook delivery fails" do
      allow(WebhookService).to receive(:new).and_raise(Net::HTTPError.new('Connection failed', nil))

      item_attributes = {
        item: {
          sku: 'TEST-ERROR',
          name: 'Error Test Item',
          barcode: '111000222',
          cost: 50.0,
          price: 100.0,
          item_type: 'Electronics',
          brand: 'Test Brand',
          location_id: location.id
        }
      }

      # Should not raise an error and should still create the item
      expect {
        post team_items_path(team), params: item_attributes
      }.not_to raise_error

      expect(Item.last.sku).to eq('TEST-ERROR')
    end
  end
end
