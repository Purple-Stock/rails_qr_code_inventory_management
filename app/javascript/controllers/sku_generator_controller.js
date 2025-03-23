import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["name", "sku"]

  generate() {
    const name = this.nameTarget.value.trim()
    
    if (name) {
      // Generate SKU from name (first 3 letters of each word)
      const sku = name
        .split(/\s+/)
        .map(word => word.substring(0, 3).toUpperCase())
        .join('-')
      this.skuTarget.value = sku
    } else {
      // Generate random SKU if no name
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
      this.skuTarget.value = `SKU-${randomPart}`
    }
  }
} 