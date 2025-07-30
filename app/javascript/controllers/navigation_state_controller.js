import { Controller } from "@hotwired/stimulus"

// Navigation State Controller - Handles deep linking and navigation state persistence
export default class extends Controller {
  static values = { 
    currentPath: String,
    previousPath: String,
    navigationHistory: Array,
    maxHistorySize: { type: Number, default: 10 }
  }

  connect() {
    this.navigationHistory = this.getNavigationHistory()
    this.setupEventListeners()
    this.handleInitialNavigation()
    
    console.log('Navigation State Controller: Connected')
  }

  disconnect() {
    this.removeEventListeners()
  }

  // Setup event listeners for navigation events
  setupEventListeners() {
    // Listen for Turbo navigation events
    this.turboBeforeVisitHandler = this.handleTurboBeforeVisit.bind(this)
    this.turboVisitHandler = this.handleTurboVisit.bind(this)
    this.turboLoadHandler = this.handleTurboLoad.bind(this)
    
    document.addEventListener('turbo:before-visit', this.turboBeforeVisitHandler)
    document.addEventListener('turbo:visit', this.turboVisitHandler)
    document.addEventListener('turbo:load', this.turboLoadHandler)
    
    // Listen for browser navigation events
    this.popstateHandler = this.handlePopstate.bind(this)
    window.addEventListener('popstate', this.popstateHandler)
    
    // Listen for PWA app state changes
    this.visibilityChangeHandler = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)
    
    // Listen for beforeunload to save state
    this.beforeUnloadHandler = this.handleBeforeUnload.bind(this)
    window.addEventListener('beforeunload', this.beforeUnloadHandler)
  }

  // Remove event listeners
  removeEventListeners() {
    document.removeEventListener('turbo:before-visit', this.turboBeforeVisitHandler)
    document.removeEventListener('turbo:visit', this.turboVisitHandler)
    document.removeEventListener('turbo:load', this.turboLoadHandler)
    window.removeEventListener('popstate', this.popstateHandler)
    document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
    window.removeEventListener('beforeunload', this.beforeUnloadHandler)
  }

  // Handle initial navigation when controller connects
  handleInitialNavigation() {
    const currentPath = window.location.pathname + window.location.search
    
    // Check if this is a deep link or fresh app launch
    if (this.isDeepLink(currentPath)) {
      console.log('Navigation State: Deep link detected', currentPath)
      this.handleDeepLink(currentPath)
    }
    
    // Restore navigation state if returning to app
    if (this.shouldRestoreNavigationState()) {
      this.restoreNavigationState()
    }
    
    // Record current navigation
    this.recordNavigation(currentPath, 'initial')
  }

  // Handle Turbo before visit event
  handleTurboBeforeVisit(event) {
    const currentPath = window.location.pathname + window.location.search
    this.previousPathValue = currentPath
    
    console.log('Navigation State: Before visit', event.detail.url)
    
    // Save current page state
    this.savePageState(currentPath)
  }

  // Handle Turbo visit event
  handleTurboVisit(event) {
    const visitPath = new URL(event.detail.url).pathname + new URL(event.detail.url).search
    
    console.log('Navigation State: Visit', visitPath)
    
    // Record navigation
    this.recordNavigation(visitPath, 'turbo-visit')
  }

  // Handle Turbo load event
  handleTurboLoad(event) {
    const currentPath = window.location.pathname + window.location.search
    this.currentPathValue = currentPath
    
    console.log('Navigation State: Load', currentPath)
    
    // Update navigation state
    this.updateNavigationState(currentPath)
    
    // Handle page-specific initialization
    this.initializePageState(currentPath)
  }

  // Handle browser back/forward navigation
  handlePopstate(event) {
    const currentPath = window.location.pathname + window.location.search
    
    console.log('Navigation State: Popstate', currentPath)
    
    // Record navigation
    this.recordNavigation(currentPath, 'popstate')
    
    // Restore page state if available
    if (event.state && event.state.pageState) {
      this.restorePageState(event.state.pageState)
    }
  }

  // Handle app visibility changes (PWA focus/blur)
  handleVisibilityChange(event) {
    if (document.visibilityState === 'visible') {
      console.log('Navigation State: App became visible')
      
      // Check if URL changed while app was hidden
      const currentPath = window.location.pathname + window.location.search
      if (currentPath !== this.currentPathValue) {
        this.handleExternalNavigation(currentPath)
      }
      
      // Restore any pending navigation state
      this.restoreNavigationState()
      
    } else {
      console.log('Navigation State: App became hidden')
      
      // Save current state before app goes to background
      this.saveNavigationState()
    }
  }

  // Handle before unload to save state
  handleBeforeUnload(event) {
    this.saveNavigationState()
    this.savePageState(this.currentPathValue)
  }

  // Check if current path is a deep link
  isDeepLink(path) {
    // Consider it a deep link if:
    // 1. Not the root path
    // 2. Has query parameters
    // 3. Is launched as PWA with specific path
    
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true
    
    const isRootPath = path === '/' || path === ''
    const hasQueryParams = path.includes('?')
    const hasSpecificPath = path !== '/' && path !== ''
    
    return isPWA && (hasQueryParams || hasSpecificPath) && !isRootPath
  }

  // Handle deep link navigation
  handleDeepLink(path) {
    console.log('Navigation State: Handling deep link', path)
    
    // Parse deep link parameters
    const url = new URL(window.location.href)
    const params = new URLSearchParams(url.search)
    
    // Handle specific deep link patterns
    if (params.has('barcode')) {
      this.handleBarcodeDeepLink(params.get('barcode'))
    }
    
    if (params.has('item_id')) {
      this.handleItemDeepLink(params.get('item_id'))
    }
    
    if (params.has('transaction_type')) {
      this.handleTransactionDeepLink(params.get('transaction_type'))
    }
    
    // Track deep link usage
    this.trackDeepLinkUsage(path, params)
  }

  // Handle barcode deep link
  handleBarcodeDeepLink(barcode) {
    console.log('Navigation State: Barcode deep link', barcode)
    
    // Trigger barcode search
    const searchEvent = new CustomEvent('deep-link-barcode-search', {
      detail: { barcode: barcode }
    })
    document.dispatchEvent(searchEvent)
  }

  // Handle item deep link
  handleItemDeepLink(itemId) {
    console.log('Navigation State: Item deep link', itemId)
    
    // Navigate to item or trigger item display
    const itemEvent = new CustomEvent('deep-link-item-view', {
      detail: { itemId: itemId }
    })
    document.dispatchEvent(itemEvent)
  }

  // Handle transaction deep link
  handleTransactionDeepLink(transactionType) {
    console.log('Navigation State: Transaction deep link', transactionType)
    
    // Navigate to transaction form
    const transactionEvent = new CustomEvent('deep-link-transaction', {
      detail: { type: transactionType }
    })
    document.dispatchEvent(transactionEvent)
  }

  // Handle external navigation (URL changed outside app)
  handleExternalNavigation(path) {
    console.log('Navigation State: External navigation detected', path)
    
    // Update internal state
    this.currentPathValue = path
    
    // Record navigation
    this.recordNavigation(path, 'external')
    
    // Handle as potential deep link
    if (this.isDeepLink(path)) {
      this.handleDeepLink(path)
    }
  }

  // Record navigation in history
  recordNavigation(path, type) {
    const navigationEntry = {
      path: path,
      timestamp: Date.now(),
      type: type,
      referrer: document.referrer
    }
    
    // Add to history
    this.navigationHistory.unshift(navigationEntry)
    
    // Limit history size
    if (this.navigationHistory.length > this.maxHistorySizeValue) {
      this.navigationHistory = this.navigationHistory.slice(0, this.maxHistorySizeValue)
    }
    
    // Save to localStorage
    this.saveNavigationHistory()
    
    console.log('Navigation State: Recorded navigation', navigationEntry)
  }

  // Update navigation state
  updateNavigationState(path) {
    const navigationState = {
      currentPath: path,
      previousPath: this.previousPathValue,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    }
    
    // Save to sessionStorage for current session
    sessionStorage.setItem('navigation-state', JSON.stringify(navigationState))
    
    // Update page title for PWA
    this.updatePageTitle(path)
  }

  // Initialize page-specific state
  initializePageState(path) {
    // Restore form data if available
    this.restoreFormData(path)
    
    // Restore scroll position
    this.restoreScrollPosition(path)
    
    // Initialize page-specific features
    this.initializePageFeatures(path)
  }

  // Save page state
  savePageState(path) {
    const pageState = {
      path: path,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      formData: this.collectFormData(),
      timestamp: Date.now()
    }
    
    // Save to sessionStorage
    const pageStates = this.getPageStates()
    pageStates[path] = pageState
    sessionStorage.setItem('page-states', JSON.stringify(pageStates))
    
    // Also save to history state
    const currentState = history.state || {}
    history.replaceState({
      ...currentState,
      pageState: pageState
    }, '', window.location.href)
  }

  // Restore page state
  restorePageState(pageState) {
    if (!pageState) return
    
    console.log('Navigation State: Restoring page state', pageState.path)
    
    // Restore scroll position
    if (pageState.scrollPosition) {
      setTimeout(() => {
        window.scrollTo(pageState.scrollPosition.x, pageState.scrollPosition.y)
      }, 100)
    }
    
    // Restore form data
    if (pageState.formData) {
      this.restoreFormDataFromState(pageState.formData)
    }
  }

  // Collect form data from current page
  collectFormData() {
    const formData = {}
    const forms = document.querySelectorAll('form')
    
    forms.forEach((form, index) => {
      const formId = form.id || `form-${index}`
      formData[formId] = {}
      
      // Collect input values
      const inputs = form.querySelectorAll('input, select, textarea')
      inputs.forEach(input => {
        if (input.name && input.type !== 'password') {
          formData[formId][input.name] = input.value
        }
      })
    })
    
    return formData
  }

  // Restore form data for current path
  restoreFormData(path) {
    const pageStates = this.getPageStates()
    const pageState = pageStates[path]
    
    if (pageState && pageState.formData) {
      this.restoreFormDataFromState(pageState.formData)
    }
  }

  // Restore form data from state object
  restoreFormDataFromState(formData) {
    Object.keys(formData).forEach(formId => {
      const form = document.getElementById(formId) || document.querySelector(`form:nth-child(${formId.replace('form-', '')})`)
      if (!form) return
      
      Object.keys(formData[formId]).forEach(inputName => {
        const input = form.querySelector(`[name="${inputName}"]`)
        if (input && input.type !== 'password') {
          input.value = formData[formId][inputName]
        }
      })
    })
  }

  // Restore scroll position for current path
  restoreScrollPosition(path) {
    const pageStates = this.getPageStates()
    const pageState = pageStates[path]
    
    if (pageState && pageState.scrollPosition) {
      setTimeout(() => {
        window.scrollTo(pageState.scrollPosition.x, pageState.scrollPosition.y)
      }, 100)
    }
  }

  // Initialize page-specific features
  initializePageFeatures(path) {
    // Handle specific page types
    if (path.includes('/items')) {
      this.initializeItemsPage()
    } else if (path.includes('/stock_transactions')) {
      this.initializeTransactionsPage()
    } else if (path.includes('/locations')) {
      this.initializeLocationsPage()
    }
  }

  // Initialize items page features
  initializeItemsPage() {
    // Restore search state
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.has('search')) {
      const searchInput = document.querySelector('input[name="search"]')
      if (searchInput) {
        searchInput.value = searchParams.get('search')
      }
    }
  }

  // Initialize transactions page features
  initializeTransactionsPage() {
    // Handle transaction type from URL
    const path = window.location.pathname
    if (path.includes('stock_in') || path.includes('stock_out') || path.includes('stock_move')) {
      const transactionType = path.split('/').pop()
      this.setTransactionType(transactionType)
    }
  }

  // Initialize locations page features
  initializeLocationsPage() {
    // Restore any location-specific state
    console.log('Navigation State: Initializing locations page')
  }

  // Set transaction type
  setTransactionType(type) {
    const event = new CustomEvent('navigation-transaction-type', {
      detail: { type: type }
    })
    document.dispatchEvent(event)
  }

  // Update page title for PWA
  updatePageTitle(path) {
    const titles = {
      '/': 'Purple Stock - Dashboard',
      '/items': 'Purple Stock - Items',
      '/stock_transactions': 'Purple Stock - Transactions',
      '/locations': 'Purple Stock - Locations',
      '/settings': 'Purple Stock - Settings'
    }
    
    let title = titles[path] || 'Purple Stock'
    
    // Handle dynamic titles
    if (path.includes('/items/') && path !== '/items') {
      title = 'Purple Stock - Item Details'
    } else if (path.includes('/stock_transactions/')) {
      const type = path.split('/').pop()
      title = `Purple Stock - ${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
    }
    
    document.title = title
  }

  // Check if navigation state should be restored
  shouldRestoreNavigationState() {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone === true
    
    const hasStoredState = sessionStorage.getItem('navigation-state') !== null
    
    return isPWA && hasStoredState
  }

  // Restore navigation state
  restoreNavigationState() {
    const storedState = sessionStorage.getItem('navigation-state')
    if (!storedState) return
    
    try {
      const navigationState = JSON.parse(storedState)
      console.log('Navigation State: Restoring navigation state', navigationState)
      
      // Restore values
      this.currentPathValue = navigationState.currentPath
      this.previousPathValue = navigationState.previousPath
      
      // Restore page state for current path
      const pageStates = this.getPageStates()
      const currentPageState = pageStates[navigationState.currentPath]
      if (currentPageState) {
        this.restorePageState(currentPageState)
      }
      
    } catch (error) {
      console.error('Navigation State: Failed to restore navigation state', error)
    }
  }

  // Save navigation state
  saveNavigationState() {
    const navigationState = {
      currentPath: this.currentPathValue,
      previousPath: this.previousPathValue,
      timestamp: Date.now(),
      sessionId: this.getSessionId()
    }
    
    sessionStorage.setItem('navigation-state', JSON.stringify(navigationState))
  }

  // Get navigation history from localStorage
  getNavigationHistory() {
    const stored = localStorage.getItem('navigation-history')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.warn('Navigation State: Failed to parse navigation history', error)
      }
    }
    return []
  }

  // Save navigation history to localStorage
  saveNavigationHistory() {
    localStorage.setItem('navigation-history', JSON.stringify(this.navigationHistory))
  }

  // Get page states from sessionStorage
  getPageStates() {
    const stored = sessionStorage.getItem('page-states')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.warn('Navigation State: Failed to parse page states', error)
      }
    }
    return {}
  }

  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('session-id')
    if (!sessionId) {
      sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('session-id', sessionId)
    }
    return sessionId
  }

  // Track deep link usage for analytics
  trackDeepLinkUsage(path, params) {
    const deepLinkData = {
      path: path,
      parameters: Object.fromEntries(params),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      referrer: document.referrer
    }
    
    console.log('Navigation State: Deep link usage', deepLinkData)
    
    // Send to analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'deep_link_used', {
        custom_parameter: path,
        value: 1
      })
    }
  }

  // Public methods for external use
  
  // Navigate to path with state preservation
  navigateWithState(path, state = {}) {
    // Save current state
    this.savePageState(this.currentPathValue)
    
    // Navigate with Turbo
    if (window.Turbo) {
      window.Turbo.visit(path)
    } else {
      window.location.href = path
    }
  }

  // Get current navigation context
  getNavigationContext() {
    return {
      currentPath: this.currentPathValue,
      previousPath: this.previousPathValue,
      history: this.navigationHistory.slice(0, 5), // Last 5 entries
      sessionId: this.getSessionId()
    }
  }

  // Clear navigation history
  clearNavigationHistory() {
    this.navigationHistory = []
    localStorage.removeItem('navigation-history')
    sessionStorage.removeItem('navigation-state')
    sessionStorage.removeItem('page-states')
  }
}