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
class StockTransaction < ApplicationRecord
  paginates_per 25

  belongs_to :item
  belongs_to :team
  belongs_to :user
  belongs_to :source_location, class_name: 'Location', optional: true
  belongs_to :destination_location, class_name: 'Location', optional: true

  validates :quantity, presence: true, numericality: true
  validates :transaction_type, presence: true
  
  # Define enum with proper PostgreSQL ENUM mapping
  enum :transaction_type, {
    'stock_in' => 'stock_in',
    'stock_out' => 'stock_out',
    'move' => 'move',
    'adjust' => 'adjust',
    'count' => 'count'
  }, prefix: true

  # Validate locations based on transaction type
  validates :source_location, presence: true, if: -> { transaction_type_move? || transaction_type_stock_out? }
  validates :destination_location, presence: true, if: -> { transaction_type_move? || transaction_type_stock_in? }
  validates :source_location, absence: true, if: -> { transaction_type_stock_in? }
  validates :destination_location, absence: true, if: -> { transaction_type_stock_out? }

  # Validate quantity based on transaction type
  validates :quantity, numericality: { greater_than: 0 }, if: :transaction_type_stock_in?
  validates :quantity, numericality: { less_than: 0 }, if: :transaction_type_stock_out?
end 
