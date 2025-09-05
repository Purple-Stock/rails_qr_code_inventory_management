# Project Structure & Organization

## Rails Application Structure

### Core Application (`app/`)

- **Controllers**: RESTful controllers with nested team-based routing
  - `stock_transactions_controller.rb` - Main inventory operations
  - `items_controller.rb` - Item management with search and barcode lookup
  - `teams_controller.rb` - Multi-tenant team management
  - `api/v1/` - API endpoints for external integrations

- **Models**: ActiveRecord models with concerns pattern
  - `concerns/transaction_config.rb` - Shared transaction configuration logic
  - Database relationships: Team → Items/Locations → StockTransactions
  - Custom PostgreSQL enums for transaction types

- **Views**: ERB templates with partial organization
  - `stock_transactions/` - Transaction forms and modals
  - `shared/` - Common UI components (header, sidebar)
  - Responsive design with Tailwind CSS classes

- **JavaScript**: Stimulus controllers and modules
  - `controllers/stock_transaction_controller.js` - Main transaction UI logic
  - `modules/barcode_scanner.js` - QR code scanning functionality
  - `modules/transaction_config.js` - Configuration management

- **Helpers**: View helper methods for business logic presentation

### Configuration (`config/`)

- **Routes**: Nested resource routing with team scoping
- **Locales**: Multi-language support (EN, PT-BR, FR)
- **Initializers**: Devise, Kaminari pagination, asset pipeline
- **Environments**: Development, test, production configurations

### Database (`db/`)

- **Migrations**: Sequential database schema changes
- **Schema**: Auto-generated current database structure
- **Seeds**: Sample data for development

### Testing (`spec/`)

- **Models**: Unit tests with FactoryBot factories
- **Controllers**: Request specs for API endpoints
- **Integration**: End-to-end transaction flow testing
- **JavaScript**: Frontend component testing
- **System**: Capybara browser automation tests

### Documentation (`docs/`)

- Architecture documentation for stock transaction system
- Migration guides for system changes
- Developer guides for adding new transaction types

### Scripts (`script/`)

- Security review automation
- Performance validation tools

## Key Architectural Patterns

### Multi-Tenancy
- Team-based data isolation
- All major resources scoped to teams
- User authentication with team selection

### Transaction System
- Enum-based transaction types (stock_in, stock_out, adjust, move, count)
- Location-aware stock movements with validation
- Audit trail through transaction history

### API Design
- RESTful endpoints under `/api/v1/`
- Token-based authentication via API keys
- Team-scoped resource access

### Frontend Architecture
- Hotwire for SPA-like experience without complex JavaScript
- Stimulus controllers for interactive components
- Responsive design with Tailwind CSS utility classes

## File Naming Conventions

- Controllers: `snake_case_controller.rb`
- Models: `snake_case.rb` with concerns in `concerns/`
- Views: `snake_case.html.erb` with partials prefixed with `_`
- JavaScript: `snake_case_controller.js` for Stimulus controllers
- Tests: `*_spec.rb` following the file structure they test

## Development Workflow

- Feature branches with descriptive names
- RSpec tests required for new functionality
- RuboCop compliance for code style
- Database migrations for schema changes
- Internationalization for user-facing text