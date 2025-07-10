FactoryBot.define do
  factory :subscription do
    plan { 'pro' }
    status { 'active' }
    association :team
  end
end
