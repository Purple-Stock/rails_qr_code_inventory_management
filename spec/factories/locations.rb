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
FactoryBot.define do
  factory :location do
    association :team
    sequence(:name) { |n| "Location #{n}" }
    description { "Test location" }
  end
end
