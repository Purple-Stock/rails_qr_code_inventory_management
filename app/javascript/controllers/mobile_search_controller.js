import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["overlay", "input", "results", "suggestions", "recentSearches", "clearButton"]
  static values = { 
    url: String,
    debounceDelay: { type: Number, default: 300 },
    minQueryLength: { type: Number, default: 2 },
    maxRecentSearches: { type: Number, default: 5 }
  }

  connect() {
    this.debounceTimer = null
    this.currentQuery = ""
    this.isSearching = false
    this.autoSaveTimer = null
    this.searchState = this.loadSearchState()
    this.loadRecentSearches()
    this.setupKeyboardShortcuts()
    this.setupAutoSave()
  }

  disconnect() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
    this.saveSearchState()
    this.removeKeyboardShortcuts()
  }

  setupKeyboardShortcuts() {
    this.keyboardHandler = (event) => {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        this.openSearch()
      }
      // Escape to close search
      if (event.key === 'Escape' && this.isSearchOpen()) {
        this.closeSearch()
      }
    }
    
    document.addEventListener('keydown', this.keyboardHandler)
  }

  removeKeyboardShortcuts() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler)
    }
  }

  openSearch() {
    if (this.hasOverlayTarget) {
      this.overlayTarget.classList.remove('hidden')
      this.overlayTarget.classList.add('mobile-search-overlay-open')
      this.overlayTarget.setAttribute('aria-hidden', 'false')
      
      // Restore previous search state if available
      this.restoreSearchState()
      
      // Focus the input after animation
      setTimeout(() => {
        if (this.hasInputTarget) {
          this.inputTarget.focus()
        }
      }, 100)
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Show recent searches if no query
      if (!this.currentQuery) {
        this.showRecentSearches()
      } else {
        // If we have a restored query, perform search
        this.performSearch(this.currentQuery)
      }
    }
  }

  closeSearch() {
    if (this.hasOverlayTarget) {
      // Save current search state before closing
      this.saveSearchState()
      
      this.overlayTarget.classList.add('hidden')
      this.overlayTarget.classList.remove('mobile-search-overlay-open')
      this.overlayTarget.setAttribute('aria-hidden', 'true')
      
      // Restore body scroll
      document.body.style.overflow = ''
      
      // Don't clear input and results immediately - preserve for next open
      // Only clear if user explicitly cleared or completed an action
    }
  }

  search(event) {
    const query = event.target.value.trim()
    this.currentQuery = query
    this.markUnsavedChanges()

    // Clear previous timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    // Show/hide clear button
    this.toggleClearButton(query.length > 0)

    // If query is too short, show recent searches or clear results
    if (query.length < this.minQueryLengthValue) {
      if (query.length === 0) {
        this.showRecentSearches()
      } else {
        this.clearResults()
        this.hideSuggestions()
      }
      return
    }

    // Show immediate feedback for better UX
    this.showTypingIndicator()

    // Debounce the search with optimized delay for mobile
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query)
    }, this.debounceDelayValue)
  }

  async performSearch(query) {
    if (this.isSearching) return

    this.isSearching = true
    this.showLoadingState()

    try {
      const url = new URL(this.urlValue, window.location.origin)
      url.searchParams.set('query', query)
      url.searchParams.set('format', 'json')

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })

      if (response.ok) {
        const data = await response.json()
        this.displayResults(data.items || data.results || [])
        this.generateSuggestions(query, data.items || data.results || [])
      } else {
        this.showErrorState('Search failed. Please try again.')
      }
    } catch (error) {
      console.error('Search error:', error)
      this.showErrorState('Network error. Please check your connection.')
    } finally {
      this.isSearching = false
      this.hideLoadingState()
    }
  }

  displayResults(results) {
    if (!this.hasResultsTarget) return

    if (results.length === 0) {
      this.showEmptyState()
      return
    }

    const resultsHTML = results.map(item => this.createResultItem(item)).join('')
    this.resultsTarget.innerHTML = `
      <div class="mobile-search-results">
        <div class="mobile-search-results-header">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Search Results</h3>
        </div>
        <div class="mobile-search-results-list">
          ${resultsHTML}
        </div>
      </div>
    `
    
    this.resultsTarget.classList.remove('hidden')
    this.hideSuggestions()
    this.hideRecentSearches()
  }

  createResultItem(item) {
    return `
      <div class="mobile-search-result-item" data-action="click->mobile-search#selectResult" data-item-id="${item.id}">
        <div class="flex items-center p-4 hover:bg-gray-50 cursor-pointer">
          <div class="flex-shrink-0">
            ${item.barcode ? `<div class="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs">QR</div>` : ''}
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">${item.name}</div>
            <div class="text-sm text-gray-500 truncate">
              ${item.sku ? `SKU: ${item.sku}` : ''}
              ${item.barcode ? ` • ${item.barcode}` : ''}
            </div>
            ${item.current_stock !== undefined ? `
              <div class="text-xs text-gray-400 mt-1">
                Stock: <span class="${item.current_stock === 0 ? 'text-red-600' : 'text-green-600'}">${item.current_stock}</span>
              </div>
            ` : ''}
          </div>
          <div class="ml-3 flex-shrink-0">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </div>
        </div>
      </div>
    `
  }

  generateSuggestions(query, results) {
    if (!this.hasSuggestionsTarget) return

    // Generate smart suggestions based on query and results
    const suggestions = new Set()
    const queryLower = query.toLowerCase()
    
    // Add auto-complete suggestions based on partial matches
    results.forEach(item => {
      // Add item name completions
      if (item.name && item.name.toLowerCase().includes(queryLower) && item.name.toLowerCase() !== queryLower) {
        suggestions.add(item.name)
      }
      
      // Add SKU completions
      if (item.sku && item.sku.toLowerCase().includes(queryLower) && item.sku.toLowerCase() !== queryLower) {
        suggestions.add(item.sku)
      }
      
      // Add category suggestions
      if (item.item_type && item.item_type.toLowerCase().includes(queryLower)) {
        suggestions.add(item.item_type)
      }
      
      // Add brand suggestions
      if (item.brand && item.brand.toLowerCase().includes(queryLower)) {
        suggestions.add(item.brand)
      }
    })

    // Add contextual suggestions based on query patterns
    if (queryLower.length >= 2) {
      this.addContextualSuggestions(queryLower, suggestions)
    }

    if (suggestions.size > 0) {
      const suggestionsArray = Array.from(suggestions).slice(0, 6)
      const suggestionsHTML = suggestionsArray.map(suggestion => `
        <button class="mobile-search-suggestion" 
                data-action="click->mobile-search#applySuggestion" 
                data-suggestion="${this.escapeHtml(suggestion)}"
                title="Search for: ${this.escapeHtml(suggestion)}">
          <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <span class="truncate">${this.highlightMatch(suggestion, query)}</span>
        </button>
      `).join('')

      this.suggestionsTarget.innerHTML = `
        <div class="mobile-search-suggestions">
          <div class="mobile-search-suggestions-header">
            <h3 class="text-sm font-medium text-gray-900 mb-3">Suggestions</h3>
          </div>
          <div class="mobile-search-suggestions-list">
            ${suggestionsHTML}
          </div>
        </div>
      `
      this.suggestionsTarget.classList.remove('hidden')
    } else {
      this.hideSuggestions()
    }
  }

  addContextualSuggestions(query, suggestions) {
    // Add common search patterns and completions
    const commonPatterns = [
      { pattern: /^low/i, suggestion: 'low stock' },
      { pattern: /^out/i, suggestion: 'out of stock' },
      { pattern: /^zero/i, suggestion: 'zero stock' },
      { pattern: /^high/i, suggestion: 'high value' },
      { pattern: /^exp/i, suggestion: 'expensive items' },
      { pattern: /^new/i, suggestion: 'new items' },
      { pattern: /^old/i, suggestion: 'old items' }
    ]

    commonPatterns.forEach(({ pattern, suggestion }) => {
      if (pattern.test(query) && !suggestions.has(suggestion)) {
        suggestions.add(suggestion)
      }
    })
  }

  highlightMatch(text, query) {
    if (!query || query.length < 2) return this.escapeHtml(text)
    
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi')
    return this.escapeHtml(text).replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>')
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  showRecentSearches() {
    if (!this.hasRecentSearchesTarget) return

    const recentSearches = this.getRecentSearches()
    
    if (recentSearches.length === 0) {
      this.hideRecentSearches()
      return
    }

    const recentHTML = recentSearches.map(search => `
      <button class="mobile-search-recent-item" data-action="click->mobile-search#applyRecentSearch" data-search="${search}">
        <svg class="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        ${search}
        <button class="ml-auto text-gray-400 hover:text-gray-600" data-action="click->mobile-search#removeRecentSearch" data-search="${search}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </button>
    `).join('')

    this.recentSearchesTarget.innerHTML = `
      <div class="mobile-search-recent">
        <div class="mobile-search-recent-header">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Recent Searches</h3>
          <button class="text-sm text-purple-600 hover:text-purple-800" data-action="click->mobile-search#clearRecentSearches">
            Clear All
          </button>
        </div>
        <div class="mobile-search-recent-list">
          ${recentHTML}
        </div>
      </div>
    `
    
    this.recentSearchesTarget.classList.remove('hidden')
    this.clearResults()
    this.hideSuggestions()
  }

  selectResult(event) {
    const itemId = event.currentTarget.dataset.itemId
    const itemName = event.currentTarget.querySelector('.text-sm.font-medium').textContent
    
    // Save to recent searches
    this.saveRecentSearch(this.currentQuery)
    
    // Navigate to item or trigger custom event
    this.dispatch('resultSelected', { 
      detail: { 
        itemId: itemId, 
        itemName: itemName,
        query: this.currentQuery 
      } 
    })
    
    this.closeSearch()
  }

  applySuggestion(event) {
    const suggestion = event.currentTarget.dataset.suggestion
    if (this.hasInputTarget) {
      this.inputTarget.value = suggestion
      this.currentQuery = suggestion
      this.performSearch(suggestion)
    }
  }

  applyRecentSearch(event) {
    const search = event.currentTarget.dataset.search
    if (this.hasInputTarget) {
      this.inputTarget.value = search
      this.currentQuery = search
      this.performSearch(search)
    }
  }

  removeRecentSearch(event) {
    event.stopPropagation()
    const search = event.currentTarget.dataset.search
    this.removeFromRecentSearches(search)
    this.showRecentSearches()
  }

  clearRecentSearches() {
    localStorage.removeItem('mobileSearchRecentSearches')
    this.hideRecentSearches()
  }

  clearInput() {
    if (this.hasInputTarget) {
      this.inputTarget.value = ''
      this.inputTarget.focus()
    }
    this.currentQuery = ""
    this.clearResults()
    this.hideSuggestions()
    this.showRecentSearches()
    this.toggleClearButton(false)
    this.markUnsavedChanges()
    
    // Clear saved search state when user explicitly clears
    localStorage.removeItem('mobileSearchState')
  }

  // Helper methods
  isSearchOpen() {
    return this.hasOverlayTarget && !this.overlayTarget.classList.contains('hidden')
  }

  toggleClearButton(show) {
    if (this.hasClearButtonTarget) {
      if (show) {
        this.clearButtonTarget.classList.remove('hidden')
      } else {
        this.clearButtonTarget.classList.add('hidden')
      }
    }
  }

  clearResults() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = ''
      this.resultsTarget.classList.add('hidden')
    }
  }

  hideSuggestions() {
    if (this.hasSuggestionsTarget) {
      this.suggestionsTarget.classList.add('hidden')
    }
  }

  hideRecentSearches() {
    if (this.hasRecentSearchesTarget) {
      this.recentSearchesTarget.classList.add('hidden')
    }
  }

  showLoadingState() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `
        <div class="flex items-center justify-center py-8">
          <svg class="animate-spin h-6 w-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm text-gray-500">Searching...</span>
        </div>
      `
      this.resultsTarget.classList.remove('hidden')
      this.hideSuggestions()
      this.hideRecentSearches()
    }
  }

  showTypingIndicator() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `
        <div class="flex items-center justify-center py-4">
          <div class="flex space-x-1">
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
          <span class="ml-3 text-sm text-gray-500">Typing...</span>
        </div>
      `
      this.resultsTarget.classList.remove('hidden')
    }
  }

  hideLoadingState() {
    // Loading state is replaced by results or empty state
  }

  showEmptyState() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No results found</h3>
          <p class="mt-1 text-sm text-gray-500">Try adjusting your search terms</p>
        </div>
      `
      this.resultsTarget.classList.remove('hidden')
    }
  }

  showErrorState(message) {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `
        <div class="text-center py-8">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Search Error</h3>
          <p class="mt-1 text-sm text-gray-500">${message}</p>
          <button class="mt-3 text-sm text-purple-600 hover:text-purple-800" data-action="click->mobile-search#retrySearch">
            Try Again
          </button>
        </div>
      `
      this.resultsTarget.classList.remove('hidden')
    }
  }

  retrySearch() {
    if (this.currentQuery) {
      this.performSearch(this.currentQuery)
    }
  }

  // Recent searches management
  loadRecentSearches() {
    // Recent searches are loaded when needed
  }

  getRecentSearches() {
    try {
      const searches = localStorage.getItem('mobileSearchRecentSearches')
      return searches ? JSON.parse(searches) : []
    } catch (error) {
      return []
    }
  }

  saveRecentSearch(query) {
    if (!query || query.length < this.minQueryLengthValue) return

    try {
      let searches = this.getRecentSearches()
      
      // Remove if already exists
      searches = searches.filter(search => search !== query)
      
      // Add to beginning
      searches.unshift(query)
      
      // Limit to max recent searches
      searches = searches.slice(0, this.maxRecentSearchesValue)
      
      localStorage.setItem('mobileSearchRecentSearches', JSON.stringify(searches))
    } catch (error) {
      console.error('Failed to save recent search:', error)
    }
  }

  removeFromRecentSearches(query) {
    try {
      let searches = this.getRecentSearches()
      searches = searches.filter(search => search !== query)
      localStorage.setItem('mobileSearchRecentSearches', JSON.stringify(searches))
    } catch (error) {
      console.error('Failed to remove recent search:', error)
    }
  }

  // Auto-save functionality to prevent data loss (Requirement 7.5)
  setupAutoSave() {
    // Auto-save search state every 2 seconds when there are changes
    this.autoSaveInterval = setInterval(() => {
      if (this.hasUnsavedChanges) {
        this.saveSearchState()
        this.hasUnsavedChanges = false
      }
    }, 2000)
  }

  saveSearchState() {
    try {
      const state = {
        query: this.currentQuery,
        timestamp: Date.now(),
        isSearchOpen: this.isSearchOpen()
      }
      localStorage.setItem('mobileSearchState', JSON.stringify(state))
    } catch (error) {
      console.error('Failed to save search state:', error)
    }
  }

  loadSearchState() {
    try {
      const saved = localStorage.getItem('mobileSearchState')
      if (saved) {
        const state = JSON.parse(saved)
        // Only restore if saved within last 30 minutes
        if (Date.now() - state.timestamp < 30 * 60 * 1000) {
          return state
        }
      }
    } catch (error) {
      console.error('Failed to load search state:', error)
    }
    return null
  }

  restoreSearchState() {
    if (this.searchState && this.hasInputTarget) {
      this.inputTarget.value = this.searchState.query || ''
      this.currentQuery = this.searchState.query || ''
      this.toggleClearButton(this.currentQuery.length > 0)
    }
  }

  markUnsavedChanges() {
    this.hasUnsavedChanges = true
  }

  onInputFocus() {
    // Provide immediate feedback when user focuses on search
    if (!this.currentQuery && this.hasRecentSearchesTarget) {
      this.showRecentSearches()
    }
  }
}