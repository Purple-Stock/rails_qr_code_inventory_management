class Team < ApplicationRecord
  belongs_to :user
  has_many :items, dependent: :destroy
  validates :name, presence: true
  
  # Add any other team-specific validations or methods here
end 