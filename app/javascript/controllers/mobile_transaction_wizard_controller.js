import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["step", "nextButton", "prevButton", "progressBar", "progressStep"]
  static values = {
    currentStep: { type: Number, default: 0 },
    totalSteps: { type: Number, default: 3 },
    transactionType: String,
    teamId: String
  }

  connect() {
    console.log("Mobile Transaction Wizard connected", {
      type: this.transactionTypeValue,
      steps: this.totalStepsValue
    })
    
    this.updateStepVisibility()
    this.updateProgress()
    this.setupAutoSave()
  }

  disconnect() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
    }
  }

  next() {
    if (this.validateCurrentStep()) {
      if (this.currentStepValue < this.totalStepsValue - 1) {
        this.currentStepValue++
        this.updateStepVisibility()
        this.updateProgress()
        this.saveFormData()
        
        // Provide haptic feedback if available
        this.triggerHapticFeedback()
      }
    }
  }

  previous() {
    if (this.currentStepValue > 0) {
      this.currentStepValue--
      this.updateStepVisibility()
      this.updateProgress()
      
      // Provide haptic feedback if available
      this.triggerHapticFeedback()
    }
  }

  goToStep(event) {
    const targetStep = parseInt(event.currentTarget.dataset.step)
    if (targetStep >= 0 && targetStep < this.totalStepsValue) {
      this.currentStepValue = targetStep
      this.updateStepVisibility()
      this.updateProgress()
    }
  }

  updateStepVisibility() {
    this.stepTargets.forEach((step, index) => {
      if (index === this.currentStepValue) {
        step.classList.remove("hidden")
        step.classList.add("block")
        
        // Focus first input in the step for accessibility
        const firstInput = step.querySelector("input, select, textarea")
        if (firstInput && !firstInput.disabled) {
          setTimeout(() => firstInput.focus(), 100)
        }
      } else {
        step.classList.add("hidden")
        step.classList.remove("block")
      }
    })

    // Update navigation buttons
    if (this.hasPrevButtonTarget) {
      this.prevButtonTarget.disabled = this.currentStepValue === 0
      this.prevButtonTarget.classList.toggle("opacity-50", this.currentStepValue === 0)
    }

    if (this.hasNextButtonTarget) {
      const isLastStep = this.currentStepValue === this.totalStepsValue - 1
      this.nextButtonTarget.textContent = isLastStep ? "Complete Transaction" : "Next"
      this.nextButtonTarget.classList.toggle("bg-green-600", isLastStep)
      this.nextButtonTarget.classList.toggle("hover:bg-green-700", isLastStep)
      this.nextButtonTarget.classList.toggle("bg-purple-600", !isLastStep)
      this.nextButtonTarget.classList.toggle("hover:bg-purple-700", !isLastStep)
    }
  }

  updateProgress() {
    const progressPercentage = ((this.currentStepValue + 1) / this.totalStepsValue) * 100
    
    if (this.hasProgressBarTarget) {
      this.progressBarTarget.style.width = `${progressPercentage}%`
    }

    // Update progress steps
    this.progressStepTargets.forEach((step, index) => {
      const stepNumber = step.querySelector(".step-number")
      const stepIcon = step.querySelector(".step-icon")
      
      if (index < this.currentStepValue) {
        // Completed step
        step.classList.remove("text-gray-500", "text-purple-600")
        step.classList.add("text-green-600")
        if (stepNumber) stepNumber.classList.add("hidden")
        if (stepIcon) stepIcon.classList.remove("hidden")
      } else if (index === this.currentStepValue) {
        // Current step
        step.classList.remove("text-gray-500", "text-green-600")
        step.classList.add("text-purple-600")
        if (stepNumber) stepNumber.classList.remove("hidden")
        if (stepIcon) stepIcon.classList.add("hidden")
      } else {
        // Future step
        step.classList.remove("text-purple-600", "text-green-600")
        step.classList.add("text-gray-500")
        if (stepNumber) stepNumber.classList.remove("hidden")
        if (stepIcon) stepIcon.classList.add("hidden")
      }
    })
  }

  validateCurrentStep() {
    const currentStep = this.stepTargets[this.currentStepValue]
    if (!currentStep) return true

    const requiredFields = currentStep.querySelectorAll("[required]")
    let isValid = true
    let firstInvalidField = null

    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        isValid = false
        field.classList.add("border-red-500", "focus:border-red-500", "focus:ring-red-500")
        
        if (!firstInvalidField) {
          firstInvalidField = field
        }
        
        // Remove error styling after user starts typing
        field.addEventListener("input", () => {
          field.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-500")
        }, { once: true })
      } else {
        field.classList.remove("border-red-500", "focus:border-red-500", "focus:ring-red-500")
      }
    })

    // Custom validation for specific steps
    if (this.currentStepValue === 1) { // Items step
      const itemsList = currentStep.querySelector("[data-stock-transaction-target='itemsList']")
      if (itemsList && itemsList.children.length === 0) {
        isValid = false
        this.showToast("Please add at least one item", "error")
      }
    }

    if (!isValid && firstInvalidField) {
      firstInvalidField.focus()
      this.showToast("Please fill in all required fields", "error")
    }

    return isValid
  }

  setupAutoSave() {
    // Auto-save form data every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveFormData()
    }, 30000)

    // Save on input changes with debouncing
    this.element.addEventListener("input", this.debounce(() => {
      this.saveFormData()
    }, 2000))
  }

  saveFormData() {
    const formData = this.collectFormData()
    const storageKey = `transaction_draft_${this.transactionTypeValue}_${this.teamIdValue}`
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        data: formData,
        timestamp: Date.now(),
        step: this.currentStepValue
      }))
      
      // Show subtle save indicator
      this.showSaveIndicator()
    } catch (error) {
      console.warn("Could not save form data:", error)
    }
  }

  loadSavedData() {
    const storageKey = `transaction_draft_${this.transactionTypeValue}_${this.teamIdValue}`
    
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { data, timestamp, step } = JSON.parse(saved)
        
        // Only restore if saved within last hour
        if (Date.now() - timestamp < 3600000) {
          this.restoreFormData(data)
          this.currentStepValue = step || 0
          this.updateStepVisibility()
          this.updateProgress()
          
          this.showToast("Previous draft restored", "success")
          return true
        }
      }
    } catch (error) {
      console.warn("Could not load saved data:", error)
    }
    
    return false
  }

  clearSavedData() {
    const storageKey = `transaction_draft_${this.transactionTypeValue}_${this.teamIdValue}`
    localStorage.removeItem(storageKey)
  }

  collectFormData() {
    const formData = {}
    
    // Collect all form inputs
    this.element.querySelectorAll("input, select, textarea").forEach(field => {
      if (field.name) {
        if (field.type === "checkbox" || field.type === "radio") {
          if (field.checked) {
            formData[field.name] = field.value
          }
        } else {
          formData[field.name] = field.value
        }
      }
    })

    return formData
  }

  restoreFormData(data) {
    Object.entries(data).forEach(([name, value]) => {
      const field = this.element.querySelector(`[name="${name}"]`)
      if (field) {
        if (field.type === "checkbox" || field.type === "radio") {
          field.checked = field.value === value
        } else {
          field.value = value
        }
      }
    })
  }

  showSaveIndicator() {
    // Create or update save indicator
    let indicator = this.element.querySelector(".save-indicator")
    if (!indicator) {
      indicator = document.createElement("div")
      indicator.className = "save-indicator fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm opacity-0 transition-opacity duration-300 z-50"
      indicator.textContent = "Saved"
      document.body.appendChild(indicator)
    }

    indicator.classList.remove("opacity-0")
    setTimeout(() => {
      indicator.classList.add("opacity-0")
    }, 2000)
  }

  showToast(message, type = "info") {
    // Create toast notification
    const toast = document.createElement("div")
    const bgColor = type === "error" ? "bg-red-500" : type === "success" ? "bg-green-500" : "bg-blue-500"
    
    toast.className = `fixed bottom-4 left-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg transform translate-y-20 opacity-0 transition-all duration-300 z-50 md:left-auto md:right-4 md:max-w-sm`
    toast.textContent = message
    
    document.body.appendChild(toast)
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove("translate-y-20", "opacity-0")
    }, 100)
    
    // Animate out and remove
    setTimeout(() => {
      toast.classList.add("translate-y-20", "opacity-0")
      setTimeout(() => {
        document.body.removeChild(toast)
      }, 300)
    }, 3000)
  }

  triggerHapticFeedback() {
    // Trigger haptic feedback on supported devices
    if (navigator.vibrate) {
      navigator.vibrate(50) // Light vibration
    }
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Handle keyboard shortcuts
  handleKeydown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      // Cmd/Ctrl + Enter to go to next step
      event.preventDefault()
      this.next()
    } else if (event.key === "Escape") {
      // Escape to go back
      event.preventDefault()
      this.previous()
    }
  }
}