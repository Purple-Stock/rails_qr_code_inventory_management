# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_07_12_113930) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  # Custom types defined in this database.
  # Note that some types may not work with other database engines. Be careful if changing database.
  create_enum "stock_transaction_type", ["stock_in", "stock_out", "adjust", "move", "count"]

  create_table "api_keys", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["token"], name: "index_api_keys_on_token", unique: true
    t.index ["user_id"], name: "index_api_keys_on_user_id"
  end

  create_table "items", force: :cascade do |t|
    t.string "name"
    t.string "sku"
    t.string "barcode"
    t.decimal "cost", precision: 10, scale: 2
    t.decimal "price", precision: 10, scale: 2
    t.string "item_type"
    t.string "brand"
    t.integer "initial_quantity", default: 0
    t.bigint "team_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.decimal "current_stock", precision: 10, scale: 2, default: "0.0"
    t.decimal "minimum_stock", precision: 10, scale: 2, default: "0.0"
    t.bigint "location_id"
    t.index ["barcode"], name: "index_items_on_barcode"
    t.index ["location_id"], name: "index_items_on_location_id"
    t.index ["sku"], name: "index_items_on_sku"
    t.index ["team_id"], name: "index_items_on_team_id"
  end

  create_table "locations", force: :cascade do |t|
    t.string "name", null: false
    t.text "description"
    t.bigint "team_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["team_id", "name"], name: "index_locations_on_team_id_and_name", unique: true
    t.index ["team_id"], name: "index_locations_on_team_id"
  end

  create_table "stock_transactions", force: :cascade do |t|
    t.bigint "item_id", null: false
    t.bigint "team_id", null: false
    t.enum "transaction_type", null: false, enum_type: "stock_transaction_type"
    t.decimal "quantity", precision: 10, scale: 2, null: false
    t.text "notes"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "source_location_id"
    t.bigint "destination_location_id"
    t.index ["destination_location_id"], name: "index_stock_transactions_on_destination_location_id"
    t.index ["item_id", "created_at"], name: "index_stock_transactions_on_item_id_and_created_at"
    t.index ["item_id"], name: "index_stock_transactions_on_item_id"
    t.index ["source_location_id"], name: "index_stock_transactions_on_source_location_id"
    t.index ["team_id"], name: "index_stock_transactions_on_team_id"
    t.index ["transaction_type"], name: "index_stock_transactions_on_transaction_type"
    t.index ["user_id"], name: "index_stock_transactions_on_user_id"
    t.check_constraint "\nCASE transaction_type\n    WHEN 'move'::stock_transaction_type THEN source_location_id IS NOT NULL AND destination_location_id IS NOT NULL\n    WHEN 'stock_in'::stock_transaction_type THEN destination_location_id IS NOT NULL AND source_location_id IS NULL\n    WHEN 'stock_out'::stock_transaction_type THEN source_location_id IS NOT NULL AND destination_location_id IS NULL\n    ELSE true\nEND", name: "valid_locations_for_transaction_type"
    t.check_constraint "\nCASE transaction_type\n    WHEN 'stock_out'::stock_transaction_type THEN quantity <= 0::numeric\n    WHEN 'stock_in'::stock_transaction_type THEN quantity >= 0::numeric\n    ELSE true\nEND", name: "valid_quantity_for_transaction_type"
  end

  create_table "teams", force: :cascade do |t|
    t.string "name", null: false
    t.text "notes"
    t.bigint "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id"], name: "index_teams_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  create_table "webhooks", force: :cascade do |t|
    t.string "url"
    t.string "event"
    t.string "secret"
    t.bigint "team_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["team_id"], name: "index_webhooks_on_team_id"
  end

  add_foreign_key "api_keys", "users"
  add_foreign_key "items", "locations"
  add_foreign_key "items", "teams"
  add_foreign_key "locations", "teams"
  add_foreign_key "stock_transactions", "items"
  add_foreign_key "stock_transactions", "locations", column: "destination_location_id"
  add_foreign_key "stock_transactions", "locations", column: "source_location_id"
  add_foreign_key "stock_transactions", "teams"
  add_foreign_key "stock_transactions", "users"
  add_foreign_key "teams", "users"
  add_foreign_key "webhooks", "teams"
end
