import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["labelType", "labelTypeSelect", "selectedItems"]

  connect() {
    // Add event listeners for changes
    this.updateFormValues()
    document.querySelectorAll('input[name="item_ids[]"]').forEach(checkbox => {
      checkbox.addEventListener('change', () => this.updateFormValues())
    })
  }

  submit() {
    this.updateFormValues()
    this.element.requestSubmit()
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