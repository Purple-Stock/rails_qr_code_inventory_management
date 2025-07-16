/**
 * @jest-environment jsdom
 */

import { Application } from "@hotwired/stimulus"
import StockTransactionController from '../../../app/javascript/controllers/stock_transaction_controller'

// Mock the barcode scanner module
jest.mock('../../../app/javascript/modules/barcode_scanner', () => ({
  createTransactionScanner: jest.fn(() => ({
    onSuccess: jest.fn().mockReturnThis(),
    onError: jest.fn().mockReturnThis(),
    onLibraryError: jest.fn().mockReturnThis(),
    isCurrentlyScanning: jest.fn(() => false),
    startCameraScanning: jest.fn().mockResolvedValue(),
    stopCameraScanning: jest.fn().mockResolvedValue(),
    scanFile: jest.fn().mockResolvedValue('test-barcode'),
    destroy: jest.fn().mockResolvedValue()
  }))
}))

// Mock the transaction config module
jest.mock('../../../app/javascript/modules/transaction_config', () => ({
  createStimulusConfig: jest.fn(() => ({
    type: 'stock_in',
    title: 'Stock In',
    color: 'green',
    locations: ['destination'],
    validation_rules: ['positive_quantity'],
    quantity_behavior: 'positive',
    ui_behavior: {
      show_current_stock: true,
      allow_negative_quantity: false,
      require_location_selection: true,
      default_quantity: 1
    },
    api_endpoints: {
      search: '/teams/123/items/search',
      transaction: '/teams/123/transactions'
    },
    validation_messages: {
      no_location: 'Please select a location',
      no_items: 'Please add items and quantities',
      invalid_quantity: 'Quantity must be positive'
    },
    css_classes: {
      primary_color: 'green-600',
      hover_color: 'green-700'
    }
  }))
}))

describe('StockTransactionController', () => {
  let application
  let controller
  let element

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div data-controller="stock-transaction"
           data-stock-transaction-team-id-value="123"
           data-stock-transaction-type-value="stock_in">
        
        <!-- Item list and template -->
        <tbody data-stock-transaction-target="itemsList"></tbody>
        <template data-stock-transaction-target="itemTemplate">
          <tr data-item-id="">
            <td><span data-item-name></span></td>
            <td><span data-item-sku></span></td>
            <td><span data-current-stock></span></td>
            <td><input data-quantity type="number" min="1"></td>
            <td><button data-action="stock-transaction#removeItem">Remove</button></td>
          </tr>
        </template>
        
        <!-- Total quantity display -->
        <span data-stock-transaction-target="totalQuantity">0</span>
        
        <!-- Barcode scanner elements -->
        <div data-stock-transaction-target="barcodeModal" class="hidden">
          <div data-stock-transaction-target="scannerContainer">
            <div id="qr-reader" data-stock-transaction-target="qrReader"></div>
            <button data-stock-transaction-target="startScannerButton">Start Camera</button>
            <input type="file" data-stock-transaction-target="fileInput">
            <input type="text" data-stock-transaction-target="barcodeInput">
            <button data-stock-transaction-target="searchButton">Search</button>
          </div>
        </div>
        
        <!-- Form elements -->
        <select name="destination_location_id">
          <option value="1">Warehouse A</option>
        </select>
        <textarea name="notes"></textarea>
      </div>
    `

    // Set up Stimulus application
    application = Application.start()
    application.register("stock-transaction", StockTransactionController)
    
    element = document.querySelector('[data-controller="stock-transaction"]')
    controller = application.getControllerForElementAndIdentifier(element, "stock-transaction")

    // Mock fetch
    global.fetch = jest.fn()
    
    // Mock CSRF token
    document.head.innerHTML = '<meta name="csrf-token" content="test-token">'
  })

  afterEach(() => {
    application.stop()
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('connects successfully', () => {
      expect(controller).toBeDefined()
      expect(controller.typeValue).toBe('stock_in')
      expect(controller.teamIdValue).toBe('123')
      expect(controller.items).toBeInstanceOf(Map)
    })

    it('initializes configuration from values', () => {
      expect(controller.transactionConfig).toBeDefined()
      expect(controller.transactionConfig.type).toBe('stock_in')
    })

    it('initializes barcode scanner', () => {
      const { createTransactionScanner } = require('../../../app/javascript/modules/barcode_scanner')
      expect(createTransactionScanner).toHaveBeenCalledWith('stock_in', 'qr-reader')
    })
  })

  describe('item management', () => {
    const mockItem = {
      id: '1',
      name: 'Test Item',
      sku: 'TEST-001',
      currentStock: 10
    }

    it('adds item successfully', () => {
      const event = new CustomEvent('item-selected', { detail: mockItem })
      
      controller.addItem(event)
      
      expect(controller.items.has('1')).toBe(true)
      expect(controller.itemsListTarget.children.length).toBe(1)
      
      const row = controller.itemsListTarget.children[0]
      expect(row.dataset.itemId).toBe('1')
      expect(row.querySelector('[data-item-name]').textContent).toBe('Test Item')
      expect(row.querySelector('[data-item-sku]').textContent).toBe('TEST-001')
      expect(row.querySelector('[data-current-stock]').textContent).toBe('10')
    })

    it('skips adding duplicate items', () => {
      const event = new CustomEvent('item-selected', { detail: mockItem })
      
      controller.addItem(event)
      controller.addItem(event) // Try to add again
      
      expect(controller.items.size).toBe(1)
      expect(controller.itemsListTarget.children.length).toBe(1)
    })

    it('configures quantity input based on transaction type', () => {
      const event = new CustomEvent('item-selected', { detail: mockItem })
      
      controller.addItem(event)
      
      const quantityInput = controller.itemsListTarget.querySelector('[data-quantity]')
      expect(quantityInput.min).toBe('1')
      expect(quantityInput.value).toBe('1')
    })

    it('removes item successfully', () => {
      const event = new CustomEvent('item-selected', { detail: mockItem })
      controller.addItem(event)
      
      const removeButton = controller.itemsListTarget.querySelector('button')
      removeButton.click()
      
      expect(controller.items.has('1')).toBe(false)
      expect(controller.itemsListTarget.children.length).toBe(0)
    })

    it('updates total quantity when items change', () => {
      const event = new CustomEvent('item-selected', { detail: mockItem })
      controller.addItem(event)
      
      const quantityInput = controller.itemsListTarget.querySelector('[data-quantity]')
      quantityInput.value = '5'
      quantityInput.dispatchEvent(new Event('input'))
      
      expect(controller.totalQuantityTarget.textContent).toBe('5')
    })
  })

  describe('barcode scanner integration', () => {
    it('opens barcode modal', () => {
      controller.openBarcodeModal()
      
      expect(controller.barcodeModalTarget.classList.contains('hidden')).toBe(false)
    })

    it('closes barcode modal', () => {
      controller.openBarcodeModal()
      controller.closeBarcodeModal()
      
      expect(controller.barcodeModalTarget.classList.contains('hidden')).toBe(true)
    })

    it('processes scanned barcode', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          items: [{ id: '1', name: 'Scanned Item', sku: 'SCAN-001', currentStock: 5 }]
        })
      }
      global.fetch.mockResolvedValue(mockResponse)
      
      await controller.searchItemByBarcode('test-barcode-123')
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/teams/123/items/search?barcode=test-barcode-123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-token'
          })
        })
      )
    })

    it('handles barcode search error', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'))
      
      // Mock showToast to avoid DOM manipulation
      controller.showToast = jest.fn()
      
      await controller.searchItemByBarcode('test-barcode')
      
      expect(controller.showToast).toHaveBeenCalledWith(
        'Error searching for item. Please try again.',
        'red'
      )
    })

    it('handles file selection for barcode scanning', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const event = { target: { files: [mockFile], value: '' } }
      
      controller.showToast = jest.fn()
      
      await controller.handleFileSelect(event)
      
      expect(controller.barcodeScanner.scanFile).toHaveBeenCalledWith(mockFile)
    })

    it('processes barcode input on Enter key', () => {
      controller.barcodeInputTarget.value = 'test-barcode'
      controller.processScannedItem = jest.fn()
      
      const event = new KeyboardEvent('keypress', { key: 'Enter' })
      controller.handleBarcodeKeypress(event)
      
      expect(controller.processScannedItem).toHaveBeenCalled()
    })
  })

  describe('form validation', () => {
    beforeEach(() => {
      // Add some items for testing
      const mockItem = { id: '1', name: 'Test Item', sku: 'TEST-001', currentStock: 10 }
      const event = new CustomEvent('item-selected', { detail: mockItem })
      controller.addItem(event)
    })

    it('validates location selection', () => {
      const validation = controller.validateLocations()
      
      expect(validation.valid).toBe(true)
      expect(validation.locations.destination).toBe('1')
    })

    it('fails validation when location is missing', () => {
      const locationSelect = element.querySelector('select[name="destination_location_id"]')
      locationSelect.value = ''
      
      const validation = controller.validateLocations()
      
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('location')
    })

    it('collects items correctly', () => {
      const quantityInput = controller.itemsListTarget.querySelector('[data-quantity]')
      quantityInput.value = '3'
      
      const items = controller.collectItems()
      
      expect(items).toHaveLength(1)
      expect(items[0]).toEqual({
        id: '1',
        quantity: 3,
        currentStock: 10,
        name: 'Test Item'
      })
    })

    it('validates items based on configuration', () => {
      const items = [{ id: '1', quantity: 2, currentStock: 10, name: 'Test Item' }]
      
      const validation = controller.validateItems(items)
      
      expect(validation.valid).toBe(true)
    })

    it('fails item validation for insufficient stock', () => {
      // Mock stock_out configuration with stock validation
      controller.transactionConfig.validation_rules = ['stock_availability']
      
      const items = [{ id: '1', quantity: 15, currentStock: 10, name: 'Test Item' }]
      
      const validation = controller.validateItems(items)
      
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('Not enough stock')
    })
  })

  describe('transaction submission', () => {
    beforeEach(() => {
      // Add item and set up form
      const mockItem = { id: '1', name: 'Test Item', sku: 'TEST-001', currentStock: 10 }
      const event = new CustomEvent('item-selected', { detail: mockItem })
      controller.addItem(event)
      
      const quantityInput = controller.itemsListTarget.querySelector('[data-quantity]')
      quantityInput.value = '2'
      
      const notesTextarea = element.querySelector('textarea[name="notes"]')
      notesTextarea.value = 'Test notes'
    })

    it('builds transaction data correctly', () => {
      const locations = { destination: '1' }
      const items = [{ id: '1', quantity: 2 }]
      
      const data = controller.buildTransactionData(locations, items)
      
      expect(data).toEqual({
        items: [{ id: '1', quantity: 2 }],
        notes: 'Test notes',
        transaction_type: 'stock_in',
        location: '1'
      })
    })

    it('submits transaction successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ redirect_url: '/success' })
      }
      global.fetch.mockResolvedValue(mockResponse)
      
      // Mock window.location.href
      delete window.location
      window.location = { href: '' }
      
      await controller.save()
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/teams/123/transactions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'test-token'
          }),
          body: expect.stringContaining('"transaction_type":"stock_in"')
        })
      )
      
      expect(window.location.href).toBe('/success')
    })

    it('handles transaction submission error', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: 'Transaction failed' })
      }
      global.fetch.mockResolvedValue(mockResponse)
      
      // Mock alert
      window.alert = jest.fn()
      
      await controller.save()
      
      expect(window.alert).toHaveBeenCalledWith('Transaction failed')
    })

    it('prevents submission with validation errors', () => {
      // Remove location selection
      const locationSelect = element.querySelector('select[name="destination_location_id"]')
      locationSelect.value = ''
      
      // Mock alert
      window.alert = jest.fn()
      
      controller.save()
      
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('location'))
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('configuration-driven behavior', () => {
    it('uses fallback configuration when config loading fails', () => {
      const { createStimulusConfig } = require('../../../app/javascript/modules/transaction_config')
      createStimulusConfig.mockImplementation(() => {
        throw new Error('Config error')
      })
      
      // Create new controller instance
      const newElement = element.cloneNode(true)
      document.body.appendChild(newElement)
      const newController = application.getControllerForElementAndIdentifier(newElement, "stock-transaction")
      
      expect(newController.transactionConfig).toBeDefined()
      expect(newController.transactionConfig.type).toBe('stock_in')
    })

    it('configures quantity input based on transaction type', () => {
      // Test with adjust configuration
      controller.transactionConfig.quantity_behavior = 'adjustment'
      
      const mockItem = { id: '1', name: 'Test Item', currentStock: 10 }
      const quantityInput = document.createElement('input')
      
      controller.configureQuantityInput(quantityInput, mockItem)
      
      expect(quantityInput.value).toBe('10') // Should use current stock for adjustments
    })

    it('validates quantity input based on configuration', () => {
      const mockItem = { id: '1', name: 'Test Item', currentStock: 5 }
      const quantityInput = document.createElement('input')
      quantityInput.value = '10'
      
      controller.transactionConfig.validation_rules = ['stock_availability']
      
      controller.validateQuantityInput(quantityInput, mockItem)
      
      expect(quantityInput.classList.contains('border-red-500')).toBe(true)
      expect(quantityInput.title).toContain('Only 5 available')
    })
  })

  describe('cleanup', () => {
    it('destroys barcode scanner on disconnect', () => {
      controller.disconnect()
      
      expect(controller.barcodeScanner.destroy).toHaveBeenCalled()
    })
  })
})