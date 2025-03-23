class CreateItems < ActiveRecord::Migration[7.1]
  def change
    create_table :items do |t|
      t.string :name, null: false
      t.string :sku, null: false
      t.string :category, null: false
      t.integer :quantity, default: 0, null: false
      t.decimal :unit_price, precision: 10, scale: 2, null: false
      t.references :team, null: false, foreign_key: true

      t.timestamps
    end
    
    add_index :items, [:sku, :team_id], unique: true
  end
end 