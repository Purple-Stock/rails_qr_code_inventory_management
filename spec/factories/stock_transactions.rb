# == Schema Information
#
# Table name: stock_transactions
#
#  id                      :bigint           not null, primary key
#  notes                   :text
#  quantity                :decimal(10, 2)   not null
#  transaction_type        :enum             not null
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  destination_location_id :bigint
#  item_id                 :bigint           not null
#  source_location_id      :bigint
#  team_id                 :bigint           not null
#  user_id                 :bigint           not null
#
# Indexes
#
#  index_stock_transactions_on_destination_location_id  (destination_location_id)
#  index_stock_transactions_on_item_id                  (item_id)
#  index_stock_transactions_on_item_id_and_created_at   (item_id,created_at)
#  index_stock_transactions_on_source_location_id       (source_location_id)
#  index_stock_transactions_on_team_id                  (team_id)
#  index_stock_transactions_on_transaction_type         (transaction_type)
#  index_stock_transactions_on_user_id                  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (destination_location_id => locations.id)
#  fk_rails_...  (item_id => items.id)
#  fk_rails_...  (source_location_id => locations.id)
#  fk_rails_...  (team_id => teams.id)
#  fk_rails_...  (user_id => users.id)
#
FactoryBot.define do
  factory :stock_transaction do
    association :item
    team { item.team }
    user { team.user }
    transaction_type { 'stock_in' }
    quantity { 1 }
    association :destination_location, factory: :location

    trait :stock_out do
      transaction_type { 'stock_out' }
      quantity { -1 }
      destination_location { nil }
      association :source_location, factory: :location
    end

    trait :adjust do
      transaction_type { 'adjust' }
    end
  end
end
