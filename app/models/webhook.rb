class Webhook < ApplicationRecord
  belongs_to :team

  validates :url, presence: true, format: { with: URI::DEFAULT_PARSER.make_regexp }
  validates :event, presence: true
end
