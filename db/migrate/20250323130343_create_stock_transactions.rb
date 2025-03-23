class CreateStockTransactions < ActiveRecord::Migration[8.0]
  def change
    create_table :stock_transactions do |t|
      t.references :item, null: false, foreign_key: true
      t.references :team, null: false, foreign_key: true
      t.column :transaction_type, :stock_transaction_type, null: false
      t.decimal :quantity, precision: 10, scale: 2, null: false
      t.string :source_location
      t.string :destination_location
      t.text :notes
      t.references :user, null: false, foreign_key: true

      t.timestamps

      t.check_constraint "CASE transaction_type 
                         WHEN 'move' THEN source_location IS NOT NULL AND destination_location IS NOT NULL
                         WHEN 'stock_in' THEN destination_location IS NOT NULL AND source_location IS NULL
                         WHEN 'stock_out' THEN source_location IS NOT NULL AND destination_location IS NULL
                         ELSE true
                         END",
                         name: 'valid_locations_for_transaction_type'

      t.check_constraint "CASE transaction_type
                         WHEN 'stock_out' THEN quantity <= 0
                         WHEN 'stock_in' THEN quantity >= 0
                         ELSE true
                         END",
                         name: 'valid_quantity_for_transaction_type'
    end

    add_index :stock_transactions, :transaction_type
    add_index :stock_transactions, [:item_id, :created_at]
  end
end 