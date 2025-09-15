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
  # Kit relationships
  has_many :kit_components, class_name: "ItemComponent", foreign_key: :kit_item_id, dependent: :destroy
  has_many :components, through: :kit_components, source: :component_item
  has_many :reverse_kit_components, class_name: "ItemComponent", foreign_key: :component_item_id, dependent: :destroy
  has_many :used_in_kits, through: :reverse_kit_components, source: :kit_item
  accepts_nested_attributes_for :kit_components, allow_destroy: true

  validates :name, presence: true
  validates :sku, presence: true, uniqueness: { scope: :team_id }
  validates :item_type, presence: true
  validates :price, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :cost, presence: true, numericality: { greater_than_or_equal_to: 0 }
  validates :barcode, uniqueness: true, allow_blank: true
  validate :location_belongs_to_team

  before_validation :generate_sku, on: :create, if: -> { sku.blank? }

  def current_stock
    # If this item is a kit (has components), derive stock from components
    if kit?
      return kit_available_stock
    end

    total = 0
    stock_transactions.each do |transaction|
      case transaction.transaction_type
      when "stock_in"
        total += transaction.quantity
      when "stock_out"
        total += transaction.quantity  # quantity is already negative for stock_out
      when "move"
        # Move transactions don't affect total stock
        next
      when "adjust"
        total += transaction.quantity
      end
    end
    total
  end

  def stock_at_location(location_id)
    total = 0

    stock_transactions.each do |transaction|
      case transaction.transaction_type
      when "stock_in"
        total += transaction.quantity if transaction.destination_location_id == location_id
      when "stock_out"
        total += transaction.quantity if transaction.source_location_id == location_id
      when "move"
        if transaction.source_location_id == location_id
          total -= transaction.quantity.abs # Subtract from source
        elsif transaction.destination_location_id == location_id
          total += transaction.quantity.abs # Add to destination
        end
      when "adjust"
        total += transaction.quantity if transaction.destination_location_id == location_id
      end
    end

    total
  end

  def low_stock?
    current_stock <= minimum_stock && current_stock > 0
  end

  private

  def location_belongs_to_team
    if location_id.present? && !team.locations.exists?(location_id)
      errors.add(:location_id, :must_belong_to_team)
    end
  end

  def generate_sku
    return if name.blank?

    self.sku = name
      .split(/\s+/)
      .map { |word| word.first(3).upcase }
      .join("-")
  end

  def kit?
    kit_components.any?
  end

  def kit_available_stock
    return 0 if kit_components.empty?

    # Minimum of (component current stock / required quantity) across all components
    kit_components.map do |kc|
      comp_stock = BigDecimal(kc.component_item.current_stock.to_s)
      req = BigDecimal(kc.quantity.to_s)
      next 0 if req <= 0
      (comp_stock / req).floor(2)
    end.min || 0
  end
end
