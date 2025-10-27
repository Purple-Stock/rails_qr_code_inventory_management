# == Schema Information
#
# Table name: webhooks
#
#  id         :bigint           not null, primary key
#  event      :string
#  secret     :string
#  url        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  team_id    :bigint           not null
#
# Indexes
#
#  index_webhooks_on_team_id  (team_id)
#
# Foreign Keys
#
#  fk_rails_...  (team_id => teams.id)
#
class Webhook < ApplicationRecord
  belongs_to :team

  validates :url, presence: true, format: { with: URI::DEFAULT_PARSER.make_regexp }
  validates :event, presence: true
end
