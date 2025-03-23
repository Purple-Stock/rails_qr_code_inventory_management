class StockTransaction < ApplicationRecord
  paginates_per 25

  belongs_to :item
  belongs_to :team
  belongs_to :user

  validates :quantity, presence: true, numericality: true
  validates :transaction_type, presence: true
  
  # Define enum with proper PostgreSQL ENUM mapping
  enum :transaction_type, {
    stock_in: 'stock_in',
    stock_out: 'stock_out',
    adjust: 'adjust',
    move: 'move',
    count: 'count'
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