import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["itemsList", "itemTemplate", "totalQuantity"]
  static values = {
    teamId: String,
    type: { type: String, default: 'stock_in' }
  }

  connect() {
    this.items = new Map()
    
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
    
    console.log("Stock Transaction Controller connected", {
      type: this.typeValue,
      element: this.element
    })
  }

  disconnect() {
    // Clean up event listeners
    this.element.removeEventListener("item-selected", this.addItem.bind(this))
    this.element.removeEventListener("item-selected", this.addMoveItem.bind(this))
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