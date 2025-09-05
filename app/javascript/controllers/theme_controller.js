import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["toggle", "themeIcon", "themeText"]
  static values = { 
    theme: { type: String, default: 'system' },
    enableTransitions: { type: Boolean, default: true },
    storageKey: { type: String, default: 'purple-stock-theme' }
  }

  connect() {
    this.initializeTheme()
    this.setupSystemThemeListener()
    this.setupThemeTransitions()
  }

  disconnect() {
    this.removeSystemThemeListener()
  }

  // Initialize theme based on stored preference or system setting
  initializeTheme() {
    // Get stored theme preference
    const storedTheme = localStorage.getItem(this.storageKeyValue)
    
    if (storedTheme) {
      this.themeValue = storedTheme
    } else {
      // Default to system preference
      this.themeValue = 'system'
    }
    
    this.applyTheme()
    this.updateToggleState()
  }

  // Setup system theme change listener
  setupSystemThemeListener() {
    this.systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    this.boundHandleSystemThemeChange = this.handleSystemThemeChange.bind(this)
    this.systemThemeQuery.addEventListener('change', this.boundHandleSystemThemeChange)
  }

  // Remove system theme listener
  removeSystemThemeListener() {
    if (this.systemThemeQuery && this.boundHandleSystemThemeChange) {
      this.systemThemeQuery.removeEventListener('change', this.boundHandleSystemThemeChange)
    }
  }

  // Handle system theme changes
  handleSystemThemeChange(event) {
    if (this.themeValue === 'system') {
      this.applyTheme()
      this.announceThemeChange()
    }
  }

  // Setup theme transitions
  setupThemeTransitions() {
    if (!this.enableTransitionsValue) return
    
    // Add transition classes to elements that should animate theme changes
    const transitionElements = document.querySelectorAll(
      'body, .theme-transition, [data-theme-transition]'
    )
    
    transitionElements.forEach(element => {
      element.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease'
    })
  }

  // Toggle between light, dark, and system themes
  toggle() {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(this.themeValue)
    const nextIndex = (currentIndex + 1) % themes.length
    
    this.themeValue = themes[nextIndex]
    this.saveThemePreference()
    this.applyTheme()
    this.updateToggleState()
    this.announceThemeChange()
    
    // Provide haptic feedback
    this.triggerHapticFeedback()
  }

  // Set specific theme (can be called from data attributes)
  setTheme(event) {
    const theme = event.params?.theme || event.currentTarget.dataset.themeParam
    
    if (['light', 'dark', 'system'].includes(theme)) {
      this.themeValue = theme
      this.saveThemePreference()
      this.applyTheme()
      this.updateToggleState()
      this.announceThemeChange()
    }
  }

  // Set theme programmatically
  setThemeValue(theme) {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.themeValue = theme
      this.saveThemePreference()
      this.applyTheme()
      this.updateToggleState()
      this.announceThemeChange()
    }
  }

  // Apply the current theme
  applyTheme() {
    const isDark = this.shouldUseDarkTheme()
    
    // Update document classes
    document.documentElement.classList.toggle('dark', isDark)
    document.body.classList.toggle('dark-theme', isDark)
    document.body.classList.toggle('light-theme', !isDark)
    
    // Update meta theme-color
    this.updateThemeColor(isDark)
    
    // Update CSS custom properties
    this.updateCSSCustomProperties(isDark)
    
    // Dispatch theme change event
    this.dispatchThemeChangeEvent(isDark)
  }

  // Determine if dark theme should be used
  shouldUseDarkTheme() {
    switch (this.themeValue) {
      case 'dark':
        return true
      case 'light':
        return false
      case 'system':
      default:
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  }

  // Update theme color meta tag
  updateThemeColor(isDark) {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]')
    if (themeColorMeta) {
      themeColorMeta.content = isDark ? '#1f2937' : '#7c3aed'
    }
  }

  // Update CSS custom properties for theme
  updateCSSCustomProperties(isDark) {
    const root = document.documentElement
    
    if (isDark) {
      // Dark theme colors
      root.style.setProperty('--color-primary', '#a78bfa')
      root.style.setProperty('--color-primary-dark', '#8b5cf6')
      root.style.setProperty('--color-background', '#111827')
      root.style.setProperty('--color-surface', '#1f2937')
      root.style.setProperty('--color-text', '#f9fafb')
      root.style.setProperty('--color-text-secondary', '#d1d5db')
      root.style.setProperty('--color-border', '#374151')
      root.style.setProperty('--color-shadow', 'rgba(0, 0, 0, 0.5)')
    } else {
      // Light theme colors
      root.style.setProperty('--color-primary', '#7c3aed')
      root.style.setProperty('--color-primary-dark', '#6b21a8')
      root.style.setProperty('--color-background', '#ffffff')
      root.style.setProperty('--color-surface', '#f9fafb')
      root.style.setProperty('--color-text', '#111827')
      root.style.setProperty('--color-text-secondary', '#6b7280')
      root.style.setProperty('--color-border', '#e5e7eb')
      root.style.setProperty('--color-shadow', 'rgba(0, 0, 0, 0.1)')
    }
  }

  // Update toggle button state
  updateToggleState() {
    if (!this.hasToggleTarget) return
    
    const isDark = this.shouldUseDarkTheme()
    
    // Update toggle button appearance
    this.toggleTarget.classList.toggle('theme-dark', isDark)
    this.toggleTarget.classList.toggle('theme-light', !isDark)
    
    // Update icon if present
    if (this.hasThemeIconTarget) {
      this.updateThemeIcon(isDark)
    }
    
    // Update text if present
    if (this.hasThemeTextTarget) {
      this.updateThemeText()
    }
    
    // Update ARIA attributes
    this.toggleTarget.setAttribute('aria-pressed', isDark.toString())
    this.toggleTarget.setAttribute('aria-label', this.getThemeToggleLabel())
  }

  // Update theme icon
  updateThemeIcon(isDark) {
    const iconHTML = isDark ? this.getMoonIcon() : this.getSunIcon()
    this.themeIconTarget.innerHTML = iconHTML
  }

  // Update theme text
  updateThemeText() {
    const themeNames = {
      light: 'Light',
      dark: 'Dark',
      system: 'System'
    }
    
    this.themeTextTarget.textContent = themeNames[this.themeValue] || 'System'
  }

  // Get sun icon SVG
  getSunIcon() {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>
    `
  }

  // Get moon icon SVG
  getMoonIcon() {
    return `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
      </svg>
    `
  }

  // Get theme toggle label for accessibility
  getThemeToggleLabel() {
    const isDark = this.shouldUseDarkTheme()
    return isDark ? 'Switch to light theme' : 'Switch to dark theme'
  }

  // Save theme preference to localStorage
  saveThemePreference() {
    localStorage.setItem(this.storageKeyValue, this.themeValue)
  }

  // Dispatch theme change event
  dispatchThemeChangeEvent(isDark) {
    const event = new CustomEvent('theme:changed', {
      detail: {
        theme: this.themeValue,
        isDark: isDark,
        timestamp: Date.now()
      }
    })
    
    document.dispatchEvent(event)
  }

  // Announce theme change to screen readers
  announceThemeChange() {
    const isDark = this.shouldUseDarkTheme()
    const message = isDark ? 'Dark theme enabled' : 'Light theme enabled'
    
    // Find accessibility controller to make announcement
    const accessibilityController = this.application.getControllerForElementAndIdentifier(
      document.body, 
      'accessibility'
    )
    
    if (accessibilityController) {
      accessibilityController.announceToScreenReader(message)
    }
  }

  // Trigger haptic feedback
  triggerHapticFeedback() {
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  // Public methods for external use

  // Get current theme
  getCurrentTheme() {
    return this.themeValue
  }

  // Check if dark theme is active
  isDarkTheme() {
    return this.shouldUseDarkTheme()
  }

  // Force refresh theme (useful after system theme changes)
  refreshTheme() {
    this.applyTheme()
    this.updateToggleState()
  }

  // Reset theme to system default
  resetToSystem() {
    this.setTheme('system')
  }
}