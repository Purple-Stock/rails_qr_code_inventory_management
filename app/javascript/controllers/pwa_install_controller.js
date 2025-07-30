import { Controller } from "@hotwired/stimulus"

// PWA Install Controller - Handles custom install prompt and user engagement tracking
export default class extends Controller {
  static targets = ["prompt", "installButton", "dismissButton", "onboardingModal", "benefitsList"]
  static values = { 
    engagementThreshold: { type: Number, default: 3 },
    dismissalCooldown: { type: Number, default: 86400000 }, // 24 hours in ms
    showDelay: { type: Number, default: 2000 } // 2 seconds
  }

  connect() {
    this.deferredPrompt = null
    this.userEngagement = this.getUserEngagement()
    this.installPromptDismissed = this.getInstallPromptDismissed()
    
    this.setupEventListeners()
    this.checkInstallEligibility()
    
    console.log('PWA Install Controller: Connected')
  }

  disconnect() {
    this.removeEventListeners()
  }

  // Setup event listeners for PWA install events
  setupEventListeners() {
    this.beforeInstallPromptHandler = this.handleBeforeInstallPrompt.bind(this)
    this.appInstalledHandler = this.handleAppInstalled.bind(this)
    this.userEngagementHandler = this.trackUserEngagement.bind(this)

    window.addEventListener('beforeinstallprompt', this.beforeInstallPromptHandler)
    window.addEventListener('appinstalled', this.appInstalledHandler)
    
    // Track user engagement events
    document.addEventListener('click', this.userEngagementHandler)
    document.addEventListener('scroll', this.userEngagementHandler)
    document.addEventListener('keydown', this.userEngagementHandler)
  }

  // Remove event listeners
  removeEventListeners() {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallPromptHandler)
    window.removeEventListener('appinstalled', this.appInstalledHandler)
    document.removeEventListener('click', this.userEngagementHandler)
    document.removeEventListener('scroll', this.userEngagementHandler)
    document.removeEventListener('keydown', this.userEngagementHandler)
  }

  // Handle the beforeinstallprompt event
  handleBeforeInstallPrompt(event) {
    console.log('PWA Install: beforeinstallprompt event fired')
    
    // Prevent the default browser install prompt
    event.preventDefault()
    
    // Store the event for later use
    this.deferredPrompt = event
    
    // Check if we should show the custom prompt
    this.evaluateInstallPromptTiming()
  }

  // Handle successful app installation
  handleAppInstalled(event) {
    console.log('PWA Install: App was installed successfully')
    
    // Hide any visible install prompts
    this.hideInstallPrompt()
    
    // Show onboarding flow
    setTimeout(() => {
      this.showOnboardingFlow()
    }, 1000)
    
    // Clear the deferred prompt
    this.deferredPrompt = null
    
    // Track installation success
    this.trackInstallationSuccess()
  }

  // Track user engagement for install prompt timing
  trackUserEngagement(event) {
    // Throttle engagement tracking
    if (this.engagementThrottled) return
    
    this.engagementThrottled = true
    setTimeout(() => {
      this.engagementThrottled = false
    }, 1000)

    this.userEngagement.interactions++
    this.userEngagement.lastActivity = Date.now()
    
    // Track specific engagement types
    switch (event.type) {
      case 'click':
        this.userEngagement.clicks++
        break
      case 'scroll':
        this.userEngagement.scrolls++
        break
      case 'keydown':
        this.userEngagement.keystrokes++
        break
    }
    
    this.saveUserEngagement()
    
    // Re-evaluate install prompt timing if not already shown
    if (this.deferredPrompt && !this.isInstallPromptVisible()) {
      this.evaluateInstallPromptTiming()
    }
  }

  // Evaluate whether to show the install prompt based on engagement
  evaluateInstallPromptTiming() {
    // Don't show if already installed
    if (this.isAppInstalled()) {
      console.log('PWA Install: App already installed, skipping prompt')
      return
    }

    // Don't show if recently dismissed
    if (this.isRecentlyDismissed()) {
      console.log('PWA Install: Install prompt recently dismissed, skipping')
      return
    }

    // Check engagement threshold
    if (this.userEngagement.interactions < this.engagementThresholdValue) {
      console.log(`PWA Install: User engagement (${this.userEngagement.interactions}) below threshold (${this.engagementThresholdValue})`)
      return
    }

    // Check if user has been active recently
    const timeSinceLastActivity = Date.now() - this.userEngagement.lastActivity
    if (timeSinceLastActivity > 300000) { // 5 minutes
      console.log('PWA Install: User not recently active, skipping prompt')
      return
    }

    // Show the install prompt with delay
    setTimeout(() => {
      this.showInstallPrompt()
    }, this.showDelayValue)
  }

  // Show the custom install prompt
  showInstallPrompt() {
    if (!this.hasPromptTarget || this.isInstallPromptVisible()) return

    console.log('PWA Install: Showing custom install prompt')
    
    // Add entrance animation
    this.promptTarget.classList.remove('hidden')
    this.promptTarget.classList.add('animate-slide-up')
    
    // Focus management for accessibility
    setTimeout(() => {
      const firstButton = this.promptTarget.querySelector('button')
      if (firstButton) {
        firstButton.focus()
      }
    }, 300)

    // Track prompt display
    this.trackPromptDisplay()
  }

  // Hide the install prompt
  hideInstallPrompt() {
    if (!this.hasPromptTarget) return

    this.promptTarget.classList.add('animate-slide-down')
    
    setTimeout(() => {
      this.promptTarget.classList.add('hidden')
      this.promptTarget.classList.remove('animate-slide-up', 'animate-slide-down')
    }, 300)
  }

  // Handle install button click
  async installApp(event) {
    event.preventDefault()
    
    if (!this.deferredPrompt) {
      console.warn('PWA Install: No deferred prompt available')
      return
    }

    console.log('PWA Install: User clicked install')
    
    // Show the browser's install prompt
    this.deferredPrompt.prompt()
    
    // Wait for the user's response
    const { outcome } = await this.deferredPrompt.userChoice
    
    console.log(`PWA Install: User choice: ${outcome}`)
    
    if (outcome === 'accepted') {
      this.trackInstallationAttempt('accepted')
    } else {
      this.trackInstallationAttempt('dismissed')
      this.hideInstallPrompt()
    }
    
    // Clear the deferred prompt
    this.deferredPrompt = null
  }

  // Handle dismiss button click
  dismissPrompt(event) {
    event.preventDefault()
    
    console.log('PWA Install: User dismissed install prompt')
    
    // Record dismissal
    this.recordPromptDismissal()
    
    // Hide the prompt
    this.hideInstallPrompt()
    
    // Track dismissal
    this.trackPromptDismissal()
  }

  // Show onboarding flow after successful installation
  showOnboardingFlow() {
    if (!this.hasOnboardingModalTarget) return

    console.log('PWA Install: Showing onboarding flow')
    
    this.onboardingModalTarget.classList.remove('hidden')
    this.onboardingModalTarget.classList.add('animate-fade-in')
    
    // Focus management
    setTimeout(() => {
      const firstButton = this.onboardingModalTarget.querySelector('button')
      if (firstButton) {
        firstButton.focus()
      }
    }, 300)
  }

  // Close onboarding flow
  closeOnboarding(event) {
    event.preventDefault()
    
    if (!this.hasOnboardingModalTarget) return
    
    this.onboardingModalTarget.classList.add('animate-fade-out')
    
    setTimeout(() => {
      this.onboardingModalTarget.classList.add('hidden')
      this.onboardingModalTarget.classList.remove('animate-fade-in', 'animate-fade-out')
    }, 300)
  }

  // Check if app is already installed
  isAppInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true
  }

  // Check if install prompt is currently visible
  isInstallPromptVisible() {
    return this.hasPromptTarget && !this.promptTarget.classList.contains('hidden')
  }

  // Check if prompt was recently dismissed
  isRecentlyDismissed() {
    if (!this.installPromptDismissed.timestamp) return false
    
    const timeSinceDismissal = Date.now() - this.installPromptDismissed.timestamp
    return timeSinceDismissal < this.dismissalCooldownValue
  }

  // Record prompt dismissal
  recordPromptDismissal() {
    this.installPromptDismissed = {
      timestamp: Date.now(),
      count: (this.installPromptDismissed.count || 0) + 1
    }
    
    localStorage.setItem('pwa-install-dismissed', JSON.stringify(this.installPromptDismissed))
  }

  // Get user engagement data from localStorage
  getUserEngagement() {
    const stored = localStorage.getItem('pwa-user-engagement')
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.warn('PWA Install: Failed to parse user engagement data', error)
      }
    }
    
    return {
      interactions: 0,
      clicks: 0,
      scrolls: 0,
      keystrokes: 0,
      sessions: 0,
      lastActivity: Date.now(),
      firstVisit: Date.now()
    }
  }

  // Save user engagement data to localStorage
  saveUserEngagement() {
    localStorage.setItem('pwa-user-engagement', JSON.stringify(this.userEngagement))
  }

  // Get install prompt dismissal data
  getInstallPromptDismissed() {
    const stored = localStorage.getItem('pwa-install-dismissed')
    
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.warn('PWA Install: Failed to parse dismissal data', error)
      }
    }
    
    return { timestamp: null, count: 0 }
  }

  // Check install eligibility
  checkInstallEligibility() {
    // Check if PWA criteria are met
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost'
    const hasServiceWorker = 'serviceWorker' in navigator
    const hasManifest = document.querySelector('link[rel="manifest"]')
    
    if (!isSecure || !hasServiceWorker || !hasManifest) {
      console.warn('PWA Install: App does not meet PWA installation criteria')
      return false
    }
    
    return true
  }

  // Analytics tracking methods
  trackPromptDisplay() {
    this.sendAnalyticsEvent('pwa_install_prompt_displayed', {
      engagement_level: this.userEngagement.interactions,
      time_since_first_visit: Date.now() - this.userEngagement.firstVisit
    })
  }

  trackPromptDismissal() {
    this.sendAnalyticsEvent('pwa_install_prompt_dismissed', {
      dismissal_count: this.installPromptDismissed.count
    })
  }

  trackInstallationAttempt(outcome) {
    this.sendAnalyticsEvent('pwa_installation_attempt', {
      outcome: outcome,
      engagement_level: this.userEngagement.interactions
    })
  }

  trackInstallationSuccess() {
    this.sendAnalyticsEvent('pwa_installation_success', {
      time_to_install: Date.now() - this.userEngagement.firstVisit
    })
  }

  // Send analytics event (integrate with your analytics system)
  sendAnalyticsEvent(eventName, properties = {}) {
    // This would integrate with your analytics system (Google Analytics, etc.)
    console.log(`PWA Install Analytics: ${eventName}`, properties)
    
    // Example: Send to Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties)
    }
  }
}