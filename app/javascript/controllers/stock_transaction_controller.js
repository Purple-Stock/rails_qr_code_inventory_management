import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["itemsList", "itemTemplate", "totalQuantity"]
  static values = {
    teamId: String,
    type: { type: String, default: 'stock_in' }
  }

  connect() {
    console.log("Stock Transaction Controller connected", {
      type: this.typeValue,
      element: this.element
    })
    
    this.items = new Map()
    this.setupEventListeners()
    this.initializePageFunctionality()
  }

  disconnect() {
    console.log("Stock Transaction Controller disconnected")
    this.cleanupEventListeners()
  }

  setupEventListeners() {
    // Use the same event name for both, but handle differently based on type
    this.itemSelectedHandler = (event) => {
      console.log("Item selected event received", {
        type: this.typeValue,
        event: event.detail
      })
      
      if (this.typeValue === 'move') {
        this.addMoveItem(event)
      } else {
        this.addItem(event)
      }
    }
    
    this.element.addEventListener("item-selected", this.itemSelectedHandler)
  }

  cleanupEventListeners() {
    if (this.itemSelectedHandler) {
      this.element.removeEventListener("item-selected", this.itemSelectedHandler)
    }
    
    if (this.qrCodeHandler) {
      document.removeEventListener('qr-code-scanned', this.qrCodeHandler)
    }
  }

  initializePageFunctionality() {
    // Initialize search functionality
    this.initializeSearch()
    
    // Initialize scanner functionality
    this.initializeScanner()
    
    // Initialize barcode input functionality
    this.initializeBarcodeInput()
    
    // Initialize QR code scanner events
    this.initializeQrCodeEvents()
  }

  initializeSearch() {
    const searchInput = this.element.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]')
    if (searchInput) {
      // Remove existing listeners to avoid duplicates
      searchInput.removeEventListener('input', this.handleSearchInput)
      searchInput.removeEventListener('focus', this.handleSearchFocus)
      
      // Add new listeners
      this.handleSearchInput = this.debounce((event) => {
        this.performSearch(event.target.value)
      }, 300)
      
      this.handleSearchFocus = () => {
        this.loadItems()
      }
      
      searchInput.addEventListener('input', this.handleSearchInput)
      searchInput.addEventListener('focus', this.handleSearchFocus)
    }
  }

  initializeScanner() {
    // Initialize scanner buttons
    const scannerButtons = [
      'start-scanner',
      'stockout-start-scanner', 
      'adjust-start-scanner',
      'move-start-scanner'
    ]

    scannerButtons.forEach(buttonId => {
      const button = document.getElementById(buttonId)
      if (button) {
        // Remove existing listeners
        button.removeEventListener('click', this.handleScannerClick)
        
        // Add new listener
        this.handleScannerClick = () => {
          this.toggleScanner(buttonId)
        }
        
        button.addEventListener('click', this.handleScannerClick)
      }
    })
  }

  initializeBarcodeInput() {
    const barcodeInput = this.element.querySelector('input[id*="barcode"], input[placeholder*="barcode" i]')
    if (barcodeInput) {
      // Remove existing listeners
      barcodeInput.removeEventListener('keypress', this.handleBarcodeKeypress)
      
      // Add new listener
      this.handleBarcodeKeypress = (e) => {
        if (e.key === 'Enter') {
          const value = (e.target.value || '').trim()
          if (value) this.searchForItem(value)
        }
      }
      
      barcodeInput.addEventListener('keypress', this.handleBarcodeKeypress)
    }
  }

  performSearch(query) {
    console.log("Performing search:", query)
    // Implement search logic here
  }

  loadItems() {
    console.log("Loading items...")
    // Implement item loading logic here
  }

  toggleScanner(buttonId) {
    console.log("Toggling scanner:", buttonId)
    // Implement scanner toggle logic here
  }

  addScannedItem() {
    // Find a barcode input within this controller element
    const input = this.element.querySelector('#barcodeInput, #stockOutBarcodeInput, #adjustBarcodeInput, input[id*="barcode"]')
    const barcode = input ? (input.value || '').trim() : ''
    if (!barcode) return
    this.searchForItem(barcode)
  }

  initializeQrCodeEvents() {
    // Listen for QR code scanned events
    this.qrCodeHandler = (event) => {
      console.log("QR code scanned:", event.detail)
      this.handleQrCodeScanned(event.detail.text)
      // Close any open scanner modal after handling
      this.closeScannerModal()
    }
    
    document.addEventListener('qr-code-scanned', this.qrCodeHandler)
  }

  handleQrCodeScanned(barcode) {
    console.log("Handling scanned barcode:", barcode)
    
    // Set the barcode input value
    const barcodeInput = this.element.querySelector('input[id*="barcode"], input[placeholder*="barcode" i]')
    if (barcodeInput) {
      barcodeInput.value = barcode
    }
    
    // Trigger search for the item
    this.searchForItem(barcode)
  }

  // Close the scanner modal for the current transaction type if present
  closeScannerModal() {
    const modalIdsByType = {
      stock_in: 'barcodeModal',
      stock_out: 'stockOutBarcodeModal',
      adjust: 'adjustBarcodeModal',
      move: 'barcodeModal'
    }
    const modalId = modalIdsByType[this.typeValue]
    if (!modalId) return

    const modal = document.getElementById(modalId)
    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden')
    }
  }

  searchForItem(barcode) {
    console.log("Searching for item with barcode:", barcode)
    const teamId = this.teamIdValue
    if (!teamId || !barcode) return

    fetch(`/teams/${teamId}/items/find_by_barcode?barcode=${encodeURIComponent(barcode)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success || !data.item) return
        const item = {
          id: String(data.item.id),
          name: data.item.name,
          sku: data.item.sku,
          currentStock: data.item.current_stock
        }

        if (this.typeValue === 'move') {
          this.addOrIncrementMove(item)
        } else if (this.typeValue === 'stock_out') {
          this.addOrIncrementStockOut(item)
        } else if (this.typeValue === 'stock_in') {
          this.addOrIncrementStockIn(item)
        } else if (this.typeValue === 'adjust') {
          this.addOrIgnoreAdjust(item)
        }
      })
      .catch(err => console.error('Barcode search error:', err))
  }

  addOrIncrementMove(item) {
    const existingRow = this.itemsListTarget.querySelector(`tr[data-item-id="${item.id}"]`)
    if (existingRow) {
      const quantityInput = existingRow.querySelector('[data-quantity]')
      const currentQuantity = parseInt(quantityInput.value) || 0
      const currentStock = parseInt(existingRow.querySelector('[data-current-stock]').textContent)
      if (currentQuantity + 1 > currentStock) return
      quantityInput.value = currentQuantity + 1
      this.updateTotal()
      return
    }
    this.addMoveItem({ detail: item })
  }

  addOrIncrementStockOut(item) {
    const existingRow = this.itemsListTarget.querySelector(`tr[data-item-id="${item.id}"]`)
    if (existingRow) {
      const quantityInput = existingRow.querySelector('[data-quantity]')
      const currentQuantity = parseInt(quantityInput.value) || 0
      const currentStock = parseInt(existingRow.querySelector('[data-current-stock]').textContent)
      if (currentQuantity + 1 > currentStock) return
      quantityInput.value = currentQuantity + 1
      this.updateTotal()
      return
    }
    // Reuse addItem path by faking event structure
    this.addItem({ detail: item })
  }

  addOrIncrementStockIn(item) {
    const existingRow = this.itemsListTarget.querySelector(`tr[data-item-id="${item.id}"]`)
    if (existingRow) {
      const quantityInput = existingRow.querySelector('[data-quantity]')
      const currentQuantity = parseInt(quantityInput.value) || 0
      quantityInput.value = currentQuantity + 1
      this.updateTotal()
      return
    }
    this.addItem({ detail: item })
  }

  addOrIgnoreAdjust(item) {
    const existingRow = this.itemsListTarget.querySelector(`tr[data-item-id="${item.id}"]`)
    if (existingRow) return
    this.addItem({ detail: item })
  }

  debounce(func, wait) {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), wait)
    }
  }

  addItem(event) {
    const item = event.detail
    
    if (this.items.has(item.id)) {
      return
    }

    const template = this.itemTemplateTarget.content.cloneNode(true)
    const row = template.querySelector("tr")
    
    row.dataset.itemId = item.id
    row.querySelector("[data-item-name]").textContent = item.name
    row.querySelector("[data-item-sku]").textContent = item.sku
    row.querySelector("[data-current-stock]").textContent = item.currentStock
    
    this.itemsListTarget.appendChild(row)
    this.items.set(item.id, item)
    this.updateTotal()
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
    if (this.typeValue === 'move') {
      console.log("Starting move transaction save")
      
      const sourceLocationSelect = this.element.querySelector("select[name='source_location_id']")
      const destinationLocationSelect = this.element.querySelector("select[name='destination_location_id']")
      
      console.log("Selected locations", {
        source: sourceLocationSelect.value,
        destination: destinationLocationSelect.value
      })

      if (!sourceLocationSelect.value) {
        alert("Please select a source location")
        sourceLocationSelect.focus()
        return
      }

      if (!destinationLocationSelect.value) {
        alert("Please select a destination location")
        destinationLocationSelect.focus()
        return
      }

      if (sourceLocationSelect.value === destinationLocationSelect.value) {
        alert("Source and destination locations must be different")
        return
      }

      const items = Array.from(this.itemsListTarget.querySelectorAll("tr"))
        .map(row => ({
          id: row.dataset.itemId,
          quantity: parseInt(row.querySelector("[data-quantity]").value) || 0
        }))
        .filter(item => item.quantity > 0)

      console.log("Collected items for move", items)

      if (items.length === 0) {
        alert("Please add items and quantities")
        return
      }

      // Validate stock availability
      for (const row of this.itemsListTarget.querySelectorAll("tr")) {
        const quantity = parseInt(row.querySelector("[data-quantity]").value) || 0
        const currentStock = parseInt(row.querySelector("[data-current-stock]").textContent)
        
        console.log("Validating stock for item", {
          itemName: row.querySelector("[data-item-name]").textContent,
          quantity,
          currentStock
        })
        
        if (quantity > currentStock) {
          alert(`Not enough stock for ${row.querySelector("[data-item-name]").textContent}`)
          return
        }
      }

      const data = {
        source_location_id: sourceLocationSelect.value,
        destination_location_id: destinationLocationSelect.value,
        notes: this.element.querySelector("textarea[name='notes']").value || "",
        items: items
      }

      console.log('Sending move data:', data)

      fetch(`/teams/${this.teamIdValue}/transactions/move`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        console.log("Move response received", {
          ok: response.ok,
          status: response.status
        })
        return response.json()
      })
      .then(data => {
        console.log("Move response data", data)
        if (data.redirect_url) {
          window.location.href = data.redirect_url
        }
      })
      .catch(error => {
        console.error('Move error:', error)
        alert(error.message || "Something went wrong. Please try again.")
      })
    } else {
      const locationSelect = document.querySelector("select[name='location']")
      const locationId = locationSelect.value

      if (!locationId) {
        alert("Please select a location")
        locationSelect.focus()
        return
      }

      const items = Array.from(this.itemsListTarget.querySelectorAll("tr")).map(row => {
        const quantity = parseInt(row.querySelector("[data-quantity]").value) || 0
        const currentStock = parseInt(row.querySelector("[data-current-stock]").textContent)
        
        // Validate stock availability for stock out
        if (this.typeValue === 'stock_out' && quantity > currentStock) {
          throw new Error(`Not enough stock for item ${row.querySelector("[data-item-name]").textContent}`)
        }
        
        return {
          id: row.dataset.itemId,
          quantity: quantity
        }
      }).filter(item => item.quantity > 0)

      if (items.length === 0) {
        alert("Please add items and quantities")
        return
      }

      const data = {
        location: locationId,
        notes: document.querySelector("textarea").value,
        items: items,
        transaction_type: this.typeValue
      }

      // Use the correct URL pattern
      const url = `/teams/${this.teamIdValue}/transactions`

      fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Transaction failed')
          })
        }
        return response.json()
      })
      .then(data => {
        if (data.redirect_url) {
          window.location.href = data.redirect_url
        }
      })
      .catch(error => {
        console.error('Error:', error)
        alert(error.message || "Something went wrong. Please try again.")
      })
    }
  }

  addMoveItem(event) {
    console.log("Adding move item", {
      item: event.detail,
      existingItems: Array.from(this.items.keys())
    })
    
    const item = event.detail
    
    if (this.items.has(item.id)) {
      console.log("Item already exists, skipping", item.id)
      return
    }

    // Be robust if Stimulus target resolution fails; fallback to query
    const templateEl = this.element.querySelector('[data-stock-transaction-target="itemTemplate"]') || document.querySelector('[data-stock-transaction-target="itemTemplate"]')
    if (!templateEl) {
      console.error('Missing itemTemplate target for stock-transaction controller')
      return
    }
    const template = templateEl.content.cloneNode(true)
    const row = template.querySelector("tr")
    
    row.dataset.itemId = item.id
    row.querySelector("[data-item-name]").textContent = item.name
    row.querySelector("[data-item-sku]").textContent = item.sku
    row.querySelector("[data-current-stock]").textContent = item.currentStock
    
    const quantityInput = row.querySelector("[data-quantity]")
    quantityInput.name = `items[][quantity]`
    
    const itemsListEl = this.hasItemsListTarget ? this.itemsListTarget : (this.element.querySelector('[data-stock-transaction-target="itemsList"]') || document.querySelector('[data-stock-transaction-target="itemsList"]'))
    if (!itemsListEl) {
      console.error('Missing itemsList target for stock-transaction controller')
      return
    }
    itemsListEl.appendChild(row)
    this.items.set(item.id, item)
    this.updateTotal()
    
    console.log("Move item added successfully", {
      itemId: item.id,
      currentItems: Array.from(this.items.keys())
    })
  }
} 
