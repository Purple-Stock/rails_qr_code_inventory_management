class ItemComponent < ApplicationRecord
  belongs_to :team
  belongs_to :kit_item, class_name: "Item"
  belongs_to :component_item, class_name: "Item"

  validates :quantity, presence: true, numericality: { greater_than: 0 }
  validate :kit_and_component_must_belong_to_same_team
  validate :kit_and_component_cannot_be_same

  private

  def kit_and_component_must_belong_to_same_team
    return if kit_item.blank? || component_item.blank? || team.blank?
    if kit_item.team_id != team_id || component_item.team_id != team_id
      errors.add(:base, "Kit and component must belong to the same team")
    end
  end

  def kit_and_component_cannot_be_same
    return if kit_item_id.blank? || component_item_id.blank?
    if kit_item_id == component_item_id
      errors.add(:component_item_id, "cannot be the same as kit item")
    end
  end
end

