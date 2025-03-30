# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "barcode-detector", to: "https://cdn.jsdelivr.net/npm/barcode-detector@1.0.3/+esm"
pin "html5-qrcode", to: "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/+esm"
