FactoryBot.define do
  factory :team do
    name { Faker::Company.name }
    association :user
  end
end 