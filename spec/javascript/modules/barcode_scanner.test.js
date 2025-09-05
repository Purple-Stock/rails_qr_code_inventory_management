/**
 * @jest-environment jsdom
 */

import { BarcodeScanner, createBarcodeScanner, createTransactionScanner } from '../../../app/javascript/modules/barcode_scanner'

// Mock HTML5-QRCode library
const mockHtml5Qrcode = {
  start: jest.fn(),
  stop: jest.fn(),
  scanFile: jest.fn()
}

global.Html5Qrcode = jest.fn(() => mockHtml5Qrcode)

describe('BarcodeScanner', () => {
  let scanner
  let mockElement

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mock DOM element
    mockElement = document.createElement('div')
    mockElement.id = 'test-qr-reader'
    document.body.appendChild(mockElement)
    
    // Create scanner instance
    scanner = new BarcodeScanner({
      readerId: 'test-qr-reader',
      libraryUrl: 'mock://html5-qrcode.js'
    })
  })

  afterEach(() => {
    if (mockElement && mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement)
    }
    if (scanner) {
      scanner.destroy()
    }
  })

  describe('constructor', () => {
    it('initializes with default configuration', () => {
      const defaultScanner = new BarcodeScanner()
      
      expect(defaultScanner.config.readerId).toBe('qr-reader')
      expect(defaultScanner.config.fps).toBe(10)
      expect(defaultScanner.config.qrbox).toEqual({ width: 250, height: 250 })
      expect(defaultScanner.isScanning).toBe(false)
      expect(defaultScanner.isLibraryLoaded).toBe(false)
    })

    it('merges custom configuration', () => {
      const customConfig = {
        readerId: 'custom-reader',
        fps: 15,
        qrbox: { width: 300, height: 300 }
      }
      
      const customScanner = new BarcodeScanner(customConfig)
      
      expect(customScanner.config.readerId).toBe('custom-reader')
      expect(customScanner.config.fps).toBe(15)
      expect(customScanner.config.qrbox).toEqual({ width: 300, height: 300 })
      expect(customScanner.config.aspectRatio).toBe(1.0) // Default preserved
    })
  })

  describe('loadLibrary', () => {
    it('resolves immediately if library already loaded', async () => {
      global.Html5Qrcode = jest.fn()
      
      await expect(scanner.loadLibrary()).resolves.toBeUndefined()
    })

    it('loads library from CDN', async () => {
      delete global.Html5Qrcode
      
      // Mock script loading
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      }
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockScript)
      jest.spyOn(document.head, 'appendChild').mockImplementation(() => {
        // Simulate successful load
        setTimeout(() => mockScript.onload(), 0)
      })
      
      const loadPromise = scanner.loadLibrary()
      
      // Restore Html5Qrcode after script "loads"
      setTimeout(() => {
        global.Html5Qrcode = jest.fn()
      }, 0)
      
      await expect(loadPromise).resolves.toBeUndefined()
      expect(document.createElement).toHaveBeenCalledWith('script')
      expect(mockScript.src).toBe('mock://html5-qrcode.js')
    })

    it('rejects on script load error', async () => {
      delete global.Html5Qrcode
      
      const mockScript = {
        src: '',
        onload: null,
        onerror: null
      }
      
      jest.spyOn(document, 'createElement').mockReturnValue(mockScript)
      jest.spyOn(document.head, 'appendChild').mockImplementation(() => {
        setTimeout(() => mockScript.onerror(new Error('Load failed')), 0)
      })
      
      await expect(scanner.loadLibrary()).rejects.toThrow('Failed to load barcode scanning library')
    })
  })

  describe('startCameraScanning', () => {
    beforeEach(() => {
      scanner.isLibraryLoaded = true
      global.Html5Qrcode = jest.fn(() => mockHtml5Qrcode)
    })

    it('starts scanning successfully', async () => {
      mockHtml5Qrcode.start.mockResolvedValue()
      
      await scanner.startCameraScanning()
      
      expect(mockHtml5Qrcode.start).toHaveBeenCalledWith(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        expect.any(Function),
        expect.any(Function)
      )
      expect(scanner.isScanning).toBe(true)
    })

    it('handles start error', async () => {
      const error = new Error('Camera access denied')
      mockHtml5Qrcode.start.mockRejectedValue(error)
      
      await expect(scanner.startCameraScanning()).rejects.toThrow('Camera access denied')
      expect(scanner.isScanning).toBe(false)
      expect(scanner.scanner).toBeNull()
    })

    it('skips if already scanning', async () => {
      scanner.isScanning = true
      
      await scanner.startCameraScanning()
      
      expect(mockHtml5Qrcode.start).not.toHaveBeenCalled()
    })

    it('initializes library if not loaded', async () => {
      scanner.isLibraryLoaded = false
      jest.spyOn(scanner, 'initialize').mockResolvedValue()
      mockHtml5Qrcode.start.mockResolvedValue()
      
      await scanner.startCameraScanning()
      
      expect(scanner.initialize).toHaveBeenCalled()
    })
  })

  describe('stopCameraScanning', () => {
    beforeEach(() => {
      scanner.scanner = mockHtml5Qrcode
      scanner.isScanning = true
    })

    it('stops scanning successfully', async () => {
      mockHtml5Qrcode.stop.mockResolvedValue()
      
      await scanner.stopCameraScanning()
      
      expect(mockHtml5Qrcode.stop).toHaveBeenCalled()
      expect(scanner.isScanning).toBe(false)
      expect(scanner.scanner).toBeNull()
    })

    it('handles stop error but cleans up', async () => {
      const error = new Error('Stop failed')
      mockHtml5Qrcode.stop.mockRejectedValue(error)
      
      await expect(scanner.stopCameraScanning()).rejects.toThrow('Stop failed')
      expect(scanner.isScanning).toBe(false)
      expect(scanner.scanner).toBeNull()
    })

    it('skips if not scanning', async () => {
      scanner.isScanning = false
      scanner.scanner = null
      
      await scanner.stopCameraScanning()
      
      expect(mockHtml5Qrcode.stop).not.toHaveBeenCalled()
    })
  })

  describe('scanFile', () => {
    beforeEach(() => {
      scanner.isLibraryLoaded = true
      global.Html5Qrcode = jest.fn(() => mockHtml5Qrcode)
    })

    it('scans file successfully', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const mockResult = 'scanned-barcode-123'
      mockHtml5Qrcode.scanFile.mockResolvedValue(mockResult)
      
      jest.spyOn(scanner, 'handleScanSuccess').mockImplementation()
      
      const result = await scanner.scanFile(mockFile)
      
      expect(mockHtml5Qrcode.scanFile).toHaveBeenCalledWith(mockFile, true)
      expect(scanner.handleScanSuccess).toHaveBeenCalledWith(mockResult)
      expect(result).toBe(mockResult)
    })

    it('handles file scan error', async () => {
      const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
      const error = new Error('Invalid image')
      mockHtml5Qrcode.scanFile.mockRejectedValue(error)
      
      jest.spyOn(scanner, 'handleScanFailure').mockImplementation()
      
      await expect(scanner.scanFile(mockFile)).rejects.toThrow('Invalid image')
      expect(scanner.handleScanFailure).toHaveBeenCalledWith(error)
    })

    it('rejects if no file provided', async () => {
      await expect(scanner.scanFile(null)).rejects.toThrow('No file provided')
    })
  })

  describe('toggleScanning', () => {
    beforeEach(() => {
      jest.spyOn(scanner, 'startCameraScanning').mockResolvedValue()
      jest.spyOn(scanner, 'stopCameraScanning').mockResolvedValue()
    })

    it('starts scanning when not scanning', async () => {
      scanner.isScanning = false
      
      await scanner.toggleScanning()
      
      expect(scanner.startCameraScanning).toHaveBeenCalled()
      expect(scanner.stopCameraScanning).not.toHaveBeenCalled()
    })

    it('stops scanning when scanning', async () => {
      scanner.isScanning = true
      
      await scanner.toggleScanning()
      
      expect(scanner.stopCameraScanning).toHaveBeenCalled()
      expect(scanner.startCameraScanning).not.toHaveBeenCalled()
    })
  })

  describe('callback methods', () => {
    it('sets success callback', () => {
      const callback = jest.fn()
      
      const result = scanner.onSuccess(callback)
      
      expect(scanner.onScanSuccess).toBe(callback)
      expect(result).toBe(scanner) // Should return scanner for chaining
    })

    it('sets error callback', () => {
      const callback = jest.fn()
      
      const result = scanner.onError(callback)
      
      expect(scanner.onScanError).toBe(callback)
      expect(result).toBe(scanner)
    })

    it('sets library error callback', () => {
      const callback = jest.fn()
      
      const result = scanner.onLibraryError(callback)
      
      expect(scanner.onLibraryLoadError).toBe(callback)
      expect(result).toBe(scanner)
    })
  })

  describe('handleScanSuccess', () => {
    it('calls success callback with decoded text', () => {
      const callback = jest.fn()
      scanner.onScanSuccess = callback
      
      scanner.handleScanSuccess('test-barcode', { format: 'QR_CODE' })
      
      expect(callback).toHaveBeenCalledWith('test-barcode', { format: 'QR_CODE' })
    })

    it('works without callback', () => {
      expect(() => {
        scanner.handleScanSuccess('test-barcode')
      }).not.toThrow()
    })
  })

  describe('handleScanFailure', () => {
    it('calls error callback', () => {
      const callback = jest.fn()
      scanner.onScanError = callback
      
      scanner.handleScanFailure('Scan error')
      
      expect(callback).toHaveBeenCalledWith('Scan error')
    })

    it('does not log "No QR code found" messages', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      scanner.handleScanFailure('No QR code found')
      
      expect(consoleSpy).not.toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('logs actual errors', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      scanner.handleScanFailure('Camera access denied')
      
      expect(consoleSpy).toHaveBeenCalledWith('Barcode scan error:', 'Camera access denied')
      
      consoleSpy.mockRestore()
    })
  })

  describe('utility methods', () => {
    it('returns current scanning state', () => {
      scanner.isScanning = true
      expect(scanner.isCurrentlyScanning()).toBe(true)
      
      scanner.isScanning = false
      expect(scanner.isCurrentlyScanning()).toBe(false)
    })

    it('returns configuration copy', () => {
      const config = scanner.getConfig()
      
      expect(config).toEqual(scanner.config)
      expect(config).not.toBe(scanner.config) // Should be a copy
    })

    it('updates configuration', () => {
      const newConfig = { fps: 20, qrbox: { width: 400, height: 400 } }
      
      scanner.updateConfig(newConfig)
      
      expect(scanner.config.fps).toBe(20)
      expect(scanner.config.qrbox).toEqual({ width: 400, height: 400 })
      expect(scanner.config.readerId).toBe('test-qr-reader') // Original preserved
    })
  })

  describe('destroy', () => {
    it('stops scanning and clears callbacks', async () => {
      scanner.isScanning = true
      scanner.onScanSuccess = jest.fn()
      scanner.onScanError = jest.fn()
      scanner.onLibraryLoadError = jest.fn()
      
      jest.spyOn(scanner, 'stopCameraScanning').mockResolvedValue()
      
      await scanner.destroy()
      
      expect(scanner.stopCameraScanning).toHaveBeenCalled()
      expect(scanner.onScanSuccess).toBeNull()
      expect(scanner.onScanError).toBeNull()
      expect(scanner.onLibraryLoadError).toBeNull()
    })

    it('handles stop error during destroy', async () => {
      scanner.isScanning = true
      jest.spyOn(scanner, 'stopCameraScanning').mockRejectedValue(new Error('Stop failed'))
      
      await expect(scanner.destroy()).rejects.toThrow('Stop failed')
    })
  })
})

describe('Factory functions', () => {
  describe('createBarcodeScanner', () => {
    it('creates scanner with default config', () => {
      const scanner = createBarcodeScanner()
      
      expect(scanner).toBeInstanceOf(BarcodeScanner)
      expect(scanner.config.readerId).toBe('qr-reader')
    })

    it('creates scanner with custom config', () => {
      const config = { readerId: 'custom-reader', fps: 15 }
      const scanner = createBarcodeScanner(config)
      
      expect(scanner.config.readerId).toBe('custom-reader')
      expect(scanner.config.fps).toBe(15)
    })
  })

  describe('createTransactionScanner', () => {
    it('creates scanner with transaction-specific config', () => {
      const scanner = createTransactionScanner('stock_in', 'stock-in-reader')
      
      expect(scanner).toBeInstanceOf(BarcodeScanner)
      expect(scanner.config.readerId).toBe('stock-in-reader')
      expect(scanner.config.fps).toBe(10)
      expect(scanner.config.qrbox).toEqual({ width: 250, height: 250 })
    })

    it('uses default reader ID if not provided', () => {
      const scanner = createTransactionScanner('stock_out')
      
      expect(scanner.config.readerId).toBe('stock_out-qr-reader')
    })
  })
})