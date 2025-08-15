import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["item", "actions", "deleteAction", "contextMenu"]
  static values = { 
    threshold: { type: Number, default: 80 },
    longPressDelay: { type: Number, default: 500 },
    deleteUrl: String,
    editUrl: String,
    duplicateUrl: String
  }

  connect() {
    this.isTouch = 'ontouchstart' in window
    this.startX = 0
    this.startY = 0
    this.currentX = 0
    this.currentY = 0
    this.isDragging = false
    this.isLongPress = false
    this.longPressTimer = null
    this.swipeDirection = null
    
    // Bind methods to preserve context
    this.handleTouchStart = this.handleTouchStart.bind(this)
    this.handleTouchMove = this.handleTouchMove.bind(this)
    this.handleTouchEnd = this.handleTouchEnd.bind(this)
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    
    this.setupEventListeners()
    this.createContextMenu()
  }

  disconnect() {
    this.removeEventListeners()
    this.clearLongPressTimer()
    this.removeContextMenu()
  }

  setupEventListeners() {
    if (this.isTouch) {
      this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false })
      this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false })
      this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false })
    } else {
      this.element.addEventListener('mousedown', this.handleMouseDown)
      this.element.addEventListener('mousemove', this.handleMouseMove)
      this.element.addEventListener('mouseup', this.handleMouseUp)
    }
  }

  removeEventListeners() {
    if (this.isTouch) {
      this.element.removeEventListener('touchstart', this.handleTouchStart)
      this.element.removeEventListener('touchmove', this.handleTouchMove)
      this.element.removeEventListener('touchend', this.handleTouchEnd)
    } else {
      this.element.removeEventListener('mousedown', this.handleMouseDown)
      this.element.removeEventListener('mousemove', this.handleMouseMove)
      this.element.removeEventListener('mouseup', this.handleMouseUp)
    }
  }

  handleTouchStart(event) {
    this.startInteraction(event.touches[0])
  }

  handleTouchMove(event) {
    if (!this.isDragging) return
    event.preventDefault()
    this.updateInteraction(event.touches[0])
  }

  handleTouchEnd(event) {
    this.endInteraction()
  }

  handleMouseDown(event) {
    this.startInteraction(event)
  }

  handleMouseMove(event) {
    if (!this.isDragging) return
    this.updateInteraction(event)
  }

  handleMouseUp(event) {
    this.endInteraction()
  }

  startInteraction(pointer) {
    this.startX = pointer.clientX
    this.startY = pointer.clientY
    this.currentX = pointer.clientX
    this.currentY = pointer.clientY
    this.isDragging = true
    this.isLongPress = false
    this.swipeDirection = null

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      if (this.isDragging && !this.hasMovedSignificantly()) {
        this.isLongPress = true
        this.showContextMenu()
        this.triggerHapticFeedback('medium')
      }
    }, this.longPressDelayValue)

    this.element.classList.add('swipe-active')
  }

  updateInteraction(pointer) {
    if (!this.isDragging) return

    this.currentX = pointer.clientX
    this.currentY = pointer.clientY

    const deltaX = this.currentX - this.startX
    const deltaY = this.currentY - this.startY

    // Clear long press if user moves significantly
    if (this.hasMovedSignificantly() && this.longPressTimer) {
      this.clearLongPressTimer()
    }

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.swipeDirection = deltaX > 0 ? 'right' : 'left'
      
      // Apply visual feedback for swipe
      if (Math.abs(deltaX) > 10) {
        this.applySwipeTransform(deltaX)
      }
    }
  }

  endInteraction() {
    if (!this.isDragging) return

    this.clearLongPressTimer()
    
    const deltaX = this.currentX - this.startX
    const deltaY = this.currentY - this.startY

    // Handle swipe gestures
    if (Math.abs(deltaX) > this.thresholdValue && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Swipe left - show delete action
        this.handleSwipeLeft()
      } else {
        // Swipe right - show edit actions
        this.handleSwipeRight()
      }
    } else if (!this.isLongPress) {
      // Reset position if no significant swipe
      this.resetSwipePosition()
    }

    this.isDragging = false
    this.element.classList.remove('swipe-active')
  }

  handleSwipeLeft() {
    this.showDeleteAction()
    this.triggerHapticFeedback('light')
  }

  handleSwipeRight() {
    this.showEditActions()
    this.triggerHapticFeedback('light')
  }

  showDeleteAction() {
    if (this.hasDeleteActionTarget) {
      this.deleteActionTarget.classList.remove('hidden')
      this.deleteActionTarget.classList.add('swipe-action-visible')
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.hideActions()
      }, 3000)
    }
  }

  showEditActions() {
    if (this.hasActionsTarget) {
      this.actionsTarget.classList.remove('hidden')
      this.actionsTarget.classList.add('swipe-action-visible')
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        this.hideActions()
      }, 3000)
    }
  }

  hideActions() {
    if (this.hasDeleteActionTarget) {
      this.deleteActionTarget.classList.add('hidden')
      this.deleteActionTarget.classList.remove('swipe-action-visible')
    }
    if (this.hasActionsTarget) {
      this.actionsTarget.classList.remove('swipe-action-visible')
    }
    this.resetSwipePosition()
  }

  applySwipeTransform(deltaX) {
    // Limit the swipe distance
    const maxSwipe = 100
    const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX))
    
    if (this.hasItemTarget) {
      this.itemTarget.style.transform = `translateX(${clampedDelta}px)`
      this.itemTarget.style.transition = 'none'
    }
  }

  resetSwipePosition() {
    if (this.hasItemTarget) {
      this.itemTarget.style.transform = 'translateX(0)'
      this.itemTarget.style.transition = 'transform 0.3s ease-out'
    }
  }

  hasMovedSignificantly() {
    const deltaX = Math.abs(this.currentX - this.startX)
    const deltaY = Math.abs(this.currentY - this.startY)
    return deltaX > 10 || deltaY > 10
  }

  clearLongPressTimer() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  createContextMenu() {
    if (this.hasContextMenuTarget) return

    const contextMenu = document.createElement('div')
    contextMenu.className = 'swipe-context-menu hidden'
    contextMenu.innerHTML = `
      <div class="swipe-context-menu-backdrop"></div>
      <div class="swipe-context-menu-content">
        <div class="swipe-context-menu-header">
          <h3>Quick Actions</h3>
          <button class="swipe-context-menu-close" data-action="click->swipe-gesture#hideContextMenu">×</button>
        </div>
        <div class="swipe-context-menu-actions">
          ${this.editUrlValue ? `<button class="swipe-context-menu-action" data-action="click->swipe-gesture#editItem">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit
          </button>` : ''}
          ${this.duplicateUrlValue ? `<button class="swipe-context-menu-action" data-action="click->swipe-gesture#duplicateItem">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            Duplicate
          </button>` : ''}
          ${this.deleteUrlValue ? `<button class="swipe-context-menu-action swipe-context-menu-action-danger" data-action="click->swipe-gesture#deleteItem">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
            Delete
          </button>` : ''}
        </div>
      </div>
    `
    
    document.body.appendChild(contextMenu)
    this.contextMenuElement = contextMenu
  }

  removeContextMenu() {
    if (this.contextMenuElement) {
      document.body.removeChild(this.contextMenuElement)
      this.contextMenuElement = null
    }
  }

  showContextMenu() {
    if (this.contextMenuElement) {
      this.contextMenuElement.classList.remove('hidden')
      this.contextMenuElement.classList.add('swipe-context-menu-visible')
    }
  }

  hideContextMenu() {
    if (this.contextMenuElement) {
      this.contextMenuElement.classList.add('hidden')
      this.contextMenuElement.classList.remove('swipe-context-menu-visible')
    }
  }

  editItem() {
    if (this.editUrlValue) {
      window.location.href = this.editUrlValue
    }
    this.hideContextMenu()
  }

  duplicateItem() {
    if (this.duplicateUrlValue) {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = this.duplicateUrlValue
      
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
      if (csrfToken) {
        const csrfInput = document.createElement('input')
        csrfInput.type = 'hidden'
        csrfInput.name = 'authenticity_token'
        csrfInput.value = csrfToken
        form.appendChild(csrfInput)
      }
      
      document.body.appendChild(form)
      form.submit()
    }
    this.hideContextMenu()
  }

  deleteItem() {
    if (this.deleteUrlValue && confirm('Are you sure you want to delete this item?')) {
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = this.deleteUrlValue
      
      const methodInput = document.createElement('input')
      methodInput.type = 'hidden'
      methodInput.name = '_method'
      methodInput.value = 'DELETE'
      form.appendChild(methodInput)
      
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
      if (csrfToken) {
        const csrfInput = document.createElement('input')
        csrfInput.type = 'hidden'
        csrfInput.name = 'authenticity_token'
        csrfInput.value = csrfToken
        form.appendChild(csrfInput)
      }
      
      document.body.appendChild(form)
      form.submit()
    }
    this.hideContextMenu()
  }

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
}