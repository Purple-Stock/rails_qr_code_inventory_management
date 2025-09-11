import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["startButton", "closeButton", "scannerContainer", "qrReader"]
  static values = {
    type: String
  }

  connect() {
    console.log("Scanner controller connected", {
      type: this.typeValue,
      element: this.element
    })
    
    this.scanner = null
    this.isInitialized = false
    this.setupEventListeners()
  }

  disconnect() {
    console.log("Scanner controller disconnected")
    this.cleanup()
  }

  setupEventListeners() {
    if (this.hasStartButtonTarget) {
      this.startButtonTarget.addEventListener('click', this.startScanner.bind(this))
    }
    
    if (this.hasCloseButtonTarget) {
      this.closeButtonTarget.addEventListener('click', this.stopScanner.bind(this))
    }
  }

  startScanner() {
    console.log("Starting scanner for type:", this.typeValue)
    
    if (this.scanner) {
      this.stopScanner()
      return
    }

    if (this.hasStartButtonTarget) {
      this.startButtonTarget.textContent = 'Starting...'
      this.startButtonTarget.disabled = true
    }

    // Load the html5-qrcode script if not already loaded
    if (!window.Html5Qrcode) {
      this.loadScannerLibrary()
    } else {
      this.initializeScanner()
    }
  }

  loadScannerLibrary() {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
    script.onload = () => {
      console.log("Scanner library loaded")
      this.initializeScanner()
    }
    script.onerror = () => {
      console.error('Failed to load HTML5-QRCode library')
      if (this.hasStartButtonTarget) {
        this.startButtonTarget.textContent = 'Camera Not Available'
        this.startButtonTarget.disabled = true
      }
    }
    document.head.appendChild(script)
  }

  initializeScanner() {
    try {
      const qrReaderId = this.getQrReaderId()
      const html5QrCode = new Html5Qrcode(qrReaderId)
      
      const config = {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 4/3
      }

      html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        this.onScanSuccess.bind(this),
        this.onScanFailure.bind(this)
      ).then(() => {
        this.scanner = html5QrCode
        this.updateButtonState(true)
        console.log("Scanner started successfully")
      }).catch((err) => {
        console.error(`Unable to start scanning: ${err}`)
        this.resetButtonState()
        alert('Could not access camera. Please ensure you\'ve granted camera permissions or try entering the barcode manually.')
      })
    } catch (err) {
      console.error("Scanner initialization error:", err)
      this.resetButtonState()
    }
  }

  stopScanner() {
    if (this.scanner) {
      console.log("Stopping scanner")
      
      if (this.scanner._isScanning) {
        this.scanner.stop().then(() => {
          this.scanner = null
          this.updateButtonState(false)
          console.log("Scanner stopped successfully")
        }).catch((err) => {
          console.error("Error stopping scanner:", err)
          this.scanner = null
          this.updateButtonState(false)
        })
      } else {
        this.scanner = null
        this.updateButtonState(false)
      }
    }
  }

  onScanSuccess(decodedText, decodedResult) {
    console.log("QR Code scanned:", decodedText)
    
    // Dispatch custom event for other controllers to handle
    const event = new CustomEvent('qr-code-scanned', {
      detail: { 
        text: decodedText,
        result: decodedResult,
        type: this.typeValue
      }
    })
    
    document.dispatchEvent(event)
    
    // Stop scanner after successful scan
    this.stopScanner()
  }

  onScanFailure(error) {
    // Don't log every failure as it's very verbose
    // console.log("QR Code scan failed:", error)
  }

  updateButtonState(isScanning) {
    if (this.hasStartButtonTarget) {
      if (isScanning) {
        this.startButtonTarget.textContent = 'Stop Camera'
        this.startButtonTarget.disabled = false
      } else {
        this.startButtonTarget.textContent = 'Start Camera'
        this.startButtonTarget.disabled = false
      }
    }
    
    if (this.hasCloseButtonTarget) {
      if (isScanning) {
        this.closeButtonTarget.classList.remove('hidden')
      } else {
        this.closeButtonTarget.classList.add('hidden')
      }
    }
  }

  resetButtonState() {
    if (this.hasStartButtonTarget) {
      this.startButtonTarget.textContent = 'Start Camera'
      this.startButtonTarget.disabled = false
    }
    
    if (this.hasCloseButtonTarget) {
      this.closeButtonTarget.classList.add('hidden')
    }
  }

  getQrReaderId() {
    // Return the appropriate QR reader ID based on the scanner type
    const qrReaderIds = {
      'stock_in': 'qr-reader',
      'stock_out': 'stockout-qr-reader',
      'adjust': 'adjust-qr-reader',
      'move': 'qr-reader'
    }
    
    return qrReaderIds[this.typeValue] || 'qr-reader'
  }

  cleanup() {
    this.stopScanner()
  }
}
