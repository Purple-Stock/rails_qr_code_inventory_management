class Subscription < ApplicationRecord
  belongs_to :team

  validates :plan, presence: true
end
