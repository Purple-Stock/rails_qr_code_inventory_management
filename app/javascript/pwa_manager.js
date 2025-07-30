// PWA Manager - Handles service worker registration and updates
class PWAManager {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.setupEventListeners();
  }

  // Initialize PWA functionality
  async init() {
    if ('serviceWorker' in navigator) {
      try {
        await this.registerServiceWorker();
        this.setupUpdateHandling();
        console.log('PWA Manager: Initialized successfully');
      } catch (error) {
        console.error('PWA Manager: Failed to initialize', error);
      }
    } else {
      console.warn('PWA Manager: Service workers not supported');
    }
  }

  // Register service worker
  async registerServiceWorker() {
    try {
      this.registration = await navigator.serviceWorker.register('/service-worker', {
        scope: '/'
      });

      console.log('PWA Manager: Service worker registered', this.registration.scope);

      // Handle different registration states
      if (this.registration.installing) {
        console.log('PWA Manager: Service worker installing');
        this.trackInstalling(this.registration.installing);
      } else if (this.registration.waiting) {
        console.log('PWA Manager: Service worker waiting');
        this.showUpdateAvailable();
      } else if (this.registration.active) {
        console.log('PWA Manager: Service worker active');
      }

      return this.registration;
    } catch (error) {
      console.error('PWA Manager: Service worker registration failed', error);
      throw error;
    }
  }

  // Setup service worker update handling
  setupUpdateHandling() {
    if (!this.registration) return;

    this.registration.addEventListener('updatefound', () => {
      console.log('PWA Manager: Update found');
      this.trackInstalling(this.registration.installing);
    });
  }

  // Track installing service worker
  trackInstalling(worker) {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          console.log('PWA Manager: New content available');
          this.showUpdateAvailable();
        } else {
          console.log('PWA Manager: Content cached for offline use');
          this.showCachedMessage();
        }
      }
    });
  }

  // Show update available notification
  showUpdateAvailable() {
    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('pwa-update-available', {
      detail: { registration: this.registration }
    }));
  }

  // Show cached content message
  showCachedMessage() {
    window.dispatchEvent(new CustomEvent('pwa-content-cached'));
  }

  // Apply waiting service worker update
  async applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      return false;
    }

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Wait for the new service worker to take control
    return new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve(true);
        window.location.reload();
      });
    });
  }

  // Setup online/offline event listeners
  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('PWA Manager: Back online');
      window.dispatchEvent(new CustomEvent('pwa-online'));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('PWA Manager: Gone offline');
      window.dispatchEvent(new CustomEvent('pwa-offline'));
    });

    // Handle service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  // Handle messages from service worker
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'CACHE_UPDATED':
        console.log('PWA Manager: Cache updated', data.url);
        break;
      case 'OFFLINE_FALLBACK':
        console.log('PWA Manager: Serving offline fallback', data.url);
        break;
      default:
        console.log('PWA Manager: Unknown message', data);
    }
  }

  // Get cache information
  async getCacheInfo() {
    if (!('caches' in window)) return null;

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = {};

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheInfo[cacheName] = {
          size: keys.length,
          urls: keys.map(request => request.url)
        };
      }

      return cacheInfo;
    } catch (error) {
      console.error('PWA Manager: Failed to get cache info', error);
      return null;
    }
  }

  // Clear all caches (for debugging)
  async clearCaches() {
    if (!('caches' in window)) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('PWA Manager: All caches cleared');
      return true;
    } catch (error) {
      console.error('PWA Manager: Failed to clear caches', error);
      return false;
    }
  }

  // Check if app is running as PWA
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // Get network status
  getNetworkStatus() {
    return {
      online: this.isOnline,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
    };
  }
}

// Create global instance
window.pwaManager = new PWAManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager.init();
  });
} else {
  window.pwaManager.init();
}

export default PWAManager;