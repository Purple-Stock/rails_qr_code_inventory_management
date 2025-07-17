/**
 * Unified Barcode Scanner Module
 * 
 * This module provides a reusable barcode scanner class that consolidates
 * HTML5-QRCode library integration and error handling across all transaction types.
 * 
 * Features:
 * - Camera-based barcode scanning
 * - File upload barcode scanning
 * - Configurable callbacks for success and error handling
 * - Lazy library loading from CDN
 * - Proper cleanup and error handling
 * - Singleton library instance to reduce memory usage
 */

// Singleton library loader to avoid multiple script loads
let libraryLoadPromise = null

export class BarcodeScanner {
  constructor(config = {}) {
    this.config = {
      // Default configuration
      readerId: 'qr-reader',
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      facingMode: 'environment',
      libraryUrl: 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
      // Merge with provided config
      ...config
    }
    
    this.scanner = null
    this.isScanning = false
    
    // Callbacks
    this.onScanSuccess = null
    this.onScanError = null
    this.onLibraryLoadError = null
  }

  /**
   * Initialize the scanner and load the HTML5-QRCode library if needed
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  async initialize() {
    try {
      await this.loadLibrary()
      this.isLibraryLoaded = true
      return Promise.resolve()
    } catch (error) {
      console.error('Failed to initialize barcode scanner:', error)
      if (this.onLibraryLoadError) {
        this.onLibraryLoadError(error)
      }
      return Promise.reject(error)
    }
  }

  /**
   * Load the HTML5-QRCode library from CDN using singleton pattern
   * @returns {Promise} Promise that resolves when library is loaded
   */
  loadLibrary() {
    // Use singleton promise to avoid multiple script loads
    if (libraryLoadPromise) {
      return libraryLoadPromise
    }

    // Check if library is already loaded
    if (window.Html5Qrcode) {
      libraryLoadPromise = Promise.resolve()
      return libraryLoadPromise
    }

    libraryLoadPromise = new Promise((resolve, reject) => {
      // Check again in case it was loaded while we were waiting
      if (window.Html5Qrcode) {
        resolve()
        return
      }

      // Create and load script
      const script = document.createElement('script')
      script.src = this.config.libraryUrl
      script.onload = () => {
        console.log('HTML5-QRCode library loaded successfully')
        resolve()
      }
      script.onerror = (error) => {
        console.error('Failed to load HTML5-QRCode library:', error)
        libraryLoadPromise = null // Reset on error to allow retry
        reject(new Error('Failed to load barcode scanning library'))
      }
      
      document.head.appendChild(script)
    })

    return libraryLoadPromise
  }

  /**
   * Start camera-based scanning
   * @returns {Promise} Promise that resolves when scanning starts
   */
  async startCameraScanning() {
    if (!this.isLibraryLoaded) {
      await this.initialize()
    }

    if (this.isScanning) {
      console.warn('Scanner is already running')
      return Promise.resolve()
    }

    try {
      this.scanner = new Html5Qrcode(this.config.readerId)
      
      const scanConfig = {
        fps: this.config.fps,
        qrbox: this.config.qrbox,
        aspectRatio: this.config.aspectRatio
      }

      await this.scanner.start(
        { facingMode: this.config.facingMode },
        scanConfig,
        this.handleScanSuccess.bind(this),
        this.handleScanFailure.bind(this)
      )

      this.isScanning = true
      console.log('Camera scanning started successfully')
      return Promise.resolve()
    } catch (error) {
      console.error('Failed to start camera scanning:', error)
      this.scanner = null
      return Promise.reject(error)
    }
  }

  /**
   * Stop camera-based scanning
   * @returns {Promise} Promise that resolves when scanning stops
   */
  async stopCameraScanning() {
    if (!this.scanner || !this.isScanning) {
      console.warn('Scanner is not running')
      return Promise.resolve()
    }

    try {
      await this.scanner.stop()
      this.scanner = null
      this.isScanning = false
      console.log('Camera scanning stopped successfully')
      return Promise.resolve()
    } catch (error) {
      console.error('Failed to stop camera scanning:', error)
      // Force cleanup even if stop fails
      this.scanner = null
      this.isScanning = false
      return Promise.reject(error)
    }
  }

  /**
   * Scan barcode from uploaded file
   * @param {File} file - The image file to scan
   * @returns {Promise} Promise that resolves with scan result
   */
  async scanFile(file) {
    if (!this.isLibraryLoaded) {
      await this.initialize()
    }

    if (!file) {
      return Promise.reject(new Error('No file provided'))
    }

    try {
      // Create a temporary scanner instance for file scanning
      const fileScanner = new Html5Qrcode(this.config.readerId)
      const result = await fileScanner.scanFile(file, true)
      
      console.log('File scan successful:', result)
      this.handleScanSuccess(result)
      return Promise.resolve(result)
    } catch (error) {
      console.error('File scan failed:', error)
      this.handleScanFailure(error)
      return Promise.reject(error)
    }
  }

  /**
   * Toggle camera scanning on/off
   * @returns {Promise} Promise that resolves when toggle is complete
   */
  async toggleScanning() {
    if (this.isScanning) {
      return this.stopCameraScanning()
    } else {
      return this.startCameraScanning()
    }
  }

  /**
   * Handle successful barcode scan
   * @param {string} decodedText - The decoded barcode text
   * @param {object} decodedResult - The full decode result object
   */
  handleScanSuccess(decodedText, decodedResult = null) {
    console.log('Barcode scan successful:', decodedText)
    
    if (this.onScanSuccess) {
      this.onScanSuccess(decodedText, decodedResult)
    }
  }

  /**
   * Handle scan failure/error
   * @param {string|Error} error - The error message or object
   */
  handleScanFailure(error) {
    // Only log actual errors, not the continuous "No QR code found" messages
    if (error && !error.toString().includes('No QR code found')) {
      console.warn('Barcode scan error:', error)
    }
    
    if (this.onScanError) {
      this.onScanError(error)
    }
  }

  /**
   * Set callback for successful scans
   * @param {Function} callback - Function to call on successful scan
   */
  onSuccess(callback) {
    this.onScanSuccess = callback
    return this
  }

  /**
   * Set callback for scan errors
   * @param {Function} callback - Function to call on scan error
   */
  onError(callback) {
    this.onScanError = callback
    return this
  }

  /**
   * Set callback for library load errors
   * @param {Function} callback - Function to call on library load error
   */
  onLibraryError(callback) {
    this.onLibraryLoadError = callback
    return this
  }

  /**
   * Get current scanning state
   * @returns {boolean} True if currently scanning
   */
  isCurrentlyScanning() {
    return this.isScanning
  }

  /**
   * Get scanner configuration
   * @returns {object} Current configuration object
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * Update scanner configuration
   * @param {object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Clean up resources and stop scanning
   * @returns {Promise} Promise that resolves when cleanup is complete
   */
  async destroy() {
    try {
      if (this.isScanning) {
        await this.stopCameraScanning()
      }
      
      // Clear callbacks
      this.onScanSuccess = null
      this.onScanError = null
      this.onLibraryLoadError = null
      
      console.log('Barcode scanner destroyed successfully')
      return Promise.resolve()
    } catch (error) {
      console.error('Error during scanner cleanup:', error)
      return Promise.reject(error)
    }
  }
}

/**
 * Factory function to create a configured barcode scanner
 * @param {object} config - Scanner configuration
 * @returns {BarcodeScanner} Configured scanner instance
 */
export function createBarcodeScanner(config = {}) {
  return new BarcodeScanner(config)
}

/**
 * Utility function to create a scanner with transaction-specific configuration
 * @param {string} transactionType - Type of transaction (stock_in, stock_out, etc.)
 * @param {string} readerId - ID of the reader element
 * @returns {BarcodeScanner} Configured scanner instance
 */
export function createTransactionScanner(transactionType, readerId) {
  const config = {
    readerId: readerId || `${transactionType}-qr-reader`,
    fps: 10,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    facingMode: 'environment'
  }
  
  return new BarcodeScanner(config)
}

export default BarcodeScanner