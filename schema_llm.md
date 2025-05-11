## Schema Information

### Table: `items`

| Column            | Type           | Attributes            |
| ----------------- | -------------- | --------------------- |
| id                | bigint         | not null, primary key |
| barcode           | string         |                       |
| brand             | string         |                       |
| cost              | decimal(10, 2) |                       |
| current\_stock    | decimal(10, 2) | default: 0.0          |
| initial\_quantity | integer        | default: 0            |
| item\_type        | string         |                       |
| minimum\_stock    | decimal(10, 2) | default: 0.0          |
| name              | string         |                       |
| price             | decimal(10, 2) |                       |
| sku               | string         |                       |
| created\_at       | datetime       | not null              |
| updated\_at       | datetime       | not null              |
| location\_id      | bigint         |                       |
| team\_id          | bigint         | not null              |

**Indexes**

* `index_items_on_barcode (barcode)`
* `index_items_on_location_id (location_id)`
* `index_items_on_sku (sku)`
* `index_items_on_team_id (team_id)`

**Foreign Keys**

* `location_id → locations.id`
* `team_id → teams.id`

---

### Table: `locations`

| Column      | Type     | Attributes            |
| ----------- | -------- | --------------------- |
| id          | bigint   | not null, primary key |
| description | text     |                       |
| name        | string   | not null              |
| created\_at | datetime | not null              |
| updated\_at | datetime | not null              |
| team\_id    | bigint   | not null              |

**Indexes**

* `index_locations_on_team_id (team_id)`
* `index_locations_on_team_id_and_name (team_id, name)` - UNIQUE

**Foreign Keys**

* `team_id → teams.id`

---

### Table: `stock_transactions`

| Column                    | Type           | Attributes            |
| ------------------------- | -------------- | --------------------- |
| id                        | bigint         | not null, primary key |
| notes                     | text           |                       |
| quantity                  | decimal(10, 2) | not null              |
| transaction\_type         | enum           | not null              |
| created\_at               | datetime       | not null              |
| updated\_at               | datetime       | not null              |
| destination\_location\_id | bigint         |                       |
| item\_id                  | bigint         | not null              |
| source\_location\_id      | bigint         |                       |
| team\_id                  | bigint         | not null              |
| user\_id                  | bigint         | not null              |

**Indexes**

* `index_stock_transactions_on_destination_location_id (destination_location_id)`
* `index_stock_transactions_on_item_id (item_id)`
* `index_stock_transactions_on_item_id_and_created_at (item_id, created_at)`
* `index_stock_transactions_on_source_location_id (source_location_id)`
* `index_stock_transactions_on_team_id (team_id)`
* `index_stock_transactions_on_transaction_type (transaction_type)`
* `index_stock_transactions_on_user_id (user_id)`

**Foreign Keys**

* `destination_location_id → locations.id`
* `item_id → items.id`
* `source_location_id → locations.id`
* `team_id → teams.id`
* `user_id → users.id`

---

### Table: `teams`

| Column      | Type     | Attributes            |
| ----------- | -------- | --------------------- |
| id          | bigint   | not null, primary key |
| name        | string   | not null              |
| notes       | text     |                       |
| created\_at | datetime | not null              |
| updated\_at | datetime | not null              |
| user\_id    | bigint   | not null              |

**Indexes**

* `index_teams_on_user_id (user_id)`

**Foreign Keys**

* `user_id → users.id`

---

### Table: `users`

| Column                    | Type     | Attributes            |
| ------------------------- | -------- | --------------------- |
| id                        | bigint   | not null, primary key |
| email                     | string   | default: "", not null |
| encrypted\_password       | string   | default: "", not null |
| remember\_created\_at     | datetime |                       |
| reset\_password\_sent\_at | datetime |                       |
| reset\_password\_token    | string   |                       |
| created\_at               | datetime | not null              |
| updated\_at               | datetime | not null              |

**Indexes**

* `index_users_on_email (email)` - UNIQUE
* `index_users_on_reset_password_token (reset_password_token)` - UNIQUE