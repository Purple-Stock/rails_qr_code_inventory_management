class RenameTypeColumnInItems < ActiveRecord::Migration[8.0]
  def change
    rename_column :items, :type, :item_type
  end
end
