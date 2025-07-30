import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="offline-sync"
export default class extends Controller {
  static targets = ["form", "status", "queue", "syncButton"]
  static values = { 
    endpoint: String,
    transactionType: String
  }

  connect() {
    console.log("Offline Sync Controller: Connected")
    
    // Listen for offline/online events
    this.boundOnlineHandler = this.handleOnline.bind(this)
    this.boundOfflineHandler = this.handleOffline.bind(this)
    this.boundTransactionEvents = this.handleTransactionEvents.bind(this)
    
    window.addEventListener('online', this.boundOnlineHandler)
    window.addEventListener('offline', this.boundOfflineHandler)
    
    // Listen for offline transaction events
    window.addEventListener('offline-transaction-queued', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-synced', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-failed', this.boundTransactionEvents)
    window.addEventListener('offline-transaction-conflict', this.boundTransactionEvents)
    
    // Initial status update
    this.updateConnectionStatus()
    this.updateQueueStatus()
  }

  disconnect() {
    window.removeEventListener('online', this.boundOnlineHandler)
    window.removeEventListener('offline', this.boundOfflineHandler)
    window.removeEventListener('offline-transaction-queued', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-synced', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-failed', this.boundTransactionEvents)
    window.removeEventListener('offline-transaction-conflict', this.boundTransactionEvents)
  }

  // Handle form submission with offline support
  async submitForm(event) {
    event.preventDefault()
    
    if (!this.hasFormTarget) {
      console.error("Offline Sync Controller: No form target found")
      return
    }

    const formData = new FormData(this.formTarget)
    const transactionData = this.extractTransactionData(formData)
    
    try {
      if (navigator.onLine) {
        // Try direct submission first
        await this.submitDirectly(transactionData)
      } else {
        // Queue for offline sync
        await this.queueTransaction(transactionData)
      }
    } catch (error) {
      console.error("Offline Sync Controller: Submission failed", error)
      
      // If direct submission fails and we have offline manager, queue it
      if (window.offlineTransactionManager) {
        await this.queueTransaction(transactionData)
      } else {
        this.showError("Failed to submit transaction. Please try again.")
      }
    }
  }

  // Submit transaction directly to server
  async submitDirectly(transactionData) {
    const response = await fetch(this.endpointValue, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': this.getCSRFToken()
      },
      body: JSON.stringify(transactionData)
    })

    if (response.ok) {
      const result = await response.json()
      this.showSuccess("Transaction submitted successfully")
      this.resetForm()
      
      // Redirect or update UI as needed
      if (result.redirect_url) {
        window.location.href = result.redirect_url
      }
    } else {
      throw new Error(`Server error: ${response.status}`)
    }
  }

  // Queue transaction for offline sync
  async queueTransaction(transactionData) {
    if (!window.offlineTransactionManager) {
      throw new Error("Offline transaction manager not available")
    }

    const transaction = {
      type: this.transactionTypeValue,
      data: transactionData,
      endpoint: this.endpointValue
    }

    const transactionId = await window.offlineTransactionManager.queueTransaction(transaction)
    
    this.showInfo(`Transaction queued for sync (ID: ${transactionId.slice(-8)})`)
    this.resetForm()
    this.updateQueueStatus()
  }

  // Extract transaction data from form
  extractTransactionData(formData) {
    const data = {}
    
    for (let [key, value] of formData.entries()) {
      // Handle nested attributes (e.g., stock_transaction[items_attributes][0][item_id])
      if (key.includes('[') && key.includes(']')) {
        this.setNestedValue(data, key, value)
      } else {
        data[key] = value
      }
    }
    
    return data
  }

  // Set nested object values from form field names
  setNestedValue(obj, path, value) {
    const keys = path.replace(/\]/g, '').split('[')
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current)) {
        // Check if next key is a number (array index)
        const nextKey = keys[i + 1]
        current[key] = /^\d+$/.test(nextKey) ? [] : {}
      }
      current = current[key]
    }
    
    const finalKey = keys[keys.length - 1]
    current[finalKey] = value
  }

  // Handle online event
  handleOnline() {
    console.log("Offline Sync Controller: Back online")
    this.updateConnectionStatus()
    
    // Trigger sync of pending transactions
    if (window.offlineTransactionManager) {
      window.offlineTransactionManager.syncPendingTransactions()
    }
  }

  // Handle offline event
  handleOffline() {
    console.log("Offline Sync Controller: Gone offline")
    this.updateConnectionStatus()
  }

  // Handle transaction events
  handleTransactionEvents(event) {
    const { type, detail } = event
    
    switch (type) {
      case 'offline-transaction-queued':
        this.showInfo(`Transaction queued: ${detail.transaction.type}`)
        break
      case 'offline-transaction-synced':
        this.showSuccess(`Transaction synced: ${detail.transaction.type}`)
        break
      case 'offline-transaction-failed':
        this.showError(`Transaction failed: ${detail.transaction.type}`)
        break
      case 'offline-transaction-conflict':
        this.showWarning(`Conflict detected: ${detail.transaction.type}`)
        break
    }
    
    this.updateQueueStatus()
  }

  // Manual sync trigger
  async syncNow() {
    if (!navigator.onLine) {
      this.showError("Cannot sync while offline")
      return
    }

    if (!window.offlineTransactionManager) {
      this.showError("Offline manager not available")
      return
    }

    try {
      this.showInfo("Syncing pending transactions...")
      await window.offlineTransactionManager.syncPendingTransactions()
      this.showSuccess("Sync completed")
    } catch (error) {
      console.error("Manual sync failed", error)
      this.showError("Sync failed. Please try again.")
    }
  }

  // Update connection status display
  updateConnectionStatus() {
    if (!this.hasStatusTarget) return

    const isOnline = navigator.onLine
    const statusElement = this.statusTarget
    
    statusElement.textContent = isOnline ? 'Online' : 'Offline'
    statusElement.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isOnline 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`
  }

  // Update queue status display
  async updateQueueStatus() {
    if (!this.hasQueueTarget || !window.offlineTransactionManager) return

    try {
      const stats = await window.offlineTransactionManager.getTransactionStats()
      const queueElement = this.queueTarget
      
      if (stats.pending > 0) {
        queueElement.textContent = `${stats.pending} pending`
        queueElement.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800'
        queueElement.style.display = 'inline-flex'
      } else {
        queueElement.style.display = 'none'
      }
    } catch (error) {
      console.error("Failed to update queue status", error)
    }
  }

  // Reset form after successful submission
  resetForm() {
    if (this.hasFormTarget) {
      this.formTarget.reset()
    }
  }

  // Show success message
  showSuccess(message) {
    this.showNotification(message, 'success')
  }

  // Show error message
  showError(message) {
    this.showNotification(message, 'error')
  }

  // Show info message
  showInfo(message) {
    this.showNotification(message, 'info')
  }

  // Show warning message
  showWarning(message) {
    this.showNotification(message, 'warning')
  }

  // Show notification (can be enhanced with toast library)
  showNotification(message, type) {
    // Simple implementation - can be enhanced with proper toast notifications
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    }

    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300`
    notification.textContent = message

    document.body.appendChild(notification)

    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0'
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  // Get CSRF token
  getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]')
    return token ? token.getAttribute('content') : ''
  }
}