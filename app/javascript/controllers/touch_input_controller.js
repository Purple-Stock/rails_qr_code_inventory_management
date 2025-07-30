import { Controller } from "@hotwired/stimulus"

// Touch-optimized input controller for enhanced mobile interactions
export default class extends Controller {
  static targets = ["input", "feedback", "hapticTrigger"]
  static values = { 
    hapticEnabled: { type: Boolean, default: true },
    feedbackDuration: { type: Number, default: 200 },
    inputType: { type: String, default: "text" }
  }

  connect() {
    this.setupTouchOptimizations()
    this.setupHapticFeedback()
    this.setupKeyboardOptimizations()
    this.setupVisualFeedback()
  }

  setupTouchOptimizations() {
    this.inputTargets.forEach(input => {
      // Ensure minimum touch target size
      if (!input.classList.contains('touch-target')) {
        input.classList.add('touch-target')
      }

      // Optimize touch behavior
      input.style.touchAction = 'manipulation'
      input.style.webkitTapHighlightColor = 'transparent'

      // Add touch event listeners for immediate feedback
      input.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true })
      input.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true })
      input.addEventListener('focus', this.handleFocus.bind(this))
      input.addEventListener('blur', this.handleBlur.bind(this))
    })
  }

  setupHapticFeedback() {
    // Check if haptic feedback is supported
    this.hapticSupported = 'vibrate' in navigator
    
    if (this.hapticSupported && this.hapticEnabledValue) {
      this.element.addEventListener('touchstart', this.triggerHapticFeedback.bind(this))
    }
  }

  setupKeyboardOptimizations() {
    this.inputTargets.forEach(input => {
      // Set appropriate input modes for mobile keyboards
      switch (this.inputTypeValue) {
        case 'number':
          input.inputMode = 'numeric'
          input.pattern = '[0-9]*'
          break
        case 'decimal':
          input.inputMode = 'decimal'
          input.pattern = '[0-9]*\.?[0-9]*'
          break
        case 'email':
          input.inputMode = 'email'
          input.type = 'email'
          break
        case 'search':
          input.inputMode = 'search'
          input.type = 'search'
          break
        case 'tel':
          input.inputMode = 'tel'
          input.type = 'tel'
          break
        case 'url':
          input.inputMode = 'url'
          input.type = 'url'
          break
        default:
          input.inputMode = 'text'
      }

      // Prevent zoom on iOS by ensuring font-size is at least 16px
      const computedStyle = window.getComputedStyle(input)
      const fontSize = parseFloat(computedStyle.fontSize)
      if (fontSize < 16) {
        input.style.fontSize = '16px'
      }
    })
  }

  setupVisualFeedback() {
    this.inputTargets.forEach(input => {
      // Add visual feedback classes
      input.classList.add('transition-all', 'duration-200')
      
      // Create feedback element if it doesn't exist
      if (!this.hasFeedbackTarget) {
        const feedback = document.createElement('div')
        feedback.className = 'touch-feedback absolute inset-0 pointer-events-none opacity-0 bg-purple-brand-100 rounded-md transition-opacity duration-200'
        feedback.setAttribute('data-touch-input-target', 'feedback')
        
        // Make input container relative if not already
        const container = input.parentElement
        if (window.getComputedStyle(container).position === 'static') {
          container.style.position = 'relative'
        }
        
        container.appendChild(feedback)
      }
    })
  }

  handleTouchStart(event) {
    const input = event.currentTarget
    
    // Add active state
    input.classList.add('ring-2', 'ring-purple-brand-200', 'border-purple-brand-300')
    
    // Show visual feedback
    if (this.hasFeedbackTarget) {
      this.feedbackTarget.classList.remove('opacity-0')
      this.feedbackTarget.classList.add('opacity-30')
    }

    // Trigger haptic feedback
    this.triggerHapticFeedback()
  }

  handleTouchEnd(event) {
    const input = event.currentTarget
    
    // Remove active state after a brief delay
    setTimeout(() => {
      input.classList.remove('ring-2', 'ring-purple-brand-200', 'border-purple-brand-300')
      
      // Hide visual feedback
      if (this.hasFeedbackTarget) {
        this.feedbackTarget.classList.remove('opacity-30')
        this.feedbackTarget.classList.add('opacity-0')
      }
    }, this.feedbackDurationValue)
  }

  handleFocus(event) {
    const input = event.currentTarget
    
    // Enhanced focus styles for touch devices
    input.classList.add('ring-2', 'ring-purple-brand-500', 'border-purple-brand-500')
    
    // Scroll input into view on mobile
    if (window.innerWidth <= 767) {
      setTimeout(() => {
        input.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }, 300) // Wait for keyboard to appear
    }

    // Dispatch custom event for other controllers
    this.dispatch('focus', { detail: { input, inputType: this.inputTypeValue } })
  }

  handleBlur(event) {
    const input = event.currentTarget
    
    // Remove focus styles
    input.classList.remove('ring-2', 'ring-purple-brand-500', 'border-purple-brand-500')
    
    // Dispatch custom event
    this.dispatch('blur', { detail: { input, value: input.value } })
  }

  triggerHapticFeedback(intensity = 'light') {
    if (!this.hapticSupported || !this.hapticEnabledValue) return

    // Different haptic patterns for different interactions
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      error: [50, 50, 50]
    }

    const pattern = patterns[intensity] || patterns.light
    navigator.vibrate(pattern)
  }

  // Public methods for external control
  showSuccess() {
    this.inputTargets.forEach(input => {
      input.classList.add('border-green-500', 'ring-2', 'ring-green-200')
      setTimeout(() => {
        input.classList.remove('border-green-500', 'ring-2', 'ring-green-200')
      }, 2000)
    })
    this.triggerHapticFeedback('success')
  }

  showError(message = '') {
    this.inputTargets.forEach(input => {
      input.classList.add('border-red-500', 'ring-2', 'ring-red-200')
      setTimeout(() => {
        input.classList.remove('border-red-500', 'ring-2', 'ring-red-200')
      }, 2000)
    })
    this.triggerHapticFeedback('error')

    // Show error message if provided
    if (message && this.hasFeedbackTarget) {
      this.showFeedbackMessage(message, 'error')
    }
  }

  showFeedbackMessage(message, type = 'info') {
    if (!this.hasFeedbackTarget) return

    const feedback = this.feedbackTarget
    feedback.textContent = message
    feedback.className = `absolute top-full left-0 right-0 mt-1 p-2 text-sm rounded-md z-10 ${
      type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
      type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
      'bg-blue-100 text-blue-700 border border-blue-200'
    }`

    // Auto-hide after 3 seconds
    setTimeout(() => {
      feedback.textContent = ''
      feedback.className = 'touch-feedback absolute inset-0 pointer-events-none opacity-0 bg-purple-brand-100 rounded-md transition-opacity duration-200'
    }, 3000)
  }

  // Accessibility helpers
  announceToScreenReader(message) {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Cleanup
  disconnect() {
    this.inputTargets.forEach(input => {
      input.removeEventListener('touchstart', this.handleTouchStart.bind(this))
      input.removeEventListener('touchend', this.handleTouchEnd.bind(this))
      input.removeEventListener('focus', this.handleFocus.bind(this))
      input.removeEventListener('blur', this.handleBlur.bind(this))
    })
  }
}