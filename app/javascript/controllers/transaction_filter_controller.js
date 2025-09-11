import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["transaction"]
  static values = {
    type: String
  }

  connect() {
    console.log("Transaction filter controller connected")
    this.showAll()
    this.setupEventListeners()
  }

  disconnect() {
    console.log("Transaction filter controller disconnected")
    this.removeEventListeners()
  }

  setupEventListeners() {
    // Add event listeners to filter buttons
    this.element.querySelectorAll('.filter-button').forEach(button => {
      button.addEventListener('click', this.handleFilterClick.bind(this))
    })
  }

  removeEventListeners() {
    // Remove event listeners to prevent memory leaks
    this.element.querySelectorAll('.filter-button').forEach(button => {
      button.removeEventListener('click', this.handleFilterClick.bind(this))
    })
  }

  filter(event) {
    event.preventDefault()
    const selectedType = event.currentTarget.dataset.type
    this.applyFilter(selectedType)
  }

  handleFilterClick(event) {
    event.preventDefault()
    const selectedType = event.currentTarget.dataset.type
    this.applyFilter(selectedType)
  }

  applyFilter(selectedType) {
    console.log("Applying filter:", selectedType)
    
    // Update active state of filter buttons
    this.element.querySelectorAll('.filter-button').forEach(button => {
      button.classList.remove('bg-black', 'text-white')
      button.classList.add('text-gray-600', 'hover:bg-gray-200')
    })
    
    const activeButton = this.element.querySelector(`[data-type="${selectedType}"]`)
    if (activeButton) {
      activeButton.classList.remove('text-gray-600', 'hover:bg-gray-200')
      activeButton.classList.add('bg-black', 'text-white')
    }

    if (selectedType === 'all') {
      this.showAll()
    } else {
      this.filterByType(selectedType)
    }
  }

  showAll() {
    console.log("Showing all transactions")
    this.transactionTargets.forEach(transaction => {
      transaction.classList.remove('hidden')
    })
  }

  filterByType(type) {
    console.log("Filtering by type:", type)
    this.transactionTargets.forEach(transaction => {
      if (transaction.dataset.transactionType === type) {
        transaction.classList.remove('hidden')
      } else {
        transaction.classList.add('hidden')
      }
    })
  }
} 