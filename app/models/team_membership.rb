# == Schema Information
#
# Table name: team_memberships
#
#  id         :bigint           not null, primary key
#  role       :integer          default("viewer"), not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  team_id    :bigint           not null
#  user_id    :bigint           not null
#
# Indexes
#
#  index_team_memberships_on_team_id              (team_id)
#  index_team_memberships_on_team_id_and_user_id  (team_id,user_id) UNIQUE
#  index_team_memberships_on_user_id              (user_id)
#
# Foreign Keys
#
#  fk_rails_...  (team_id => teams.id)
#  fk_rails_...  (user_id => users.id)
#
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
