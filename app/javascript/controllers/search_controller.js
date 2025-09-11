import { Controller } from "@hotwired/stimulus"

// A lightweight search controller used by Adjust (and compatible wrappers)
// Expects markup:
// <div data-controller="search" data-team-id="...">
//   <input data-search-target="input" data-action="input->search#search">
//   <div data-search-target="results"></div>
// </div>
export default class extends Controller {
  static targets = ["input", "results"]
  static values = { teamId: String }

  connect() {
    // Team ID can come from Stimulus value or data-team-id
    this.teamId = this.hasTeamIdValue ? this.teamIdValue : this.element.dataset.teamId
    this.searchTimeout = null

    if (this.hasInputTarget) {
      // Show all on focus
      this.inputTarget.addEventListener('focus', () => this.loadItems(''))
    }

    // Hide results when clicking outside the wrapper
    this.handleDocumentClick = (e) => {
      if (!this.element.contains(e.target) && this.hasResultsTarget) {
        this.resultsTarget.classList.add('hidden')
      }
    }
    document.addEventListener('click', this.handleDocumentClick)
  }

  search() {
    if (!this.hasInputTarget) return
    const query = this.inputTarget.value.trim()

    clearTimeout(this.searchTimeout)
    this.searchTimeout = setTimeout(() => this.loadItems(query), 300)
  }

  disconnect() {
    if (this.handleDocumentClick) {
      document.removeEventListener('click', this.handleDocumentClick)
    }
  }

  // Optional action handler: focus->search#focus
  focus() {
    this.loadItems('')
  }

  loadItems(query = '') {
    if (!this.teamId || !this.hasResultsTarget) return

    // Optional location parameter if present on page
    const sourceSelect = document.querySelector('select[name="source_location_id"]')
    const adjustLocation = document.querySelector('select[name="location"]')
    const locationId = (sourceSelect && sourceSelect.value) || (adjustLocation && adjustLocation.value)

    const url = new URL(`/teams/${this.teamId}/items/search`, window.location.origin)
    url.searchParams.set('q', query)
    if (locationId) url.searchParams.set('location_id', locationId)

    fetch(url.toString(), {
      headers: {
        "Accept": "text/html",
        "X-Requested-With": "XMLHttpRequest"
      }
    })
      .then(r => { if (!r.ok) throw new Error('Search failed'); return r.text() })
      .then(html => {
        this.resultsTarget.innerHTML = html
        this.resultsTarget.classList.remove('hidden')

        // Bind click on each result to dispatch a Stimulus-friendly event
        this.resultsTarget.querySelectorAll('button[data-item-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const detail = {
              id: btn.dataset.itemId,
              name: btn.dataset.itemName,
              sku: btn.dataset.itemSku,
              currentStock: btn.dataset.itemCurrentStock
            }

            // Bubble so stock-transaction controller can catch it on its element
            const evt = new CustomEvent('item-selected', { detail, bubbles: true })
            this.element.dispatchEvent(evt)

            // Reset UI
            if (this.hasInputTarget) this.inputTarget.value = ''
            this.resultsTarget.classList.add('hidden')
          })
        })
      })
      .catch(err => {
        console.error('Search error:', err)
        this.resultsTarget.innerHTML = `
          <div class="py-14">
            <div class="text-center">
              <svg class="mx-auto h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="mt-2 text-sm text-gray-500">Error searching items. Please try again.</p>
            </div>
          </div>`
        this.resultsTarget.classList.remove('hidden')
      })
  }
}
