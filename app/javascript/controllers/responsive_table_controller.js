import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["table", "cardContainer", "expandButton", "expandableContent"]
  static values = { 
    breakpoint: { type: Number, default: 768 },
    cardTemplate: String,
    preserveTable: { type: Boolean, default: false }
  }

  connect() {
    this.checkViewport()
    this.setupResizeObserver()
    this.setupExpandableRows()
  }

  disconnect() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }

  checkViewport() {
    const isMobile = window.innerWidth < this.breakpointValue
    
    if (isMobile && !this.preserveTableValue) {
      this.showCardLayout()
    } else {
      this.showTableLayout()
    }
  }

  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.checkViewport()
    })
    this.resizeObserver.observe(document.body)
  }

  setupExpandableRows() {
    this.expandButtonTargets.forEach(button => {
      button.addEventListener('click', this.toggleRow.bind(this))
    })
  }

  showCardLayout() {
    if (this.hasTableTarget) {
      this.tableTarget.classList.add('hidden')
    }
    
    if (this.hasCardContainerTarget) {
      this.cardContainerTarget.classList.remove('hidden')
      this.generateCards()
    }
  }

  showTableLayout() {
    if (this.hasTableTarget) {
      this.tableTarget.classList.remove('hidden')
    }
    
    if (this.hasCardContainerTarget) {
      this.cardContainerTarget.classList.add('hidden')
    }
  }

  generateCards() {
    if (!this.hasTableTarget || !this.hasCardContainerTarget) return

    const table = this.tableTarget
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.textContent.trim(),
      classes: th.className
    }))
    
    const rows = Array.from(table.querySelectorAll('tbody tr'))
    
    this.cardContainerTarget.innerHTML = ''
    
    rows.forEach((row, index) => {
      const card = this.createCard(row, headers, index)
      this.cardContainerTarget.appendChild(card)
    })
  }

  createCard(row, headers, index) {
    const cells = Array.from(row.querySelectorAll('td'))
    const card = document.createElement('div')
    card.className = 'bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4'
    card.dataset.cardIndex = index

    let cardContent = ''
    
    cells.forEach((cell, cellIndex) => {
      if (cellIndex < headers.length) {
        const header = headers[cellIndex]
        const cellContent = cell.innerHTML.trim()
        
        if (cellContent && !header.text.includes('sr-only')) {
          // Check if this is an actions column
          if (header.text.toLowerCase().includes('action') || cell.querySelector('button, a')) {
            cardContent += `
              <div class="flex justify-end mt-4 pt-4 border-t border-gray-100">
                ${cellContent}
              </div>
            `
          } else {
            cardContent += `
              <div class="flex justify-between items-start mb-3">
                <span class="text-sm font-medium text-gray-500">${header.text}:</span>
                <span class="text-sm text-gray-900 ml-4 text-right">${cellContent}</span>
              </div>
            `
          }
        }
      }
    })

    // Add expandable content if row has expandable data
    const expandableData = row.dataset.expandableContent
    if (expandableData) {
      cardContent += `
        <button class="w-full mt-4 pt-4 border-t border-gray-100 text-sm text-purple-600 hover:text-purple-800 flex items-center justify-center"
                data-action="click->responsive-table#toggleCardExpansion"
                data-card-index="${index}">
          <span data-responsive-table-target="expandText">Show Details</span>
          <svg class="w-4 h-4 ml-2 transform transition-transform" data-responsive-table-target="expandIcon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="hidden mt-4 pt-4 border-t border-gray-100" data-responsive-table-target="expandableContent" data-card-index="${index}">
          ${expandableData}
        </div>
      `
    }

    card.innerHTML = cardContent
    return card
  }

  toggleRow(event) {
    const button = event.currentTarget
    const row = button.closest('tr')
    const expandableContent = row.nextElementSibling
    
    if (expandableContent && expandableContent.classList.contains('expandable-row')) {
      const isExpanded = !expandableContent.classList.contains('hidden')
      
      if (isExpanded) {
        expandableContent.classList.add('hidden')
        button.querySelector('svg').style.transform = 'rotate(0deg)'
        button.querySelector('span').textContent = 'Show Details'
      } else {
        expandableContent.classList.remove('hidden')
        button.querySelector('svg').style.transform = 'rotate(180deg)'
        button.querySelector('span').textContent = 'Hide Details'
      }
    }
  }

  toggleCardExpansion(event) {
    const button = event.currentTarget
    const cardIndex = button.dataset.cardIndex
    const expandableContent = this.element.querySelector(`[data-responsive-table-target="expandableContent"][data-card-index="${cardIndex}"]`)
    const expandIcon = button.querySelector('[data-responsive-table-target="expandIcon"]')
    const expandText = button.querySelector('[data-responsive-table-target="expandText"]')
    
    if (expandableContent) {
      const isExpanded = !expandableContent.classList.contains('hidden')
      
      if (isExpanded) {
        expandableContent.classList.add('hidden')
        expandIcon.style.transform = 'rotate(0deg)'
        expandText.textContent = 'Show Details'
      } else {
        expandableContent.classList.remove('hidden')
        expandIcon.style.transform = 'rotate(180deg)'
        expandText.textContent = 'Hide Details'
      }
    }
  }

  // Enable horizontal scroll with momentum for table preservation
  enableHorizontalScroll() {
    if (this.hasTableTarget) {
      const tableContainer = this.tableTarget.closest('.overflow-x-auto')
      if (tableContainer) {
        tableContainer.style.webkitOverflowScrolling = 'touch'
        tableContainer.style.scrollBehavior = 'smooth'
      }
    }
  }
}