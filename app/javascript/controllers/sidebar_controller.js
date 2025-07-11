import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "text", "toggleIcon"]
  static values = {
    expanded: { type: Boolean, default: true },
    mobileVisible: { type: Boolean, default: false }
  }

  connect() {
    this.expandedValue = true
  }

  toggle() {
    this.expandedValue = !this.expandedValue
    
    if (this.expandedValue) {
      this.sidebarTarget.classList.remove("w-16")
      this.sidebarTarget.classList.add("w-64")
      this.toggleIconTarget.classList.remove("rotate-180")
      
      document.querySelectorAll('.sidebar-icon').forEach(icon => {
        icon.classList.remove('h-8', 'w-8')
        icon.classList.add('h-6', 'w-6')
      })
      
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-0", "w-0", "hidden")
        text.classList.add("opacity-100")
      })
    } else {
      this.sidebarTarget.classList.remove("w-64")
      this.sidebarTarget.classList.add("w-16")
      this.toggleIconTarget.classList.add("rotate-180")
      
      document.querySelectorAll('.sidebar-icon').forEach(icon => {
        icon.classList.remove('h-6', 'w-6')
        icon.classList.add('h-8', 'w-8')
      })
      
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-100")
        text.classList.add("opacity-0", "w-0", "hidden")
      })
    }
  }

  toggleMobile() {
    this.mobileVisibleValue = !this.mobileVisibleValue

    if (this.mobileVisibleValue) {
      this.sidebarTarget.classList.remove("hidden", "-translate-x-full")
      this.sidebarTarget.classList.add("translate-x-0")
    } else {
      this.sidebarTarget.classList.remove("translate-x-0")
      this.sidebarTarget.classList.add("-translate-x-full")
      setTimeout(() => this.sidebarTarget.classList.add("hidden"), 300)
    }
  }
}