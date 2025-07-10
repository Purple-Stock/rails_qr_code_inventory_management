require 'rails_helper'

RSpec.describe "PWA", type: :request do
  describe "GET /manifest" do
    it "returns the manifest" do
      get pwa_manifest_path(format: :json)
      expect(response).to have_http_status(:ok)
    end
  end
end
