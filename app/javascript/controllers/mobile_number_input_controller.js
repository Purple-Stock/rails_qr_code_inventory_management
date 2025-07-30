import { Controller } from "@hotwired/stimulus"

// Mobile-optimized number input with touch-friendly number pad and gestures
export default class extends Controller {
  static targets = ["input", "display", "numberPad", "quickActions", "gestureArea"]
  static values = { 
    min: { type: Number, default: 0 },
    max: { type: Number, default: 999999 },
    step: { type: Number, default: 1 },
    decimals: { type: Number, default: 0 },
    quickIncrements: { type: Array, default: [1, 5, 10] },
    gesturesEnabled: { type: Boolean, default: true },
    hapticEnabled: { type: Boolean, default: true },
    showNumberPad: { type: Boolean, default: false }
  }

  connect() {
    this.currentValue = parseFloat(this.inputTarget.value) || 0
    this.isNumberPadVisible = false
    this.gestureStartY = 0
    this.gestureStartValue = 0
    this.isGesturing = false
    
    this.setupNumberPad()
    this.setupGestures()
    this.setupQuickActions()
    this.updateDisplay()
    
    // Handle mobile keyboard
    this.inputTarget.addEventListener('focus', this.handleInputFocus.bind(this))
    this.inputTarget.addEventListener('blur', this.handleInputBlur.bind(this))
    this.inputTarget.addEventListener('input', this.handleInputChange.bind(this))
  }

  setupNumberPad() {
    if (!this.hasNumberPadTarget) return

    // Create number pad if it doesn't exist
    this.createNumberPad()
    
    // Initially hide the number pad
    this.hideNumberPad()
  }

  createNumberPad() {
    const numberPad = this.numberPadTarget
    numberPad.innerHTML = `
      <div class="bg-white border-t border-gray-200 p-4 space-y-3">
        <div class="text-center text-lg font-semibold text-gray-700 mb-4">
          Enter Quantity
        </div>
        
        <!-- Number display -->
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-3xl font-mono font-bold text-gray-900" data-mobile-number-input-target="display">
            ${this.formatNumber(this.currentValue)}
          </div>
        </div>
        
        <!-- Number pad grid -->
        <div class="grid grid-cols-3 gap-3">
          ${[1,2,3,4,5,6,7,8,9].map(num => `
            <button type="button" 
                    class="touch-number-btn" 
                    data-action="click->mobile-number-input#pressNumber" 
                    data-number="${num}">
              ${num}
            </button>
          `).join('')}
          
          <!-- Bottom row -->
          <button type="button" 
                  class="touch-number-btn" 
                  data-action="click->mobile-number-input#clearAll">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
          
          <button type="button" 
                  class="touch-number-btn" 
                  data-action="click->mobile-number-input#pressNumber" 
                  data-number="0">
            0
          </button>
          
          ${this.decimalsValue > 0 ? `
            <button type="button" 
                    class="touch-number-btn" 
                    data-action="click->mobile-number-input#pressDecimal">
              .
            </button>
          ` : `
            <button type="button" 
                    class="touch-number-btn" 
                    data-action="click->mobile-number-input#backspace">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path>
              </svg>
            </button>
          `}
        </div>
        
        <!-- Action buttons -->
        <div class="grid grid-cols-2 gap-3 mt-4">
          <button type="button" 
                  class="btn btn-secondary" 
                  data-action="click->mobile-number-input#hideNumberPad">
            Cancel
          </button>
          <button type="button" 
                  class="btn btn-primary" 
                  data-action="click->mobile-number-input#confirmValue">
            Confirm
          </button>
        </div>
      </div>
    `
  }

  setupQuickActions() {
    if (!this.hasQuickActionsTarget) return

    const quickActions = this.quickActionsTarget
    quickActions.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-sm text-gray-600 font-medium">Quick:</span>
        ${this.quickIncrementsValue.map(increment => `
          <button type="button" 
                  class="quick-increment-btn" 
                  data-action="click->mobile-number-input#quickIncrement" 
                  data-increment="${increment}">
            +${increment}
          </button>
        `).join('')}
        <button type="button" 
                class="quick-increment-btn bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                data-action="click->mobile-number-input#reset">
          Reset
        </button>
      </div>
    `
  }

  setupGestures() {
    if (!this.gesturesEnabledValue || !this.hasGestureAreaTarget) return

    const gestureArea = this.gestureAreaTarget
    
    // Touch events for gesture recognition
    gestureArea.addEventListener('touchstart', this.handleGestureStart.bind(this), { passive: false })
    gestureArea.addEventListener('touchmove', this.handleGestureMove.bind(this), { passive: false })
    gestureArea.addEventListener('touchend', this.handleGestureEnd.bind(this), { passive: false })
    
    // Mouse events for desktop testing
    gestureArea.addEventListener('mousedown', this.handleGestureStart.bind(this))
    gestureArea.addEventListener('mousemove', this.handleGestureMove.bind(this))
    gestureArea.addEventListener('mouseup', this.handleGestureEnd.bind(this))
    
    // Prevent context menu on long press
    gestureArea.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  // Number pad actions
  pressNumber(event) {
    const number = event.currentTarget.dataset.number
    this.appendDigit(number)
    this.triggerHaptic('light')
  }

  pressDecimal(event) {
    if (this.decimalsValue > 0 && !this.currentValue.toString().includes('.')) {
      this.appendDigit('.')
      this.triggerHaptic('light')
    }
  }

  backspace(event) {
    const valueStr = this.currentValue.toString()
    if (valueStr.length > 1) {
      const newValue = valueStr.slice(0, -1)
      this.currentValue = parseFloat(newValue) || 0
    } else {
      this.currentValue = 0
    }
    this.updateDisplay()
    this.triggerHaptic('light')
  }

  clearAll(event) {
    this.currentValue = 0
    this.updateDisplay()
    this.triggerHaptic('medium')
  }

  appendDigit(digit) {
    const currentStr = this.currentValue.toString()
    const newStr = currentStr === '0' ? digit : currentStr + digit
    const newValue = parseFloat(newStr)
    
    if (newValue <= this.maxValue) {
      this.currentValue = newValue
      this.updateDisplay()
    }
  }

  // Quick action methods
  quickIncrement(event) {
    const increment = parseFloat(event.currentTarget.dataset.increment)
    this.increment(increment)
    this.triggerHaptic('medium')
  }

  increment(amount) {
    const newValue = this.currentValue + amount
    if (newValue <= this.maxValue) {
      this.currentValue = newValue
      this.updateDisplay()
      this.updateInput()
    }
  }

  decrement(amount) {
    const newValue = this.currentValue - amount
    if (newValue >= this.minValue) {
      this.currentValue = newValue
      this.updateDisplay()
      this.updateInput()
    }
  }

  reset(event) {
    this.currentValue = 0
    this.updateDisplay()
    this.updateInput()
    this.triggerHaptic('heavy')
  }

  // Gesture handling
  handleGestureStart(event) {
    this.isGesturing = true
    this.gestureStartY = this.getEventY(event)
    this.gestureStartValue = this.currentValue
    
    // Add visual feedback
    this.gestureAreaTarget.classList.add('bg-purple-brand-50', 'border-purple-brand-200')
    
    event.preventDefault()
  }

  handleGestureMove(event) {
    if (!this.isGesturing) return

    const currentY = this.getEventY(event)
    const deltaY = this.gestureStartY - currentY // Inverted: up = positive
    const sensitivity = 2 // pixels per unit
    const increment = Math.floor(deltaY / sensitivity) * this.stepValue

    const newValue = Math.max(this.minValue, 
                     Math.min(this.maxValue, 
                     this.gestureStartValue + increment))

    if (newValue !== this.currentValue) {
      this.currentValue = newValue
      this.updateDisplay()
      this.triggerHaptic('light')
    }

    event.preventDefault()
  }

  handleGestureEnd(event) {
    if (!this.isGesturing) return

    this.isGesturing = false
    this.updateInput()
    
    // Remove visual feedback
    this.gestureAreaTarget.classList.remove('bg-purple-brand-50', 'border-purple-brand-200')
    
    event.preventDefault()
  }

  getEventY(event) {
    return event.touches ? event.touches[0].clientY : event.clientY
  }

  // Input handling
  handleInputFocus(event) {
    if (this.showNumberPadValue && window.innerWidth <= 767) {
      this.showNumberPad()
      event.target.blur() // Prevent keyboard from showing
    }
  }

  handleInputBlur(event) {
    // Don't hide number pad immediately to allow for number pad interactions
    setTimeout(() => {
      if (!this.numberPadTarget.contains(document.activeElement)) {
        this.hideNumberPad()
      }
    }, 100)
  }

  handleInputChange(event) {
    const value = parseFloat(event.target.value) || 0
    this.currentValue = Math.max(this.minValue, Math.min(this.maxValue, value))
    this.updateDisplay()
  }

  // Number pad visibility
  showNumberPad() {
    if (!this.hasNumberPadTarget) return

    this.isNumberPadVisible = true
    this.numberPadTarget.classList.remove('hidden')
    this.numberPadTarget.classList.add('animate-slide-up')
    
    // Focus on the number pad for accessibility
    const firstButton = this.numberPadTarget.querySelector('button')
    if (firstButton) firstButton.focus()
  }

  hideNumberPad() {
    if (!this.hasNumberPadTarget) return

    this.isNumberPadVisible = false
    this.numberPadTarget.classList.add('hidden')
    this.numberPadTarget.classList.remove('animate-slide-up')
  }

  confirmValue() {
    this.updateInput()
    this.hideNumberPad()
    this.triggerHaptic('success')
    
    // Dispatch change event
    this.inputTarget.dispatchEvent(new Event('change', { bubbles: true }))
  }

  // Display and input updates
  updateDisplay() {
    if (this.hasDisplayTarget) {
      this.displayTarget.textContent = this.formatNumber(this.currentValue)
    }
  }

  updateInput() {
    this.inputTarget.value = this.formatNumber(this.currentValue)
    
    // Dispatch input event for other controllers
    this.inputTarget.dispatchEvent(new Event('input', { bubbles: true }))
  }

  formatNumber(value) {
    if (this.decimalsValue > 0) {
      return value.toFixed(this.decimalsValue)
    }
    return Math.floor(value).toString()
  }

  // Haptic feedback
  triggerHaptic(intensity = 'light') {
    if (!this.hapticEnabledValue || !('vibrate' in navigator)) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10]
    }

    navigator.vibrate(patterns[intensity] || patterns.light)
  }

  // Public API
  setValue(value) {
    this.currentValue = Math.max(this.minValue, Math.min(this.maxValue, parseFloat(value) || 0))
    this.updateDisplay()
    this.updateInput()
  }

  getValue() {
    return this.currentValue
  }

  // Cleanup
  disconnect() {
    if (this.hasGestureAreaTarget) {
      const gestureArea = this.gestureAreaTarget
      gestureArea.removeEventListener('touchstart', this.handleGestureStart.bind(this))
      gestureArea.removeEventListener('touchmove', this.handleGestureMove.bind(this))
      gestureArea.removeEventListener('touchend', this.handleGestureEnd.bind(this))
      gestureArea.removeEventListener('mousedown', this.handleGestureStart.bind(this))
      gestureArea.removeEventListener('mousemove', this.handleGestureMove.bind(this))
      gestureArea.removeEventListener('mouseup', this.handleGestureEnd.bind(this))
    }
  }
}