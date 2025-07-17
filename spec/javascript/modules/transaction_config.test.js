/**
 * @jest-environment jsdom
 */

import {
  TRANSACTION_CONFIGS,
  getTransactionConfig,
  getAvailableTransactionTypes,
  isValidTransactionType,
  getValidationRules,
  getUIBehavior,
  getCSSClasses,
  getValidationMessages,
  createStimulusConfig
} from '../../../app/javascript/modules/transaction_config'

describe('Transaction Configuration Module', () => {
  describe('TRANSACTION_CONFIGS', () => {
    it('contains all expected transaction types', () => {
      const expectedTypes = ['stock_in', 'stock_out', 'adjust', 'move', 'count']
      
      expectedTypes.forEach(type => {
        expect(TRANSACTION_CONFIGS).toHaveProperty(type)
      })
    })

    it('has consistent structure for all transaction types', () => {
      const requiredProperties = [
        'type', 'title', 'color', 'locations', 'validation_rules',
        'quantity_behavior', 'description', 'ui_behavior', 'api_endpoints',
        'validation_messages', 'css_classes'
      ]

      Object.values(TRANSACTION_CONFIGS).forEach(config => {
        requiredProperties.forEach(prop => {
          expect(config).toHaveProperty(prop)
        })
      })
    })

    describe('stock_in configuration', () => {
      const config = TRANSACTION_CONFIGS.stock_in

      it('has correct basic properties', () => {
        expect(config.type).toBe('stock_in')
        expect(config.title).toBe('Stock In')
        expect(config.color).toBe('green')
        expect(config.quantity_behavior).toBe('positive')
      })

      it('requires destination location only', () => {
        expect(config.locations).toEqual(['destination'])
      })

      it('has positive quantity validation', () => {
        expect(config.validation_rules).toContain('positive_quantity')
      })

      it('has correct UI behavior', () => {
        expect(config.ui_behavior.allow_negative_quantity).toBe(false)
        expect(config.ui_behavior.require_location_selection).toBe(true)
        expect(config.ui_behavior.default_quantity).toBe(1)
      })
    })

    describe('stock_out configuration', () => {
      const config = TRANSACTION_CONFIGS.stock_out

      it('has correct basic properties', () => {
        expect(config.type).toBe('stock_out')
        expect(config.title).toBe('Stock Out')
        expect(config.color).toBe('red')
        expect(config.quantity_behavior).toBe('positive')
      })

      it('requires source location only', () => {
        expect(config.locations).toEqual(['source'])
      })

      it('has stock availability validation', () => {
        expect(config.validation_rules).toContain('stock_availability')
        expect(config.validation_rules).toContain('positive_quantity')
      })

      it('validates stock availability in UI behavior', () => {
        expect(config.ui_behavior.validate_stock_availability).toBe(true)
      })
    })

    describe('adjust configuration', () => {
      const config = TRANSACTION_CONFIGS.adjust

      it('has correct basic properties', () => {
        expect(config.type).toBe('adjust')
        expect(config.title).toBe('Adjust Stock')
        expect(config.color).toBe('blue')
        expect(config.quantity_behavior).toBe('adjustment')
      })

      it('allows negative quantities', () => {
        expect(config.ui_behavior.allow_negative_quantity).toBe(true)
      })

      it('shows adjustment difference', () => {
        expect(config.ui_behavior.show_adjustment_difference).toBe(true)
      })

      it('has adjustment calculation validation', () => {
        expect(config.validation_rules).toContain('adjustment_calculation')
      })
    })

    describe('move configuration', () => {
      const config = TRANSACTION_CONFIGS.move

      it('has correct basic properties', () => {
        expect(config.type).toBe('move')
        expect(config.title).toBe('Move Stock')
        expect(config.color).toBe('purple')
        expect(config.quantity_behavior).toBe('positive')
      })

      it('requires both source and destination locations', () => {
        expect(config.locations).toEqual(['source', 'destination'])
      })

      it('requires different locations', () => {
        expect(config.ui_behavior.require_different_locations).toBe(true)
      })

      it('has custom API endpoint', () => {
        expect(config.api_endpoints.transaction).toContain('/move')
      })
    })

    describe('count configuration', () => {
      const config = TRANSACTION_CONFIGS.count

      it('has correct basic properties', () => {
        expect(config.type).toBe('count')
        expect(config.title).toBe('Stock Count')
        expect(config.color).toBe('yellow')
        expect(config.quantity_behavior).toBe('positive')
      })

      it('allows zero quantities', () => {
        expect(config.ui_behavior.quantity_min).toBe(0)
      })

      it('shows count difference', () => {
        expect(config.ui_behavior.show_count_difference).toBe(true)
      })
    })
  })

  describe('getTransactionConfig', () => {
    it('returns configuration for valid transaction type', () => {
      const config = getTransactionConfig('stock_in')
      
      expect(config.type).toBe('stock_in')
      expect(config.title).toBe('Stock In')
    })

    it('interpolates team ID in API endpoints', () => {
      const config = getTransactionConfig('stock_in', '123')
      
      expect(config.api_endpoints.search).toBe('/teams/123/items/search')
      expect(config.api_endpoints.transaction).toBe('/teams/123/transactions')
    })

    it('returns deep copy to avoid mutation', () => {
      const config1 = getTransactionConfig('stock_in')
      const config2 = getTransactionConfig('stock_in')
      
      config1.title = 'Modified Title'
      
      expect(config2.title).toBe('Stock In')
      expect(config1).not.toBe(config2)
    })

    it('throws error for invalid transaction type', () => {
      expect(() => {
        getTransactionConfig('invalid_type')
      }).toThrow('Unknown transaction type: invalid_type')
    })

    it('works without team ID', () => {
      const config = getTransactionConfig('stock_in')
      
      expect(config.api_endpoints.search).toBe('/teams/{teamId}/items/search')
    })
  })

  describe('getAvailableTransactionTypes', () => {
    it('returns all transaction type names', () => {
      const types = getAvailableTransactionTypes()
      
      expect(types).toContain('stock_in')
      expect(types).toContain('stock_out')
      expect(types).toContain('adjust')
      expect(types).toContain('move')
      expect(types).toContain('count')
      expect(types).toHaveLength(5)
    })
  })

  describe('isValidTransactionType', () => {
    it('returns true for valid transaction types', () => {
      expect(isValidTransactionType('stock_in')).toBe(true)
      expect(isValidTransactionType('stock_out')).toBe(true)
      expect(isValidTransactionType('adjust')).toBe(true)
      expect(isValidTransactionType('move')).toBe(true)
      expect(isValidTransactionType('count')).toBe(true)
    })

    it('returns false for invalid transaction types', () => {
      expect(isValidTransactionType('invalid')).toBe(false)
      expect(isValidTransactionType('')).toBe(false)
      expect(isValidTransactionType(null)).toBe(false)
      expect(isValidTransactionType(undefined)).toBe(false)
    })
  })

  describe('getValidationRules', () => {
    it('returns validation rules for valid transaction type', () => {
      const rules = getValidationRules('stock_out')
      
      expect(rules).toContain('positive_quantity')
      expect(rules).toContain('stock_availability')
    })

    it('returns empty array for invalid transaction type', () => {
      const rules = getValidationRules('invalid')
      
      expect(rules).toEqual([])
    })
  })

  describe('getUIBehavior', () => {
    it('returns UI behavior for valid transaction type', () => {
      const behavior = getUIBehavior('adjust')
      
      expect(behavior.allow_negative_quantity).toBe(true)
      expect(behavior.show_adjustment_difference).toBe(true)
    })

    it('returns empty object for invalid transaction type', () => {
      const behavior = getUIBehavior('invalid')
      
      expect(behavior).toEqual({})
    })
  })

  describe('getCSSClasses', () => {
    it('returns CSS classes for valid transaction type', () => {
      const classes = getCSSClasses('stock_in')
      
      expect(classes.primary_color).toBe('green-600')
      expect(classes.hover_color).toBe('green-700')
      expect(classes.text_color).toBe('green-600')
    })

    it('returns empty object for invalid transaction type', () => {
      const classes = getCSSClasses('invalid')
      
      expect(classes).toEqual({})
    })
  })

  describe('getValidationMessages', () => {
    it('returns validation messages for valid transaction type', () => {
      const messages = getValidationMessages('move')
      
      expect(messages.no_source_location).toBe('Please select a source location')
      expect(messages.no_destination_location).toBe('Please select a destination location')
      expect(messages.same_locations).toBe('Source and destination locations must be different')
    })

    it('returns empty object for invalid transaction type', () => {
      const messages = getValidationMessages('invalid')
      
      expect(messages).toEqual({})
    })
  })

  describe('createStimulusConfig', () => {
    it('creates configuration suitable for Stimulus controller', () => {
      const config = createStimulusConfig('stock_in', '123')
      
      expect(config.type).toBe('stock_in')
      expect(config.api_endpoints.search).toBe('/teams/123/items/search')
      expect(config.ui_behavior).toBeDefined()
      expect(config.validation_messages).toBeDefined()
      expect(config.css_classes).toBeDefined()
    })

    it('merges overrides correctly', () => {
      const overrides = {
        title: 'Custom Title',
        ui_behavior: {
          default_quantity: 5,
          custom_property: true
        },
        api_endpoints: {
          custom_endpoint: '/custom'
        }
      }
      
      const config = createStimulusConfig('stock_in', '123', overrides)
      
      expect(config.title).toBe('Custom Title')
      expect(config.ui_behavior.default_quantity).toBe(5)
      expect(config.ui_behavior.custom_property).toBe(true)
      expect(config.ui_behavior.show_current_stock).toBe(true) // Original preserved
      expect(config.api_endpoints.custom_endpoint).toBe('/custom')
      expect(config.api_endpoints.search).toBe('/teams/123/items/search') // Original preserved
    })

    it('handles deep merging of nested objects', () => {
      const overrides = {
        validation_messages: {
          no_items: 'Custom no items message',
          custom_message: 'Custom message'
        },
        css_classes: {
          primary_color: 'custom-600'
        }
      }
      
      const config = createStimulusConfig('stock_out', '456', overrides)
      
      expect(config.validation_messages.no_items).toBe('Custom no items message')
      expect(config.validation_messages.custom_message).toBe('Custom message')
      expect(config.validation_messages.insufficient_stock).toBe('Not enough stock available for this item') // Original preserved
      expect(config.css_classes.primary_color).toBe('custom-600')
      expect(config.css_classes.hover_color).toBe('red-700') // Original preserved
    })

    it('works without overrides', () => {
      const config = createStimulusConfig('adjust', '789')
      
      expect(config.type).toBe('adjust')
      expect(config.api_endpoints.search).toBe('/teams/789/items/search')
    })
  })

  describe('Configuration consistency', () => {
    it('all configurations have required CSS classes', () => {
      const requiredCSSClasses = ['primary_color', 'hover_color', 'border_color', 'bg_color', 'text_color']
      
      Object.values(TRANSACTION_CONFIGS).forEach(config => {
        requiredCSSClasses.forEach(className => {
          expect(config.css_classes).toHaveProperty(className)
          expect(config.css_classes[className]).toMatch(/^[a-z]+-\d+$/)
        })
      })
    })

    it('all configurations have required validation messages', () => {
      const requiredMessages = ['no_items', 'invalid_quantity']
      
      Object.values(TRANSACTION_CONFIGS).forEach(config => {
        requiredMessages.forEach(message => {
          expect(config.validation_messages).toHaveProperty(message)
          expect(typeof config.validation_messages[message]).toBe('string')
        })
      })
    })

    it('all configurations have required UI behavior properties', () => {
      const requiredBehavior = ['show_current_stock', 'require_location_selection', 'default_quantity']
      
      Object.values(TRANSACTION_CONFIGS).forEach(config => {
        requiredBehavior.forEach(behavior => {
          expect(config.ui_behavior).toHaveProperty(behavior)
        })
      })
    })

    it('location requirements match validation rules', () => {
      // Stock out and move should have stock availability validation
      expect(TRANSACTION_CONFIGS.stock_out.validation_rules).toContain('stock_availability')
      expect(TRANSACTION_CONFIGS.move.validation_rules).toContain('stock_availability')
      
      // Adjust should have adjustment calculation validation
      expect(TRANSACTION_CONFIGS.adjust.validation_rules).toContain('adjustment_calculation')
      
      // All except adjust should have positive quantity validation
      ['stock_in', 'stock_out', 'move', 'count'].forEach(type => {
        expect(TRANSACTION_CONFIGS[type].validation_rules).toContain('positive_quantity')
      })
    })
  })
})