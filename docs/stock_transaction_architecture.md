# Stock Transaction Architecture Documentation

## Overview

The stock transaction system has been refactored to use a shared component architecture that eliminates code duplication while maintaining all existing functionality. This document describes the new architecture and how to work with it.

## Architecture Components

### 1. Configuration-Driven Design

The system uses a configuration-driven approach where transaction behavior is controlled by configuration objects rather than duplicated code.

#### Transaction Configuration (Ruby)

Located in `app/models/concerns/transaction_config.rb`, this module defines configurations for all transaction types:

```ruby
# Example configuration for stock_in
stock_in: {
  type: :stock_in,
  title: 'Stock In',
  color: 'green',
  locations: [:destination],
  validation_rules: [:positive_quantity],
  quantity_behavior: :positive,
  # ... other configuration options
}
```

#### JavaScript Configuration

Located in `app/javascript/modules/transaction_config.js`, this provides client-side configuration:

```javascript
// Get configuration for a transaction type
const config = getTransactionConfig('stock_in', teamId)

// Use in Stimulus controller
this.transactionConfig = config
```

### 2. Shared View Components

All transaction views now use shared partials instead of duplicated code:

#### Main Transaction Form
- **File**: `app/views/stock_transactions/_transaction_form.html.erb`
- **Purpose**: Main container that orchestrates all other components
- **Usage**: Rendered by individual transaction views (stock_in.html.erb, etc.)

#### Location Selector
- **File**: `app/views/stock_transactions/_location_selector.html.erb`
- **Purpose**: Handles location selection for all transaction types
- **Features**: 
  - Single location mode (stock_in, stock_out, adjust)
  - Dual location mode (move)
  - Automatic validation and error handling

#### Item Search
- **File**: `app/views/stock_transactions/_item_search.html.erb`
- **Purpose**: Unified item search interface
- **Features**:
  - Search input with autocomplete
  - Barcode scanner integration
  - Configuration-driven behavior

#### Item Table
- **File**: `app/views/stock_transactions/_item_table.html.erb`
- **Purpose**: Display selected items with quantity inputs
- **Features**:
  - Dynamic quantity validation
  - Transaction-specific input behavior
  - Real-time total calculation

#### Barcode Modal
- **File**: `app/views/stock_transactions/_barcode_modal.html.erb`
- **Purpose**: Unified barcode scanning interface
- **Features**:
  - Camera scanning
  - File upload scanning
  - Configuration-driven styling

### 3. JavaScript Architecture

#### Unified Stock Transaction Controller
- **File**: `app/javascript/controllers/stock_transaction_controller.js`
- **Purpose**: Single Stimulus controller for all transaction types
- **Features**:
  - Configuration-driven behavior
  - Unified barcode scanning
  - Dynamic validation
  - Optimized performance with lazy loading

#### Barcode Scanner Module
- **File**: `app/javascript/modules/barcode_scanner.js`
- **Purpose**: Reusable barcode scanning functionality
- **Features**:
  - Singleton library loading
  - Camera and file scanning
  - Error handling and cleanup
  - Memory optimization

#### Transaction Configuration Module
- **File**: `app/javascript/modules/transaction_config.js`
- **Purpose**: Client-side configuration management
- **Features**:
  - Configuration caching
  - API endpoint interpolation
  - Validation rule definitions

### 4. Controller Architecture

#### Unified Processing
The `StockTransactionsController` uses shared methods for all transaction types:

```ruby
# Public interfaces remain the same
def stock_in
  handle_transaction_request(:stock_in)
end

# Shared processing logic
private

def handle_transaction_request(transaction_type)
  if request.post?
    process_transaction(transaction_type)
  else
    render_transaction_form(transaction_type)
  end
end
```

## Performance Optimizations

### 1. Database Query Optimization
- Location data is cached to avoid repeated queries
- Preloading of associations to prevent N+1 queries
- Fragment caching for location selectors

### 2. JavaScript Optimization
- Lazy initialization of barcode scanner
- Configuration caching to avoid repeated processing
- Singleton library loading to reduce memory usage
- Debounced search to reduce API calls

### 3. View Optimization
- Fragment caching for shared components
- Turbo permanent attributes for form persistence
- Optimized partial rendering

## Usage Examples

### Adding a New Transaction Type

1. **Add Configuration** (Ruby):
```ruby
# In app/models/concerns/transaction_config.rb
new_type: {
  type: :new_type,
  title: 'New Transaction',
  color: 'indigo',
  locations: [:destination],
  validation_rules: [:positive_quantity],
  quantity_behavior: :positive
}
```

2. **Add JavaScript Configuration**:
```javascript
// In app/javascript/modules/transaction_config.js
new_type: {
  type: 'new_type',
  title: 'New Transaction',
  color: 'indigo',
  // ... other configuration
}
```

3. **Add Controller Method**:
```ruby
def new_type
  handle_transaction_request(:new_type)
end
```

4. **Add View**:
```erb
<% config = StockTransaction.transaction_config(:new_type) %>
<%= render 'stock_transactions/transaction_form', config: config %>
```

5. **Add Route**:
```ruby
resources :stock_transactions do
  member do
    get :new_type
    post :new_type
  end
end
```

### Customizing Behavior

#### Custom Validation Rules
```ruby
# Add to configuration
validation_rules: [:positive_quantity, :custom_rule]

# Implement in controller
def validate_item_transaction(config, item, quantity, locations)
  # ... existing validation
  
  if config.validation_rules.include?(:custom_rule)
    # Custom validation logic
  end
end
```

#### Custom UI Behavior
```javascript
// Override configuration in JavaScript
const customConfig = {
  ui_behavior: {
    ...baseConfig.ui_behavior,
    custom_behavior: true
  }
}
```

## Testing

### Component Testing
Each shared component should be tested independently:

```ruby
# spec/views/stock_transactions/shared_components_spec.rb
RSpec.describe "stock_transactions/location_selector" do
  it "renders single location mode correctly" do
    config = double(requires_both_locations?: false)
    # ... test implementation
  end
end
```

### Integration Testing
Test complete transaction flows:

```ruby
# spec/integration/transaction_flows_integration_spec.rb
RSpec.describe "Transaction Flows" do
  it "completes stock_in transaction successfully" do
    # ... test implementation
  end
end
```

### JavaScript Testing
Test JavaScript modules and controllers:

```javascript
// spec/javascript/controllers/stock_transaction_controller.test.js
describe('StockTransactionController', () => {
  it('initializes with correct configuration', () => {
    // ... test implementation
  })
})
```

## Migration Guide

### From Old Architecture
If you have customizations in the old individual transaction views:

1. **Identify the customization type**:
   - UI changes → Move to shared components
   - Validation logic → Add to configuration
   - JavaScript behavior → Update unified controller

2. **Update configurations** instead of duplicating code

3. **Test thoroughly** to ensure functionality is preserved

### Best Practices
- Always use configuration-driven behavior
- Avoid duplicating code across transaction types
- Test changes across all transaction types
- Use shared examples in tests
- Document configuration changes

## Troubleshooting

### Common Issues

#### Configuration Not Loading
- Check that configuration exists in both Ruby and JavaScript modules
- Verify configuration is passed correctly to views
- Check browser console for JavaScript errors

#### Barcode Scanner Not Working
- Verify HTML5-QRCode library is loading
- Check camera permissions
- Ensure QR reader element exists in DOM

#### Performance Issues
- Check for N+1 queries in database logs
- Verify fragment caching is working
- Monitor JavaScript memory usage

### Debugging Tips
- Use browser developer tools to inspect configuration objects
- Check Rails logs for database query patterns
- Use console.log to trace JavaScript execution
- Verify Stimulus controller connections

## Future Enhancements

### Planned Improvements
- Additional transaction types (transfer, return, etc.)
- Enhanced barcode scanning (multiple formats)
- Real-time validation with WebSockets
- Mobile-optimized interface
- Bulk transaction processing

### Extension Points
- Custom validation rules
- Additional UI behaviors
- New location selection modes
- Enhanced search functionality
- Custom reporting features