# == Schema Information
#
# Table name: items
#
#  id               :bigint           not null, primary key
#  barcode          :string
#  brand            :string
#  cost             :decimal(10, 2)
#  current_stock    :decimal(10, 2)   default(0.0)
#  initial_quantity :integer          default(0)
#  item_type        :string
#  minimum_stock    :decimal(10, 2)   default(0.0)
#  name             :string
#  price            :decimal(10, 2)
#  sku              :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  location_id      :bigint
#  team_id          :bigint           not null
#
# Indexes
#
#  index_items_on_barcode      (barcode)
#  index_items_on_location_id  (location_id)
#  index_items_on_sku          (sku)
#  index_items_on_team_id      (team_id)
#
# Foreign Keys
#
#  fk_rails_...  (location_id => locations.id)
#  fk_rails_...  (team_id => teams.id)
#
FactoryBot.define do
  factory :item do
    association :team
    association :location
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
