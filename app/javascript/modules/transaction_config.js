/**
 * Transaction Configuration Module
 * 
 * This module provides JavaScript configuration objects for each transaction type,
 * including validation rules, UI behavior, and API endpoints.
 * 
 * These configurations are designed to be passed from Rails views to JavaScript
 * controllers to enable configuration-driven behavior.
 */

export const TRANSACTION_CONFIGS = {
  stock_in: {
    type: 'stock_in',
    title: 'Stock In',
    color: 'green',
    locations: ['destination'],
    validation_rules: ['positive_quantity'],
    quantity_behavior: 'positive',
    description: 'Add items to inventory at a specific location',
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
      invalid_quantity: 'Quantity must be positive',
      insufficient_stock: 'Not enough stock available'
    },
    css_classes: {
      primary_color: 'green-600',
      hover_color: 'green-700',
      border_color: 'green-200',
      bg_color: 'green-50',
      text_color: 'green-600'
    }
  },

  stock_out: {
    type: 'stock_out',
    title: 'Stock Out',
    color: 'red',
    locations: ['source'],
    validation_rules: ['positive_quantity', 'stock_availability'],
    quantity_behavior: 'positive',
    description: 'Remove items from inventory at a specific location',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: false,
      require_location_selection: true,
      default_quantity: 1,
      quantity_step: 1,
      quantity_min: 1,
      validate_stock_availability: true
    },
    api_endpoints: {
      search: '/teams/{teamId}/items/search',
      transaction: '/teams/{teamId}/transactions'
    },
    validation_messages: {
      no_location: 'Please select a location',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Quantity must be positive',
      insufficient_stock: 'Not enough stock available for this item'
    },
    css_classes: {
      primary_color: 'red-600',
      hover_color: 'red-700',
      border_color: 'red-200',
      bg_color: 'red-50',
      text_color: 'red-600'
    }
  },

  adjust: {
    type: 'adjust',
    title: 'Adjust Stock',
    color: 'blue',
    locations: ['destination'],
    validation_rules: ['adjustment_calculation'],
    quantity_behavior: 'adjustment',
    description: 'Adjust item quantities to match actual counts',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: true,
      require_location_selection: true,
      default_quantity: 0, // Will be set to current stock
      quantity_step: 1,
      show_adjustment_difference: true
    },
    api_endpoints: {
      search: '/teams/{teamId}/items/search',
      transaction: '/teams/{teamId}/transactions'
    },
    validation_messages: {
      no_location: 'Please select a location',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Please enter a valid quantity',
      no_adjustment: 'No adjustment needed - quantity matches current stock'
    },
    css_classes: {
      primary_color: 'blue-600',
      hover_color: 'blue-700',
      border_color: 'blue-200',
      bg_color: 'blue-50',
      text_color: 'blue-600'
    }
  },

  move: {
    type: 'move',
    title: 'Move Stock',
    color: 'purple',
    locations: ['source', 'destination'],
    validation_rules: ['positive_quantity', 'stock_availability'],
    quantity_behavior: 'positive',
    description: 'Transfer items between locations',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: false,
      require_location_selection: true,
      require_different_locations: true,
      default_quantity: 1,
      quantity_step: 1,
      quantity_min: 1,
      validate_stock_availability: true
    },
    api_endpoints: {
      search: '/teams/{teamId}/items/search',
      transaction: '/teams/{teamId}/transactions/move'
    },
    validation_messages: {
      no_source_location: 'Please select a source location',
      no_destination_location: 'Please select a destination location',
      same_locations: 'Source and destination locations must be different',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Quantity must be positive',
      insufficient_stock: 'Not enough stock available at source location'
    },
    css_classes: {
      primary_color: 'purple-600',
      hover_color: 'purple-700',
      border_color: 'purple-200',
      bg_color: 'purple-50',
      text_color: 'purple-600'
    }
  },

  count: {
    type: 'count',
    title: 'Stock Count',
    color: 'yellow',
    locations: ['destination'],
    validation_rules: ['positive_quantity'],
    quantity_behavior: 'positive',
    description: 'Record stock count for inventory verification',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: false,
      require_location_selection: true,
      default_quantity: 0,
      quantity_step: 1,
      quantity_min: 0,
      show_count_difference: true
    },
    api_endpoints: {
      search: '/teams/{teamId}/items/search',
      transaction: '/teams/{teamId}/transactions'
    },
    validation_messages: {
      no_location: 'Please select a location',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Count must be zero or positive'
    },
    css_classes: {
      primary_color: 'yellow-600',
      hover_color: 'yellow-700',
      border_color: 'yellow-200',
      bg_color: 'yellow-50',
      text_color: 'yellow-600'
    }
  }
}

/**
 * Get configuration for a specific transaction type
 * @param {string} type - Transaction type
 * @param {string} teamId - Team ID for API endpoints
 * @returns {object} Configuration object with interpolated API endpoints
 */
export function getTransactionConfig(type, teamId = null) {
  const config = TRANSACTION_CONFIGS[type]
  if (!config) {
    throw new Error(`Unknown transaction type: ${type}`)
  }

  // Create a deep copy to avoid modifying the original
  const configCopy = JSON.parse(JSON.stringify(config))

  // Interpolate team ID in API endpoints if provided
  if (teamId) {
    Object.keys(configCopy.api_endpoints).forEach(key => {
      configCopy.api_endpoints[key] = configCopy.api_endpoints[key].replace('{teamId}', teamId)
    })
  }

  return configCopy
}

/**
 * Get all available transaction types
 * @returns {string[]} Array of transaction type names
 */
export function getAvailableTransactionTypes() {
  return Object.keys(TRANSACTION_CONFIGS)
}

/**
 * Check if a transaction type is valid
 * @param {string} type - Transaction type to validate
 * @returns {boolean} True if valid
 */
export function isValidTransactionType(type) {
  return TRANSACTION_CONFIGS.hasOwnProperty(type)
}

/**
 * Get validation rules for a transaction type
 * @param {string} type - Transaction type
 * @returns {string[]} Array of validation rule names
 */
export function getValidationRules(type) {
  const config = TRANSACTION_CONFIGS[type]
  return config ? config.validation_rules : []
}

/**
 * Get UI behavior configuration for a transaction type
 * @param {string} type - Transaction type
 * @returns {object} UI behavior configuration
 */
export function getUIBehavior(type) {
  const config = TRANSACTION_CONFIGS[type]
  return config ? config.ui_behavior : {}
}

/**
 * Get CSS classes for a transaction type
 * @param {string} type - Transaction type
 * @returns {object} CSS class configuration
 */
export function getCSSClasses(type) {
  const config = TRANSACTION_CONFIGS[type]
  return config ? config.css_classes : {}
}

/**
 * Get validation messages for a transaction type
 * @param {string} type - Transaction type
 * @returns {object} Validation message configuration
 */
export function getValidationMessages(type) {
  const config = TRANSACTION_CONFIGS[type]
  return config ? config.validation_messages : {}
}

/**
 * Create a configuration object suitable for passing to Stimulus controllers
 * @param {string} type - Transaction type
 * @param {string} teamId - Team ID
 * @param {object} overrides - Optional configuration overrides
 * @returns {object} Configuration object for Stimulus controller
 */
export function createStimulusConfig(type, teamId, overrides = {}) {
  const baseConfig = getTransactionConfig(type, teamId)
  
  // Merge with any overrides
  const config = {
    ...baseConfig,
    ...overrides,
    ui_behavior: {
      ...baseConfig.ui_behavior,
      ...(overrides.ui_behavior || {})
    },
    api_endpoints: {
      ...baseConfig.api_endpoints,
      ...(overrides.api_endpoints || {})
    },
    validation_messages: {
      ...baseConfig.validation_messages,
      ...(overrides.validation_messages || {})
    },
    css_classes: {
      ...baseConfig.css_classes,
      ...(overrides.css_classes || {})
    }
  }

  return config
}

export default {
  TRANSACTION_CONFIGS,
  getTransactionConfig,
  getAvailableTransactionTypes,
  isValidTransactionType,
  getValidationRules,
  getUIBehavior,
  getCSSClasses,
  getValidationMessages,
  createStimulusConfig
}