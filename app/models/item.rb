class Item < ApplicationRecord
  belongs_to :team
  has_many :stock_transactions, dependent: :destroy

  validates :name, presence: true
  validates :sku, presence: true, uniqueness: { scope: :team_id }
  validates :item_type, presence: true
  validates :initial_quantity, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :price, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :cost, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :barcode, uniqueness: true, allow_blank: true

  before_validation :generate_sku, on: :create, if: -> { sku.blank? }

  def current_stock
    stock_transactions.sum(:quantity)
  end

  def low_stock?
    current_stock <= minimum_stock && current_stock > 0
  end

  private

  def generate_sku
    return if name.blank?
    
    self.sku = name
      .split(/\s+/)
      .map { |word| word.first(3).upcase }
      .join('-')
  end
end 