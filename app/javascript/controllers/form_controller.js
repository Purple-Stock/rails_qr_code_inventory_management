import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["form"]

  connect() {
    console.log("Form controller connected")
    // Add event listeners for changes
    this.updateFormValues()
    document.querySelectorAll('input[name="item_ids[]"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateFormValues())
    })
  }

  submit(event) {
    console.log("Form submit triggered")
    
    // Get all checked items
    const selectedItems = Array.from(document.querySelectorAll('input[name="item_ids[]"]:checked'))
      .map(checkbox => checkbox.value)
    
    // Get the label type
    const labelType = this.element.querySelector('select[name="label_type"]').value

    // Get the copies
    const copies = Array.from(document.querySelectorAll('input[name="copies[]"]'))
      .map(input => input.value || '1')

    // Submit the form with Turbo
    const form = this.element
    const formData = new FormData(form)
    
    // Update the form data with current selections
    formData.set('label_type', labelType)
    formData.delete('item_ids[]') // Clear existing values
    selectedItems.forEach(id => {
      formData.append('item_ids[]', id)
    })
    formData.set('copies[]', copies)

    // Submit the form
    fetch(form.action, {
      method: form.method,
      body: formData,
      headers: {
        "Accept": "text/vnd.turbo-stream.html",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content
      }
    }).catch(error => {
      console.error("Error submitting form:", error)
    })
  }

  updateLabelType() {
    this.updateFormValues()
  }

  updateFormValues() {
    // Get selected items
    const selectedItems = Array.from(document.querySelectorAll('input[name="item_ids[]"]:checked'))
      .map(input => input.value)
    
    // Get the label type
    const labelType = document.querySelector('select[name="label_type"]').value
    
    // Get the copies
    const copies = Array.from(document.querySelectorAll('input[name="copies[]"]'))
      .map(input => input.value || '1')
    
    // Update both forms
    const forms = document.querySelectorAll('form[id$="-form"]')
    forms.forEach(form => {
      form.querySelector('input[name="label_type"]').value = labelType
      form.querySelector('input[name="item_ids"]').value = selectedItems.join(',')
      form.querySelector('input[name="copies"]').value = copies.join(',')
    })
  }
} 