class CreateItems < ActiveRecord::Migration[8.0]
  def change
    create_table :items do |t|
      t.string :name
      t.string :sku
      t.string :barcode
      t.decimal :cost, precision: 10, scale: 2
      t.decimal :price, precision: 10, scale: 2
      t.string :type
      t.string :brand
      t.string :location
      t.integer :initial_quantity, default: 0
      t.references :team, null: false, foreign_key: true

      t.timestamps
    end

    add_index :items, :sku
    add_index :items, :barcode
  end
end 