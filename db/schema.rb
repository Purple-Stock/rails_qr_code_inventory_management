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

ActiveRecord::Schema[8.0].define(version: 2025_03_23_130338) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "categories", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.bigint "parent_id"
    t.boolean "is_active", default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["parent_id"], name: "index_categories_on_parent_id"
  end

  create_table "companies", force: :cascade do |t|
    t.string "name"
    t.string "slug"
    t.string "logo_url"
    t.boolean "is_active"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "company_users", force: :cascade do |t|
    t.bigint "company_id", null: false
    t.uuid "user_id"
    t.string "role"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_company_users_on_company_id"
  end

  create_table "item_locations", force: :cascade do |t|
    t.bigint "item_id", null: false
    t.bigint "location_id", null: false
    t.integer "current_quantity"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["item_id"], name: "index_item_locations_on_item_id"
    t.index ["location_id"], name: "index_item_locations_on_location_id"
  end

  create_table "items", force: :cascade do |t|
    t.string "name"
    t.string "sku"
    t.string "barcode"
    t.text "description"
    t.decimal "cost"
    t.decimal "price"
    t.integer "minimum_quantity"
    t.bigint "category_id", null: false
    t.bigint "supplier_id", null: false
    t.boolean "is_active"
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["category_id"], name: "index_items_on_category_id"
    t.index ["company_id"], name: "index_items_on_company_id"
    t.index ["supplier_id"], name: "index_items_on_supplier_id"
  end

  create_table "locations", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.bigint "parent_id"
    t.boolean "is_active", default: true
    t.bigint "company_id"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_locations_on_company_id"
    t.index ["parent_id"], name: "index_locations_on_parent_id"
  end

  create_table "stock_transactions", force: :cascade do |t|
    t.bigint "item_id", null: false
    t.string "transaction_type"
    t.integer "quantity"
    t.bigint "from_location_id"
    t.bigint "to_location_id"
    t.text "memo"
    t.string "reference_number"
    t.string "supplier"
    t.decimal "unit_cost", precision: 10, scale: 2
    t.decimal "total_cost", precision: 10, scale: 2
    t.string "created_by"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["from_location_id"], name: "index_stock_transactions_on_from_location_id"
    t.index ["item_id"], name: "index_stock_transactions_on_item_id"
    t.index ["to_location_id"], name: "index_stock_transactions_on_to_location_id"
  end

  create_table "suppliers", force: :cascade do |t|
    t.string "name"
    t.text "description"
    t.boolean "is_active"
    t.bigint "company_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["company_id"], name: "index_suppliers_on_company_id"
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

  add_foreign_key "categories", "categories", column: "parent_id"
  add_foreign_key "company_users", "companies"
  add_foreign_key "item_locations", "items"
  add_foreign_key "item_locations", "locations"
  add_foreign_key "items", "categories"
  add_foreign_key "items", "companies"
  add_foreign_key "items", "suppliers"
  add_foreign_key "locations", "companies"
  add_foreign_key "locations", "locations", column: "parent_id"
  add_foreign_key "stock_transactions", "items"
  add_foreign_key "stock_transactions", "locations", column: "from_location_id"
  add_foreign_key "stock_transactions", "locations", column: "to_location_id"
  add_foreign_key "suppliers", "companies"
end
