import { Controller } from "@hotwired/stimulus"
import { createTransactionScanner } from "../modules/barcode_scanner"

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
    type: { type: String, default: 'stock_in' }
  }

  connect() {
    this.items = new Map()
    this.barcodeScanner = null
    
    // Use the same event name for both, but handle differently based on type
    this.element.addEventListener("item-selected", (event) => {
      console.log("Item selected event received", {
        type: this.typeValue,
        event: event.detail
      })
      
      if (this.typeValue === 'move') {
        this.addMoveItem(event)
      } else {
        this.addItem(event)
      }
    })
    
    // Initialize barcode scanner if targets are available
    this.initializeBarcodeScanner()
    
    console.log("Stock Transaction Controller connected", {
      type: this.typeValue,
      element: this.element
    })
  }

  disconnect() {
    // Clean up event listeners
    this.element.removeEventListener("item-selected", this.addItem.bind(this))
    this.element.removeEventListener("item-selected", this.addMoveItem.bind(this))
    
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
      
      const response = await fetch(`/teams/${this.teamIdValue}/items/search?barcode=${encodeURIComponent(barcode)}`, {
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
        button.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-blue-600', 'hover:bg-blue-700', 'bg-purple-600', 'hover:bg-purple-700')
      } else {
        button.textContent = "Start Camera"
        // Reset to transaction-specific color - this could be improved with config
        button.classList.remove('bg-red-600', 'hover:bg-red-700')
        // Add back the appropriate color based on transaction type
        switch(this.typeValue) {
          case 'stock_in':
            button.classList.add('bg-green-600', 'hover:bg-green-700')
            break
          case 'stock_out':
            button.classList.add('bg-red-600', 'hover:bg-red-700')
            break
          case 'adjust':
            button.classList.add('bg-blue-600', 'hover:bg-blue-700')
            break
          case 'move':
            button.classList.add('bg-purple-600', 'hover:bg-purple-700')
            break
          default:
            button.classList.add('bg-blue-600', 'hover:bg-blue-700')
        }
      }
    }
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

    const template = this.itemTemplateTarget.content.cloneNode(true)
    const row = template.querySelector("tr")
    
    row.dataset.itemId = item.id
    row.querySelector("[data-item-name]").textContent = item.name
    row.querySelector("[data-item-sku]").textContent = item.sku
    row.querySelector("[data-current-stock]").textContent = item.currentStock
    
    const quantityInput = row.querySelector("[data-quantity]")
    quantityInput.name = `items[][quantity]`
    
    this.itemsListTarget.appendChild(row)
    this.items.set(item.id, item)
    this.updateTotal()
    
    console.log("Move item added successfully", {
      itemId: item.id,
      currentItems: Array.from(this.items.keys())
    })
  }
} 