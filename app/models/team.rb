class Team < ApplicationRecord
  belongs_to :user
  has_many :items, dependent: :destroy
  has_many :stock_transactions, dependent: :destroy
  has_many :locations, dependent: :destroy
  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id }
  
  # Add any other team-specific validations or methods here
end 