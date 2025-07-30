import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["overlay", "menu", "backdrop", "hamburger"]
  static values = { 
    open: { type: Boolean, default: false },
    swipeThreshold: { type: Number, default: 50 },
    animationDuration: { type: Number, default: 300 }
  }

  connect() {
    this.boundHandleResize = this.handleResize.bind(this)
    this.boundHandleKeydown = this.handleKeydown.bind(this)
    this.boundHandleTouchStart = this.handleTouchStart.bind(this)
    this.boundHandleTouchMove = this.handleTouchMove.bind(this)
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this)
    
    // Initialize touch tracking
    this.touchStartX = 0
    this.touchCurrentX = 0
    this.isDragging = false
    this.menuWidth = 280 // Default menu width in pixels
    
    // Set up event listeners
    window.addEventListener('resize', this.boundHandleResize)
    document.addEventListener('keydown', this.boundHandleKeydown)
    
    // Add touch event listeners to the menu for swipe gestures
    if (this.hasMenuTarget) {
      this.menuTarget.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false })
      this.menuTarget.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false })
      this.menuTarget.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false })
    }
    
    // Add swipe listener to backdrop for closing
    if (this.hasBackdropTarget) {
      this.backdropTarget.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false })
      this.backdropTarget.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false })
      this.backdropTarget.addEventListener('touchend', this.boundHandleTouchEnd, { passive: false })
    }
    
    // Initialize menu state
    this.updateMenuVisibility()
    this.handleResize()
  }

  disconnect() {
    window.removeEventListener('resize', this.boundHandleResize)
    document.removeEventListener('keydown', this.boundHandleKeydown)
    
    if (this.hasMenuTarget) {
      this.menuTarget.removeEventListener('touchstart', this.boundHandleTouchStart)
      this.menuTarget.removeEventListener('touchmove', this.boundHandleTouchMove)
      this.menuTarget.removeEventListener('touchend', this.boundHandleTouchEnd)
    }
    
    if (this.hasBackdropTarget) {
      this.backdropTarget.removeEventListener('touchstart', this.boundHandleTouchStart)
      this.backdropTarget.removeEventListener('touchmove', this.boundHandleTouchMove)
      this.backdropTarget.removeEventListener('touchend', this.boundHandleTouchEnd)
    }
  }

  // Toggle menu open/closed
  toggle() {
    this.openValue = !this.openValue
    this.updateMenuVisibility()
    
    // Provide haptic feedback if available
    this.triggerHapticFeedback()
  }

  // Open the menu
  open() {
    if (!this.openValue) {
      this.openValue = true
      this.updateMenuVisibility()
      this.triggerHapticFeedback()
    }
  }

  // Close the menu
  close() {
    if (this.openValue) {
      this.openValue = false
      this.updateMenuVisibility()
      this.triggerHapticFeedback()
    }
  }

  // Handle backdrop click to close menu
  closeOnBackdrop(event) {
    if (event.target === this.backdropTarget) {
      this.close()
    }
  }

  // Update menu visibility with animations
  updateMenuVisibility() {
    if (!this.hasOverlayTarget) return

    if (this.openValue) {
      // Show overlay
      this.overlayTarget.classList.remove('hidden')
      this.overlayTarget.classList.add('fixed', 'inset-0', 'z-overlay')
      
      // Animate backdrop
      if (this.hasBackdropTarget) {
        this.backdropTarget.classList.remove('opacity-0')
        this.backdropTarget.classList.add('opacity-50')
      }
      
      // Animate menu slide-in
      if (this.hasMenuTarget) {
        this.menuTarget.classList.remove('-translate-x-full')
        this.menuTarget.classList.add('translate-x-0')
        this.menuTarget.setAttribute('aria-hidden', 'false')
      }
      
      // Update hamburger button ARIA state
      if (this.hasHamburgerTarget) {
        this.hamburgerTarget.setAttribute('aria-expanded', 'true')
      }
      
      // Update hamburger icon
      this.updateHamburgerIcon(true)
      
      // Prevent body scroll
      document.body.classList.add('overflow-hidden')
      
      // Focus management for accessibility
      this.trapFocus()
      
      // Announce to screen readers
      this.announceToScreenReader('Navigation menu opened')
      
    } else {
      // Animate menu slide-out
      if (this.hasMenuTarget) {
        this.menuTarget.classList.remove('translate-x-0')
        this.menuTarget.classList.add('-translate-x-full')
        this.menuTarget.setAttribute('aria-hidden', 'true')
      }
      
      // Update hamburger button ARIA state
      if (this.hasHamburgerTarget) {
        this.hamburgerTarget.setAttribute('aria-expanded', 'false')
      }
      
      // Animate backdrop
      if (this.hasBackdropTarget) {
        this.backdropTarget.classList.remove('opacity-50')
        this.backdropTarget.classList.add('opacity-0')
      }
      
      // Hide overlay after animation
      setTimeout(() => {
        if (!this.openValue && this.hasOverlayTarget) {
          this.overlayTarget.classList.add('hidden')
          this.overlayTarget.classList.remove('fixed', 'inset-0', 'z-overlay')
        }
      }, this.animationDurationValue)
      
      // Update hamburger icon
      this.updateHamburgerIcon(false)
      
      // Restore body scroll
      document.body.classList.remove('overflow-hidden')
      
      // Return focus to hamburger button
      if (this.hasHamburgerTarget) {
        this.hamburgerTarget.focus()
      }
      
      // Announce to screen readers
      this.announceToScreenReader('Navigation menu closed')
    }
  }

  // Update hamburger icon animation
  updateHamburgerIcon(isOpen) {
    if (!this.hasHamburgerTarget) return
    
    const lines = this.hamburgerTarget.querySelectorAll('.hamburger-line')
    
    if (isOpen) {
      // Transform to X
      if (lines[0]) {
        lines[0].classList.add('rotate-45', 'translate-y-2')
      }
      if (lines[1]) {
        lines[1].classList.add('opacity-0')
      }
      if (lines[2]) {
        lines[2].classList.add('-rotate-45', '-translate-y-2')
      }
    } else {
      // Transform back to hamburger
      if (lines[0]) {
        lines[0].classList.remove('rotate-45', 'translate-y-2')
      }
      if (lines[1]) {
        lines[1].classList.remove('opacity-0')
      }
      if (lines[2]) {
        lines[2].classList.remove('-rotate-45', '-translate-y-2')
      }
    }
  }

  // Handle window resize
  handleResize() {
    const isMobile = window.innerWidth < 768 // md breakpoint
    
    if (!isMobile && this.openValue) {
      // Close menu on desktop
      this.close()
    }
    
    // Update menu width for calculations
    if (this.hasMenuTarget) {
      this.menuWidth = this.menuTarget.offsetWidth || 280
    }
  }

  // Handle keyboard navigation
  handleKeydown(event) {
    if (!this.openValue) return
    
    if (event.key === 'Escape') {
      event.preventDefault()
      this.close()
    }
    
    // Tab trapping for accessibility
    if (event.key === 'Tab') {
      this.handleTabKey(event)
    }
  }

  // Touch event handlers for swipe gestures
  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX
    this.touchCurrentX = this.touchStartX
    this.isDragging = false
  }

  handleTouchMove(event) {
    if (!event.touches[0]) return
    
    this.touchCurrentX = event.touches[0].clientX
    const deltaX = this.touchCurrentX - this.touchStartX
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > 10) {
      this.isDragging = true
      
      // For menu, allow dragging to close (swipe left)
      if (this.openValue && event.target.closest('[data-mobile-navigation-target="menu"]')) {
        if (deltaX < 0) {
          // Dragging left to close
          const progress = Math.max(0, Math.min(1, Math.abs(deltaX) / this.menuWidth))
          this.updateMenuDragProgress(progress)
        }
      }
      
      // For backdrop, allow swipe left to close
      if (this.openValue && event.target === this.backdropTarget && deltaX < -this.swipeThresholdValue) {
        event.preventDefault()
      }
    }
  }

  handleTouchEnd(event) {
    if (!this.isDragging) return
    
    const deltaX = this.touchCurrentX - this.touchStartX
    const isSwipeLeft = deltaX < -this.swipeThresholdValue
    const isSwipeRight = deltaX > this.swipeThresholdValue
    
    // Reset drag progress
    this.resetMenuDragProgress()
    
    if (this.openValue && isSwipeLeft) {
      // Swipe left to close
      this.close()
    } else if (!this.openValue && isSwipeRight && event.target.closest('[data-mobile-navigation-target="hamburger"]')) {
      // Swipe right on hamburger to open
      this.open()
    }
    
    this.isDragging = false
  }

  // Update menu position during drag
  updateMenuDragProgress(progress) {
    if (!this.hasMenuTarget) return
    
    const translateX = -progress * 100
    this.menuTarget.style.transform = `translateX(${translateX}%)`
    
    // Update backdrop opacity
    if (this.hasBackdropTarget) {
      const opacity = 0.5 * (1 - progress)
      this.backdropTarget.style.opacity = opacity
    }
  }

  // Reset menu drag progress
  resetMenuDragProgress() {
    if (this.hasMenuTarget) {
      this.menuTarget.style.transform = ''
    }
    if (this.hasBackdropTarget) {
      this.backdropTarget.style.opacity = ''
    }
  }

  // Focus management for accessibility
  trapFocus() {
    if (!this.hasMenuTarget) return
    
    const focusableElements = this.menuTarget.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    )
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }

  // Handle tab key for focus trapping
  handleTabKey(event) {
    if (!this.hasMenuTarget) return
    
    const focusableElements = this.menuTarget.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }

  // Trigger haptic feedback if available
  triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration
    }
  }

  // Announce to screen readers
  announceToScreenReader(message) {
    const accessibilityController = this.application.getControllerForElementAndIdentifier(document.body, 'accessibility')
    if (accessibilityController) {
      accessibilityController.announceToScreenReader(message)
    }
  }

  // Enhanced focus management with better accessibility
  trapFocus() {
    if (!this.hasMenuTarget) return
    
    const focusableElements = this.menuTarget.querySelectorAll(
      'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )
    
    if (focusableElements.length > 0) {
      // Focus the first focusable element
      focusableElements[0].focus()
      
      // Store the previously focused element to return focus later
      this.previouslyFocusedElement = document.activeElement
    }
  }

  // Enhanced tab key handling with better accessibility
  handleTabKey(event) {
    if (!this.hasMenuTarget) return
    
    const focusableElements = this.menuTarget.querySelectorAll(
      'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    )
    
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }
}