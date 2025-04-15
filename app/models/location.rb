class Location < ApplicationRecord
  belongs_to :team
  
  has_many :items_as_source, class_name: 'StockTransaction', foreign_key: 'source_location_id'
  has_many :items_as_destination, class_name: 'StockTransaction', foreign_key: 'destination_location_id'
  
  validates :name, presence: true
  validates :name, uniqueness: { scope: :team_id, message: "must be unique within the team" }
  
  scope :ordered, -> { order(name: :asc) }
end 