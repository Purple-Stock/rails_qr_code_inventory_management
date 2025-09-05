import { Controller } from "@hotwired/stimulus"

// Visual feedback and loading states controller for enhanced user experience
export default class extends Controller {
  static targets = ["loadingOverlay", "skeleton", "toast", "ripple", "progressBar"]
  static values = { 
    feedbackDuration: { type: Number, default: 2000 },
    hapticEnabled: { type: Boolean, default: true },
    animationDuration: { type: Number, default: 300 },
    toastPosition: { type: String, default: "top-right" } // top-right, top-left, bottom-right, bottom-left, center
  }

  connect() {
    this.activeToasts = new Set()
    this.rippleElements = new Map()
    this.setupGlobalFeedback()
    this.setupLoadingStates()
  }

  setupGlobalFeedback() {
    // Listen for global events that need feedback
    document.addEventListener('turbo:submit-start', this.showFormSubmissionFeedback.bind(this))
    document.addEventListener('turbo:submit-end', this.hideFormSubmissionFeedback.bind(this))
    document.addEventListener('turbo:before-fetch-request', this.showNavigationFeedback.bind(this))
    document.addEventListener('turbo:before-fetch-response', this.hideNavigationFeedback.bind(this))
    
    // Listen for custom feedback events
    document.addEventListener('feedback:success', this.handleSuccessFeedback.bind(this))
    document.addEventListener('feedback:error', this.handleErrorFeedback.bind(this))
    document.addEventListener('feedback:info', this.handleInfoFeedback.bind(this))
    document.addEventListener('feedback:loading', this.handleLoadingFeedback.bind(this))
  }

  setupLoadingStates() {
    // Create global loading overlay if it doesn't exist
    if (!document.getElementById('global-loading-overlay')) {
      this.createGlobalLoadingOverlay()
    }

    // Create toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.createToastContainer()
    }
  }

  createGlobalLoadingOverlay() {
    const overlay = document.createElement('div')
    overlay.id = 'global-loading-overlay'
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-overlay hidden items-center justify-center'
    overlay.innerHTML = `
      <div class="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4">
        <div class="flex items-center space-x-4">
          <div class="loading-spinner"></div>
          <div>
            <div class="text-lg font-medium text-gray-900">Loading...</div>
            <div class="text-sm text-gray-500" id="loading-message">Please wait</div>
          </div>
        </div>
        <div class="mt-4">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-purple-brand-600 h-2 rounded-full transition-all duration-300" 
                 id="loading-progress" 
                 style="width: 0%"></div>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
  }

  createToastContainer() {
    const container = document.createElement('div')
    container.id = 'toast-container'
    container.className = this.getToastContainerClasses()
    document.body.appendChild(container)
  }

  getToastContainerClasses() {
    const baseClasses = 'fixed z-notification pointer-events-none'
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    }
    
    return `${baseClasses} ${positionClasses[this.toastPositionValue] || positionClasses['top-right']}`
  }

  // Loading state methods
  showLoading(message = 'Loading...', progress = 0) {
    const overlay = document.getElementById('global-loading-overlay')
    const messageEl = document.getElementById('loading-message')
    const progressEl = document.getElementById('loading-progress')
    
    if (overlay) {
      overlay.classList.remove('hidden')
      overlay.classList.add('flex')
      
      if (messageEl) messageEl.textContent = message
      if (progressEl) progressEl.style.width = `${progress}%`
      
      // Add fade-in animation
      overlay.style.opacity = '0'
      requestAnimationFrame(() => {
        overlay.style.transition = 'opacity 300ms ease-out'
        overlay.style.opacity = '1'
      })
    }
  }

  hideLoading() {
    const overlay = document.getElementById('global-loading-overlay')
    if (overlay) {
      overlay.style.transition = 'opacity 300ms ease-out'
      overlay.style.opacity = '0'
      
      setTimeout(() => {
        overlay.classList.add('hidden')
        overlay.classList.remove('flex')
      }, 300)
    }
  }

  updateLoadingProgress(progress, message = null) {
    const progressEl = document.getElementById('loading-progress')
    const messageEl = document.getElementById('loading-message')
    
    if (progressEl) {
      progressEl.style.width = `${Math.min(100, Math.max(0, progress))}%`
    }
    
    if (message && messageEl) {
      messageEl.textContent = message
    }
  }

  // Skeleton loading methods
  showSkeleton(target = null) {
    const elements = target ? [target] : this.skeletonTargets
    
    elements.forEach(element => {
      element.classList.remove('hidden')
      element.classList.add('animate-pulse')
    })
  }

  hideSkeleton(target = null) {
    const elements = target ? [target] : this.skeletonTargets
    
    elements.forEach(element => {
      element.classList.add('hidden')
      element.classList.remove('animate-pulse')
    })
  }

  // Toast notification methods
  showToast(message, type = 'info', duration = null) {
    const toastDuration = duration || this.feedbackDurationValue
    const toast = this.createToast(message, type)
    const container = document.getElementById('toast-container')
    
    if (container) {
      container.appendChild(toast)
      this.activeToasts.add(toast)
      
      // Animate in
      requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0')
        toast.classList.add('translate-x-0', 'opacity-100')
      })
      
      // Auto-remove after duration
      setTimeout(() => {
        this.removeToast(toast)
      }, toastDuration)
      
      // Trigger haptic feedback
      this.triggerHaptic(type === 'error' ? 'error' : type === 'success' ? 'success' : 'light')
    }
    
    return toast
  }

  createToast(message, type) {
    const toast = document.createElement('div')
    toast.className = `
      pointer-events-auto w-full max-w-sm bg-white shadow-lg rounded-lg mb-4
      transform transition-all duration-300 ease-out
      translate-x-full opacity-0
      border-l-4 ${this.getToastBorderColor(type)}
    `
    
    toast.innerHTML = `
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            ${this.getToastIcon(type)}
          </div>
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">
              ${message}
            </p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-brand-500"
                    onclick="this.closest('.pointer-events-auto').remove()">
              <span class="sr-only">Close</span>
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    `
    
    return toast
  }

  getToastBorderColor(type) {
    const colors = {
      success: 'border-green-400',
      error: 'border-red-400',
      warning: 'border-yellow-400',
      info: 'border-blue-400'
    }
    return colors[type] || colors.info
  }

  getToastIcon(type) {
    const icons = {
      success: `
        <svg class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
      error: `
        <svg class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `,
      warning: `
        <svg class="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      `,
      info: `
        <svg class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      `
    }
    return icons[type] || icons.info
  }

  removeToast(toast) {
    if (this.activeToasts.has(toast)) {
      toast.classList.remove('translate-x-0', 'opacity-100')
      toast.classList.add('translate-x-full', 'opacity-0')
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
        this.activeToasts.delete(toast)
      }, 300)
    }
  }

  // Ripple effect methods
  createRipple(event) {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    const ripple = document.createElement('span')
    ripple.className = 'absolute rounded-full bg-white bg-opacity-30 pointer-events-none animate-ping'
    ripple.style.width = ripple.style.height = size + 'px'
    ripple.style.left = x + 'px'
    ripple.style.top = y + 'px'
    
    // Ensure button has relative positioning
    if (window.getComputedStyle(button).position === 'static') {
      button.style.position = 'relative'
    }
    
    button.appendChild(ripple)
    
    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 600)
    
    this.triggerHaptic('light')
  }

  // Event handlers for global feedback
  handleSuccessFeedback(event) {
    this.showToast(event.detail.message || 'Success!', 'success')
  }

  handleErrorFeedback(event) {
    this.showToast(event.detail.message || 'An error occurred', 'error')
  }

  handleInfoFeedback(event) {
    this.showToast(event.detail.message || 'Information', 'info')
  }

  handleLoadingFeedback(event) {
    if (event.detail.show) {
      this.showLoading(event.detail.message, event.detail.progress)
    } else {
      this.hideLoading()
    }
  }

  showFormSubmissionFeedback(event) {
    const form = event.target
    const submitButton = form.querySelector('[type="submit"]')
    
    if (submitButton) {
      submitButton.disabled = true
      submitButton.classList.add('opacity-75', 'cursor-wait')
      
      // Add loading spinner to button
      const originalText = submitButton.textContent
      submitButton.innerHTML = `
        <div class="flex items-center justify-center">
          <div class="loading-spinner-sm mr-2"></div>
          ${originalText}
        </div>
      `
    }
    
    this.showLoading('Submitting form...')
  }

  hideFormSubmissionFeedback(event) {
    const form = event.target
    const submitButton = form.querySelector('[type="submit"]')
    
    if (submitButton) {
      submitButton.disabled = false
      submitButton.classList.remove('opacity-75', 'cursor-wait')
      
      // Restore original button text (this is a simplified approach)
      const buttonText = submitButton.querySelector('div') ? 
        submitButton.querySelector('div').textContent.trim() : 
        submitButton.textContent
      submitButton.textContent = buttonText
    }
    
    this.hideLoading()
  }

  showNavigationFeedback(event) {
    // Show subtle loading indicator for navigation
    this.showLoading('Loading page...', 10)
  }

  hideNavigationFeedback(event) {
    this.hideLoading()
  }

  // Haptic feedback
  triggerHaptic(intensity = 'light') {
    if (!this.hapticEnabledValue || !('vibrate' in navigator)) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      error: [50, 50, 50]
    }

    navigator.vibrate(patterns[intensity] || patterns.light)
  }

  // Public API methods
  success(message) {
    this.showToast(message, 'success')
  }

  error(message) {
    this.showToast(message, 'error')
  }

  info(message) {
    this.showToast(message, 'info')
  }

  warning(message) {
    this.showToast(message, 'warning')
  }

  loading(show, message = 'Loading...', progress = 0) {
    if (show) {
      this.showLoading(message, progress)
    } else {
      this.hideLoading()
    }
  }

  // Cleanup
  disconnect() {
    this.activeToasts.forEach(toast => this.removeToast(toast))
    this.activeToasts.clear()
    
    document.removeEventListener('turbo:submit-start', this.showFormSubmissionFeedback.bind(this))
    document.removeEventListener('turbo:submit-end', this.hideFormSubmissionFeedback.bind(this))
    document.removeEventListener('turbo:before-fetch-request', this.showNavigationFeedback.bind(this))
    document.removeEventListener('turbo:before-fetch-response', this.hideNavigationFeedback.bind(this))
  }
}