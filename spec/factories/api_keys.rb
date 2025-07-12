FactoryBot.define do
  factory :api_key do
    association :user
    token { SecureRandom.hex(16) }
  end
end
