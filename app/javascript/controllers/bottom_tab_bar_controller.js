import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab", "indicator"]
  static values = { 
    activeTab: { type: String, default: "" },
    hideOnScroll: { type: Boolean, default: true },
    scrollThreshold: { type: Number, default: 10 }
  }

  connect() {
    this.boundHandleScroll = this.handleScroll.bind(this)
    this.boundHandleTouchStart = this.handleTouchStart.bind(this)
    this.boundHandleTouchEnd = this.handleTouchEnd.bind(this)
    
    // Initialize scroll tracking
    this.lastScrollY = window.scrollY
    this.isScrollingDown = false
    this.scrollTimeout = null
    
    // Initialize touch tracking
    this.touchStartY = 0
    this.touchStartTime = 0
    
    // Set up event listeners
    if (this.hideOnScrollValue) {
      window.addEventListener('scroll', this.boundHandleScroll, { passive: true })
    }
    
    // Add touch event listeners for haptic feedback
    this.tabTargets.forEach(tab => {
      tab.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true })
      tab.addEventListener('touchend', this.boundHandleTouchEnd, { passive: true })
    })
    
    // Initialize active tab
    this.updateActiveTab()
    this.ensureSafeAreaSupport()
  }

  disconnect() {
    if (this.hideOnScrollValue) {
      window.removeEventListener('scroll', this.boundHandleScroll)
    }
    
    this.tabTargets.forEach(tab => {
      tab.removeEventListener('touchstart', this.boundHandleTouchStart)
      tab.removeEventListener('touchend', this.boundHandleTouchEnd)
    })
    
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
  }

  // Handle tab selection
  selectTab(event) {
    const tab = event.currentTarget
    const tabName = tab.dataset.tab
    
    if (tabName && tabName !== this.activeTabValue) {
      this.activeTabValue = tabName
      this.updateActiveTab()
      this.triggerHapticFeedback()
      
      // Dispatch custom event for other controllers to listen to
      this.dispatch('tabChanged', { 
        detail: { 
          activeTab: tabName, 
          tabElement: tab 
        } 
      })
    }
  }

  // Update visual state of active tab
  updateActiveTab() {
    this.tabTargets.forEach(tab => {
      const tabName = tab.dataset.tab
      const isActive = tabName === this.activeTabValue
      
      // Update tab appearance
      this.updateTabAppearance(tab, isActive)
      
      // Update ARIA attributes for accessibility
      tab.setAttribute('aria-selected', isActive.toString())
      tab.setAttribute('tabindex', isActive ? '0' : '-1')
    })
    
    // Update indicator position if present
    this.updateIndicatorPosition()
  }

  // Update individual tab appearance
  updateTabAppearance(tab, isActive) {
    const icon = tab.querySelector('.tab-icon')
    const label = tab.querySelector('.tab-label')
    const badge = tab.querySelector('.tab-badge')
    
    if (isActive) {
      // Active state
      tab.classList.remove('text-gray-500')
      tab.classList.add('text-purple-600')
      
      if (icon) {
        icon.classList.remove('text-gray-400')
        icon.classList.add('text-purple-600')
      }
      
      if (label) {
        label.classList.remove('text-gray-500')
        label.classList.add('text-purple-600', 'font-medium')
      }
      
      // Add active background
      tab.classList.add('bg-purple-50')
      
    } else {
      // Inactive state
      tab.classList.remove('text-purple-600', 'bg-purple-50')
      tab.classList.add('text-gray-500')
      
      if (icon) {
        icon.classList.remove('text-purple-600')
        icon.classList.add('text-gray-400')
      }
      
      if (label) {
        label.classList.remove('text-purple-600', 'font-medium')
        label.classList.add('text-gray-500')
      }
    }
  }

  // Update indicator position
  updateIndicatorPosition() {
    if (!this.hasIndicatorTarget) return
    
    const activeTab = this.tabTargets.find(tab => 
      tab.dataset.tab === this.activeTabValue
    )
    
    if (activeTab) {
      const tabRect = activeTab.getBoundingClientRect()
      const containerRect = this.element.getBoundingClientRect()
      
      const left = tabRect.left - containerRect.left
      const width = tabRect.width
      
      this.indicatorTarget.style.transform = `translateX(${left}px)`
      this.indicatorTarget.style.width = `${width}px`
    }
  }

  // Handle scroll behavior
  handleScroll() {
    const currentScrollY = window.scrollY
    const scrollDelta = currentScrollY - this.lastScrollY
    
    // Determine scroll direction
    if (Math.abs(scrollDelta) > this.scrollThresholdValue) {
      this.isScrollingDown = scrollDelta > 0
      
      if (this.isScrollingDown) {
        // Hide tab bar when scrolling down
        this.hideTabBar()
      } else {
        // Show tab bar when scrolling up
        this.showTabBar()
      }
      
      this.lastScrollY = currentScrollY
    }
    
    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
    
    // Show tab bar after scroll stops
    this.scrollTimeout = setTimeout(() => {
      this.showTabBar()
    }, 1000)
  }

  // Hide tab bar
  hideTabBar() {
    this.element.classList.add('translate-y-full')
    this.element.classList.remove('translate-y-0')
  }

  // Show tab bar
  showTabBar() {
    this.element.classList.remove('translate-y-full')
    this.element.classList.add('translate-y-0')
  }

  // Touch event handlers
  handleTouchStart(event) {
    this.touchStartY = event.touches[0].clientY
    this.touchStartTime = Date.now()
    
    // Add visual feedback
    const tab = event.currentTarget
    tab.classList.add('bg-gray-100')
    
    // Scale animation for touch feedback
    tab.style.transform = 'scale(0.95)'
  }

  handleTouchEnd(event) {
    const tab = event.currentTarget
    
    // Remove visual feedback
    tab.classList.remove('bg-gray-100')
    tab.style.transform = ''
    
    // Check if it was a quick tap
    const touchDuration = Date.now() - this.touchStartTime
    const touchEndY = event.changedTouches[0].clientY
    const deltaY = Math.abs(touchEndY - this.touchStartY)
    
    // If it was a quick tap with minimal movement, trigger haptic feedback
    if (touchDuration < 200 && deltaY < 10) {
      this.triggerHapticFeedback()
    }
  }

  // Ensure safe area support for devices with home indicators
  ensureSafeAreaSupport() {
    // Add safe area padding for devices with home indicators
    if (CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)')) {
      this.element.style.paddingBottom = 'calc(1rem + env(safe-area-inset-bottom))'
    }
  }

  // Trigger haptic feedback
  triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      navigator.vibrate(50) // Short vibration
    }
  }

  // Keyboard navigation support
  handleKeydown(event) {
    const currentIndex = this.tabTargets.findIndex(tab => 
      tab.dataset.tab === this.activeTabValue
    )
    
    let newIndex = currentIndex
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : this.tabTargets.length - 1
        break
        
      case 'ArrowRight':
        event.preventDefault()
        newIndex = currentIndex < this.tabTargets.length - 1 ? currentIndex + 1 : 0
        break
        
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
        
      case 'End':
        event.preventDefault()
        newIndex = this.tabTargets.length - 1
        break
        
      case 'Enter':
      case ' ':
        event.preventDefault()
        this.selectTab({ currentTarget: this.tabTargets[currentIndex] })
        return
    }
    
    if (newIndex !== currentIndex) {
      const newTab = this.tabTargets[newIndex]
      if (newTab) {
        this.activeTabValue = newTab.dataset.tab
        this.updateActiveTab()
        newTab.focus()
      }
    }
  }

  // Set active tab programmatically
  setActiveTab(tabName) {
    if (this.tabTargets.some(tab => tab.dataset.tab === tabName)) {
      this.activeTabValue = tabName
      this.updateActiveTab()
    }
  }

  // Get current active tab
  getActiveTab() {
    return this.activeTabValue
  }
}