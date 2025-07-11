module LabelsHelper
  def barcode_data_url(sku)
    barcode = Barby::Code128.new(sku.to_s)
    blob = Barby::PngOutputter.new(barcode).to_png(height: 50, margin: 5)
    "data:image/png;base64,#{Base64.strict_encode64(blob)}"
  end

  def qr_code_data_url(sku)
    qr = RQRCode::QRCode.new(sku.to_s)
    png = qr.as_png(
      bit_depth: 1,
      border_modules: 4,
      color_mode: ChunkyPNG::COLOR_GRAYSCALE,
      color: "black",
      file: nil,
      fill: "white",
      module_px_size: 6,
      size: 180
    )
    "data:image/png;base64,#{Base64.strict_encode64(png.to_blob)}"
  end
end
