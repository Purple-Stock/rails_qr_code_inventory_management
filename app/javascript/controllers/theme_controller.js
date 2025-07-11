import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["label"]
  static values = { lightLabel: String, darkLabel: String }

  connect() {
    this.applyPreference()
    this.updateLabel()
  }

  toggle() {
    document.documentElement.classList.toggle("dark")
    this.savePreference()
    this.updateLabel()
  }

  applyPreference() {
    const stored = localStorage.getItem("theme")
    if (stored === "dark") {
      document.documentElement.classList.add("dark")
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark")
    }
  }

  savePreference() {
    const mode = document.documentElement.classList.contains("dark") ? "dark" : "light"
    localStorage.setItem("theme", mode)
  }

  updateLabel() {
    const dark = document.documentElement.classList.contains("dark")
    this.labelTarget.textContent = dark ? this.darkLabelValue : this.lightLabelValue
  }
}
