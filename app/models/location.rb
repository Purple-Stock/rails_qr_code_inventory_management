# == Schema Information
#
# Table name: locations
#
#  id          :bigint           not null, primary key
#  description :text
#  name        :string           not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  team_id     :bigint           not null
#
# Indexes
#
#  index_locations_on_team_id           (team_id)
#  index_locations_on_team_id_and_name  (team_id,name) UNIQUE
#
# Foreign Keys
#
#  fk_rails_...  (team_id => teams.id)
#
class Location < ApplicationRecord
  belongs_to :team

  has_many :items, dependent: :nullify
  has_many :source_transactions, class_name: "StockTransaction", foreign_key: "source_location_id"
  has_many :destination_transactions, class_name: "StockTransaction", foreign_key: "destination_location_id"

  validates :name, presence: true
  validates :name, uniqueness: { scope: :team_id, message: "must be unique within the team" }

  scope :ordered, -> { order(name: :asc) }
end
