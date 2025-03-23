import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "text", "toggleIcon"]
  static values = { expanded: { type: Boolean, default: true } }

  connect() {
    this.expandedValue = true
  }

  toggle() {
    this.expandedValue = !this.expandedValue
    
    if (this.expandedValue) {
      this.sidebarTarget.classList.remove("w-16")
      this.sidebarTarget.classList.add("w-64")
      this.toggleIconTarget.classList.remove("rotate-180")
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-0", "w-0", "hidden")
        text.classList.add("opacity-100")
      })
    } else {
      this.sidebarTarget.classList.remove("w-64")
      this.sidebarTarget.classList.add("w-16")
      this.toggleIconTarget.classList.add("rotate-180")
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-100")
        text.classList.add("opacity-0", "w-0", "hidden")
      })
    }
  }
} 