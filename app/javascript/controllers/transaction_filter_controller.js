import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["transaction"]
  static values = {
    type: String
  }

  connect() {
    this.showAll()
  }

  filter(event) {
    event.preventDefault()
    const selectedType = event.currentTarget.dataset.type
    
    // Update active state of filter buttons
    this.element.querySelectorAll('.filter-button').forEach(button => {
      button.classList.remove('bg-black', 'text-white')
      button.classList.add('text-gray-600', 'hover:bg-gray-200')
    })
    event.currentTarget.classList.remove('text-gray-600', 'hover:bg-gray-200')
    event.currentTarget.classList.add('bg-black', 'text-white')

    if (selectedType === 'all') {
      this.showAll()
    } else {
      this.filterByType(selectedType)
    }
  }

  showAll() {
    this.transactionTargets.forEach(transaction => {
      transaction.classList.remove('hidden')
    })
  }

  filterByType(type) {
    this.transactionTargets.forEach(transaction => {
      if (transaction.dataset.transactionType === type) {
        transaction.classList.remove('hidden')
      } else {
        transaction.classList.add('hidden')
      }
    })
  }
} 