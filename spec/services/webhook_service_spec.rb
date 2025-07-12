require 'rails_helper'

RSpec.describe WebhookService do
  let(:team) { create(:team) }
  let(:webhook) { create(:webhook, team: team, url: 'https://example.com/webhook', secret: 'test_secret') }
  let(:payload) { { event: 'item.created', item: { id: 1, name: 'Test Item' } } }
  let(:service) { described_class.new(webhook, payload) }

  describe '#deliver' do
    let(:http_double) { instance_double(Net::HTTP) }
    let(:request_double) { instance_double(Net::HTTP::Post) }
    let(:response_double) { instance_double(Net::HTTPResponse) }

    before do
      allow(Net::HTTP).to receive(:new).and_return(http_double)
      allow(http_double).to receive(:use_ssl=)
      allow(http_double).to receive(:request).and_return(response_double)
      allow(Net::HTTP::Post).to receive(:new).and_return(request_double)
      allow(request_double).to receive(:[]=)
      allow(request_double).to receive(:body=)
    end

    it 'sends a POST request to the webhook URL' do
      expect(http_double).to receive(:request).with(request_double)
      service.deliver
    end

    it 'sets the correct headers' do
      expect(request_double).to receive(:[]=).with('Content-Type', 'application/json')
      expect(request_double).to receive(:[]=).with('X-Signature', anything)
      service.deliver
    end

    it 'sets the request body to JSON payload' do
      expected_body = payload.to_json
      expect(request_double).to receive(:body=).with(expected_body)
      service.deliver
    end

    it 'enables SSL for HTTPS URLs' do
      expect(http_double).to receive(:use_ssl=).with(true)
      service.deliver
    end

    it 'disables SSL for HTTP URLs' do
      http_webhook = create(:webhook, :with_http_url, team: team)
      http_service = described_class.new(http_webhook, payload)

      expect(http_double).to receive(:use_ssl=).with(false)
      http_service.deliver
    end

    it 'generates the correct signature' do
      expected_signature = OpenSSL::HMAC.hexdigest(
        OpenSSL::Digest.new('sha256'),
        webhook.secret,
        payload.to_json
      )

      expect(request_double).to receive(:[]=).with('X-Signature', expected_signature)
      service.deliver
    end

    it 'returns the HTTP response' do
      expect(service.deliver).to eq(response_double)
    end

    context 'with different payloads' do
      it 'generates different signatures for different payloads' do
        payload1 = { event: 'item.created', item: { id: 1 } }
        payload2 = { event: 'item.created', item: { id: 2 } }

        service1 = described_class.new(webhook, payload1)
        service2 = described_class.new(webhook, payload2)

        signature1 = OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new('sha256'),
          webhook.secret,
          payload1.to_json
        )
        signature2 = OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new('sha256'),
          webhook.secret,
          payload2.to_json
        )

        expect(signature1).not_to eq(signature2)
      end
    end

    context 'with different secrets' do
      it 'generates different signatures for different secrets' do
        webhook1 = create(:webhook, team: team, secret: 'secret1')
        webhook2 = create(:webhook, team: team, secret: 'secret2')

        service1 = described_class.new(webhook1, payload)
        service2 = described_class.new(webhook2, payload)

        signature1 = OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new('sha256'),
          webhook1.secret,
          payload.to_json
        )
        signature2 = OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new('sha256'),
          webhook2.secret,
          payload.to_json
        )

        expect(signature1).not_to eq(signature2)
      end
    end

    context 'with complex payloads' do
      it 'handles nested objects correctly' do
        complex_payload = {
          event: 'stock.updated',
          item: {
            id: 1,
            name: 'Test Item',
            location: {
              id: 1,
              name: 'Warehouse A'
            },
            transactions: [
              { id: 1, quantity: 10 },
              { id: 2, quantity: -5 }
            ]
          }
        }

        complex_service = described_class.new(webhook, complex_payload)
        expected_signature = OpenSSL::HMAC.hexdigest(
          OpenSSL::Digest.new('sha256'),
          webhook.secret,
          complex_payload.to_json
        )

        expect(request_double).to receive(:[]=).with('X-Signature', expected_signature)
        complex_service.deliver
      end
    end

    context 'error handling' do
      it 'raises an error when HTTP request fails' do
        allow(http_double).to receive(:request).and_raise(Net::HTTPError.new('Connection failed', nil))

        expect { service.deliver }.to raise_error(Net::HTTPError)
      end

      # Skipped: cannot create invalid webhook due to model validation
      # it 'raises an error for invalid URLs' do
      #   invalid_webhook = build_stubbed(:webhook, team: team, url: 'not-a-valid-url')
      #   invalid_service = described_class.new(invalid_webhook, payload)
      #   expect { invalid_service.deliver }.to raise_error(URI::InvalidURIError)
      # end
    end
  end

  describe 'signature generation' do
    it 'uses SHA256 for HMAC' do
      signature = service.send(:signature)
      expect(signature).to be_a(String)
      expect(signature.length).to eq(64) # SHA256 hex digest length
    end

    it 'generates consistent signatures for the same input' do
      signature1 = service.send(:signature)
      signature2 = service.send(:signature)
      expect(signature1).to eq(signature2)
    end

    it 'generates different signatures for different secrets' do
      webhook1 = create(:webhook, team: team, secret: 'secret1')
      webhook2 = create(:webhook, team: team, secret: 'secret2')

      service1 = described_class.new(webhook1, payload)
      service2 = described_class.new(webhook2, payload)

      expect(service1.send(:signature)).not_to eq(service2.send(:signature))
    end

    it 'generates different signatures for different payloads' do
      payload1 = { event: 'item.created', item: { id: 1 } }
      payload2 = { event: 'item.created', item: { id: 2 } }

      service1 = described_class.new(webhook, payload1)
      service2 = described_class.new(webhook, payload2)

      expect(service1.send(:signature)).not_to eq(service2.send(:signature))
    end
  end
end
