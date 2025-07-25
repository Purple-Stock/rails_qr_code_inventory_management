import { Controller } from "@hotwired/stimulus"
import { createTransactionScanner } from "../modules/barcode_scanner"
import { getTransactionConfig, createStimulusConfig } from "../modules/transaction_config"

export default class extends Controller {
  static targets = [
    "itemsList",
    "itemTemplate",
    "totalQuantity",
    "searchInput",
    "searchResults",
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
    console.log("Stock Transaction Controller connecting...")
    this.items = new Map()
    this.barcodeScanner = null
    this.searchTimeout = null
    this.initializeConfiguration()
    this.setupEventListeners()
    this.scannerInitialized = false

    // Debug: List all available methods
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => typeof this[name] === 'function')
    console.log("Available methods:", methods)
    console.log("handleFocus exists:", typeof this.handleFocus === 'function')
    console.log("handleFocus method:", this.handleFocus)

    console.log("Stock Transaction Controller connected successfully")
  }

  initializeConfiguration() {
    if (this.hasConfigValue) {
      this.transactionConfig = this.configValue
    } else {
      this.transactionConfig = createStimulusConfig(this.typeValue, this.teamIdValue)
    }
  }

  setupEventListeners() {
    this.element.addEventListener("item-selected", (event) => {
      this.addItem(event)
    })
  }

  // Focus handler for search input
  handleFocus() {
    console.log("handleFocus called - showing all items")
    this.performSearch('')
  }

  // Search methods
  handleSearch(event) {
    const query = event.target.value.trim()

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout)
    }

    if (!query) {
      this.hideSearchResults()
      return
    }

    this.searchTimeout = setTimeout(() => {
      this.performSearch(query)
    }, 300)
  }

  async performSearch(query) {
    try {
      const searchUrl = this.transactionConfig.api_endpoints.search
      const response = await fetch(`${searchUrl}?q=${encodeURIComponent(query)}`, {
        headers: {
          "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      this.displaySearchResults(data.items || [])
    } catch (error) {
      console.error("Error searching for items:", error)
    }
  }

  displaySearchResults(items) {
    if (!this.hasSearchResultsTarget) return

    const resultsContainer = this.searchResultsTarget

    if (items.length === 0) {
      resultsContainer.innerHTML = '<div class="p-4 text-gray-500">No items found</div>'
      resultsContainer.classList.remove('hidden')
      return
    }

    const resultsHTML = items.map(item => `
      <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
           data-action="click->stock-transaction#selectItem"
           data-item-id="${item.id}"
           data-item-name="${item.name}"
           data-item-sku="${item.sku}"
           data-current-stock="${item.current_stock || 0}">
        <div class="flex justify-between items-center">
          <div>
            <div class="font-medium text-gray-900">${item.name}</div>
            <div class="text-sm text-gray-500">SKU: ${item.sku}</div>
          </div>
          <div class="text-sm text-gray-600">
            Stock: ${item.current_stock || 0}
          </div>
        </div>
      </div>
    `).join('')

    resultsContainer.innerHTML = resultsHTML
    resultsContainer.classList.remove('hidden')
  }

  selectItem(event) {
    const element = event.currentTarget
    const item = {
      id: element.dataset.itemId,
      name: element.dataset.itemName,
      sku: element.dataset.itemSku,
      currentStock: parseInt(element.dataset.currentStock) || 0
    }

    const customEvent = new CustomEvent('item-selected', {
      detail: item,
      bubbles: true
    })
    this.element.dispatchEvent(customEvent)

    this.hideSearchResults()
    if (this.hasSearchInputTarget) {
      this.searchInputTarget.value = ''
    }
  }

  hideSearchResults() {
    if (this.hasSearchResultsTarget) {
      this.searchResultsTarget.classList.add('hidden')
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

    const quantityInput = row.querySelector("[data-quantity]")
    quantityInput.value = 1
    quantityInput.addEventListener('input', () => this.updateTotal())

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

  // Placeholder methods for other functionality
  openBarcodeModal() {
    console.log("openBarcodeModal called")
  }

  save() {
    console.log("save called")
  }
}