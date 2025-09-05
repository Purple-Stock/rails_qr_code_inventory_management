import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["container", "loadingIndicator", "endMessage", "virtualContainer"]
  static values = { 
    url: String,
    page: { type: Number, default: 1 },
    perPage: { type: Number, default: 20 },
    threshold: { type: Number, default: 100 },
    hasMore: { type: Boolean, default: true },
    loading: { type: Boolean, default: false },
    pullToRefreshEnabled: { type: Boolean, default: true },
    virtualScrollEnabled: { type: Boolean, default: true },
    itemHeight: { type: Number, default: 80 },
    bufferSize: { type: Number, default: 5 }
  }

  connect() {
    this.setupIntersectionObserver()
    this.setupPullToRefresh()
    this.setupVirtualScroll()
    this.setupScrollListener()
    this.setupResizeObserver()
    
    // Initialize virtual scroll state
    this.allItems = []
    this.visibleRange = { start: 0, end: this.perPageValue }
    this.containerHeight = 0
    this.scrollTop = 0
    this.isScrolling = false
    this.scrollTimeout = null
    
    // Performance optimization
    this.throttledScroll = this.throttle(this.handleScroll.bind(this), 16) // 60fps
    this.debouncedResize = this.debounce(this.handleResize.bind(this), 250)
  }

  disconnect() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    if (this.pullToRefreshGesture) {
      this.removePullToRefreshListeners()
    }
    if (this.scrollListener) {
      this.containerTarget.removeEventListener('scroll', this.scrollListener)
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }
  }

  setupIntersectionObserver() {
    const options = {
      root: this.containerTarget,
      rootMargin: `${this.thresholdValue}px`,
      threshold: [0, 0.1, 0.5, 1.0]
    }

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === this.loadingIndicatorTarget) {
          if (entry.isIntersecting && this.hasMoreValue && !this.loadingValue) {
            this.loadMore()
          }
        } else {
          // Handle item visibility for virtual scrolling
          this.handleItemVisibility(entry)
        }
      })
    }, options)

    // Observe the loading indicator
    if (this.hasLoadingIndicatorTarget) {
      this.intersectionObserver.observe(this.loadingIndicatorTarget)
    }
  }

  setupVirtualScroll() {
    if (!this.virtualScrollEnabledValue) return

    // Create virtual container if it doesn't exist
    if (!this.hasVirtualContainerTarget) {
      const virtualContainer = document.createElement('div')
      virtualContainer.setAttribute('data-infinite-scroll-target', 'virtualContainer')
      virtualContainer.className = 'virtual-scroll-container'
      this.containerTarget.appendChild(virtualContainer)
    }
  }

  setupScrollListener() {
    this.scrollListener = this.throttledScroll
    this.containerTarget.addEventListener('scroll', this.scrollListener, { passive: true })
  }

  setupResizeObserver() {
    if (!window.ResizeObserver) return

    this.resizeObserver = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        if (entry.target === this.containerTarget) {
          this.debouncedResize()
        }
      })
    })

    this.resizeObserver.observe(this.containerTarget)
  }

  handleScroll() {
    if (!this.virtualScrollEnabledValue) return

    this.scrollTop = this.containerTarget.scrollTop
    this.isScrolling = true

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout)
    }

    // Update virtual scroll immediately for smooth scrolling
    this.updateVirtualScroll()

    // Set scrolling to false after scroll ends
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false
    }, 150)
  }

  handleResize() {
    this.containerHeight = this.containerTarget.clientHeight
    this.updateVirtualScroll()
  }

  handleItemVisibility(entry) {
    const item = entry.target
    const itemIndex = parseInt(item.dataset.itemIndex)
    
    if (entry.isIntersecting) {
      // Item is visible, ensure it's rendered
      item.style.display = ''
      item.classList.remove('virtual-scroll-hidden')
    } else if (!this.isScrolling) {
      // Item is not visible and we're not actively scrolling
      // Hide it to improve performance
      item.classList.add('virtual-scroll-hidden')
    }
  }

  setupPullToRefresh() {
    if (!this.pullToRefreshEnabledValue || !this.hasContainerTarget) return

    this.pullToRefreshGesture = {
      startY: 0,
      currentY: 0,
      startTime: 0,
      isDragging: false,
      isRefreshing: false,
      threshold: 80,
      maxDistance: 120,
      velocity: 0,
      lastY: 0,
      lastTime: 0
    }

    // Bind methods to preserve context
    this.boundTouchStart = this.handleTouchStart.bind(this)
    this.boundTouchMove = this.handleTouchMove.bind(this)
    this.boundTouchEnd = this.handleTouchEnd.bind(this)

    this.containerTarget.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    this.containerTarget.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    this.containerTarget.addEventListener('touchend', this.boundTouchEnd, { passive: false })

    // Create pull-to-refresh indicator
    this.createPullToRefreshIndicator()
  }

  createPullToRefreshIndicator() {
    this.pullIndicator = document.createElement('div')
    this.pullIndicator.className = 'pull-to-refresh-indicator'
    this.pullIndicator.innerHTML = `
      <div class="pull-to-refresh-content">
        <div class="pull-to-refresh-spinner hidden">
          <svg class="animate-spin h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div class="pull-to-refresh-arrow">
          <svg class="h-6 w-6 text-gray-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
        <span class="pull-to-refresh-text text-sm text-gray-500">Pull to refresh</span>
      </div>
    `
    
    this.containerTarget.insertBefore(this.pullIndicator, this.containerTarget.firstChild)
  }

  handleTouchStart(event) {
    if (this.containerTarget.scrollTop > 0 || this.pullToRefreshGesture.isRefreshing) return
    
    const touch = event.touches[0]
    this.pullToRefreshGesture.startY = touch.clientY
    this.pullToRefreshGesture.lastY = touch.clientY
    this.pullToRefreshGesture.startTime = Date.now()
    this.pullToRefreshGesture.lastTime = Date.now()
    this.pullToRefreshGesture.isDragging = true
    this.pullToRefreshGesture.velocity = 0

    // Add pull-to-refresh class for touch-action control
    this.containerTarget.classList.add('pull-to-refresh-enabled')
  }

  handleTouchMove(event) {
    if (!this.pullToRefreshGesture.isDragging || 
        this.containerTarget.scrollTop > 0 || 
        this.pullToRefreshGesture.isRefreshing) return

    const touch = event.touches[0]
    const currentTime = Date.now()
    this.pullToRefreshGesture.currentY = touch.clientY
    
    // Calculate velocity for momentum
    const timeDelta = currentTime - this.pullToRefreshGesture.lastTime
    if (timeDelta > 0) {
      this.pullToRefreshGesture.velocity = (touch.clientY - this.pullToRefreshGesture.lastY) / timeDelta
    }
    
    this.pullToRefreshGesture.lastY = touch.clientY
    this.pullToRefreshGesture.lastTime = currentTime

    const deltaY = this.pullToRefreshGesture.currentY - this.pullToRefreshGesture.startY

    if (deltaY > 0) {
      event.preventDefault()
      
      // Apply resistance curve for more natural feel
      const resistance = Math.max(0.3, 1 - (deltaY / 300))
      const distance = Math.min(deltaY * resistance, this.pullToRefreshGesture.maxDistance)
      
      this.updatePullIndicator(distance)
      this.containerTarget.style.transform = `translateY(${distance}px)`
      this.containerTarget.style.transition = 'none'
    }
  }

  handleTouchEnd(event) {
    if (!this.pullToRefreshGesture.isDragging) return

    const deltaY = this.pullToRefreshGesture.currentY - this.pullToRefreshGesture.startY
    const resistance = Math.max(0.3, 1 - (deltaY / 300))
    const distance = Math.min(deltaY * resistance, this.pullToRefreshGesture.maxDistance)
    const duration = Date.now() - this.pullToRefreshGesture.startTime

    // Check if gesture qualifies for refresh
    const shouldRefresh = distance >= this.pullToRefreshGesture.threshold && 
                         duration > 100 && // Minimum gesture duration
                         this.pullToRefreshGesture.velocity > 0.1 // Minimum velocity

    this.containerTarget.classList.remove('pull-to-refresh-enabled')
    this.containerTarget.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'

    if (shouldRefresh) {
      this.triggerRefresh()
    } else {
      this.resetPullToRefresh()
    }

    this.pullToRefreshGesture.isDragging = false
  }

  updatePullIndicator(distance) {
    const progress = Math.min(distance / this.pullToRefreshGesture.threshold, 1)
    const arrow = this.pullIndicator.querySelector('.pull-to-refresh-arrow svg')
    const text = this.pullIndicator.querySelector('.pull-to-refresh-text')

    this.pullIndicator.style.transform = `translateY(${distance - 60}px)`
    this.pullIndicator.style.opacity = progress

    if (progress >= 1) {
      arrow.style.transform = 'rotate(180deg)'
      text.textContent = 'Release to refresh'
    } else {
      arrow.style.transform = 'rotate(0deg)'
      text.textContent = 'Pull to refresh'
    }
  }

  triggerRefresh() {
    if (this.pullToRefreshGesture.isRefreshing) return

    this.pullToRefreshGesture.isRefreshing = true
    
    const spinner = this.pullIndicator.querySelector('.pull-to-refresh-spinner')
    const arrow = this.pullIndicator.querySelector('.pull-to-refresh-arrow')
    const text = this.pullIndicator.querySelector('.pull-to-refresh-text')

    // Show refreshing state
    spinner.classList.remove('hidden')
    arrow.classList.add('hidden')
    text.textContent = 'Refreshing...'
    
    // Keep indicator visible during refresh
    this.pullIndicator.style.transform = 'translateY(0px)'
    this.pullIndicator.style.opacity = '1'
    this.containerTarget.style.transform = 'translateY(60px)'

    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    this.refresh().finally(() => {
      setTimeout(() => {
        this.resetPullToRefresh()
        this.pullToRefreshGesture.isRefreshing = false
      }, 500) // Show success state briefly
    })
  }

  resetPullToRefresh() {
    // Smooth transition back to normal state
    this.containerTarget.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    this.pullIndicator.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease-out'
    
    this.containerTarget.style.transform = ''
    this.pullIndicator.style.transform = ''
    this.pullIndicator.style.opacity = '0'

    const spinner = this.pullIndicator.querySelector('.pull-to-refresh-spinner')
    const arrow = this.pullIndicator.querySelector('.pull-to-refresh-arrow')
    const text = this.pullIndicator.querySelector('.pull-to-refresh-text')

    spinner.classList.add('hidden')
    arrow.classList.remove('hidden')
    text.textContent = 'Pull to refresh'

    // Reset transitions after animation
    setTimeout(() => {
      this.containerTarget.style.transition = ''
      this.pullIndicator.style.transition = ''
    }, 300)
  }

  async loadMore() {
    if (this.loadingValue || !this.hasMoreValue) return

    this.loadingValue = true
    this.showLoadingIndicator()

    try {
      const nextPage = this.pageValue + 1
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set('page', nextPage)
      url.searchParams.set('per_page', this.perPageValue)

      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const html = await response.text()
        this.appendContent(html)
        this.pageValue = nextPage
      } else {
        this.handleLoadError(response)
      }
    } catch (error) {
      this.handleLoadError(error)
    } finally {
      this.loadingValue = false
      this.hideLoadingIndicator()
    }
  }

  async refresh() {
    try {
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set('page', 1)
      url.searchParams.set('per_page', this.perPageValue)

      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const html = await response.text()
        this.replaceContent(html)
        this.pageValue = 1
        this.hasMoreValue = true
      } else {
        this.handleLoadError(response)
      }
    } catch (error) {
      this.handleLoadError(error)
    }
  }

  appendContent(html) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    const newItems = tempDiv.querySelectorAll('[data-infinite-scroll-item]')
    
    if (newItems.length === 0) {
      this.hasMoreValue = false
      this.showEndMessage()
      return
    }

    // Add index to new items for virtual scrolling
    const existingItems = this.containerTarget.querySelectorAll('[data-infinite-scroll-item]')
    const startIndex = existingItems.length

    newItems.forEach((item, index) => {
      item.dataset.itemIndex = startIndex + index
      this.containerTarget.appendChild(item)
      
      // Observe new items for intersection
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(item)
      }
    })

    // Update virtual scroll
    this.updateVirtualScroll()
    
    // Announce to screen readers
    this.announceNewContent(newItems.length)
  }

  replaceContent(html) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html
    
    const newItems = tempDiv.querySelectorAll('[data-infinite-scroll-item]')
    
    // Clear existing items and stop observing them
    const existingItems = this.containerTarget.querySelectorAll('[data-infinite-scroll-item]')
    existingItems.forEach(item => {
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(item)
      }
      item.remove()
    })

    // Add new items with proper indexing
    newItems.forEach((item, index) => {
      item.dataset.itemIndex = index
      this.containerTarget.appendChild(item)
      
      // Observe new items
      if (this.intersectionObserver) {
        this.intersectionObserver.observe(item)
      }
    })

    // Reset scroll position
    this.containerTarget.scrollTop = 0
    this.scrollTop = 0

    // Update virtual scroll
    this.updateVirtualScroll()
    
    // Announce refresh completion
    this.announceRefreshComplete(newItems.length)
  }

  announceNewContent(count) {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Loaded ${count} more items`
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  announceRefreshComplete(count) {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `Content refreshed. Showing ${count} items`
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  updateVirtualScroll() {
    if (!this.virtualScrollEnabledValue) return

    const items = this.containerTarget.querySelectorAll('[data-infinite-scroll-item]')
    if (items.length === 0) return

    const containerHeight = this.containerTarget.clientHeight || 400
    const scrollTop = this.containerTarget.scrollTop
    const itemHeight = this.itemHeightValue
    
    // Calculate visible range with buffer
    const visibleStart = Math.floor(scrollTop / itemHeight)
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight)
    
    const bufferStart = Math.max(0, visibleStart - this.bufferSizeValue)
    const bufferEnd = Math.min(items.length - 1, visibleEnd + this.bufferSizeValue)

    // Update visible range
    this.visibleRange = { start: bufferStart, end: bufferEnd }

    // Show/hide items based on visibility
    items.forEach((item, index) => {
      if (index >= bufferStart && index <= bufferEnd) {
        // Item should be visible
        if (item.style.display === 'none') {
          item.style.display = ''
          item.classList.remove('virtual-scroll-hidden')
          
          // Re-observe for intersection if needed
          if (this.intersectionObserver) {
            this.intersectionObserver.observe(item)
          }
        }
      } else {
        // Item should be hidden
        if (item.style.display !== 'none') {
          item.style.display = 'none'
          item.classList.add('virtual-scroll-hidden')
          
          // Stop observing hidden items
          if (this.intersectionObserver) {
            this.intersectionObserver.unobserve(item)
          }
        }
      }
    })

    // Update virtual container height for proper scrollbar
    if (this.hasVirtualContainerTarget) {
      const totalHeight = items.length * itemHeight
      this.virtualContainerTarget.style.height = `${totalHeight}px`
    }

    // Dispatch custom event for other components
    this.dispatch('virtualScrollUpdate', {
      detail: {
        visibleRange: this.visibleRange,
        totalItems: items.length,
        scrollTop: scrollTop
      }
    })
  }

  showLoadingIndicator() {
    if (this.hasLoadingIndicatorTarget) {
      this.loadingIndicatorTarget.classList.remove('hidden')
    }
  }

  hideLoadingIndicator() {
    if (this.hasLoadingIndicatorTarget) {
      this.loadingIndicatorTarget.classList.add('hidden')
    }
  }

  showEndMessage() {
    if (this.hasEndMessageTarget) {
      this.endMessageTarget.classList.remove('hidden')
    }
  }

  handleLoadError(error) {
    console.error('Failed to load more content:', error)
    
    // Show error message to user
    const errorMessage = document.createElement('div')
    errorMessage.className = 'bg-red-50 border border-red-200 rounded-md p-4 m-4'
    errorMessage.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">Failed to load more content. Please try again.</p>
          <button class="mt-2 text-sm text-red-600 hover:text-red-500 underline" data-action="click->infinite-scroll#loadMore">
            Retry
          </button>
        </div>
      </div>
    `
    
    this.containerTarget.appendChild(errorMessage)
    
    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.remove()
      }
    }, 5000)
  }

  removePullToRefreshListeners() {
    if (this.hasContainerTarget) {
      this.containerTarget.removeEventListener('touchstart', this.boundTouchStart)
      this.containerTarget.removeEventListener('touchmove', this.boundTouchMove)
      this.containerTarget.removeEventListener('touchend', this.boundTouchEnd)
    }
  }

  // Utility methods for performance optimization
  throttle(func, limit) {
    let inThrottle
    return function() {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
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

  // Public API methods for external control
  scrollToTop() {
    this.containerTarget.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  scrollToItem(index) {
    const targetY = index * this.itemHeightValue
    this.containerTarget.scrollTo({
      top: targetY,
      behavior: 'smooth'
    })
  }

  getVisibleItems() {
    return Array.from(this.containerTarget.querySelectorAll('[data-infinite-scroll-item]'))
      .slice(this.visibleRange.start, this.visibleRange.end + 1)
  }

  getTotalItemCount() {
    return this.containerTarget.querySelectorAll('[data-infinite-scroll-item]').length
  }

  // Force refresh method
  forceRefresh() {
    if (!this.pullToRefreshGesture.isRefreshing) {
      this.refresh()
    }
  }
}