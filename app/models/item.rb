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
class Item < ApplicationRecord
  belongs_to :team
  belongs_to :location, optional: true
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
