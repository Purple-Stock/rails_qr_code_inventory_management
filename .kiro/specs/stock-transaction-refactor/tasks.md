# Implementation Plan

- [x] 1. Create transaction configuration system
  - Create TransactionConfig model with type-specific configurations
  - Define configuration constants for all transaction types (stock_in, stock_out, adjust, move)
  - Add helper methods for location requirements and validation rules
  - Write unit tests for configuration system
  - _Requirements: 1.1, 3.1, 4.2_

- [x] 2. Extract shared view components
  - [x] 2.1 Create base transaction form partial
    - Extract common form structure from existing transaction views
    - Create `app/views/stock_transactions/_transaction_form.html.erb` with configurable sections
    - Implement transaction-specific styling and labels using configuration
    - _Requirements: 1.1, 2.1, 4.2_

  - [x] 2.2 Create location selector partial
    - Extract location selection logic into `app/views/stock_transactions/_location_selector.html.erb`
    - Support single location (stock_in, stock_out, adjust) and dual location (move) modes
    - Include validation error handling and empty state messaging
    - _Requirements: 1.1, 2.4, 4.2_

  - [x] 2.3 Create item search and selection partial
    - Extract item search interface into `app/views/stock_transactions/_item_search.html.erb`
    - Include search input, results display, and barcode scanner button
    - Make search behavior configurable for different transaction types
    - _Requirements: 1.1, 2.1, 4.2_

  - [x] 2.4 Create item table partial
    - Extract item display table into `app/views/stock_transactions/_item_table.html.erb`
    - Support different quantity input behaviors (positive only, stock limits, etc.)
    - Include remove item functionality and total calculation
    - _Requirements: 1.1, 2.1, 4.2_

- [x] 3. Create unified barcode scanner component
  - [x] 3.1 Extract barcode modal partial
    - Create `app/views/stock_transactions/_barcode_modal.html.erb` with configurable styling
    - Support different modal colors and titles based on transaction type
    - Include camera scanning and file upload functionality
    - _Requirements: 1.3, 2.2, 4.2_

  - [x] 3.2 Create unified barcode scanner JavaScript module
    - Create `app/javascript/modules/barcode_scanner.js` with reusable scanner class
    - Consolidate HTML5-QRCode library integration and error handling
    - Support configurable callbacks for successful scans and errors
    - Remove duplicated scanner code from individual transaction views
    - _Requirements: 1.3, 3.2, 4.3_

- [x] 4. Refactor stock transaction controller
  - [x] 4.1 Create shared transaction processing methods
    - Extract common transaction creation logic into private `process_transaction` method
    - Create shared validation logic for items, locations, and quantities
    - Implement unified error handling and response formatting
    - _Requirements: 1.2, 4.1, 4.4_

  - [x] 4.2 Consolidate transaction-specific methods
    - Refactor `stock_in`, `stock_out`, `adjust`, and `move` methods to use shared logic
    - Maintain existing method signatures and response formats for backward compatibility
    - Remove duplicated code while preserving transaction-specific business rules
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4_

  - [x] 4.3 Create unified form rendering method
    - Extract common form rendering logic into private `render_transaction_form` method
    - Pass transaction configuration to views for dynamic behavior
    - Ensure all transaction types render correctly with shared components
    - _Requirements: 1.2, 4.1, 4.4_

- [ ] 5. Update JavaScript controllers
  - [ ] 5.1 Refactor stock transaction Stimulus controller
    - Update `app/javascript/controllers/stock_transaction_controller.js` to use configuration-driven behavior
    - Consolidate item addition, removal, and total calculation logic
    - Integrate with unified barcode scanner module
    - _Requirements: 1.3, 3.2, 4.3_

  - [ ] 5.2 Create transaction-specific JavaScript configurations
    - Define JavaScript configuration objects for each transaction type
    - Include validation rules, UI behavior, and API endpoints
    - Pass configurations from Rails views to JavaScript controllers
    - _Requirements: 3.1, 3.2, 4.3_

- [ ] 6. Replace individual transaction views
  - [ ] 6.1 Update stock_in view to use shared components
    - Replace `app/views/stock_transactions/stock_in.html.erb` with shared component calls
    - Ensure all existing functionality works identically
    - Test barcode scanning, item selection, and form submission
    - _Requirements: 1.1, 2.1, 2.2_

  - [ ] 6.2 Update stock_out view to use shared components
    - Replace `app/views/stock_transactions/stock_out.html.erb` with shared component calls
    - Preserve stock validation and quantity limit functionality
    - Test all stock_out specific features work correctly
    - _Requirements: 1.1, 2.2, 2.2_

  - [ ] 6.3 Update adjust view to use shared components
    - Replace `app/views/stock_transactions/adjust.html.erb` with shared component calls
    - Maintain adjustment calculation behavior and UI
    - Verify adjust-specific functionality remains intact
    - _Requirements: 1.1, 2.3, 2.2_

  - [ ] 6.4 Update move view to use shared components
    - Replace `app/views/stock_transactions/move.html.erb` with shared component calls
    - Preserve dual-location selection and move-specific validation
    - Test source/destination location functionality
    - _Requirements: 1.1, 2.4, 2.2_

- [ ] 7. Write comprehensive tests
  - [ ] 7.1 Create shared component tests
    - Write unit tests for each shared partial component
    - Test configuration-driven behavior and edge cases
    - Ensure components render correctly for all transaction types
    - _Requirements: 5.2, 5.1_

  - [ ] 7.2 Update controller tests
    - Refactor existing controller tests to use shared examples for common behavior
    - Add tests for new shared methods and consolidated logic
    - Ensure all transaction types maintain existing test coverage
    - _Requirements: 5.1, 5.3_

  - [ ] 7.3 Create JavaScript module tests
    - Write unit tests for unified barcode scanner module
    - Test transaction controller refactoring with different configurations
    - Ensure JavaScript functionality works across all transaction types
    - _Requirements: 5.2, 5.1_

  - [ ] 7.4 Add integration tests
    - Create end-to-end tests for complete transaction flows
    - Test barcode scanning functionality across all transaction types
    - Verify form submissions and error handling work correctly
    - _Requirements: 5.3, 5.1_

- [ ] 8. Performance optimization and cleanup
  - [ ] 8.1 Remove duplicated code
    - Delete original transaction view files after confirming shared components work
    - Remove duplicated JavaScript code and unused functions
    - Clean up controller methods that are no longer needed
    - _Requirements: 1.1, 1.4_

  - [ ] 8.2 Optimize shared components
    - Minimize partial rendering overhead and improve caching
    - Optimize JavaScript bundle size by removing duplicate libraries
    - Ensure database queries remain efficient with refactored code
    - _Requirements: 1.4, 3.1_

  - [ ] 8.3 Update documentation
    - Document new shared component architecture and usage
    - Update developer documentation for adding new transaction types
    - Create migration guide for future transaction type additions
    - _Requirements: 3.1, 3.3, 4.2_

- [ ] 9. Validation and deployment preparation
  - [ ] 9.1 Comprehensive testing
    - Run full test suite to ensure no regressions
    - Perform manual testing of all transaction types
    - Test barcode scanning functionality across different browsers
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 9.2 Performance validation
    - Measure and compare performance before and after refactoring
    - Ensure page load times and JavaScript execution remain optimal
    - Validate that code complexity has been reduced as intended
    - _Requirements: 1.4, 3.1_

  - [ ] 9.3 Security review
    - Verify all existing security measures remain in place
    - Ensure CSRF protection and input validation work correctly
    - Confirm no new security vulnerabilities have been introduced
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_