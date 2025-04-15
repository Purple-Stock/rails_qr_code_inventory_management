class ChangeStockTransactionLocationsToReferences < ActiveRecord::Migration[8.0]
  def up
    # Add new reference columns
    add_reference :stock_transactions, :source_location, foreign_key: { to_table: :locations }
    add_reference :stock_transactions, :destination_location, foreign_key: { to_table: :locations }
    
    # Create a default location for existing records
    execute <<-SQL
      INSERT INTO locations (name, team_id, created_at, updated_at)
      SELECT DISTINCT 'Default Location', team_id, NOW(), NOW()
      FROM stock_transactions
      WHERE source_location IS NOT NULL OR destination_location IS NOT NULL;
    SQL
    
    # Update existing records with the default location based on transaction type
    execute <<-SQL
      WITH default_locations AS (
        SELECT l.id as location_id, l.team_id
        FROM locations l
        WHERE l.name = 'Default Location'
      )
      UPDATE stock_transactions st
      SET 
        source_location_id = CASE 
          WHEN transaction_type IN ('stock_out', 'move') THEN dl.location_id
          ELSE NULL
        END,
        destination_location_id = CASE 
          WHEN transaction_type IN ('stock_in', 'move') THEN dl.location_id
          ELSE NULL
        END
      FROM default_locations dl
      WHERE st.team_id = dl.team_id
      AND (st.source_location IS NOT NULL OR st.destination_location IS NOT NULL);
    SQL
    
    # Remove old string columns
    remove_column :stock_transactions, :source_location
    remove_column :stock_transactions, :destination_location
    
    # Remove old check constraint if it exists
    execute <<-SQL
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 
          FROM information_schema.check_constraints 
          WHERE constraint_name = 'valid_locations_for_transaction_type'
        ) THEN
          ALTER TABLE stock_transactions 
          DROP CONSTRAINT valid_locations_for_transaction_type;
        END IF;
      END;
      $$;
    SQL
    
    # Add new check constraint
    add_check_constraint :stock_transactions, 
      "CASE transaction_type 
       WHEN 'move' THEN source_location_id IS NOT NULL AND destination_location_id IS NOT NULL
       WHEN 'stock_in' THEN destination_location_id IS NOT NULL AND source_location_id IS NULL
       WHEN 'stock_out' THEN source_location_id IS NOT NULL AND destination_location_id IS NULL
       ELSE true
       END",
      name: 'valid_locations_for_transaction_type'
  end

  def down
    # Create temporary columns to store location data
    add_column :stock_transactions, :source_location, :string
    add_column :stock_transactions, :destination_location, :string
    
    # Copy data back to string columns based on transaction type
    execute <<-SQL
      UPDATE stock_transactions st
      SET 
        source_location = CASE 
          WHEN transaction_type IN ('stock_out', 'move') THEN sl.name
          ELSE NULL
        END,
        destination_location = CASE 
          WHEN transaction_type IN ('stock_in', 'move') THEN dl.name
          ELSE NULL
        END
      FROM locations sl
      LEFT JOIN locations dl ON true
      WHERE (st.source_location_id = sl.id OR st.source_location_id IS NULL)
      AND (st.destination_location_id = dl.id OR st.destination_location_id IS NULL);
    SQL
    
    # Remove the check constraint
    remove_check_constraint :stock_transactions, name: 'valid_locations_for_transaction_type'
    
    # Remove the reference columns
    remove_reference :stock_transactions, :source_location, foreign_key: { to_table: :locations }
    remove_reference :stock_transactions, :destination_location, foreign_key: { to_table: :locations }
    
    # Add back original check constraint
    add_check_constraint :stock_transactions,
      "CASE transaction_type 
       WHEN 'move' THEN source_location IS NOT NULL AND destination_location IS NOT NULL
       WHEN 'stock_in' THEN destination_location IS NOT NULL AND source_location IS NULL
       WHEN 'stock_out' THEN source_location IS NOT NULL AND destination_location IS NULL
       ELSE true
       END",
      name: 'valid_locations_for_transaction_type'
      
    # Clean up default locations
    execute <<-SQL
      DELETE FROM locations WHERE name = 'Default Location';
    SQL
  end
end 