class CreateStockTransactionTypeEnum < ActiveRecord::Migration[8.0]
  def up
    execute <<-SQL
      CREATE TYPE stock_transaction_type AS ENUM ('stock_in', 'stock_out', 'adjust', 'move', 'count');
    SQL
  end

  def down
    execute <<-SQL
      DROP TYPE stock_transaction_type;
    SQL
  end
end 