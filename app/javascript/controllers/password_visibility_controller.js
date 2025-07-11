import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "eye", "eyeSlash"]

  toggle() {
    const type = this.inputTarget.type === "password" ? "text" : "password"
    this.inputTarget.type = type
    if (this.hasEyeTarget && this.hasEyeSlashTarget) {
      this.eyeTarget.classList.toggle("hidden", type === "text")
      this.eyeSlashTarget.classList.toggle("hidden", type === "password")
    }
  }
}
