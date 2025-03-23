import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["barcode"]

  generate() {
    this.barcodeTarget.value = this.generateEAN13()
  }

  // Generates a valid EAN-13 barcode
  generateEAN13() {
    // Generate first 12 digits randomly
    let code = ''
    for (let i = 0; i < 12; i++) {
      code += Math.floor(Math.random() * 10)
    }
    
    // Calculate check digit
    const checkDigit = this.calculateEAN13CheckDigit(code)
    
    // Return complete EAN-13
    return code + checkDigit
  }

  // Calculates the EAN-13 check digit
  calculateEAN13CheckDigit(code12) {
    let sum = 0
    
    // For EAN-13, multiply odd positions by 1 and even positions by 3
    for (let i = 0; i < 12; i++) {
      sum += parseInt(code12[i]) * (i % 2 === 0 ? 1 : 3)
    }
    
    // Calculate check digit: (10 - (sum % 10)) % 10
    const checkDigit = (10 - (sum % 10)) % 10
    
    return checkDigit.toString()
  }
} 