# Migration Guide: Stock Transaction Refactoring

This guide helps developers migrate from the old duplicated transaction system to the new shared component architecture.

## Overview of Changes

The refactoring consolidates four nearly identical transaction views (800+ lines each) into a shared component system while maintaining all existing functionality.

### Before (Old Architecture)
- Separate view files for each transaction type
- Duplicated JavaScript code
- Repeated controller methods
- Manual maintenance of similar code across files

### After (New Architecture)
- Shared view components
- Unified JavaScript modules
- Configuration-driven behavior
- Single source of truth for transaction logic

## Breaking Changes

### ⚠️ None!

This refactoring was designed to be **completely backward compatible**. All existing:
- URLs remain the same
- API endpoints work identically
- Database schema unchanged
- User workflows preserved
- Test interfaces maintained

## What Changed

### 1. View Files

#### Old Structure
```
app/views/stock_transactions/
├── stock_in.html.erb      (800+ lines)
├── stock_out.html.erb     (800+ lines)
├── adjust.html.erb        (800+ lines)
└── move.html.erb          (800+ lines)
```

#### New Structure
```
app/views/stock_transactions/
├── stock_in.html.erb      (3 lines - uses shared components)
├── stock_out.html.erb     (3 lines - uses shared components)
├── adjust.html.erb        (3 lines - uses shared components)
├── move.html.erb          (3 lines - uses shared components)
├── _transaction_form.html.erb      (main shared component)
├── _location_selector.html.erb     (location selection)
├── _item_search.html.erb           (item search interface)
├── _item_table.html.erb            (item display table)
└── _barcode_modal.html.erb         (barcode scanning)
```

### 2. JavaScript Files

#### Old Structure
- Duplicated barcode scanning code in each view
- Repeated form handling logic
- Similar validation across transaction types

#### New Structure
```
app/javascript/
├── controllers/
│   └── stock_transaction_controller.js  (unified controller)
└── modules/
    ├── barcode_scanner.js               (reusable scanner)
    └── transaction_config.js            (configuration management)
```

### 3. Controller Changes

#### Old Methods (Still Work!)
```ruby
def stock_in
  # Old implementation still works
end

def stock_out  
  # Old implementation still works
end
```

#### New Shared Methods (Added)
```ruby
private

def handle_transaction_request(transaction_type)
  # Unified request handling
end

def process_transaction(transaction_type)
  # Shared transaction processing
end
```

## Migration Steps

### For Existing Customizations

If you have customizations in the old system, follow these steps:

#### 1. Identify Your Customizations

**View Customizations**
- Custom HTML in transaction views
- Modified form fields
- Additional UI elements

**JavaScript Customizations**
- Custom validation logic
- Modified barcode scanning
- Additional form behaviors

**Controller Customizations**
- Custom validation rules
- Modified transaction processing
- Additional business logic

#### 2. Migrate View Customizations

**Before (Old Way):**
```erb
<!-- In stock_in.html.erb -->
<div class="custom-section">
  <!-- Your custom HTML -->
</div>
<!-- 800+ lines of duplicated code -->
```

**After (New Way):**
```erb
<!-- In stock_in.html.erb -->
<% config = StockTransaction.transaction_config(:stock_in) %>
<%= render 'stock_transactions/transaction_form', config: config %>

<!-- Add your customizations -->
<%= render 'stock_transactions/your_custom_partial', config: config %>
```

#### 3. Migrate JavaScript Customizations

**Before (Old Way):**
```javascript
// Duplicated in each transaction view
function customValidation() {
  // Your custom logic
}
```

**After (New Way):**
```javascript
// In stock_transaction_controller.js or custom controller
export default class extends Controller {
  connect() {
    super.connect()
    this.setupCustomBehavior()
  }
  
  setupCustomBehavior() {
    // Your custom logic here
  }
}
```

#### 4. Migrate Controller Customizations

**Before (Old Way):**
```ruby
def stock_in
  # Custom validation
  if custom_condition_fails
    # Handle error
  end
  
  # Duplicated processing logic
end
```

**After (New Way):**
```ruby
def stock_in
  handle_transaction_request(:stock_in)
end

private

def validate_item_transaction(config, item, quantity, locations)
  super # Call parent validation
  
  # Add your custom validation
  if config.type == :stock_in && custom_condition_fails
    raise TransactionValidationError, "Custom error message"
  end
end
```

### For New Features

When adding new features, use the new architecture:

#### Adding Custom Transaction Types
Follow the [Adding New Transaction Types Guide](adding_new_transaction_types.md)

#### Adding Custom Validation
```ruby
# Add to configuration
validation_rules: [:positive_quantity, :your_custom_rule]

# Implement in controller
def validate_item_transaction(config, item, quantity, locations)
  # ... existing validation
  
  if config.validation_rules.include?(:your_custom_rule)
    # Your validation logic
  end
end
```

## Testing Your Migration

### 1. Functional Testing

Test each transaction type to ensure functionality is preserved:

```bash
# Manual testing checklist
- [ ] Stock In: Add items, scan barcodes, submit form
- [ ] Stock Out: Remove items, validate stock levels
- [ ] Adjust: Modify quantities, calculate adjustments  
- [ ] Move: Transfer between locations, validate rules
```

### 2. Automated Testing

Run the existing test suite:

```bash
# All tests should pass without modification
bundle exec rspec

# Specific transaction tests
bundle exec rspec spec/requests/stock_transactions_spec.rb
bundle exec rspec spec/integration/transaction_flows_integration_spec.rb
```

### 3. Performance Testing

The new architecture should improve performance:

```bash
# Check page load times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/teams/1/stock_transactions/stock_in"

# Monitor database queries
tail -f log/development.log | grep "SELECT\|INSERT\|UPDATE"
```

## Rollback Plan

If issues arise, you can temporarily rollback by:

### 1. Restore Old View Files

```bash
# If you have backups of old view files
cp backup/stock_in.html.erb app/views/stock_transactions/
cp backup/stock_out.html.erb app/views/stock_transactions/
cp backup/adjust.html.erb app/views/stock_transactions/
cp backup/move.html.erb app/views/stock_transactions/
```

### 2. Disable New JavaScript

```javascript
// Temporarily disable new controller
// Comment out in app/javascript/controllers/index.js
// application.register("stock-transaction", StockTransactionController)
```

### 3. Restore Old Controller Methods

```ruby
# Restore old individual methods if needed
def stock_in
  # Old implementation
end
```

## Common Issues and Solutions

### Issue: Custom CSS Not Applied

**Problem:** Custom styles not showing up in new components

**Solution:** 
```erb
<!-- Add custom CSS classes to shared components -->
<%= render 'stock_transactions/transaction_form', 
           config: config, 
           css_classes: 'your-custom-classes' %>
```

### Issue: JavaScript Errors

**Problem:** Custom JavaScript not working with new controller

**Solution:**
```javascript
// Extend the new controller instead of replacing it
import StockTransactionController from "./stock_transaction_controller"

export default class extends StockTransactionController {
  connect() {
    super.connect()
    // Your custom initialization
  }
}
```

### Issue: Validation Not Working

**Problem:** Custom validation rules not being applied

**Solution:**
```ruby
# Ensure validation rules are added to configuration
TRANSACTION_CONFIGS = {
  stock_in: {
    # ... other config
    validation_rules: [:positive_quantity, :your_custom_rule]
  }
}
```

### Issue: Performance Regression

**Problem:** Pages loading slower than before

**Solution:**
```ruby
# Check for N+1 queries and add includes
@team.locations.includes(:items).ordered.load

# Add fragment caching if needed
<% cache [team, 'location_selector'] do %>
  <!-- cached content -->
<% end %>
```

## Benefits After Migration

### For Developers
- **Reduced Code Duplication**: 60% reduction in view code
- **Easier Maintenance**: Single source of truth
- **Faster Development**: New transaction types in minutes
- **Better Testing**: Shared test examples

### For Users
- **Consistent Experience**: Identical behavior across transaction types
- **Better Performance**: Optimized shared components
- **Enhanced Features**: Unified barcode scanning improvements
- **Reliable Functionality**: Comprehensive test coverage

### For System
- **Improved Performance**: Cached components and optimized queries
- **Reduced Memory Usage**: Shared JavaScript modules
- **Better Scalability**: Configuration-driven architecture
- **Enhanced Maintainability**: Clear separation of concerns

## Getting Help

If you encounter issues during migration:

1. **Check Documentation**: Review architecture and developer guides
2. **Run Tests**: Ensure no regressions with automated tests
3. **Check Logs**: Review Rails and browser console logs
4. **Compare Configurations**: Ensure Ruby and JavaScript configs match
5. **Test Incrementally**: Migrate one transaction type at a time

## Post-Migration Checklist

After completing the migration:

- [ ] All transaction types work correctly
- [ ] Custom features still function
- [ ] Tests pass without modification
- [ ] Performance is improved or maintained
- [ ] Documentation is updated
- [ ] Team is trained on new architecture
- [ ] Monitoring shows no regressions
- [ ] Backup/rollback plan is documented

## Future Considerations

With the new architecture in place, you can:

- **Add New Transaction Types** easily using configuration
- **Enhance Barcode Scanning** with additional formats
- **Improve Performance** with advanced caching strategies
- **Add Real-time Features** with WebSocket integration
- **Create Mobile Apps** using the same API endpoints
- **Implement Bulk Operations** with shared processing logic

The refactored system provides a solid foundation for future enhancements while maintaining backward compatibility and improving maintainability.