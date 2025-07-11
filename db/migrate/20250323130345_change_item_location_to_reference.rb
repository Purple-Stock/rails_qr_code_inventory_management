class ChangeItemLocationToReference < ActiveRecord::Migration[8.0]
  def up
    # First add the new reference column
    add_reference :items, :location, foreign_key: true

    # Remove the old location string column
    remove_column :items, :location
  end

  def down
    # Add back the location string column
    add_column :items, :location, :string

    # Remove the location reference
    remove_reference :items, :location, foreign_key: true
  end
end
