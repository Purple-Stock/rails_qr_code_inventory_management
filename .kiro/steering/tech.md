# Technology Stack & Build System

## Core Technologies

- **Framework**: Ruby on Rails 8.0.1
- **Database**: PostgreSQL with custom enums for transaction types
- **Authentication**: Devise for user management
- **Frontend**: Hotwire (Turbo + Stimulus) with Tailwind CSS 4.x
- **Asset Pipeline**: Propshaft with Import Maps
- **Deployment**: Kamal with Docker containerization
- **Background Jobs**: Solid Queue
- **Caching**: Solid Cache
- **WebSockets**: Solid Cable

## Key Dependencies

- **QR Code Generation**: rqrcode, barby, chunky_png
- **PDF Generation**: prawn for label printing
- **Pagination**: kaminari
- **Payment Processing**: stripe
- **Internationalization**: rails-i18n (EN, PT-BR, FR)
- **API**: Built-in Rails API with token authentication

## JavaScript Libraries

- **Barcode Detection**: barcode-detector (CDN)
- **QR Code Scanning**: html5-qrcode (CDN)
- **Controllers**: Stimulus controllers for interactive features

## Development & Testing

- **Testing Framework**: RSpec with Capybara for system tests
- **Test Data**: FactoryBot with Faker
- **Code Quality**: RuboCop Rails Omakase, Brakeman security scanner
- **Database Annotations**: annotaterb for model documentation

## Common Commands

```bash
# Setup
bundle install
rails db:create db:migrate db:seed

# Development
bin/dev                    # Start development server with Procfile.dev
rails server              # Start Rails server only
rails console             # Interactive console

# Testing
bundle exec rspec          # Run all tests
bundle exec rspec spec/models  # Run model tests only
bundle exec capybara       # System tests with browser automation

# Database
rails db:migrate          # Run pending migrations
rails db:rollback         # Rollback last migration
rails db:reset            # Drop, create, migrate, seed

# Code Quality
bundle exec rubocop       # Ruby style checking
bundle exec brakeman      # Security vulnerability scan
bundle exec annotate      # Update model annotations

# Asset Management
rails assets:precompile   # Compile assets for production
rails importmap:install   # Install JavaScript dependencies

# Deployment
kamal setup              # Initial deployment setup
kamal deploy             # Deploy to production
```

## Environment Configuration

- Uses dotenv-rails for environment variables
- Supports multiple deployment environments via Kamal
- Database configuration in `config/database.yml`
- Credentials managed via Rails encrypted credentials