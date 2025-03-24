import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["itemsList", "itemTemplate", "totalQuantity"]
  static values = {
    teamId: String
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
    const items = Array.from(this.itemsListTarget.querySelectorAll("tr")).map(row => {
      return {
        id: row.dataset.itemId,
        quantity: parseInt(row.querySelector("[data-quantity]").value) || 0
      }
    }).filter(item => item.quantity > 0)

    if (items.length === 0) {
      alert("Please add items and quantities")
      return
    }

    const data = {
      location: document.querySelector("select").value,
      notes: document.querySelector("textarea").value,
      items: items
    }

    fetch(`/teams/${this.teamIdValue}/stock_transactions/stock_in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (response.ok) {
        window.location.href = `/teams/${this.teamIdValue}/stock_transactions`
      } else {
        alert("Something went wrong")
      }
    })
  }
} 