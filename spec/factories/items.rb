FactoryBot.define do
  factory :item do
    association :team
    association :location, factory: :location, team: team
    sequence(:name) { |n| "Item #{n}" }
    sequence(:sku) { |n| "SKU#{n}" }
    sequence(:barcode) { |n| "BC#{n}" }
    cost { 1.0 }
    price { 2.0 }
    item_type { 'Type' }
    brand { 'Brand' }
    initial_quantity { 1 }
  end
end
