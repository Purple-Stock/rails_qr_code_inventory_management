import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["itemsList", "itemTemplate", "totalQuantity"]
  static values = {
    teamId: String,
    type: { type: String, default: 'stock_in' }
  }

  connect() {
    this.items = new Map()
    this.element.addEventListener("item-selected", this.addItem.bind(this))
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