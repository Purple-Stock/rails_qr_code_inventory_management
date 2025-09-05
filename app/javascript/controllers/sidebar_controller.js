import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["sidebar", "text", "toggleIcon", "toggleButton"]
  static values = { 
    expanded: { type: Boolean, default: true },
    autoCollapse: { type: Boolean, default: true },
    tabletBreakpoint: { type: Number, default: 768 },
    desktopBreakpoint: { type: Number, default: 1024 }
  }

  connect() {
    this.boundHandleResize = this.handleResize.bind(this)
    this.boundHandleTouchStart = this.handleTouchStart.bind(this)
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this)
    
    // Initialize touch tracking for tablet gestures
    this.touchStartX = 0
    this.touchStartY = 0
    this.isTouch = false
    
    // Set up event listeners
    window.addEventListener('resize', this.boundHandleResize)
    
    // Add touch event listeners for tablet interactions
    if (this.hasToggleButtonTarget) {
      this.toggleButtonTarget.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true })
      this.toggleButtonTarget.addEventListener('touchend', this.boundHandleTouchEnd, { passive: true })
    }
    
    // Initialize responsive behavior
    this.handleResize()
    this.updateSidebarState()
  }

  disconnect() {
    window.removeEventListener('resize', this.boundHandleResize)
    
    if (this.hasToggleButtonTarget) {
      this.toggleButtonTarget.removeEventListener('touchstart', this.boundHandleTouchStart)
      this.toggleButtonTarget.removeEventListener('touchend', this.boundHandleTouchEnd)
    }
  }

  // Toggle sidebar expanded/collapsed state
  toggle() {
    this.expandedValue = !this.expandedValue
    this.updateSidebarState()
    
    // Provide haptic feedback on touch devices
    this.triggerHapticFeedback()
    
    // Store user preference
    this.storeUserPreference()
  }

  // Expand sidebar
  expand() {
    if (!this.expandedValue) {
      this.expandedValue = true
      this.updateSidebarState()
      this.storeUserPreference()
    }
  }

  // Collapse sidebar
  collapse() {
    if (this.expandedValue) {
      this.expandedValue = false
      this.updateSidebarState()
      this.storeUserPreference()
    }
  }

  // Update sidebar visual state based on current values
  updateSidebarState() {
    if (!this.hasSidebarTarget) return

    const currentBreakpoint = this.getCurrentBreakpoint()
    
    // Handle different breakpoints
    switch (currentBreakpoint) {
      case 'mobile':
        // Mobile: sidebar is handled by mobile navigation controller
        this.hideSidebar()
        break
        
      case 'tablet':
        // Tablet: collapsible sidebar with touch-friendly controls
        this.showSidebar()
        this.updateTabletSidebar()
        break
        
      case 'desktop':
        // Desktop: full sidebar with hover interactions
        this.showSidebar()
        this.updateDesktopSidebar()
        break
    }
  }

  // Update sidebar for tablet view
  updateTabletSidebar() {
    if (this.expandedValue) {
      // Expanded state
      this.sidebarTarget.classList.remove("w-16", "w-20")
      this.sidebarTarget.classList.add("w-64")
      
      if (this.hasToggleIconTarget) {
        this.toggleIconTarget.classList.remove("rotate-180")
      }
      
      // Update icons for expanded state
      this.updateIconSizes(false) // false = not collapsed
      
      // Show text elements
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-0", "w-0", "hidden")
        text.classList.add("opacity-100")
      })
      
      // Update toggle button for touch
      this.updateToggleButtonForTouch(true)
      
    } else {
      // Collapsed state
      this.sidebarTarget.classList.remove("w-64")
      this.sidebarTarget.classList.add("w-20") // Slightly wider for tablet touch targets
      
      if (this.hasToggleIconTarget) {
        this.toggleIconTarget.classList.add("rotate-180")
      }
      
      // Update icons for collapsed state
      this.updateIconSizes(true) // true = collapsed
      
      // Hide text elements
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-100")
        text.classList.add("opacity-0", "w-0", "hidden")
      })
      
      // Update toggle button for touch
      this.updateToggleButtonForTouch(false)
    }
  }

  // Update sidebar for desktop view
  updateDesktopSidebar() {
    if (this.expandedValue) {
      // Expanded state
      this.sidebarTarget.classList.remove("w-16", "w-20")
      this.sidebarTarget.classList.add("w-64")
      
      if (this.hasToggleIconTarget) {
        this.toggleIconTarget.classList.remove("rotate-180")
      }
      
      // Update icons for expanded state
      this.updateIconSizes(false)
      
      // Show text elements
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-0", "w-0", "hidden")
        text.classList.add("opacity-100")
      })
      
      // Update toggle button for mouse
      this.updateToggleButtonForMouse(true)
      
    } else {
      // Collapsed state
      this.sidebarTarget.classList.remove("w-64", "w-20")
      this.sidebarTarget.classList.add("w-16")
      
      if (this.hasToggleIconTarget) {
        this.toggleIconTarget.classList.add("rotate-180")
      }
      
      // Update icons for collapsed state
      this.updateIconSizes(true)
      
      // Hide text elements
      this.textTargets.forEach(text => {
        text.classList.remove("opacity-100")
        text.classList.add("opacity-0", "w-0", "hidden")
      })
      
      // Update toggle button for mouse
      this.updateToggleButtonForMouse(false)
    }
  }

  // Update icon sizes based on collapsed state
  updateIconSizes(isCollapsed) {
    document.querySelectorAll('.sidebar-icon').forEach(icon => {
      if (isCollapsed) {
        icon.classList.remove('h-6', 'w-6')
        icon.classList.add('h-8', 'w-8')
      } else {
        icon.classList.remove('h-8', 'w-8')
        icon.classList.add('h-6', 'w-6')
      }
    })
  }

  // Update toggle button for touch interactions (tablet)
  updateToggleButtonForTouch(isExpanded) {
    if (!this.hasToggleButtonTarget) return
    
    // Make button larger for touch
    this.toggleButtonTarget.classList.remove('p-1.5')
    this.toggleButtonTarget.classList.add('p-3', 'touch-target')
    
    // Add touch-friendly styling
    this.toggleButtonTarget.classList.add('active:bg-gray-200', 'transition-colors', 'duration-200')
  }

  // Update toggle button for mouse interactions (desktop)
  updateToggleButtonForMouse(isExpanded) {
    if (!this.hasToggleButtonTarget) return
    
    // Standard size for mouse
    this.toggleButtonTarget.classList.remove('p-3', 'touch-target', 'active:bg-gray-200')
    this.toggleButtonTarget.classList.add('p-1.5')
    
    // Add hover effects
    this.toggleButtonTarget.classList.add('hover:bg-gray-100', 'transition-colors', 'duration-200')
  }

  // Show sidebar
  showSidebar() {
    if (this.hasSidebarTarget) {
      this.element.classList.remove('hidden')
      this.element.classList.add('block')
    }
  }

  // Hide sidebar (for mobile)
  hideSidebar() {
    if (this.hasSidebarTarget) {
      this.element.classList.remove('block')
      this.element.classList.add('hidden')
    }
  }

  // Handle window resize
  handleResize() {
    const currentBreakpoint = this.getCurrentBreakpoint()
    
    // Auto-collapse behavior based on screen size
    if (this.autoCollapseValue) {
      if (currentBreakpoint === 'tablet' && window.innerWidth < 900) {
        // Auto-collapse on smaller tablets
        this.expandedValue = false
      } else if (currentBreakpoint === 'desktop') {
        // Auto-expand on desktop if user hasn't explicitly collapsed
        const userPreference = this.getUserPreference()
        if (userPreference === null) {
          this.expandedValue = true
        }
      }
    }
    
    // Update sidebar state for new breakpoint
    this.updateSidebarState()
  }

  // Get current responsive breakpoint
  getCurrentBreakpoint() {
    const width = window.innerWidth
    
    if (width < this.tabletBreakpointValue) {
      return 'mobile'
    } else if (width < this.desktopBreakpointValue) {
      return 'tablet'
    } else {
      return 'desktop'
    }
  }

  // Touch event handlers for tablet interactions
  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX
    this.touchStartY = event.touches[0].clientY
    this.isTouch = true
    
    // Add visual feedback for touch
    event.target.classList.add('bg-gray-200')
  }

  handleTouchEnd(event) {
    if (this.isTouch) {
      // Remove visual feedback
      event.target.classList.remove('bg-gray-200')
      
      // Trigger toggle if it was a tap (not a swipe)
      const touchEndX = event.changedTouches[0].clientX
      const touchEndY = event.changedTouches[0].clientY
      const deltaX = Math.abs(touchEndX - this.touchStartX)
      const deltaY = Math.abs(touchEndY - this.touchStartY)
      
      // If movement is minimal, treat as tap
      if (deltaX < 10 && deltaY < 10) {
        this.toggle()
      }
    }
    
    this.isTouch = false
  }

  // Store user preference in localStorage
  storeUserPreference() {
    try {
      localStorage.setItem('sidebar-expanded', this.expandedValue.toString())
    } catch (e) {
      // Handle localStorage not available
      console.warn('Could not store sidebar preference:', e)
    }
  }

  // Get user preference from localStorage
  getUserPreference() {
    try {
      const stored = localStorage.getItem('sidebar-expanded')
      return stored ? stored === 'true' : null
    } catch (e) {
      // Handle localStorage not available
      return null
    }
  }

  // Trigger haptic feedback if available
  triggerHapticFeedback() {
    if ('vibrate' in navigator && this.getCurrentBreakpoint() !== 'desktop') {
      navigator.vibrate(50) // Short vibration for touch devices
    }
  }

  // Initialize from user preference
  expandedValueChanged() {
    this.updateSidebarState()
  }
} 