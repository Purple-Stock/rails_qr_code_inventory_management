# Adding New Transaction Types - Developer Guide

This guide walks you through the process of adding a new transaction type to the stock transaction system.

## Prerequisites

- Understanding of the shared component architecture
- Familiarity with Rails and Stimulus
- Knowledge of the configuration-driven design pattern

## Step-by-Step Guide

### 1. Define Ruby Configuration

Add your new transaction type to the configuration in `app/models/concerns/transaction_config.rb`:

```ruby
TRANSACTION_CONFIGS = {
  # ... existing configurations
  
  your_new_type: {
    type: :your_new_type,
    title: 'Your New Transaction',
    color: 'indigo',                    # Tailwind color name
    locations: [:destination],          # or [:source], [:source, :destination]
    validation_rules: [:positive_quantity], # Array of validation rules
    quantity_behavior: :positive,       # :positive, :negative, or :adjustment
    description: 'Description of what this transaction does'
  }
}
```

#### Configuration Options

| Option | Type | Description | Examples |
|--------|------|-------------|----------|
| `type` | Symbol | Unique identifier | `:stock_in`, `:custom_type` |
| `title` | String | Display name | `'Stock In'`, `'Custom Transaction'` |
| `color` | String | Tailwind color | `'green'`, `'blue'`, `'purple'` |
| `locations` | Array | Required locations | `[:source]`, `[:destination]`, `[:source, :destination]` |
| `validation_rules` | Array | Validation rules to apply | `[:positive_quantity]`, `[:stock_availability]` |
| `quantity_behavior` | Symbol | How quantities are handled | `:positive`, `:negative`, `:adjustment` |
| `description` | String | User-facing description | Shown in UI tooltips |

#### Available Validation Rules

- `:positive_quantity` - Ensures quantity is greater than 0
- `:stock_availability` - Checks if enough stock is available
- `:adjustment_calculation` - For adjustment transactions
- `:different_locations` - For move transactions (source ≠ destination)

### 2. Add JavaScript Configuration

Add the corresponding configuration in `app/javascript/modules/transaction_config.js`:

```javascript
export const TRANSACTION_CONFIGS = {
  // ... existing configurations
  
  your_new_type: {
    type: 'your_new_type',
    title: 'Your New Transaction',
    color: 'indigo',
    locations: ['destination'],
    validation_rules: ['positive_quantity'],
    quantity_behavior: 'positive',
    description: 'Description of what this transaction does',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: false,
      require_location_selection: true,
      default_quantity: 1,
      quantity_step: 1,
      quantity_min: 1
    },
    api_endpoints: {
      search: '/teams/{teamId}/items/search',
      transaction: '/teams/{teamId}/transactions'
    },
    validation_messages: {
      no_location: 'Please select a location',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Quantity must be positive'
    },
    css_classes: {
      primary_color: 'indigo-600',
      hover_color: 'indigo-700',
      border_color: 'indigo-200',
      bg_color: 'indigo-50',
      text_color: 'indigo-600'
    }
  }
}
```

#### UI Behavior Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `show_current_stock` | Boolean | Show current stock in item table | `true` |
| `allow_negative_quantity` | Boolean | Allow negative quantities | `false` |
| `require_location_selection` | Boolean | Require location selection | `true` |
| `default_quantity` | Number | Default quantity value | `1` |
| `quantity_step` | Number | Step for quantity input | `1` |
| `quantity_min` | Number | Minimum quantity | `1` |

### 3. Add Controller Method

Add a method to `app/controllers/stock_transactions_controller.rb`:

```ruby
def your_new_type
  handle_transaction_request(:your_new_type)
end
```

The shared `handle_transaction_request` method will handle both GET (form display) and POST (form submission) requests automatically.

### 4. Add Custom Validation (if needed)

If your transaction type requires custom validation, add it to the controller:

```ruby
def validate_item_transaction(config, item, quantity, locations)
  # ... existing validation logic
  
  if config.validation_rules.include?(:your_custom_rule)
    # Your custom validation logic here
    if some_condition_fails
      raise TransactionValidationError, "Your custom error message"
    end
  end
end
```

### 5. Create View File

Create `app/views/stock_transactions/your_new_type.html.erb`:

```erb
<% config = StockTransaction.transaction_config(:your_new_type) %>
<%= render 'stock_transactions/transaction_form', config: config %>
```

That's it! The shared components will handle all the UI rendering automatically.

### 6. Add Routes

Add routes in `config/routes.rb`:

```ruby
resources :teams do
  resources :stock_transactions do
    collection do
      get :your_new_type
      post :your_new_type
    end
  end
end
```

### 7. Add Translations

Add translations in your locale files (e.g., `config/locales/en.yml`):

```yaml
en:
  stock_transactions:
    your_new_type:
      title: "Your New Transaction"
      subtitle: "Description of what this transaction does"
      location: "Location"
      items: "Items"
      notes: "Notes"
      notes_placeholder: "Optional notes about this transaction..."
      search_placeholder: "Search for items..."
      save_button: "Save Transaction"
      total_items: "Total Items"
      table:
        item: "Item"
        current_stock: "Current Stock"
        quantity: "Quantity"
        actions: "Actions"
      empty_state:
        title: "No items added"
        description: "Search and add items to continue"
```

### 8. Add Tests

Create tests for your new transaction type:

#### Controller Tests
```ruby
# spec/requests/stock_transactions_spec.rb
describe "POST /teams/:team_id/stock_transactions/your_new_type" do
  it "creates your new type transaction successfully" do
    # Test implementation
  end
end
```

#### Integration Tests
```ruby
# spec/integration/transaction_flows_integration_spec.rb
describe "Your New Type Transaction Flow" do
  it "completes transaction successfully" do
    # Test implementation
  end
end
```

#### JavaScript Tests
```javascript
// spec/javascript/controllers/stock_transaction_controller.test.js
describe('YourNewType Configuration', () => {
  it('loads configuration correctly', () => {
    // Test implementation
  })
})
```

## Advanced Customizations

### Custom Quantity Behavior

If you need custom quantity handling, add it to the controller:

```ruby
def calculate_quantity(config, item, input_quantity)
  quantity = input_quantity.to_i
  
  case config.quantity_behavior
  when :your_custom_behavior
    # Your custom calculation logic
    your_custom_calculation(item, quantity)
  else
    # ... existing logic
  end
end
```

### Custom Location Requirements

For complex location requirements, override the location resolution:

```ruby
def resolve_locations(config)
  locations = {}
  
  if config.type == :your_new_type
    # Custom location resolution logic
    locations[:custom] = find_custom_location
  else
    # ... existing logic
  end
  
  locations
end
```

### Custom UI Components

If you need custom UI elements, create additional partials:

```erb
<!-- app/views/stock_transactions/_your_custom_component.html.erb -->
<div class="custom-component">
  <!-- Your custom UI -->
</div>
```

Then include it in your view:

```erb
<% config = StockTransaction.transaction_config(:your_new_type) %>
<%= render 'stock_transactions/transaction_form', config: config %>
<%= render 'stock_transactions/your_custom_component', config: config %>
```

## Testing Your Implementation

### 1. Manual Testing Checklist

- [ ] Form loads correctly
- [ ] Location selection works
- [ ] Item search functions
- [ ] Barcode scanning works
- [ ] Quantity validation works
- [ ] Form submission succeeds
- [ ] Error handling works
- [ ] Translations display correctly

### 2. Automated Testing

Run the test suite to ensure no regressions:

```bash
# Run all tests
bundle exec rspec

# Run specific tests
bundle exec rspec spec/requests/stock_transactions_spec.rb
bundle exec rspec spec/integration/transaction_flows_integration_spec.rb

# Run JavaScript tests
npm test
```

### 3. Performance Testing

Check that your new transaction type doesn't impact performance:

```bash
# Check database queries
tail -f log/development.log | grep "SELECT\|INSERT\|UPDATE"

# Monitor JavaScript performance
# Use browser developer tools to check memory usage and execution time
```

## Common Pitfalls

### 1. Configuration Mismatch
Ensure Ruby and JavaScript configurations match exactly, especially:
- Color names
- Validation rules
- Location requirements

### 2. Missing Translations
All user-facing text should be translated. Check for missing translations in:
- Form labels
- Error messages
- Button text
- Placeholder text

### 3. Validation Logic
Ensure validation logic is consistent between:
- JavaScript (client-side)
- Ruby (server-side)
- Configuration definitions

### 4. Route Conflicts
Avoid route conflicts with existing transaction types or other resources.

## Getting Help

If you encounter issues:

1. Check the main architecture documentation
2. Look at existing transaction type implementations
3. Run the test suite to identify regressions
4. Check browser console for JavaScript errors
5. Review Rails logs for server-side errors

## Examples

### Simple Transaction Type

Here's a complete example for a simple "count" transaction:

```ruby
# Configuration
count: {
  type: :count,
  title: 'Stock Count',
  color: 'yellow',
  locations: [:destination],
  validation_rules: [:positive_quantity],
  quantity_behavior: :positive
}
```

```ruby
# Controller method
def count
  handle_transaction_request(:count)
end
```

```erb
<!-- View -->
<% config = StockTransaction.transaction_config(:count) %>
<%= render 'stock_transactions/transaction_form', config: config %>
```

### Complex Transaction Type

For a more complex "transfer" transaction with custom validation:

```ruby
# Configuration with custom validation
transfer: {
  type: :transfer,
  title: 'Transfer Stock',
  color: 'teal',
  locations: [:source, :destination],
  validation_rules: [:positive_quantity, :stock_availability, :transfer_validation],
  quantity_behavior: :positive
}
```

```ruby
# Custom validation
def validate_item_transaction(config, item, quantity, locations)
  # ... existing validation
  
  if config.validation_rules.include?(:transfer_validation)
    # Custom transfer validation logic
    validate_transfer_rules(item, quantity, locations)
  end
end

private

def validate_transfer_rules(item, quantity, locations)
  # Your custom validation logic
end
```

This approach ensures consistency with the shared architecture while allowing for custom behavior when needed.