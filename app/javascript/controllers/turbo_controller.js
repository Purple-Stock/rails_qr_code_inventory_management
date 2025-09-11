import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    // Listen for Turbo events to reinitialize page-specific functionality
    document.addEventListener("turbo:load", this.handlePageLoad.bind(this))
    document.addEventListener("turbo:render", this.handlePageRender.bind(this))
  }

  disconnect() {
    // Clean up event listeners
    document.removeEventListener("turbo:load", this.handlePageLoad.bind(this))
    document.removeEventListener("turbo:render", this.handlePageRender.bind(this))
  }

  handlePageLoad(event) {
    console.log("Turbo page loaded, reinitializing...")
    this.reinitializePageFunctionality()
  }

  handlePageRender(event) {
    console.log("Turbo page rendered, reinitializing...")
    this.reinitializePageFunctionality()
  }

  reinitializePageFunctionality() {
    // Reset scanner initialization flags
    this.resetScannerFlags()
    
    // Reinitialize search functionality
    this.reinitializeSearch()
    
    // Reinitialize scanner functionality
    this.reinitializeScanners()
    
    // Reinitialize filter functionality
    this.reinitializeFilters()
    
    // Reinitialize QR code events
    this.reinitializeQrCodeEvents()
  }

  resetScannerFlags() {
    // Reset all scanner initialization flags
    window.scannerInitialized = false
    window.stockOutScannerInitialized = false
    window.adjustScannerInitialized = false
    window.moveScannerInitialized = false
  }

  reinitializeSearch() {
    // Find all search inputs and reattach event listeners
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]')
    
    searchInputs.forEach(input => {
      // Remove existing listeners by cloning the input
      const newInput = input.cloneNode(true)
      input.parentNode.replaceChild(newInput, input)
      
      // Add new listeners
      newInput.addEventListener('input', this.handleSearchInput.bind(this))
      newInput.addEventListener('focus', this.handleSearchFocus.bind(this))
    })
  }

  handleSearchInput(event) {
    // Debounce search functionality
    clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => {
      this.performSearch(event.target.value)
    }, 300)
  }

  handleSearchFocus(event) {
    // Load items when search input is focused
    this.loadItems()
  }

  performSearch(query) {
    // Trigger search form submission if it exists
    const searchForm = document.querySelector('form[data-controller*="search"]')
    if (searchForm) {
      const formData = new FormData(searchForm)
      formData.set('query', query)
      
      fetch(searchForm.action, {
        method: 'GET',
        headers: {
          'Accept': 'text/vnd.turbo-stream.html',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        }
      }).then(response => response.text())
        .then(html => {
          // Handle the response
          console.log('Search performed:', query)
        })
        .catch(error => console.error('Search error:', error))
    }
  }

  loadItems() {
    // Load items for the current page
    const itemsContainer = document.querySelector('[data-controller*="stock-transaction"]')
    if (itemsContainer) {
      // Trigger item loading logic
      console.log('Loading items...')
    }
  }

  reinitializeScanners() {
    // Reinitialize scanner controllers
    const scannerControllers = document.querySelectorAll('[data-controller*="scanner"]')
    
    scannerControllers.forEach(controller => {
      // Force reconnection of scanner controllers
      const event = new Event('turbo:load')
      controller.dispatchEvent(event)
    })
    
    // Reinitialize QR code events
    this.reinitializeQrCodeEvents()
  }

  reinitializeQrCodeEvents() {
    // Reinitialize QR code event listeners
    const stockTransactionControllers = document.querySelectorAll('[data-controller*="stock-transaction"]')
    
    stockTransactionControllers.forEach(controller => {
      // Force reconnection of stock transaction controllers
      const event = new Event('turbo:load')
      controller.dispatchEvent(event)
    })
  }

  reinitializeScannerButtons() {
    // Reinitialize scanner buttons for all transaction types
    const scannerButtons = [
      { id: 'start-scanner', handler: 'toggleScanner' },
      { id: 'stockout-start-scanner', handler: 'toggleStockOutScanner' },
      { id: 'adjust-start-scanner', handler: 'toggleAdjustScanner' },
      { id: 'move-start-scanner', handler: 'toggleMoveScanner' }
    ]

    scannerButtons.forEach(({ id, handler }) => {
      const button = document.getElementById(id)
      if (button) {
        // Remove existing listeners by cloning the button
        const newButton = button.cloneNode(true)
        button.parentNode.replaceChild(newButton, button)
        
        // Add new listener
        if (window[handler]) {
          newButton.addEventListener('click', window[handler])
        }
      }
    })
  }

  reinitializeFilters() {
    // Reinitialize filter functionality
    const filterButtons = document.querySelectorAll('.filter-button')
    
    filterButtons.forEach(button => {
      // Remove existing listeners by cloning the button
      const newButton = button.cloneNode(true)
      button.parentNode.replaceChild(newButton, button)
      
      // Add new listener
      newButton.addEventListener('click', this.handleFilterClick.bind(this))
    })
  }

  handleFilterClick(event) {
    event.preventDefault()
    const selectedType = event.currentTarget.dataset.type
    
    // Update active state of filter buttons
    const allButtons = document.querySelectorAll('.filter-button')
    allButtons.forEach(button => {
      button.classList.remove('bg-black', 'text-white')
      button.classList.add('text-gray-600', 'hover:bg-gray-200')
    })
    
    event.currentTarget.classList.remove('text-gray-600', 'hover:bg-gray-200')
    event.currentTarget.classList.add('bg-black', 'text-white')

    // Filter transactions
    if (selectedType === 'all') {
      this.showAllTransactions()
    } else {
      this.filterTransactionsByType(selectedType)
    }
  }

  showAllTransactions() {
    const transactions = document.querySelectorAll('[data-transaction-filter-target="transaction"]')
    transactions.forEach(transaction => {
      transaction.classList.remove('hidden')
    })
  }

  filterTransactionsByType(type) {
    const transactions = document.querySelectorAll('[data-transaction-filter-target="transaction"]')
    transactions.forEach(transaction => {
      if (transaction.dataset.transactionType === type) {
        transaction.classList.remove('hidden')
      } else {
        transaction.classList.add('hidden')
      }
    })
  }
}
