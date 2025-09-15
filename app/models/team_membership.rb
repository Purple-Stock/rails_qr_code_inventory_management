class TeamMembership < ApplicationRecord
  belongs_to :team
  belongs_to :user

  enum :role, {
    viewer: 0,
    editor: 1,
    admin: 2,
    owner: 3
  }

  validates :user_id, uniqueness: { scope: :team_id }

  # Role helpers
  def at_least?(required)
    self.class.roles[role.to_s] >= self.class.roles[required.to_s]
  end
end

