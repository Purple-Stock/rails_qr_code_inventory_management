import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "results"]

  connect() {
    this.hideResults = this.hideResults.bind(this)
    document.addEventListener("click", this.hideResults)
  }

  disconnect() {
    document.removeEventListener("click", this.hideResults)
  }

  hideResults(event) {
    if (!this.element.contains(event.target)) {
      this.resultsTarget.classList.add("hidden")
    }
  }

  search() {
    const query = this.inputTarget.value.trim()
    const teamId = this.element.dataset.teamId
    
    if (query.length < 2) {
      this.resultsTarget.classList.add("hidden")
      return
    }

    this.resultsTarget.classList.remove("hidden")

    fetch(`/teams/${teamId}/items/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "Accept": "text/html",
        "X-Requested-With": "XMLHttpRequest"
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('Search failed')
      return response.text()
    })
    .then(html => {
      this.resultsTarget.innerHTML = html
    })
    .catch(error => {
      console.error('Search error:', error)
      this.resultsTarget.innerHTML = `
        <div class="py-14">
          <div class="text-center">
            <svg class="mx-auto h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="mt-2 text-sm text-gray-500">Error searching items. Please try again.</p>
          </div>
        </div>
      `
    })
  }

  selectItem(event) {
    event.preventDefault()
    const button = event.currentTarget
    const item = {
      id: button.dataset.itemId,
      name: button.dataset.itemName,
      sku: button.dataset.itemSku,
      currentStock: button.dataset.currentStock
    }

    const stockTransactionController = this.element.closest("[data-controller='stock-transaction']")
    if (stockTransactionController) {
      const event = new CustomEvent("item-selected", { detail: item })
      stockTransactionController.dispatchEvent(event)
    }

    this.inputTarget.value = ""
    this.resultsTarget.classList.add("hidden")
  }
} 