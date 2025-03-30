import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    delay: { type: Number, default: 300 }
  }

  connect() {
    console.log("SearchForm controller connected")
  }

  initialize() {
    console.log("SearchForm controller initialized")
    this.debouncedSearch = this.debounce(this.submit.bind(this), this.delayValue)
  }

  search(event) {
    console.log("Search triggered")
    this.debouncedSearch()
  }

  submit() {
    console.log("Submitting search")
    this.element.requestSubmit()
  }

  // Debounce helper function
  debounce(func, wait) {
    let timeout
    return () => {
      console.log("Debouncing...")
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        console.log("Debounce timeout completed")
        func()
      }, wait)
    }
  }
} 