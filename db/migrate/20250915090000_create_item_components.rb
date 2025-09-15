class CreateItemComponents < ActiveRecord::Migration[8.0]
  def change
    create_table :item_components do |t|
      t.references :team, null: false, foreign_key: true
      t.references :kit_item, null: false, foreign_key: { to_table: :items }
      t.references :component_item, null: false, foreign_key: { to_table: :items }
      t.decimal :quantity, precision: 10, scale: 2, null: false

      t.timestamps
    end

    add_index :item_components, [:kit_item_id, :component_item_id], unique: true
  end
end

