class CreateWebhooks < ActiveRecord::Migration[8.0]
  def change
    create_table :webhooks do |t|
      t.string :url
      t.string :event
      t.string :secret
      t.references :team, null: false, foreign_key: true

      t.timestamps
    end
  end
end
