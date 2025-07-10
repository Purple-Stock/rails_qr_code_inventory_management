FactoryBot.define do
  factory :location do
    association :team
    sequence(:name) { |n| "Location #{n}" }
    description { "Test location" }
  end
end
