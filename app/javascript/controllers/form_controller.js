import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["labelType", "labelTypeSelect", "selectedItems"]

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
    const labelType = this.labelTypeSelectTarget.value

    // Submit the form with Turbo
    const form = this.element
    const formData = new FormData(form)
    
    // Update the form data with current selections
    formData.set('label_type', labelType)
    formData.delete('item_ids[]') // Clear existing values
    selectedItems.forEach(id => {
      formData.append('item_ids[]', id)
    })

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
    const labelType = this.labelTypeSelectTarget.value
    const selectedItems = Array.from(document.querySelectorAll('input[name="item_ids[]"]:checked'))
      .map(checkbox => checkbox.value)

    // Update all forms, not just the preview form
    document.querySelectorAll('form').forEach(form => {
      const labelTypeInput = form.querySelector('input[name="label_type"]')
      const itemIdsInput = form.querySelector('input[name="item_ids"]')
      
      if (labelTypeInput) {
        labelTypeInput.value = labelType
      }
      if (itemIdsInput) {
        itemIdsInput.value = selectedItems.join(',')
      }
    })
  }
} 