import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["announcement", "skipLink"]
  static values = { 
    reducedMotion: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    keyboardNavigation: { type: Boolean, default: false }
  }

  connect() {
    this.initializeAccessibilityFeatures()
    this.setupEventListeners()
    this.detectUserPreferences()
    this.setupKeyboardNavigation()
    this.setupFocusManagement()
  }

  disconnect() {
    this.removeEventListeners()
  }

  // Initialize accessibility features
  initializeAccessibilityFeatures() {
    // Add accessibility classes to body
    document.body.classList.add('accessibility-enhanced')
    
    // Create announcement region if it doesn't exist
    this.createAnnouncementRegion()
    
    // Setup skip links
    this.setupSkipLinks()
    
    // Initialize ARIA live regions
    this.initializeAriaLiveRegions()
  }

  // Detect user preferences from system settings
  detectUserPreferences() {
    // Detect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reducedMotionValue = true
      document.body.classList.add('prefers-reduced-motion')
      this.announceToScreenReader('Reduced motion mode enabled')
    }

    // Detect high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.highContrastValue = true
      document.body.classList.add('prefers-high-contrast')
      this.announceToScreenReader('High contrast mode enabled')
    }

    // Detect dark mode preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('prefers-dark-mode')
    }

    // Listen for changes in preferences
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.reducedMotionValue = e.matches
      document.body.classList.toggle('prefers-reduced-motion', e.matches)
      this.announceToScreenReader(e.matches ? 'Reduced motion enabled' : 'Reduced motion disabled')
    })

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.highContrastValue = e.matches
      document.body.classList.toggle('prefers-high-contrast', e.matches)
      this.announceToScreenReader(e.matches ? 'High contrast enabled' : 'High contrast disabled')
    })

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.body.classList.toggle('prefers-dark-mode', e.matches)
    })
  }

  // Setup keyboard navigation
  setupKeyboardNavigation() {
    // Detect keyboard usage
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.keyboardNavigationValue = true
        document.body.classList.add('keyboard-navigation')
      }
    })

    // Detect mouse usage
    document.addEventListener('mousedown', () => {
      this.keyboardNavigationValue = false
      document.body.classList.remove('keyboard-navigation')
    })

    // Handle escape key for closing modals/overlays
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleEscapeKey(e)
      }
    })
  }

  // Setup focus management
  setupFocusManagement() {
    // Enhanced focus indicators
    document.addEventListener('focusin', (e) => {
      if (this.keyboardNavigationValue) {
        e.target.classList.add('focus-visible')
      }
    })

    document.addEventListener('focusout', (e) => {
      e.target.classList.remove('focus-visible')
    })

    // Focus trap for modals
    this.setupFocusTraps()
  }

  // Setup focus traps for modal elements
  setupFocusTraps() {
    const modals = document.querySelectorAll('[role="dialog"], [data-modal]')
    
    modals.forEach(modal => {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          this.trapFocus(e, modal)
        }
      })
    })
  }

  // Trap focus within an element
  trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  // Handle escape key presses
  handleEscapeKey(event) {
    // Find and close any open modals or overlays
    const openModals = document.querySelectorAll('[role="dialog"][aria-hidden="false"], .modal.open, .overlay.open')
    
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1]
      const closeButton = topModal.querySelector('[data-action*="close"], .close-button')
      
      if (closeButton) {
        closeButton.click()
      }
    }
  }

  // Create announcement region for screen readers
  createAnnouncementRegion() {
    if (!document.getElementById('accessibility-announcements')) {
      const announcementRegion = document.createElement('div')
      announcementRegion.id = 'accessibility-announcements'
      announcementRegion.setAttribute('aria-live', 'polite')
      announcementRegion.setAttribute('aria-atomic', 'true')
      announcementRegion.className = 'sr-only'
      document.body.appendChild(announcementRegion)
    }
  }

  // Initialize ARIA live regions
  initializeAriaLiveRegions() {
    // Create assertive live region for urgent announcements
    if (!document.getElementById('accessibility-announcements-assertive')) {
      const assertiveRegion = document.createElement('div')
      assertiveRegion.id = 'accessibility-announcements-assertive'
      assertiveRegion.setAttribute('aria-live', 'assertive')
      assertiveRegion.setAttribute('aria-atomic', 'true')
      assertiveRegion.className = 'sr-only'
      document.body.appendChild(assertiveRegion)
    }
  }

  // Setup skip links
  setupSkipLinks() {
    const skipLinks = document.querySelectorAll('.skip-link')
    
    skipLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const targetId = link.getAttribute('href').substring(1)
        const target = document.getElementById(targetId)
        
        if (target) {
          target.focus()
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          this.announceToScreenReader(`Skipped to ${target.getAttribute('aria-label') || targetId}`)
        }
      })
    })
  }

  // Setup event listeners
  setupEventListeners() {
    this.boundHandleResize = this.handleResize.bind(this)
    this.boundHandleOrientationChange = this.handleOrientationChange.bind(this)
    
    window.addEventListener('resize', this.boundHandleResize)
    window.addEventListener('orientationchange', this.boundHandleOrientationChange)
  }

  // Remove event listeners
  removeEventListeners() {
    if (this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize)
    }
    if (this.boundHandleOrientationChange) {
      window.removeEventListener('orientationchange', this.boundHandleOrientationChange)
    }
  }

  // Handle window resize for accessibility adjustments
  handleResize() {
    // Adjust touch targets for different screen sizes
    this.adjustTouchTargets()
    
    // Update focus management for responsive layouts
    this.updateFocusManagement()
  }

  // Handle orientation changes
  handleOrientationChange() {
    setTimeout(() => {
      this.announceToScreenReader(`Screen orientation changed to ${screen.orientation?.type || 'unknown'}`)
      this.adjustTouchTargets()
    }, 100)
  }

  // Adjust touch targets based on screen size
  adjustTouchTargets() {
    const isMobile = window.innerWidth < 768
    const touchTargets = document.querySelectorAll('.touch-target')
    
    touchTargets.forEach(target => {
      if (isMobile) {
        target.classList.add('touch-target-mobile')
      } else {
        target.classList.remove('touch-target-mobile')
      }
    })
  }

  // Update focus management for responsive layouts
  updateFocusManagement() {
    // Update focus order for responsive navigation
    const navigation = document.querySelector('[role="navigation"]')
    if (navigation) {
      this.updateNavigationFocus(navigation)
    }
  }

  // Update navigation focus order
  updateNavigationFocus(navigation) {
    const isMobile = window.innerWidth < 768
    const navItems = navigation.querySelectorAll('a, button')
    
    navItems.forEach((item, index) => {
      if (isMobile) {
        // Mobile focus order
        item.setAttribute('tabindex', index === 0 ? '0' : '-1')
      } else {
        // Desktop focus order
        item.setAttribute('tabindex', '0')
      }
    })
  }

  // Announce message to screen readers
  announceToScreenReader(message, priority = 'polite') {
    const regionId = priority === 'assertive' ? 'accessibility-announcements-assertive' : 'accessibility-announcements'
    const region = document.getElementById(regionId)
    
    if (region) {
      // Clear previous announcement
      region.textContent = ''
      
      // Add new announcement after a brief delay
      setTimeout(() => {
        region.textContent = message
      }, 100)
      
      // Clear announcement after it's been read
      setTimeout(() => {
        region.textContent = ''
      }, 5000)
    }
  }

  // Public methods for other controllers to use

  // Announce loading state
  announceLoading(message = 'Loading content') {
    this.announceToScreenReader(message, 'assertive')
  }

  // Announce completion
  announceComplete(message = 'Content loaded') {
    this.announceToScreenReader(message, 'polite')
  }

  // Announce error
  announceError(message) {
    this.announceToScreenReader(`Error: ${message}`, 'assertive')
  }

  // Announce success
  announceSuccess(message) {
    this.announceToScreenReader(`Success: ${message}`, 'polite')
  }

  // Toggle reduced motion
  toggleReducedMotion() {
    this.reducedMotionValue = !this.reducedMotionValue
    document.body.classList.toggle('prefers-reduced-motion', this.reducedMotionValue)
    
    // Store preference
    localStorage.setItem('prefers-reduced-motion', this.reducedMotionValue)
    
    this.announceToScreenReader(
      this.reducedMotionValue ? 'Reduced motion enabled' : 'Reduced motion disabled'
    )
  }

  // Toggle high contrast
  toggleHighContrast() {
    this.highContrastValue = !this.highContrastValue
    document.body.classList.toggle('prefers-high-contrast', this.highContrastValue)
    
    // Store preference
    localStorage.setItem('prefers-high-contrast', this.highContrastValue)
    
    this.announceToScreenReader(
      this.highContrastValue ? 'High contrast enabled' : 'High contrast disabled'
    )
  }

  // Focus first interactive element in container
  focusFirstInteractive(container) {
    const firstInteractive = container.querySelector(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    if (firstInteractive) {
      firstInteractive.focus()
    }
  }

  // Focus last interactive element in container
  focusLastInteractive(container) {
    const interactiveElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    if (interactiveElements.length > 0) {
      interactiveElements[interactiveElements.length - 1].focus()
    }
  }
}