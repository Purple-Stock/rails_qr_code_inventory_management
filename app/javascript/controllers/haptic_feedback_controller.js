import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { 
    intensity: { type: String, default: "light" },
    ripple: { type: Boolean, default: true },
    dragEnabled: { type: Boolean, default: false }
  }

  connect() {
    this.setupHapticFeedback()
    this.setupRippleEffect()
    this.setupDragAndDrop()
  }

  setupHapticFeedback() {
    // Add haptic feedback to all interactive elements
    const interactiveElements = this.element.querySelectorAll(
      'button, [role="button"], a, input[type="submit"], input[type="button"], .haptic-enabled'
    )

    interactiveElements.forEach(element => {
      // Touch events for mobile
      element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true })
      element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true })
      
      // Mouse events for desktop (with touch simulation)
      element.addEventListener('mousedown', this.handleMouseDown.bind(this))
      element.addEventListener('mouseup', this.handleMouseUp.bind(this))
      
      // Focus events for keyboard navigation
      element.addEventListener('focus', this.handleFocus.bind(this))
    })
  }

  setupRippleEffect() {
    if (!this.rippleValue) return

    const rippleElements = this.element.querySelectorAll(
      'button, [role="button"], .ripple-enabled'
    )

    rippleElements.forEach(element => {
      element.classList.add('ripple-container')
      element.addEventListener('click', this.createRipple.bind(this))
      element.addEventListener('touchstart', this.createRipple.bind(this))
    })
  }

  setupDragAndDrop() {
    if (!this.dragEnabledValue) return

    const draggableElements = this.element.querySelectorAll('[draggable="true"], .draggable')
    
    draggableElements.forEach(element => {
      // Touch events for mobile drag
      element.addEventListener('touchstart', this.handleDragStart.bind(this), { passive: false })
      element.addEventListener('touchmove', this.handleDragMove.bind(this), { passive: false })
      element.addEventListener('touchend', this.handleDragEnd.bind(this), { passive: false })
      
      // Mouse events for desktop drag
      element.addEventListener('mousedown', this.handleDragStart.bind(this))
      element.addEventListener('mousemove', this.handleDragMove.bind(this))
      element.addEventListener('mouseup', this.handleDragEnd.bind(this))
      
      // HTML5 drag events
      element.addEventListener('dragstart', this.handleHTML5DragStart.bind(this))
      element.addEventListener('dragend', this.handleHTML5DragEnd.bind(this))
    })

    // Setup drop zones
    const dropZones = this.element.querySelectorAll('.drop-zone')
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', this.handleDragOver.bind(this))
      zone.addEventListener('drop', this.handleDrop.bind(this))
      zone.addEventListener('dragenter', this.handleDragEnter.bind(this))
      zone.addEventListener('dragleave', this.handleDragLeave.bind(this))
    })
  }

  handleTouchStart(event) {
    this.triggerHapticFeedback('light')
    this.addPressedState(event.target)
  }

  handleTouchEnd(event) {
    this.removePressedState(event.target)
  }

  handleMouseDown(event) {
    // Simulate haptic feedback for desktop
    this.triggerHapticFeedback('light')
    this.addPressedState(event.target)
  }

  handleMouseUp(event) {
    this.removePressedState(event.target)
  }

  handleFocus(event) {
    // Light haptic feedback for keyboard navigation
    this.triggerHapticFeedback('selection')
  }

  addPressedState(element) {
    element.classList.add('pressed')
    
    // Remove pressed state after animation
    setTimeout(() => {
      element.classList.remove('pressed')
    }, 150)
  }

  removePressedState(element) {
    element.classList.remove('pressed')
  }

  createRipple(event) {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    
    // Calculate ripple position
    let x, y
    if (event.type === 'touchstart' && event.touches.length > 0) {
      x = event.touches[0].clientX - rect.left
      y = event.touches[0].clientY - rect.top
    } else if (event.type === 'click') {
      x = event.clientX - rect.left
      y = event.clientY - rect.top
    } else {
      // Center ripple if no position available
      x = rect.width / 2
      y = rect.height / 2
    }

    // Create ripple element
    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`

    // Add ripple to element
    element.appendChild(ripple)

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 600)

    // Trigger haptic feedback for ripple
    this.triggerHapticFeedback('light')
  }

  // Drag and Drop Implementation
  handleDragStart(event) {
    const element = event.target.closest('[draggable="true"], .draggable')
    if (!element) return

    this.draggedElement = element
    this.dragStartTime = Date.now()
    this.isDragging = false

    // Store initial position
    if (event.type === 'touchstart') {
      this.startX = event.touches[0].clientX
      this.startY = event.touches[0].clientY
    } else {
      this.startX = event.clientX
      this.startY = event.clientY
    }

    element.classList.add('dragging')
    this.triggerHapticFeedback('medium')

    // Prevent default for touch events
    if (event.type === 'touchstart') {
      event.preventDefault()
    }
  }

  handleDragMove(event) {
    if (!this.draggedElement) return

    let currentX, currentY
    if (event.type === 'touchmove') {
      currentX = event.touches[0].clientX
      currentY = event.touches[0].clientY
      event.preventDefault()
    } else if (this.isDragging) {
      currentX = event.clientX
      currentY = event.clientY
    } else {
      return
    }

    // Check if we've moved enough to start dragging
    const deltaX = Math.abs(currentX - this.startX)
    const deltaY = Math.abs(currentY - this.startY)
    
    if (!this.isDragging && (deltaX > 10 || deltaY > 10)) {
      this.isDragging = true
      this.triggerHapticFeedback('light')
    }

    if (this.isDragging) {
      // Update element position for visual feedback
      const deltaX = currentX - this.startX
      const deltaY = currentY - this.startY
      
      this.draggedElement.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      this.draggedElement.style.zIndex = '1000'
      this.draggedElement.style.opacity = '0.8'

      // Check for drop zones
      const elementBelow = document.elementFromPoint(currentX, currentY)
      const dropZone = elementBelow?.closest('.drop-zone')
      
      if (dropZone && dropZone !== this.currentDropZone) {
        if (this.currentDropZone) {
          this.currentDropZone.classList.remove('drag-over')
        }
        dropZone.classList.add('drag-over')
        this.currentDropZone = dropZone
        this.triggerHapticFeedback('selection')
      } else if (!dropZone && this.currentDropZone) {
        this.currentDropZone.classList.remove('drag-over')
        this.currentDropZone = null
      }
    }
  }

  handleDragEnd(event) {
    if (!this.draggedElement) return

    const dragDuration = Date.now() - this.dragStartTime
    
    // Reset element styles
    this.draggedElement.style.transform = ''
    this.draggedElement.style.zIndex = ''
    this.draggedElement.style.opacity = ''
    this.draggedElement.classList.remove('dragging')

    if (this.isDragging && this.currentDropZone) {
      // Successful drop
      this.handleSuccessfulDrop(this.draggedElement, this.currentDropZone)
      this.triggerHapticFeedback('heavy')
    } else if (dragDuration < 200 && !this.isDragging) {
      // Quick tap - treat as click
      this.draggedElement.click()
    }

    // Clean up
    if (this.currentDropZone) {
      this.currentDropZone.classList.remove('drag-over')
      this.currentDropZone = null
    }
    
    this.draggedElement = null
    this.isDragging = false
  }

  handleHTML5DragStart(event) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/html', event.target.outerHTML)
    event.target.classList.add('dragging')
    this.triggerHapticFeedback('medium')
  }

  handleHTML5DragEnd(event) {
    event.target.classList.remove('dragging')
  }

  handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  handleDragEnter(event) {
    event.preventDefault()
    event.target.classList.add('drag-over')
    this.triggerHapticFeedback('selection')
  }

  handleDragLeave(event) {
    event.target.classList.remove('drag-over')
  }

  handleDrop(event) {
    event.preventDefault()
    const dropZone = event.target.closest('.drop-zone')
    if (dropZone) {
      dropZone.classList.remove('drag-over')
      this.triggerHapticFeedback('heavy')
      
      // Dispatch custom drop event
      const dropEvent = new CustomEvent('item-dropped', {
        detail: {
          dropZone: dropZone,
          dragData: event.dataTransfer.getData('text/html')
        }
      })
      this.element.dispatchEvent(dropEvent)
    }
  }

  handleSuccessfulDrop(draggedElement, dropZone) {
    // Dispatch custom drop event for touch/mouse drag
    const dropEvent = new CustomEvent('item-dropped', {
      detail: {
        draggedElement: draggedElement,
        dropZone: dropZone
      }
    })
    this.element.dispatchEvent(dropEvent)
  }

  triggerHapticFeedback(intensity = 'light') {
    // Use the intensity value from the controller or the parameter
    const feedbackIntensity = intensity || this.intensityValue

    // Vibration API for haptic feedback
    if ('vibrate' in navigator) {
      const patterns = {
        selection: [5],
        light: [10],
        medium: [20],
        heavy: [30, 10, 20]
      }
      
      const pattern = patterns[feedbackIntensity] || patterns.light
      navigator.vibrate(pattern)
    }

    // Web Gamepad API for more advanced haptic feedback (if available)
    if ('getGamepads' in navigator) {
      const gamepads = navigator.getGamepads()
      for (let gamepad of gamepads) {
        if (gamepad && gamepad.vibrationActuator) {
          const intensityMap = {
            selection: { startDelay: 0, duration: 50, weakMagnitude: 0.1, strongMagnitude: 0.1 },
            light: { startDelay: 0, duration: 100, weakMagnitude: 0.2, strongMagnitude: 0.2 },
            medium: { startDelay: 0, duration: 150, weakMagnitude: 0.5, strongMagnitude: 0.5 },
            heavy: { startDelay: 0, duration: 200, weakMagnitude: 1.0, strongMagnitude: 1.0 }
          }
          
          const params = intensityMap[feedbackIntensity] || intensityMap.light
          gamepad.vibrationActuator.playEffect('dual-rumble', params)
        }
      }
    }
  }

  // Public methods for external use
  triggerFeedback(event) {
    const intensity = event.params?.intensity || this.intensityValue
    this.triggerHapticFeedback(intensity)
  }

  createRippleEffect(event) {
    this.createRipple(event)
  }

  handleItemDrop(event) {
    const { draggedElement, dropZone } = event.detail
    
    if (draggedElement && dropZone) {
      this.triggerHapticFeedback('heavy')
      this.reorderItems(draggedElement, dropZone)
    }
  }

  reorderItems(draggedElement, dropZone) {
    // Get all sortable items
    const sortableItems = Array.from(this.element.querySelectorAll('.sortable-item'))
    const draggedIndex = sortableItems.indexOf(draggedElement)
    const dropIndex = sortableItems.indexOf(dropZone)
    
    if (draggedIndex !== -1 && dropIndex !== -1 && draggedIndex !== dropIndex) {
      // Reorder the DOM elements
      if (draggedIndex < dropIndex) {
        dropZone.parentNode.insertBefore(draggedElement, dropZone.nextSibling)
      } else {
        dropZone.parentNode.insertBefore(draggedElement, dropZone)
      }
      
      // Send reorder request to server
      this.sendReorderRequest()
    }
  }

  sendReorderRequest() {
    const sortableItems = Array.from(this.element.querySelectorAll('.sortable-item'))
    const itemIds = sortableItems.map(item => item.dataset.itemId).filter(id => id)
    
    if (itemIds.length > 0) {
      const teamId = window.location.pathname.split('/')[2] // Extract team ID from URL
      const url = `/teams/${teamId}/items/reorder`
      
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.content || ''
        },
        body: JSON.stringify({ item_ids: itemIds })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          this.triggerHapticFeedback('light')
          this.showReorderSuccess()
        } else {
          this.showReorderError()
        }
      })
      .catch(error => {
        console.error('Reorder failed:', error)
        this.showReorderError()
      })
    }
  }

  showReorderSuccess() {
    // Create a temporary success indicator
    const indicator = document.createElement('div')
    indicator.className = 'reorder-success-indicator'
    indicator.textContent = 'Items reordered successfully'
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      z-index: 1000;
      font-size: 0.875rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
    `
    
    document.body.appendChild(indicator)
    
    // Animate in
    setTimeout(() => {
      indicator.style.transform = 'translateX(0)'
    }, 100)
    
    // Remove after 3 seconds
    setTimeout(() => {
      indicator.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator)
        }
      }, 300)
    }, 3000)
  }

  showReorderError() {
    // Create a temporary error indicator
    const indicator = document.createElement('div')
    indicator.className = 'reorder-error-indicator'
    indicator.textContent = 'Failed to reorder items'
    indicator.style.cssText = `
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
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
    `
    
    document.body.appendChild(indicator)
    
    // Animate in
    setTimeout(() => {
      indicator.style.transform = 'translateX(0)'
    }, 100)
    
    // Remove after 3 seconds
    setTimeout(() => {
      indicator.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator)
        }
      }, 300)
    }, 3000)
  }
}