require "openssl"
require "net/http"

class WebhookService
  def initialize(webhook, payload)
    @webhook = webhook
    @payload = payload
  end

  def deliver
    uri = URI.parse(@webhook.url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = uri.scheme == "https"

    request = Net::HTTP::Post.new(uri.request_uri)
    request["Content-Type"] = "application/json"
    request["X-Signature"] = signature
    request.body = @payload.to_json

    http.request(request)
  end

  private

  def signature
    OpenSSL::HMAC.hexdigest(OpenSSL::Digest.new("sha256"), @webhook.secret, @payload.to_json)
  end
end
