import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["quickActions", "shortcutPanel", "gestureArea"]
  static values = { 
    shortcuts: { type: Object, default: {} },
    gesturesEnabled: { type: Boolean, default: true },
    quickActionsVisible: { type: Boolean, default: false }
  }

  connect() {
    this.setupKeyboardShortcuts()
    this.setupGestureShortcuts()
    this.setupQuickActionsPanel()
    this.loadUserPreferences()
    
    // Bind methods to preserve context
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleGestureStart = this.handleGestureStart.bind(this)
    this.handleGestureMove = this.handleGestureMove.bind(this)
    this.handleGestureEnd = this.handleGestureEnd.bind(this)
    
    // Initialize gesture tracking
    this.gestureStartTime = 0
    this.gestureStartX = 0
    this.gestureStartY = 0
    this.gestureCurrentX = 0
    this.gestureCurrentY = 0
    this.gesturePattern = []
    this.isGesturing = false
    
    // Default shortcuts configuration
    this.defaultShortcuts = {
      // Mobile-friendly shortcuts (using Cmd/Ctrl + single key)
      'cmd+n': { action: 'newItem', description: 'Create new item' },
      'cmd+f': { action: 'focusSearch', description: 'Focus search' },
      'cmd+s': { action: 'saveForm', description: 'Save current form' },
      'cmd+e': { action: 'editSelected', description: 'Edit selected item' },
      'cmd+d': { action: 'duplicateSelected', description: 'Duplicate selected item' },
      'cmd+backspace': { action: 'deleteSelected', description: 'Delete selected item' },
      'cmd+r': { action: 'refresh', description: 'Refresh page' },
      'cmd+h': { action: 'toggleHelp', description: 'Toggle help' },
      'cmd+k': { action: 'toggleQuickActions', description: 'Toggle quick actions' },
      'cmd+shift+k': { action: 'toggleShortcuts', description: 'Show keyboard shortcuts' },
      
      // Navigation shortcuts
      'cmd+1': { action: 'goToItems', description: 'Go to items' },
      'cmd+2': { action: 'goToTransactions', description: 'Go to transactions' },
      'cmd+3': { action: 'goToReports', description: 'Go to reports' },
      'cmd+4': { action: 'goToSettings', description: 'Go to settings' },
      
      // List navigation
      'arrowup': { action: 'selectPrevious', description: 'Select previous item' },
      'arrowdown': { action: 'selectNext', description: 'Select next item' },
      'enter': { action: 'activateSelected', description: 'Activate selected item' },
      'escape': { action: 'clearSelection', description: 'Clear selection' },
      
      // Mobile keyboard specific
      'cmd+space': { action: 'toggleQuickActions', description: 'Quick actions' },
      'cmd+shift+space': { action: 'voiceSearch', description: 'Voice search' }
    }
    
    // Merge with user shortcuts
    this.shortcuts = { ...this.defaultShortcuts, ...this.shortcutsValue }
  }

  disconnect() {
    this.removeEventListeners()
    this.saveUserPreferences()
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', this.handleKeyDown)
    
    // Handle mobile keyboard events
    document.addEventListener('input', this.handleMobileInput.bind(this))
    
    // Handle virtual keyboard visibility changes
    if ('visualViewport' in window) {
      window.visualViewport.addEventListener('resize', this.handleVirtualKeyboardChange.bind(this))
    }
  }

  setupGestureShortcuts() {
    if (!this.gesturesEnabledValue) return
    
    const gestureArea = this.hasGestureAreaTarget ? this.gestureAreaTarget : document.body
    
    // Touch events for gesture recognition
    gestureArea.addEventListener('touchstart', this.handleGestureStart, { passive: false })
    gestureArea.addEventListener('touchmove', this.handleGestureMove, { passive: false })
    gestureArea.addEventListener('touchend', this.handleGestureEnd, { passive: false })
    
    // Mouse events for desktop testing
    gestureArea.addEventListener('mousedown', this.handleGestureStart)
    gestureArea.addEventListener('mousemove', this.handleGestureMove)
    gestureArea.addEventListener('mouseup', this.handleGestureEnd)
  }

  setupQuickActionsPanel() {
    if (!this.hasQuickActionsTarget) {
      this.createQuickActionsPanel()
    }
    
    // Setup quick action buttons
    this.setupQuickActionButtons()
  }

  handleKeyDown(event) {
    const shortcutKey = this.getShortcutKey(event)
    const shortcut = this.shortcuts[shortcutKey]
    
    if (shortcut) {
      event.preventDefault()
      this.executeShortcut(shortcut.action, event)
      this.triggerHapticFeedback('light')
      this.showShortcutFeedback(shortcut.description)
    }
  }

  handleMobileInput(event) {
    // Handle special mobile keyboard inputs
    const target = event.target
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      // Check for mobile-specific input patterns
      const value = target.value
      
      // Quick commands (starting with /)
      if (value.startsWith('/')) {
        this.handleQuickCommand(value, target)
      }
      
      // Emoji shortcuts
      if (value.includes('::')) {
        this.handleEmojiShortcut(value, target)
      }
    }
  }

  handleVirtualKeyboardChange() {
    // Adjust UI when virtual keyboard appears/disappears
    const keyboardHeight = window.innerHeight - window.visualViewport.height
    
    if (keyboardHeight > 100) {
      // Keyboard is visible
      document.body.classList.add('virtual-keyboard-visible')
      this.adjustForVirtualKeyboard(keyboardHeight)
    } else {
      // Keyboard is hidden
      document.body.classList.remove('virtual-keyboard-visible')
      this.resetVirtualKeyboardAdjustments()
    }
  }

  handleGestureStart(event) {
    if (!this.gesturesEnabledValue) return
    
    const pointer = event.touches ? event.touches[0] : event
    
    this.gestureStartTime = Date.now()
    this.gestureStartX = pointer.clientX
    this.gestureStartY = pointer.clientY
    this.gestureCurrentX = pointer.clientX
    this.gestureCurrentY = pointer.clientY
    this.gesturePattern = [{ x: pointer.clientX, y: pointer.clientY, time: Date.now() }]
    this.isGesturing = false
    
    // Visual feedback for gesture start
    this.showGestureIndicator(pointer.clientX, pointer.clientY)
  }

  handleGestureMove(event) {
    if (!this.gesturesEnabledValue || this.gesturePattern.length === 0) return
    
    const pointer = event.touches ? event.touches[0] : event
    this.gestureCurrentX = pointer.clientX
    this.gestureCurrentY = pointer.clientY
    
    const deltaX = Math.abs(pointer.clientX - this.gestureStartX)
    const deltaY = Math.abs(pointer.clientY - this.gestureStartY)
    
    // Start gesture recognition if moved significantly
    if (!this.isGesturing && (deltaX > 20 || deltaY > 20)) {
      this.isGesturing = true
      this.triggerHapticFeedback('light')
    }
    
    if (this.isGesturing) {
      // Record gesture path
      this.gesturePattern.push({
        x: pointer.clientX,
        y: pointer.clientY,
        time: Date.now()
      })
      
      // Update visual feedback
      this.updateGestureIndicator(pointer.clientX, pointer.clientY)
      
      // Prevent scrolling during gesture
      if (event.touches) {
        event.preventDefault()
      }
    }
  }

  handleGestureEnd(event) {
    if (!this.gesturesEnabledValue || this.gesturePattern.length === 0) return
    
    this.hideGestureIndicator()
    
    if (this.isGesturing) {
      const gesture = this.recognizeGesture()
      if (gesture) {
        this.executeGestureShortcut(gesture)
        this.triggerHapticFeedback('medium')
      }
    }
    
    // Reset gesture state
    this.gesturePattern = []
    this.isGesturing = false
  }

  getShortcutKey(event) {
    const parts = []
    
    if (event.ctrlKey || event.metaKey) parts.push('cmd')
    if (event.altKey) parts.push('alt')
    if (event.shiftKey) parts.push('shift')
    
    const key = event.key.toLowerCase()
    parts.push(key)
    
    return parts.join('+')
  }

  executeShortcut(action, event) {
    switch (action) {
      case 'newItem':
        this.createNewItem()
        break
      case 'focusSearch':
        this.focusSearch()
        break
      case 'saveForm':
        this.saveCurrentForm()
        break
      case 'editSelected':
        this.editSelectedItem()
        break
      case 'duplicateSelected':
        this.duplicateSelectedItem()
        break
      case 'deleteSelected':
        this.deleteSelectedItem()
        break
      case 'refresh':
        this.refreshPage()
        break
      case 'toggleHelp':
        this.toggleHelp()
        break
      case 'toggleQuickActions':
        this.toggleQuickActions()
        break
      case 'toggleShortcuts':
        this.showShortcutsPanel()
        break
      case 'goToItems':
        this.navigateToSection('items')
        break
      case 'goToTransactions':
        this.navigateToSection('transactions')
        break
      case 'goToReports':
        this.navigateToSection('reports')
        break
      case 'goToSettings':
        this.navigateToSection('settings')
        break
      case 'selectPrevious':
        this.selectPreviousItem()
        break
      case 'selectNext':
        this.selectNextItem()
        break
      case 'activateSelected':
        this.activateSelectedItem()
        break
      case 'clearSelection':
        this.clearSelection()
        break
      case 'voiceSearch':
        this.startVoiceSearch()
        break
      default:
        // Custom action
        this.executeCustomAction(action, event)
    }
  }

  recognizeGesture() {
    if (this.gesturePattern.length < 3) return null
    
    const startPoint = this.gesturePattern[0]
    const endPoint = this.gesturePattern[this.gesturePattern.length - 1]
    
    const deltaX = endPoint.x - startPoint.x
    const deltaY = endPoint.y - startPoint.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance < 50) return null // Too small to be a gesture
    
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
    
    // Recognize basic directional gestures
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal gesture
      return deltaX > 0 ? 'swipe-right' : 'swipe-left'
    } else {
      // Vertical gesture
      return deltaY > 0 ? 'swipe-down' : 'swipe-up'
    }
  }

  executeGestureShortcut(gesture) {
    const gestureActions = {
      'swipe-right': 'nextPage',
      'swipe-left': 'previousPage',
      'swipe-up': 'scrollToTop',
      'swipe-down': 'showQuickActions'
    }
    
    const action = gestureActions[gesture]
    if (action) {
      this.executeShortcut(action)
    }
  }

  // Action implementations
  createNewItem() {
    const newItemButton = document.querySelector('a[href*="new"]')
    if (newItemButton) {
      newItemButton.click()
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]')
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }

  saveCurrentForm() {
    const form = document.querySelector('form')
    if (form) {
      const submitButton = form.querySelector('input[type="submit"], button[type="submit"]')
      if (submitButton) {
        submitButton.click()
      }
    }
  }

  editSelectedItem() {
    const selectedItem = document.querySelector('.selected, .active')
    if (selectedItem) {
      const editButton = selectedItem.querySelector('a[href*="edit"]')
      if (editButton) {
        editButton.click()
      }
    }
  }

  duplicateSelectedItem() {
    const selectedItem = document.querySelector('.selected, .active')
    if (selectedItem) {
      const duplicateButton = selectedItem.querySelector('button[data-method="post"]')
      if (duplicateButton) {
        duplicateButton.click()
      }
    }
  }

  deleteSelectedItem() {
    const selectedItem = document.querySelector('.selected, .active')
    if (selectedItem) {
      const deleteButton = selectedItem.querySelector('button[data-method="delete"]')
      if (deleteButton && confirm('Are you sure you want to delete this item?')) {
        deleteButton.click()
      }
    }
  }

  refreshPage() {
    window.location.reload()
  }

  toggleHelp() {
    // Toggle help panel or modal
    const helpPanel = document.querySelector('.help-panel, .help-modal')
    if (helpPanel) {
      helpPanel.classList.toggle('hidden')
    } else {
      this.showShortcutsPanel()
    }
  }

  toggleQuickActions() {
    this.quickActionsVisibleValue = !this.quickActionsVisibleValue
    
    if (this.hasQuickActionsTarget) {
      if (this.quickActionsVisibleValue) {
        this.quickActionsTarget.classList.remove('hidden')
        this.quickActionsTarget.classList.add('quick-actions-visible')
      } else {
        this.quickActionsTarget.classList.add('hidden')
        this.quickActionsTarget.classList.remove('quick-actions-visible')
      }
    }
  }

  navigateToSection(section) {
    const teamId = window.location.pathname.split('/')[2]
    const urls = {
      items: `/teams/${teamId}/items`,
      transactions: `/teams/${teamId}/transactions`,
      reports: `/teams/${teamId}/transactions/report`,
      settings: `/teams/${teamId}/settings`
    }
    
    if (urls[section]) {
      window.location.href = urls[section]
    }
  }

  selectPreviousItem() {
    const items = Array.from(document.querySelectorAll('.sortable-item, tr'))
    const currentSelected = document.querySelector('.selected')
    
    if (currentSelected) {
      const currentIndex = items.indexOf(currentSelected)
      if (currentIndex > 0) {
        currentSelected.classList.remove('selected')
        items[currentIndex - 1].classList.add('selected')
        items[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else if (items.length > 0) {
      items[0].classList.add('selected')
    }
  }

  selectNextItem() {
    const items = Array.from(document.querySelectorAll('.sortable-item, tr'))
    const currentSelected = document.querySelector('.selected')
    
    if (currentSelected) {
      const currentIndex = items.indexOf(currentSelected)
      if (currentIndex < items.length - 1) {
        currentSelected.classList.remove('selected')
        items[currentIndex + 1].classList.add('selected')
        items[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } else if (items.length > 0) {
      items[0].classList.add('selected')
    }
  }

  activateSelectedItem() {
    const selectedItem = document.querySelector('.selected')
    if (selectedItem) {
      const link = selectedItem.querySelector('a')
      if (link) {
        link.click()
      }
    }
  }

  clearSelection() {
    const selectedItems = document.querySelectorAll('.selected')
    selectedItems.forEach(item => item.classList.remove('selected'))
  }

  startVoiceSearch() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        this.showVoiceSearchIndicator()
        this.triggerHapticFeedback('medium')
      }
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        this.performVoiceSearch(transcript)
      }
      
      recognition.onerror = () => {
        this.hideVoiceSearchIndicator()
        this.showError('Voice search failed')
      }
      
      recognition.onend = () => {
        this.hideVoiceSearchIndicator()
      }
      
      recognition.start()
    } else {
      this.showError('Voice search not supported')
    }
  }

  // Quick Actions Panel
  createQuickActionsPanel() {
    const panel = document.createElement('div')
    panel.className = 'quick-actions-panel hidden'
    panel.innerHTML = `
      <div class="quick-actions-backdrop"></div>
      <div class="quick-actions-content">
        <div class="quick-actions-header">
          <h3>Quick Actions</h3>
          <button class="quick-actions-close" data-action="click->mobile-keyboard-shortcuts#toggleQuickActions">×</button>
        </div>
        <div class="quick-actions-grid" data-mobile-keyboard-shortcuts-target="quickActions">
          <!-- Quick action buttons will be added here -->
        </div>
        <div class="quick-actions-shortcuts">
          <button class="quick-action-button" data-action="click->mobile-keyboard-shortcuts#showShortcutsPanel">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3"/>
            </svg>
            Keyboard Shortcuts
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(panel)
    this.quickActionsPanel = panel
  }

  setupQuickActionButtons() {
    if (!this.hasQuickActionsTarget) return
    
    const quickActions = [
      { action: 'newItem', icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6', label: 'New Item' },
      { action: 'focusSearch', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', label: 'Search' },
      { action: 'refresh', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', label: 'Refresh' },
      { action: 'goToTransactions', icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Transactions' }
    ]
    
    const buttonsHTML = quickActions.map(action => `
      <button class="quick-action-button" 
              data-action="click->mobile-keyboard-shortcuts#executeQuickAction"
              data-mobile-keyboard-shortcuts-action-param="${action.action}">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${action.icon}"/>
        </svg>
        ${action.label}
      </button>
    `).join('')
    
    this.quickActionsTarget.innerHTML = buttonsHTML
  }

  executeQuickAction(event) {
    const action = event.params.action
    this.executeShortcut(action)
    this.toggleQuickActions() // Hide panel after action
  }

  showShortcutsPanel() {
    const panel = document.createElement('div')
    panel.className = 'shortcuts-panel'
    
    const shortcutsList = Object.entries(this.shortcuts)
      .map(([key, shortcut]) => `
        <div class="shortcut-item">
          <kbd class="shortcut-key">${key.replace('cmd', '⌘').replace('shift', '⇧').replace('alt', '⌥')}</kbd>
          <span class="shortcut-description">${shortcut.description}</span>
        </div>
      `).join('')
    
    panel.innerHTML = `
      <div class="shortcuts-backdrop" data-action="click->mobile-keyboard-shortcuts#hideShortcutsPanel"></div>
      <div class="shortcuts-content">
        <div class="shortcuts-header">
          <h3>Keyboard Shortcuts</h3>
          <button class="shortcuts-close" data-action="click->mobile-keyboard-shortcuts#hideShortcutsPanel">×</button>
        </div>
        <div class="shortcuts-list">
          ${shortcutsList}
        </div>
      </div>
    `
    
    document.body.appendChild(panel)
    this.shortcutsPanel = panel
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideShortcutsPanel()
    }, 10000)
  }

  hideShortcutsPanel() {
    if (this.shortcutsPanel) {
      document.body.removeChild(this.shortcutsPanel)
      this.shortcutsPanel = null
    }
  }

  // Utility methods
  triggerHapticFeedback(intensity = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[intensity] || patterns.light)
    }
  }

  showShortcutFeedback(description) {
    // Show temporary feedback for executed shortcut
    const feedback = document.createElement('div')
    feedback.className = 'shortcut-feedback'
    feedback.textContent = description
    feedback.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      z-index: 1000;
      font-size: 0.875rem;
      opacity: 0;
      transition: opacity 0.3s ease-out;
    `
    
    document.body.appendChild(feedback)
    
    // Animate in
    setTimeout(() => {
      feedback.style.opacity = '1'
    }, 100)
    
    // Remove after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = '0'
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback)
        }
      }, 300)
    }, 2000)
  }

  showGestureIndicator(x, y) {
    const indicator = document.createElement('div')
    indicator.className = 'gesture-indicator'
    indicator.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      background: rgba(59, 130, 246, 0.8);
      border-radius: 50%;
      z-index: 1000;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease-out;
    `
    
    document.body.appendChild(indicator)
    this.gestureIndicator = indicator
  }

  updateGestureIndicator(x, y) {
    if (this.gestureIndicator) {
      this.gestureIndicator.style.left = `${x}px`
      this.gestureIndicator.style.top = `${y}px`
    }
  }

  hideGestureIndicator() {
    if (this.gestureIndicator) {
      document.body.removeChild(this.gestureIndicator)
      this.gestureIndicator = null
    }
  }

  loadUserPreferences() {
    const preferences = localStorage.getItem('mobile-keyboard-shortcuts-preferences')
    if (preferences) {
      try {
        const parsed = JSON.parse(preferences)
        this.shortcuts = { ...this.shortcuts, ...parsed.shortcuts }
        this.gesturesEnabledValue = parsed.gesturesEnabled !== false
      } catch (e) {
        console.warn('Failed to load keyboard shortcuts preferences:', e)
      }
    }
  }

  saveUserPreferences() {
    const preferences = {
      shortcuts: this.shortcuts,
      gesturesEnabled: this.gesturesEnabledValue
    }
    
    localStorage.setItem('mobile-keyboard-shortcuts-preferences', JSON.stringify(preferences))
  }

  removeEventListeners() {
    document.removeEventListener('keydown', this.handleKeyDown)
    
    if (this.quickActionsPanel) {
      document.body.removeChild(this.quickActionsPanel)
    }
    
    if (this.shortcutsPanel) {
      document.body.removeChild(this.shortcutsPanel)
    }
  }

  executeCustomAction(action, event) {
    // Dispatch custom event for external handling
    const customEvent = new CustomEvent('keyboard-shortcut', {
      detail: { action, event }
    })
    this.element.dispatchEvent(customEvent)
  }

  handleQuickCommand(value, target) {
    const command = value.substring(1).toLowerCase()
    
    const commands = {
      'new': () => this.createNewItem(),
      'search': () => this.focusSearch(),
      'help': () => this.showShortcutsPanel(),
      'refresh': () => this.refreshPage(),
      'items': () => this.navigateToSection('items'),
      'transactions': () => this.navigateToSection('transactions'),
      'reports': () => this.navigateToSection('reports'),
      'settings': () => this.navigateToSection('settings')
    }
    
    if (commands[command]) {
      commands[command]()
      target.value = '' // Clear the command
    }
  }

  handleEmojiShortcut(value, target) {
    const emojiMap = {
      '::smile::': '😊',
      '::check::': '✅',
      '::warning::': '⚠️',
      '::error::': '❌',
      '::info::': 'ℹ️',
      '::star::': '⭐',
      '::heart::': '❤️',
      '::thumbsup::': '👍'
    }
    
    let newValue = value
    Object.entries(emojiMap).forEach(([shortcut, emoji]) => {
      newValue = newValue.replace(shortcut, emoji)
    })
    
    if (newValue !== value) {
      target.value = newValue
    }
  }

  adjustForVirtualKeyboard(keyboardHeight) {
    // Adjust fixed elements when virtual keyboard appears
    const fixedElements = document.querySelectorAll('.quick-actions-fab, .quick-actions-panel')
    fixedElements.forEach(element => {
      element.style.bottom = `${keyboardHeight + 24}px`
    })
  }

  resetVirtualKeyboardAdjustments() {
    // Reset fixed elements when virtual keyboard disappears
    const fixedElements = document.querySelectorAll('.quick-actions-fab, .quick-actions-panel')
    fixedElements.forEach(element => {
      element.style.bottom = ''
    })
  }

  showVoiceSearchIndicator() {
    const indicator = document.createElement('div')
    indicator.className = 'voice-search-indicator'
    indicator.innerHTML = `
      <div class="pulse"></div>
      <p>Listening...</p>
      <p class="text-sm opacity-75">Say your search query</p>
    `
    
    document.body.appendChild(indicator)
    this.voiceSearchIndicator = indicator
  }

  hideVoiceSearchIndicator() {
    if (this.voiceSearchIndicator) {
      document.body.removeChild(this.voiceSearchIndicator)
      this.voiceSearchIndicator = null
    }
  }

  performVoiceSearch(transcript) {
    const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]')
    if (searchInput) {
      searchInput.value = transcript
      searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      
      // Submit search if there's a form
      const form = searchInput.closest('form')
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true }))
      }
    }
    
    this.showShortcutFeedback(`Voice search: "${transcript}"`)
  }

  showError(message) {
    const error = document.createElement('div')
    error.className = 'error-message'
    error.textContent = message
    error.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      z-index: 1000;
      font-size: 0.875rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `
    
    document.body.appendChild(error)
    
    setTimeout(() => {
      if (error.parentNode) {
        error.parentNode.removeChild(error)
      }
    }, 3000)
  }
}