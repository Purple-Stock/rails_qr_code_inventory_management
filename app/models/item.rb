class Item < ApplicationRecord
  belongs_to :team
  validates :name, presence: true
  validates :sku, presence: true, uniqueness: { scope: :team_id }
  validates :category, presence: true
  validates :quantity, presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :unit_price, presence: true, numericality: { greater_than_or_equal_to: 0 }
end 