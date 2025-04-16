# == Schema Information
#
# Table name: teams
#
#  id         :bigint           not null, primary key
#  name       :string           not null
#  notes      :text
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_teams_on_user_id  (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (user_id => users.id)
#
class Team < ApplicationRecord
  belongs_to :user
  has_many :items, dependent: :destroy
  has_many :stock_transactions, dependent: :destroy
  has_many :locations, dependent: :destroy
  validates :name, presence: true
  validates :name, uniqueness: { scope: :user_id }
  
  # Add any other team-specific validations or methods here
end 
