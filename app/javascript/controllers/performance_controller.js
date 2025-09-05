import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["lazyImage", "criticalCss", "deferredContent"]
  static values = { 
    imageLoadingThreshold: { type: Number, default: 100 },
    enableWebP: { type: Boolean, default: true },
    enableLazyLoading: { type: Boolean, default: true },
    performanceMetrics: { type: Boolean, default: true }
  }

  connect() {
    this.initializePerformanceOptimizations()
    this.setupImageLazyLoading()
    this.setupCriticalCssLoading()
    this.setupPerformanceMonitoring()
    this.optimizeForMobile()
  }

  disconnect() {
    this.cleanupObservers()
  }

  // Initialize performance optimizations
  initializePerformanceOptimizations() {
    // Preload critical resources
    this.preloadCriticalResources()
    
    // Setup resource hints
    this.setupResourceHints()
    
    // Initialize bundle splitting
    this.initializeBundleSplitting()
    
    // Setup service worker for caching
    this.setupServiceWorkerCaching()
  }

  // Setup image lazy loading with WebP support
  setupImageLazyLoading() {
    if (!this.enableLazyLoadingValue) return

    // Create intersection observer for lazy loading
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target)
          this.imageObserver.unobserve(entry.target)
        }
      })
    }, {
      rootMargin: `${this.imageLoadingThresholdValue}px`
    })

    // Observe all lazy images
    this.lazyImageTargets.forEach(img => {
      this.imageObserver.observe(img)
    })

    // Also observe any images added dynamically
    this.observeDynamicImages()
  }
}  //
 Load image with WebP support and fallback
  loadImage(img) {
    const src = img.dataset.src
    const webpSrc = img.dataset.webpSrc
    
    if (this.enableWebPValue && webpSrc && this.supportsWebP()) {
      img.src = webpSrc
    } else if (src) {
      img.src = src
    }
    
    img.classList.remove('lazy-loading')
    img.classList.add('lazy-loaded')
    
    // Add loading animation
    img.addEventListener('load', () => {
      img.classList.add('fade-in')
    })
    
    img.addEventListener('error', () => {
      // Fallback to original src if WebP fails
      if (img.src === webpSrc && src) {
        img.src = src
      }
    })
  }

  // Check WebP support
  supportsWebP() {
    if (this.webpSupport !== undefined) return this.webpSupport
    
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    this.webpSupport = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    return this.webpSupport
  }

  // Observe dynamically added images
  observeDynamicImages() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const lazyImages = node.querySelectorAll('[data-src]')
            lazyImages.forEach(img => {
              if (!img.classList.contains('lazy-loaded')) {
                this.imageObserver.observe(img)
              }
            })
          }
        })
      })
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    this.mutationObserver = observer
  }

  // Setup critical CSS loading
  setupCriticalCssLoading() {
    // Load non-critical CSS asynchronously
    this.loadNonCriticalCSS()
    
    // Inline critical CSS for above-the-fold content
    this.inlineCriticalCSS()
  }

  // Load non-critical CSS
  loadNonCriticalCSS() {
    const nonCriticalStyles = [
      '/assets/components/forms.css',
      '/assets/components/tables.css',
      '/assets/components/modals.css'
    ]
    
    nonCriticalStyles.forEach(href => {
      this.loadCSSAsync(href)
    })
  }

  // Load CSS asynchronously
  loadCSSAsync(href) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.media = 'print'
    link.onload = () => {
      link.media = 'all'
    }
    document.head.appendChild(link)
  }

  // Inline critical CSS
  inlineCriticalCSS() {
    const criticalCSS = `
      /* Critical above-the-fold styles */
      .loading-skeleton {
        background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
        background-size: 200% 100%;
        animation: loading-shimmer 2s infinite;
      }
      
      .fade-in {
        animation: fadeIn 0.3s ease-in-out;
      }
      
      @keyframes loading-shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    
    const style = document.createElement('style')
    style.textContent = criticalCSS
    document.head.appendChild(style)
  }
}  //
 Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      { href: '/assets/application.css', as: 'style' },
      { href: '/assets/application.js', as: 'script' },
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
    ]
    
    criticalResources.forEach(resource => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = resource.href
      link.as = resource.as
      if (resource.type) link.type = resource.type
      if (resource.crossorigin) link.crossOrigin = resource.crossorigin
      document.head.appendChild(link)
    })
  }

  // Setup resource hints
  setupResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ]
    
    externalDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = `//${domain}`
      document.head.appendChild(link)
    })
    
    // Preconnect to critical external resources
    const preconnectDomains = [
      'fonts.gstatic.com'
    ]
    
    preconnectDomains.forEach(domain => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = `//${domain}`
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
  }

  // Initialize bundle splitting
  initializeBundleSplitting() {
    // Dynamically import non-critical modules
    this.loadNonCriticalModules()
  }

  // Load non-critical modules
  async loadNonCriticalModules() {
    // Load modules based on user interaction
    document.addEventListener('click', this.loadInteractionModules.bind(this), { once: true })
    document.addEventListener('scroll', this.loadScrollModules.bind(this), { once: true })
    
    // Load modules after initial page load
    if (document.readyState === 'complete') {
      this.loadDeferredModules()
    } else {
      window.addEventListener('load', this.loadDeferredModules.bind(this))
    }
  }

  // Load modules on user interaction
  async loadInteractionModules() {
    try {
      // Dynamically import modules that are needed for interactions
      const { default: ChartController } = await import('./chart_controller.js')
      const { default: ModalController } = await import('./modal_controller.js')
      
      // Register controllers with Stimulus
      this.application.register('chart', ChartController)
      this.application.register('modal', ModalController)
    } catch (error) {
      console.warn('Failed to load interaction modules:', error)
    }
  }

  // Load modules on scroll
  async loadScrollModules() {
    try {
      // Load modules needed for scroll-based features
      const { default: InfiniteScrollController } = await import('./infinite_scroll_controller.js')
      this.application.register('infinite-scroll', InfiniteScrollController)
    } catch (error) {
      console.warn('Failed to load scroll modules:', error)
    }
  }

  // Load deferred modules
  async loadDeferredModules() {
    try {
      // Load analytics and non-critical features
      const modules = [
        import('./analytics_controller.js'),
        import('./notification_controller.js')
      ]
      
      const loadedModules = await Promise.allSettled(modules)
      
      loadedModules.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const controllerName = ['analytics', 'notification'][index]
          this.application.register(controllerName, result.value.default)
        }
      })
    } catch (error) {
      console.warn('Failed to load deferred modules:', error)
    }
  }
}  // Setup
 service worker caching
  setupServiceWorkerCaching() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration)
          this.serviceWorkerRegistration = registration
        })
        .catch(error => {
          console.warn('Service Worker registration failed:', error)
        })
    }
  }

  // Setup performance monitoring
  setupPerformanceMonitoring() {
    if (!this.performanceMetricsValue) return
    
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals()
    
    // Monitor resource loading
    this.monitorResourceLoading()
    
    // Monitor user interactions
    this.monitorUserInteractions()
  }

  // Monitor Core Web Vitals
  monitorCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeLCP()
    
    // First Input Delay (FID)
    this.observeFID()
    
    // Cumulative Layout Shift (CLS)
    this.observeCLS()
  }

  // Observe Largest Contentful Paint
  observeLCP() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        
        console.log('LCP:', lastEntry.startTime)
        this.reportMetric('lcp', lastEntry.startTime)
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
    }
  }

  // Observe First Input Delay
  observeFID() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime)
          this.reportMetric('fid', entry.processingStart - entry.startTime)
        })
      })
      
      observer.observe({ entryTypes: ['first-input'] })
    }
  }

  // Observe Cumulative Layout Shift
  observeCLS() {
    if ('PerformanceObserver' in window) {
      let clsValue = 0
      
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        
        console.log('CLS:', clsValue)
        this.reportMetric('cls', clsValue)
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
    }
  }

  // Monitor resource loading
  monitorResourceLoading() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.duration > 1000) { // Resources taking more than 1s
            console.warn('Slow resource:', entry.name, entry.duration)
            this.reportMetric('slow_resource', {
              name: entry.name,
              duration: entry.duration
            })
          }
        })
      })
      
      observer.observe({ entryTypes: ['resource'] })
    }
  }

  // Monitor user interactions
  monitorUserInteractions() {
    let interactionCount = 0
    
    const trackInteraction = (event) => {
      interactionCount++
      const now = performance.now()
      
      // Track interaction to next paint
      requestAnimationFrame(() => {
        const paintTime = performance.now()
        const interactionTime = paintTime - now
        
        if (interactionTime > 100) { // Interactions taking more than 100ms
          console.warn('Slow interaction:', event.type, interactionTime)
          this.reportMetric('slow_interaction', {
            type: event.type,
            duration: interactionTime
          })
        }
      })
    }
    
    ['click', 'touchstart', 'keydown'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true })
    })
  }
}  // 
Optimize for mobile devices
  optimizeForMobile() {
    const isMobile = window.innerWidth < 768
    
    if (isMobile) {
      // Reduce animation complexity on mobile
      this.optimizeMobileAnimations()
      
      // Optimize touch interactions
      this.optimizeTouchInteractions()
      
      // Reduce memory usage
      this.optimizeMemoryUsage()
      
      // Optimize network requests
      this.optimizeNetworkRequests()
    }
  }

  // Optimize mobile animations
  optimizeMobileAnimations() {
    // Use transform and opacity for animations (GPU accelerated)
    const style = document.createElement('style')
    style.textContent = `
      @media (max-width: 767px) {
        * {
          will-change: auto !important;
        }
        
        .mobile-optimized-animation {
          will-change: transform, opacity;
          transform: translateZ(0); /* Force GPU acceleration */
        }
        
        .reduce-motion {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  // Optimize touch interactions
  optimizeTouchInteractions() {
    // Add touch-action CSS for better scrolling performance
    document.body.style.touchAction = 'manipulation'
    
    // Optimize touch event listeners
    const touchElements = document.querySelectorAll('[data-touch-optimized]')
    touchElements.forEach(element => {
      element.style.touchAction = 'manipulation'
      element.style.webkitTapHighlightColor = 'transparent'
    })
  }

  // Optimize memory usage
  optimizeMemoryUsage() {
    // Clean up unused event listeners
    this.cleanupUnusedListeners()
    
    // Implement object pooling for frequently created objects
    this.setupObjectPooling()
    
    // Monitor memory usage
    this.monitorMemoryUsage()
  }

  // Optimize network requests
  optimizeNetworkRequests() {
    // Implement request batching
    this.setupRequestBatching()
    
    // Use compression for API requests
    this.setupRequestCompression()
    
    // Implement intelligent prefetching
    this.setupIntelligentPrefetching()
  }

  // Report performance metrics
  reportMetric(name, value) {
    // Send metrics to analytics service
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: value,
        custom_parameter: 'mobile_optimization'
      })
    }
    
    // Store metrics locally for debugging
    if (!window.performanceMetrics) {
      window.performanceMetrics = {}
    }
    window.performanceMetrics[name] = value
  }

  // Cleanup observers
  cleanupObservers() {
    if (this.imageObserver) {
      this.imageObserver.disconnect()
    }
    
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }
  }

  // Clean up unused event listeners
  cleanupUnusedListeners() {
    // Remove listeners from elements that are no longer in the DOM
    // This is a simplified example - in practice, you'd track listeners more carefully
    const elements = document.querySelectorAll('[data-cleanup-listeners]')
    elements.forEach(element => {
      if (!document.body.contains(element)) {
        // Remove listeners (implementation depends on how they were added)
        element.removeEventListener('click', this.handleClick)
        element.removeEventListener('touchstart', this.handleTouchStart)
      }
    })
  }

  // Setup object pooling
  setupObjectPooling() {
    // Create pools for frequently used objects
    this.objectPools = {
      touchEvents: [],
      animationFrames: [],
      timeouts: []
    }
  }

  // Monitor memory usage
  monitorMemoryUsage() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('High memory usage detected')
          this.reportMetric('high_memory_usage', memory.usedJSHeapSize)
        }
      }, 30000) // Check every 30 seconds
    }
  }

  // Setup request batching
  setupRequestBatching() {
    this.requestQueue = []
    this.batchTimeout = null
    
    // Batch requests together
    this.batchRequests = (request) => {
      this.requestQueue.push(request)
      
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout)
      }
      
      this.batchTimeout = setTimeout(() => {
        this.processBatchedRequests()
      }, 100) // Batch requests for 100ms
    }
  }

  // Process batched requests
  processBatchedRequests() {
    if (this.requestQueue.length === 0) return
    
    const requests = this.requestQueue.splice(0)
    
    // Send batched request to server
    fetch('/api/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    })
    .then(response => response.json())
    .then(data => {
      // Process batched responses
      data.responses.forEach((response, index) => {
        if (requests[index].callback) {
          requests[index].callback(response)
        }
      })
    })
    .catch(error => {
      console.error('Batch request failed:', error)
    })
  }

  // Setup request compression
  setupRequestCompression() {
    // Add compression headers to requests
    const originalFetch = window.fetch
    window.fetch = (url, options = {}) => {
      options.headers = {
        ...options.headers,
        'Accept-Encoding': 'gzip, deflate, br'
      }
      return originalFetch(url, options)
    }
  }

  // Setup intelligent prefetching
  setupIntelligentPrefetching() {
    // Prefetch resources based on user behavior
    const links = document.querySelectorAll('a[href]')
    
    links.forEach(link => {
      link.addEventListener('mouseenter', () => {
        // Prefetch on hover (desktop)
        this.prefetchResource(link.href)
      }, { once: true })
      
      link.addEventListener('touchstart', () => {
        // Prefetch on touch start (mobile)
        this.prefetchResource(link.href)
      }, { once: true })
    })
  }

  // Prefetch resource
  prefetchResource(url) {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
  }
}