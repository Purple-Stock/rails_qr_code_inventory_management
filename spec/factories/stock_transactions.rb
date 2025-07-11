FactoryBot.define do
  factory :stock_transaction do
    association :item
    team { item.team }
    user { team.user }
    transaction_type { 'stock_in' }
    quantity { 1 }
    destination_location { association :location, team: team }

    trait :stock_out do
      transaction_type { 'stock_out' }
      quantity { -1 }
      destination_location { nil }
      source_location { association :location, team: team }
    end

    trait :adjust do
      transaction_type { 'adjust' }
    end
  end
end
