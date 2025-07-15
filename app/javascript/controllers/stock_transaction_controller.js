import { Controller } from "@hotwired/stimulus"
import { createTransactionScanner } from "../modules/barcode_scanner"
import { getTransactionConfig, createStimulusConfig } from "../modules/transaction_config"

export default class extends Controller {
  static targets = [
    "itemsList", 
    "itemTemplate", 
    "totalQuantity",
    // Barcode scanner targets
    "barcodeModal",
    "scannerContainer", 
    "qrReader",
    "startScannerButton",
    "fileInput",
    "barcodeInput",
    "searchButton"
  ]
  static values = {
    teamId: String,
    type: { type: String, default: 'stock_in' },
    config: Object
  }

  connect() {
    this.items = new Map()
    this.barcodeScanner = null
    
    // Initialize configuration with defaults if not provided
    this.initializeConfiguration()
    
    // Set up event listeners based on configuration
    this.setupEventListeners()
    
    // Initialize barcode scanner if targets are available
    this.initializeBarcodeScanner()
    
    console.log("Stock Transaction Controller connected", {
      type: this.typeValue,
      config: this.transactionConfig,
      element: this.element
    })
  }

  initializeConfiguration() {
    try {
      // Use provided config or create configuration from module
      if (this.hasConfigValue) {
        this.transactionConfig = this.configValue
      } else {
        // Use the transaction configuration module
        this.transactionConfig = createStimulusConfig(this.typeValue, this.teamIdValue)
      }
      
      console.log("Configuration initialized", {
        type: this.typeValue,
        hasProvidedConfig: this.hasConfigValue,
        config: this.transactionConfig
      })
    } catch (error) {
      console.error("Failed to initialize configuration:", error)
      // Fallback to basic configuration
      this.transactionConfig = this.getFallbackConfig()
    }
  }

  getFallbackConfig() {
    console.warn("Using fallback configuration for transaction type:", this.typeValue)
    return {
      type: this.typeValue,
      title: this.typeValue.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      color: 'blue',
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
        search: `/teams/${this.teamIdValue}/items/search`,
        transaction: `/teams/${this.teamIdValue}/transactions`
      },
      validation_messages: {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Please enter a valid quantity'
      },
      css_classes: {
        primary_color: 'blue-600',
        hover_color: 'blue-700'
      }
    }
  }

  setupEventListeners() {
    // Use configuration-driven item addition
    this.element.addEventListener("item-selected", (event) => {
      console.log("Item selected event received", {
        type: this.typeValue,
        config: this.transactionConfig,
        event: event.detail
      })
      
      this.addItem(event)
    })
  }

  disconnect() {
    // Clean up barcode scanner
    if (this.barcodeScanner) {
      this.barcodeScanner.destroy()
    }
  }

  // Barcode Scanner Methods
  initializeBarcodeScanner() {
    if (!this.hasQrReaderTarget) {
      console.log("No QR reader target found, skipping barcode scanner initialization")
      return
    }

    const readerId = this.qrReaderTarget.id
    this.barcodeScanner = createTransactionScanner(this.typeValue, readerId)
    
    // Set up callbacks
    this.barcodeScanner
      .onSuccess((decodedText) => {
        console.log("Barcode scanned successfully:", decodedText)
        this.handleBarcodeSuccess(decodedText)
      })
      .onError((error) => {
        // Only log actual errors, not continuous scanning messages
        if (error && !error.toString().includes('No QR code found')) {
          console.warn("Barcode scan error:", error)
        }
      })
      .onLibraryError((error) => {
        console.error("Failed to load barcode scanner library:", error)
        this.showToast("Failed to load barcode scanner. Please try refreshing the page.", "red")
      })

    console.log("Barcode scanner initialized for transaction type:", this.typeValue)
  }

  async toggleScanner() {
    if (!this.barcodeScanner) {
      console.error("Barcode scanner not initialized")
      return
    }

    try {
      if (this.barcodeScanner.isCurrentlyScanning()) {
        await this.barcodeScanner.stopCameraScanning()
        this.updateScannerButtonState(false)
        console.log("Scanner stopped")
      } else {
        await this.barcodeScanner.startCameraScanning()
        this.updateScannerButtonState(true)
        console.log("Scanner started")
      }
    } catch (error) {
      console.error("Error toggling scanner:", error)
      this.showToast("Camera access failed. Please check permissions.", "red")
      this.updateScannerButtonState(false)
    }
  }

  async handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    if (!this.barcodeScanner) {
      console.error("Barcode scanner not initialized")
      return
    }

    try {
      this.showToast("Processing image...", "blue")
      await this.barcodeScanner.scanFile(file)
      // Success is handled by the onSuccess callback
    } catch (error) {
      console.error("File scan failed:", error)
      this.showToast("Could not read barcode from image. Please try another image.", "red")
    }
    
    // Clear the file input
    event.target.value = ''
  }

  handleBarcodeKeypress(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      this.processScannedItem()
    }
  }

  processScannedItem() {
    const barcodeValue = this.barcodeInputTarget.value.trim()
    if (!barcodeValue) {
      this.showToast("Please enter or scan a barcode", "yellow")
      return
    }

    this.handleBarcodeSuccess(barcodeValue)
  }

  handleBarcodeSuccess(barcode) {
    console.log("Processing barcode:", barcode)
    
    // Clear the input
    if (this.hasBarcodeInputTarget) {
      this.barcodeInputTarget.value = ''
    }
    
    // Stop scanning if active
    if (this.barcodeScanner && this.barcodeScanner.isCurrentlyScanning()) {
      this.barcodeScanner.stopCameraScanning()
      this.updateScannerButtonState(false)
    }
    
    // Close the modal
    this.closeBarcodeModal()
    
    // Search for the item by barcode
    this.searchItemByBarcode(barcode)
  }

  async searchItemByBarcode(barcode) {
    try {
      this.showToast("Searching for item...", "blue")
      
      const searchUrl = this.transactionConfig.api_endpoints.search
      const response = await fetch(`${searchUrl}?barcode=${encodeURIComponent(barcode)}`, {
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0] // Take the first match
        this.showToast(`Found: ${item.name}`, "green")
        
        // Dispatch item-selected event
        const event = new CustomEvent('item-selected', {
          detail: item,
          bubbles: true
        })
        this.element.dispatchEvent(event)
      } else {
        this.showToast("No item found with that barcode", "yellow")
      }
    } catch (error) {
      console.error("Error searching for item:", error)
      this.showToast("Error searching for item. Please try again.", "red")
    }
  }

  openBarcodeModal() {
    if (this.hasBarcodeModalTarget) {
      this.barcodeModalTarget.classList.remove('hidden')
      // Focus on the barcode input
      if (this.hasBarcodeInputTarget) {
        setTimeout(() => this.barcodeInputTarget.focus(), 100)
      }
    }
  }

  closeBarcodeModal() {
    if (this.hasBarcodeModalTarget) {
      this.barcodeModalTarget.classList.add('hidden')
      
      // Stop scanner if running
      if (this.barcodeScanner && this.barcodeScanner.isCurrentlyScanning()) {
        this.barcodeScanner.stopCameraScanning()
        this.updateScannerButtonState(false)
      }
      
      // Clear input
      if (this.hasBarcodeInputTarget) {
        this.barcodeInputTarget.value = ''
      }
    }
  }

  updateScannerButtonState(isScanning) {
    if (this.hasStartScannerButtonTarget) {
      const button = this.startScannerButtonTarget
      if (isScanning) {
        button.textContent = "Stop Camera"
        button.classList.add('bg-red-600', 'hover:bg-red-700')
        this.removeColorClasses(button)
      } else {
        button.textContent = "Start Camera"
        button.classList.remove('bg-red-600', 'hover:bg-red-700')
        // Use configuration-driven color
        const color = this.transactionConfig.color
        button.classList.add(`bg-${color}-600`, `hover:bg-${color}-700`)
      }
    }
  }

  removeColorClasses(element) {
    const colors = ['green', 'red', 'blue', 'purple', 'yellow']
    colors.forEach(color => {
      element.classList.remove(`bg-${color}-600`, `hover:bg-${color}-700`)
    })
  }

  showToast(message, color = "blue") {
    // Simple toast implementation - could be enhanced
    const toast = document.createElement('div')
    toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white bg-${color}-600 shadow-lg transition-opacity duration-300`
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    // Fade out and remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  addItem(event) {
    const item = event.detail
    
    if (this.items.has(item.id)) {
      console.log("Item already exists, skipping", item.id)
      return
    }

    const template = this.itemTemplateTarget.content.cloneNode(true)
    const row = template.querySelector("tr")
    
    // Set up row data
    row.dataset.itemId = item.id
    row.querySelector("[data-item-name]").textContent = item.name
    row.querySelector("[data-item-sku]").textContent = item.sku
    row.querySelector("[data-current-stock]").textContent = item.currentStock
    
    // Configure quantity input based on transaction type
    const quantityInput = row.querySelector("[data-quantity]")
    this.configureQuantityInput(quantityInput, item)
    
    this.itemsListTarget.appendChild(row)
    this.items.set(item.id, item)
    this.updateTotal()
    
    console.log("Item added successfully", {
      itemId: item.id,
      transactionType: this.typeValue,
      currentItems: Array.from(this.items.keys())
    })
  }

  configureQuantityInput(quantityInput, item) {
    // Set input attributes based on transaction configuration
    const config = this.transactionConfig
    
    if (config.quantity_behavior === 'positive') {
      quantityInput.min = "1"
      quantityInput.step = "1"
    } else if (config.quantity_behavior === 'negative') {
      quantityInput.min = "1"
      quantityInput.max = item.currentStock || "999999"
      quantityInput.step = "1"
    } else if (config.quantity_behavior === 'adjustment') {
      quantityInput.step = "1"
      // For adjustments, allow negative values
    }
    
    // Set default value
    quantityInput.value = config.quantity_behavior === 'adjustment' ? item.currentStock : 1
    
    // Add event listener for real-time validation
    quantityInput.addEventListener('input', (event) => {
      this.validateQuantityInput(event.target, item)
      this.updateTotal()
    })
  }

  validateQuantityInput(input, item) {
    const quantity = parseInt(input.value) || 0
    const config = this.transactionConfig
    
    // Remove existing validation classes
    input.classList.remove('border-red-500', 'border-yellow-500')
    
    // Apply validation based on configuration
    if (config.validation_rules.includes('stock_availability')) {
      if (quantity > item.currentStock) {
        input.classList.add('border-red-500')
        input.title = `Only ${item.currentStock} available in stock`
      }
    }
    
    if (config.validation_rules.includes('positive_quantity')) {
      if (quantity <= 0) {
        input.classList.add('border-red-500')
        input.title = 'Quantity must be positive'
      }
    }
  }

  removeItem(event) {
    const row = event.target.closest("tr")
    const itemId = row.dataset.itemId
    
    this.items.delete(itemId)
    row.remove()
    this.updateTotal()
  }

  updateTotal() {
    const total = Array.from(this.itemsListTarget.querySelectorAll("[data-quantity]"))
      .reduce((sum, input) => sum + (parseInt(input.value) || 0), 0)
    
    this.totalQuantityTarget.textContent = total
  }

  save() {
    console.log("Starting transaction save", {
      type: this.typeValue,
      config: this.transactionConfig
    })

    // Validate locations based on configuration
    const locationValidation = this.validateLocations()
    if (!locationValidation.valid) {
      alert(locationValidation.message)
      if (locationValidation.focusElement) {
        locationValidation.focusElement.focus()
      }
      return
    }

    // Collect and validate items
    const items = this.collectItems()
    if (items.length === 0) {
      alert(this.transactionConfig.validation_messages.no_items || "Please add items and quantities")
      return
    }

    // Validate items based on configuration
    const itemValidation = this.validateItems(items)
    if (!itemValidation.valid) {
      alert(itemValidation.message)
      return
    }

    // Build transaction data based on configuration
    const transactionData = this.buildTransactionData(locationValidation.locations, items)
    
    // Submit transaction
    this.submitTransaction(transactionData)
  }

  validateLocations() {
    const config = this.transactionConfig
    const messages = config.validation_messages
    const result = { valid: true, locations: {}, message: '', focusElement: null }

    if (config.locations.includes('source')) {
      const sourceSelect = this.element.querySelector("select[name='source_location_id']")
      if (!sourceSelect || !sourceSelect.value) {
        result.valid = false
        result.message = messages.no_source_location || messages.no_location || "Please select a source location"
        result.focusElement = sourceSelect
        return result
      }
      result.locations.source = sourceSelect.value
    }

    if (config.locations.includes('destination')) {
      const destSelect = this.element.querySelector("select[name='destination_location_id']") ||
                        this.element.querySelector("select[name='location']")
      if (!destSelect || !destSelect.value) {
        result.valid = false
        result.message = messages.no_destination_location || messages.no_location || "Please select a destination location"
        result.focusElement = destSelect
        return result
      }
      result.locations.destination = destSelect.value
    }

    // For move transactions, ensure source and destination are different
    if (config.locations.includes('source') && config.locations.includes('destination')) {
      if (result.locations.source === result.locations.destination) {
        result.valid = false
        result.message = messages.same_locations || "Source and destination locations must be different"
        return result
      }
    }

    return result
  }

  collectItems() {
    return Array.from(this.itemsListTarget.querySelectorAll("tr"))
      .map(row => ({
        id: row.dataset.itemId,
        quantity: parseInt(row.querySelector("[data-quantity]").value) || 0,
        currentStock: parseInt(row.querySelector("[data-current-stock]").textContent) || 0,
        name: row.querySelector("[data-item-name]").textContent
      }))
      .filter(item => item.quantity > 0)
  }

  validateItems(items) {
    const config = this.transactionConfig
    const messages = config.validation_messages
    const result = { valid: true, message: '' }

    for (const item of items) {
      // Validate based on configuration rules
      if (config.validation_rules.includes('stock_availability')) {
        if (item.quantity > item.currentStock) {
          result.valid = false
          result.message = `${messages.insufficient_stock || 'Not enough stock available'} for ${item.name}. Available: ${item.currentStock}`
          return result
        }
      }

      if (config.validation_rules.includes('positive_quantity')) {
        if (item.quantity <= 0) {
          result.valid = false
          result.message = `${messages.invalid_quantity || 'Quantity must be positive'} for ${item.name}`
          return result
        }
      }

      if (config.validation_rules.includes('adjustment_calculation')) {
        // For adjustments, we might want to warn if no change is being made
        if (item.quantity === item.currentStock) {
          console.warn(`No adjustment needed for ${item.name} - quantity matches current stock`)
        }
      }
    }

    return result
  }

  buildTransactionData(locations, items) {
    const config = this.transactionConfig
    const notesElement = this.element.querySelector("textarea[name='notes']")
    
    const data = {
      items: items.map(item => ({ id: item.id, quantity: item.quantity })),
      notes: notesElement ? notesElement.value || "" : "",
      transaction_type: this.typeValue
    }

    // Add location data based on configuration
    if (config.locations.includes('source') && config.locations.includes('destination')) {
      // Move transaction
      data.source_location_id = locations.source
      data.destination_location_id = locations.destination
    } else if (config.locations.includes('destination')) {
      // Single destination transaction
      data.location = locations.destination
    } else if (config.locations.includes('source')) {
      // Single source transaction
      data.location = locations.source
    }

    return data
  }

  async submitTransaction(data) {
    const config = this.transactionConfig
    
    try {
      console.log('Submitting transaction data:', data)
      
      const response = await fetch(config.api_endpoints.transaction, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        },
        body: JSON.stringify(data)
      })

      console.log("Transaction response received", {
        ok: response.ok,
        status: response.status
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Transaction failed')
      }

      const responseData = await response.json()
      console.log("Transaction response data", responseData)
      
      if (responseData.redirect_url) {
        window.location.href = responseData.redirect_url
      }
    } catch (error) {
      console.error('Transaction error:', error)
      alert(error.message || "Something went wrong. Please try again.")
    }
  }


} 