class AddCurrentStockAndPriceToItems < ActiveRecord::Migration[8.0]
  def change
    add_column :items, :current_stock, :decimal, precision: 10, scale: 2, default: 0
    add_column :items, :minimum_stock, :decimal, precision: 10, scale: 2, default: 0
  end
end
