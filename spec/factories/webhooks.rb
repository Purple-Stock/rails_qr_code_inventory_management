# == Schema Information
#
# Table name: webhooks
#
#  id         :bigint           not null, primary key
#  url        :string
#  event      :string
#  secret     :string
#  team_id    :bigint           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
# Indexes
#
#  index_webhooks_on_team_id  (team_id)
#
# Foreign Keys
#
#  fk_rails_...  (team_id => teams.id)
#
FactoryBot.define do
  factory :webhook do
    sequence(:url) { |n| "https://example.com/webhook#{n}" }
    event { "item.created" }
    secret { "secret_key_123" }
    association :team
  end

  trait :stock_updated do
    event { "stock.updated" }
  end

  trait :item_created do
    event { "item.created" }
  end

  trait :with_https_url do
    url { "https://api.example.com/webhooks/inventory" }
  end

  trait :with_http_url do
    url { "http://localhost:3000/webhook" }
  end

  trait :with_long_secret do
    secret { "very_long_secret_key_for_hmac_signature_generation_123456789" }
  end
end
