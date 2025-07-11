import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "eye", "eyeSlash"]

  toggle(event) {
    event.preventDefault()

    const show = this.inputTarget.type === "password"
    const type = show ? "text" : "password"
    this.inputTarget.type = type
    this.inputTarget.setAttribute("type", type)

    if (this.hasEyeTarget && this.hasEyeSlashTarget) {
      this.eyeTarget.classList.toggle("hidden", show)
      this.eyeSlashTarget.classList.toggle("hidden", !show)
    }
  }
}
