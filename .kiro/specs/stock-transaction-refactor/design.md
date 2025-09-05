# Design Document

## Overview

This design outlines a comprehensive refactoring of the stock transaction system to eliminate code duplication while maintaining all existing functionality. The refactoring will introduce a component-based architecture with shared views, consolidated controller logic, and unified JavaScript modules.

## Architecture

### Current State Analysis

The current implementation has significant duplication:
- 4 nearly identical view files (800+ lines each)
- Duplicated controller methods with minor variations
- Repeated JavaScript code for barcode scanning
- Similar form structures and validation logic

### Target Architecture

The refactored system will use:
- **Shared View Components**: Reusable partials for common UI elements
- **Configuration-Driven Behavior**: Transaction-specific behavior controlled by configuration
- **Unified JavaScript Modules**: Single barcode scanner and form handler
- **Consolidated Controller Logic**: Shared private methods with transaction-specific public interfaces

## Components and Interfaces

### 1. View Component Structure

#### Base Transaction Form Component
```erb
<!-- app/views/stock_transactions/_transaction_form.html.erb -->
```
- Accepts transaction type configuration
- Renders appropriate location selectors
- Includes shared item selection interface
- Handles transaction-specific styling and labels

#### Shared Partials
- `_location_selector.html.erb` - Configurable location selection
- `_item_search.html.erb` - Unified item search and barcode scanning
- `_item_table.html.erb` - Transaction item display table
- `_barcode_modal.html.erb` - Universal barcode scanning modal

#### Transaction Configuration
```ruby
# app/models/concerns/transaction_config.rb
TRANSACTION_CONFIGS = {
  stock_in: {
    title: 'Stock In',
    color: 'green',
    locations: [:destination],
    validation: :positive_quantity
  },
  stock_out: {
    title: 'Stock Out', 
    color: 'red',
    locations: [:source],
    validation: :stock_availability
  },
  # ... other configs
}
```

### 2. Controller Refactoring

#### Consolidated Methods
```ruby
class StockTransactionsController < ApplicationController
  # Public interfaces remain the same
  def stock_in
    handle_transaction_request(:stock_in)
  end
  
  def stock_out
    handle_transaction_request(:stock_out)
  end
  
  # ... other public methods
  
  private
  
  def handle_transaction_request(transaction_type)
    if request.post?
      process_transaction(transaction_type)
    else
      render_transaction_form(transaction_type)
    end
  end
  
  def process_transaction(transaction_type)
    # Unified transaction processing logic
  end
  
  def render_transaction_form(transaction_type)
    # Shared form rendering logic
  end
end
```

### 3. JavaScript Module Architecture

#### Unified Barcode Scanner
```javascript
// app/javascript/modules/barcode_scanner.js
export class BarcodeScanner {
  constructor(config) {
    this.config = config
    this.scanner = null
  }
  
  initialize() {
    // Unified scanner initialization
  }
  
  onScanSuccess(callback) {
    // Handle successful scans
  }
}
```

#### Transaction Form Handler
```javascript
// app/javascript/controllers/unified_stock_transaction_controller.js
export default class extends Controller {
  static values = { 
    type: String,
    config: Object 
  }
  
  connect() {
    this.initializeForType(this.typeValue)
  }
  
  initializeForType(type) {
    // Type-specific initialization using config
  }
}
```

## Data Models

### Transaction Configuration Model
```ruby
class TransactionConfig
  include ActiveModel::Model
  
  attr_accessor :type, :title, :color, :locations, :validation_rules
  
  def self.for(type)
    CONFIGS[type.to_sym]
  end
  
  def requires_source_location?
    locations.include?(:source)
  end
  
  def requires_destination_location?
    locations.include?(:destination)
  end
end
```

### Enhanced Stock Transaction Model
```ruby
class StockTransaction < ApplicationRecord
  # Existing code remains unchanged
  
  def self.transaction_config(type)
    TransactionConfig.for(type)
  end
  
  def config
    self.class.transaction_config(transaction_type)
  end
end
```

## Error Handling

### Unified Error Response
```ruby
class TransactionError < StandardError
  attr_reader :type, :details
  
  def initialize(type, message, details = {})
    @type = type
    @details = details
    super(message)
  end
end
```

### Error Handling Strategy
- Consistent error messages across transaction types
- Proper HTTP status codes
- Client-side error display standardization
- Graceful degradation for JavaScript failures

## Testing Strategy

### Component Testing
- Unit tests for each shared partial
- Integration tests for transaction configurations
- JavaScript module testing with Jest

### Controller Testing
- Shared examples for common transaction behavior
- Type-specific test cases for unique logic
- API endpoint testing for all transaction types

### End-to-End Testing
- Selenium tests for barcode scanning functionality
- Complete transaction flow testing
- Cross-browser compatibility testing

## Migration Strategy

### Phase 1: Create Shared Components
1. Extract common view elements into partials
2. Create transaction configuration system
3. Build unified JavaScript modules

### Phase 2: Refactor Controller
1. Consolidate duplicated controller methods
2. Implement shared transaction processing
3. Maintain backward compatibility

### Phase 3: Update Views
1. Replace individual transaction views with shared components
2. Update routing and form submissions
3. Ensure all functionality works identically

### Phase 4: Cleanup and Optimization
1. Remove duplicated code
2. Optimize performance
3. Update documentation

## Performance Considerations

### View Rendering
- Minimize partial rendering overhead
- Cache transaction configurations
- Optimize JavaScript bundle size

### Database Queries
- Maintain existing query patterns
- Ensure no N+1 query introduction
- Preserve current performance characteristics

## Security Considerations

### Input Validation
- Maintain existing validation rules
- Ensure transaction type validation
- Preserve CSRF protection

### Authorization
- Keep existing permission checks
- Ensure no privilege escalation
- Maintain team-based access control

## Backward Compatibility

### API Compatibility
- All existing endpoints remain functional
- Response formats unchanged
- URL patterns preserved

### Data Compatibility
- No database schema changes required
- Existing transaction data remains valid
- Current integrations continue working

## Monitoring and Observability

### Metrics
- Track refactoring impact on performance
- Monitor error rates during migration
- Measure code complexity reduction

### Logging
- Maintain existing log formats
- Add refactoring-specific debug information
- Preserve audit trail functionality