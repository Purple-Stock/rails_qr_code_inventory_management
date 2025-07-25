# Purple Stock - Product Overview

Purple Stock is a comprehensive inventory management system designed for businesses of all sizes. It provides robust features for tracking inventory across multiple locations, managing stock movements, and generating detailed reports.

## Core Functionality

- **Item Management**: Create, edit, and track inventory items with SKUs, barcodes, and QR codes
- **Stock Operations**: Handle stock-in, stock-out, adjustments, and transfers between locations
- **Location Management**: Multi-location inventory tracking with location-specific stock levels
- **QR Code Integration**: Generate and scan QR codes for quick item lookup and operations
- **Reporting & Analytics**: Dashboard with metrics, movement history, and exportable reports
- **API Access**: RESTful API with token-based authentication for external integrations
- **Webhook Support**: Event-driven notifications for inventory changes

## Key Business Rules

- All stock transactions must be associated with a team and user
- Stock movements require proper source/destination location validation
- Negative stock levels are allowed for adjustments but validated for stock-out operations
- Each team operates independently with isolated data
- QR codes are generated for all items to enable mobile scanning workflows

## User Roles & Access

- Team-based access control with user ownership
- API key authentication for programmatic access
- Multi-language support (English, Portuguese, French)