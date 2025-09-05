import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="offline-indicator"
export default class extends Controller {
  static targets = [
    "container", "statusBar", "statusText", "syncPanel", "syncIndicator",
    "queueCount", "lastSync", "syncButton", "queueDetails", "queueList",
    "toastContainer"
  ]

  connect() {
    console.log("Offline Indicator Controller: Connected")
    
    // Bind event handlers
    this.boundOnlineHandler = this.handleOnline.bind(this)
    this.boundOfflineHandler = this.handleOffline.bind(this)
    this.boundTransactionEvents = this.handleTransactionEvents.bind(this)
    this.boundBackgroundSyncComplete = this.handleBackgroundSyncComplete.bind(this)
    
    // Listen for network events
    window.addEventListener('online', this.boundOnlineHandler)
    window.addEventListener('offline', this.boundOfflineHandler)
    
    // Listen for PWA events
    window.addEventListener('pwa-online', this.boundOnlineHandler)
    window.addEventListener('pwa-offline', this.boundOfflineHandler)
    
    // Listen for transaction events
    window.addEventListener('offline-transaction-queued', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-synced', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-failed', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-conflict', this.boundTransactionEvents)
    
    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', this.boundBackgroundSyncComplete)
    }
    
    // Initial state
    this.updateConnectionStatus()
    this.updateSyncStatus()
    
    // Periodic updates
    this.startPeriodicUpdates()
  }

  disconnect() {
    // Clean up event listeners
    window.removeEventListener('online', this.boundOnlineHandler)
    window.removeEventListener('offline', this.boundOfflineHandler)
    window.removeEventListener('pwa-online', this.boundOnlineHandler)
    window.removeEventListener('pwa-offline', this.boundOfflineHandler)
    window.removeEventListener('offline-transaction-queued', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-synced', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-failed', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-conflict', this.boundTransactionEvents)
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.boundBackgroundSyncComplete)
    }
    
    // Clear intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
  }

  // Handle online event
  handleOnline() {
    console.log("Offline Indicator: Back online")
    this.updateConnectionStatus()
    this.showToast("Back online! Syncing pending transactions...", "success")
    
    // Auto-sync when coming back online
    setTimeout(() => {
      this.syncNow()
    }, 1000)
  }

  // Handle offline event
  handleOffline() {
    console.log("Offline Indicator: Gone offline")
    this.updateConnectionStatus()
    this.showToast("You are now offline. Transactions will be queued for sync.", "warning")
  }

  // Handle transaction events
  handleTransactionEvents(event) {
    const { type, detail } = event
    
    switch (type) {
      case 'offline-transaction-queued':
        this.showToast(`Transaction queued: ${this.formatTransactionType(detail.transaction.type)}`, "info")
        break
      case 'offline-transaction-synced':
        this.showToast(`Transaction synced: ${this.formatTransactionType(detail.transaction.type)}`, "success")
        break
      case 'offline-transaction-failed':
        this.showToast(`Transaction failed: ${this.formatTransactionType(detail.transaction.type)}`, "error")
        break
      case 'offline-transaction-conflict':
        this.showToast(`Conflict detected: ${this.formatTransactionType(detail.transaction.type)}`, "warning")
        break
    }
    
    this.updateSyncStatus()
  }

  // Handle background sync completion
  handleBackgroundSyncComplete(event) {
    if (event.data && event.data.type === 'BACKGROUND_SYNC_COMPLETE') {
      const { synced, failed } = event.data
      
      if (synced > 0) {
        this.showToast(`Background sync completed: ${synced} transactions synced`, "success")
      }
      
      if (failed > 0) {
        this.showToast(`${failed} transactions failed to sync`, "error")
      }
      
      this.updateSyncStatus()
    }
  }

  // Update connection status display
  updateConnectionStatus() {
    const isOnline = navigator.onLine
    
    if (isOnline) {
      // Hide offline indicator
      this.containerTarget.classList.add('-translate-y-full')
      this.statusBarTarget.className = 'bg-green-500 text-white px-4 py-2 text-sm font-medium text-center'
      this.statusTextTarget.textContent = 'Back online'
      
      // Show sync panel if there are pending transactions
      this.checkAndShowSyncPanel()
    } else {
      // Show offline indicator
      this.containerTarget.classList.remove('-translate-y-full')
      this.statusBarTarget.className = 'bg-red-500 text-white px-4 py-2 text-sm font-medium text-center'
      this.statusTextTarget.textContent = 'You are offline'
      
      // Always show sync panel when offline
      this.showSyncPanel()
    }
  }

  // Check if sync panel should be shown
  async checkAndShowSyncPanel() {
    if (!window.offlineTransactionManager) return
    
    try {
      const stats = await window.offlineTransactionManager.getTransactionStats()
      
      if (stats.pending > 0 || stats.retrying > 0) {
        this.showSyncPanel()
      } else {
        this.hideSyncPanel()
      }
    } catch (error) {
      console.error("Failed to check sync panel status", error)
    }
  }

  // Show sync panel
  showSyncPanel() {
    this.syncPanelTarget.style.display = 'block'
  }

  // Hide sync panel
  hideSyncPanel() {
    this.syncPanelTarget.style.display = 'none'
    this.queueDetailsTarget.style.display = 'none'
  }

  // Update sync status information
  async updateSyncStatus() {
    if (!window.offlineTransactionManager) return
    
    try {
      const stats = await window.offlineTransactionManager.getTransactionStats()
      
      // Update queue count
      const pendingCount = stats.pending + stats.retrying
      this.queueCountTarget.textContent = pendingCount
      
      // Update sync indicator
      if (pendingCount > 0) {
        this.syncIndicatorTarget.className = 'w-2 h-2 bg-yellow-400 rounded-full animate-pulse'
      } else {
        this.syncIndicatorTarget.className = 'w-2 h-2 bg-green-400 rounded-full'
      }
      
      // Update last sync time
      const lastSyncTime = localStorage.getItem('lastSyncTime')
      if (lastSyncTime) {
        const date = new Date(parseInt(lastSyncTime))
        this.lastSyncTarget.textContent = `Last sync: ${this.formatRelativeTime(date)}`
      }
      
      // Update sync button state
      this.syncButtonTarget.disabled = !navigator.onLine || pendingCount === 0
      
      // Update queue details if visible
      if (this.queueDetailsTarget.style.display !== 'none') {
        await this.updateQueueDetails()
      }
      
    } catch (error) {
      console.error("Failed to update sync status", error)
    }
  }

  // Update queue details list
  async updateQueueDetails() {
    if (!window.offlineTransactionManager) return
    
    try {
      const pendingTransactions = await window.offlineTransactionManager.getPendingTransactions()
      
      this.queueListTarget.innerHTML = ''
      
      if (pendingTransactions.length === 0) {
        this.queueListTarget.innerHTML = '<p class="text-sm text-gray-500">No pending transactions</p>'
        return
      }
      
      pendingTransactions.forEach(transaction => {
        const item = document.createElement('div')
        item.className = 'flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm'
        
        const statusColor = this.getStatusColor(transaction.status)
        const retryText = transaction.retryCount > 0 ? ` (${transaction.retryCount} retries)` : ''
        
        item.innerHTML = `
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 ${statusColor} rounded-full"></div>
            <span class="font-medium">${this.formatTransactionType(transaction.type)}</span>
            <span class="text-gray-500">${this.formatRelativeTime(new Date(transaction.timestamp))}${retryText}</span>
          </div>
          <span class="text-xs px-2 py-1 bg-white rounded border">${transaction.status}</span>
        `
        
        this.queueListTarget.appendChild(item)
      })
      
    } catch (error) {
      console.error("Failed to update queue details", error)
    }
  }

  // Manual sync trigger
  async syncNow() {
    if (!navigator.onLine) {
      this.showToast("Cannot sync while offline", "error")
      return
    }

    if (!window.offlineTransactionManager) {
      this.showToast("Offline manager not available", "error")
      return
    }

    try {
      this.syncButtonTarget.disabled = true
      this.syncButtonTarget.innerHTML = `
        <svg class="w-3 h-3 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Syncing...
      `
      
      await window.offlineTransactionManager.syncPendingTransactions()
      
      // Update last sync time
      localStorage.setItem('lastSyncTime', Date.now().toString())
      
      this.showToast("Sync completed successfully", "success")
      
    } catch (error) {
      console.error("Manual sync failed", error)
      this.showToast("Sync failed. Please try again.", "error")
    } finally {
      this.syncButtonTarget.disabled = false
      this.syncButtonTarget.innerHTML = `
        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        Sync Now
      `
    }
  }

  // Toggle queue details visibility
  toggleQueueDetails() {
    const isVisible = this.queueDetailsTarget.style.display !== 'none'
    
    if (isVisible) {
      this.queueDetailsTarget.style.display = 'none'
    } else {
      this.queueDetailsTarget.style.display = 'block'
      this.updateQueueDetails()
    }
  }

  // Start periodic updates
  startPeriodicUpdates() {
    // Update sync status every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateSyncStatus()
    }, 30000)
  }

  // Show toast notification
  showToast(message, type = "info", duration = 4000) {
    const toast = document.createElement('div')
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    }
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    }
    
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform transition-all duration-300 translate-x-full opacity-0`
    toast.innerHTML = `
      <span class="font-bold">${icons[type]}</span>
      <span class="text-sm">${message}</span>
      <button class="ml-2 text-white hover:text-gray-200" onclick="this.parentElement.remove()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    `
    
    this.toastContainerTarget.appendChild(toast)
    
    // Animate in
    setTimeout(() => {
      toast.classList.remove('translate-x-full', 'opacity-0')
    }, 100)
    
    // Auto-remove
    setTimeout(() => {
      toast.classList.add('translate-x-full', 'opacity-0')
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast)
        }
      }, 300)
    }, duration)
  }

  // Utility methods
  formatTransactionType(type) {
    const types = {
      'stock_in': 'Stock In',
      'stock_out': 'Stock Out',
      'stock_move': 'Stock Move',
      'stock_adjust': 'Stock Adjust',
      'item_create': 'Item Create',
      'item_update': 'Item Update',
      'location_create': 'Location Create',
      'location_update': 'Location Update'
    }
    
    return types[type] || type
  }

  formatRelativeTime(date) {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  getStatusColor(status) {
    const colors = {
      'pending': 'bg-yellow-400',
      'retrying': 'bg-orange-400',
      'synced': 'bg-green-400',
      'failed': 'bg-red-400'
    }
    
    return colors[status] || 'bg-gray-400'
  }
}