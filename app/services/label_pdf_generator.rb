class LabelPdfGenerator
  require 'prawn'
  require 'barby'
  require 'barby/barcode/code_128'
  require 'barby/outputter/png_outputter'
  require 'rqrcode'
  require 'chunky_png'
  require 'stringio'

  LABELS_PER_ROW = 2
  LABEL_PADDING = 20

  def initialize(items, label_type, layout)
    @items = items
    @label_type = label_type
    @layout = layout
  end

  def generate
    pdf = Prawn::Document.new(page_size: 'A4', margin: 36)
    
    # Calculate dimensions
    content_width = pdf.bounds.width
    label_width = (content_width - (LABELS_PER_ROW - 1) * LABEL_PADDING) / LABELS_PER_ROW
    
    @items.each_slice(LABELS_PER_ROW).with_index do |item_group, row_index|
      # Start new page if needed
      pdf.start_new_page if row_index > 0 && pdf.cursor < 200

      # Create a row of labels
      pdf.bounding_box([0, pdf.cursor], width: content_width, height: 200) do
        item_group.each_with_index do |item, index|
          x_position = index * (label_width + LABEL_PADDING)
          
          # Create a bounding box for each label
          pdf.bounding_box([x_position, pdf.bounds.top], width: label_width, height: 200) do
            case @label_type
            when 'barcode'
              generate_barcode_label(pdf, item)
            when 'qr'
              generate_qr_label(pdf, item)
            when 'hybrid'
              generate_hybrid_label(pdf, item)
            end
          end
        end
      end
      
      pdf.move_down LABEL_PADDING
    end

    pdf
  end

  private

  def generate_barcode_label(pdf, item)
    pdf.font_size(12) do
      pdf.text "Item: #{item.name}", align: :center
      pdf.move_down 10

      begin
        barcode = Barby::Code128.new(item.sku.to_s)
        blob = Barby::PngOutputter.new(barcode).to_png(height: 50, margin: 5)
        pdf.image StringIO.new(blob), position: :center, width: 160

        pdf.move_down 10
        pdf.text "SKU: #{item.sku}", align: :center
      rescue => e
        Rails.logger.error "Failed to generate barcode: #{e.message}"
        pdf.text "Error generating barcode", align: :center, color: "FF0000"
      end
    end
  end

  def generate_qr_label(pdf, item)
    pdf.font_size(12) do
      pdf.text "Item: #{item.name}", align: :center
      pdf.move_down 10

      begin
        qr = RQRCode::QRCode.new(item.sku.to_s)
        png = qr.as_png(
          bit_depth: 1,
          border_modules: 4,
          color_mode: ChunkyPNG::COLOR_GRAYSCALE,
          color: 'black',
          file: nil,
          fill: 'white',
          module_px_size: 6,
          size: 180
        )
        
        pdf.image StringIO.new(png.to_blob), position: :center, width: 120

        pdf.move_down 10
        pdf.text "SKU: #{item.sku}", align: :center
      rescue => e
        Rails.logger.error "Failed to generate QR code: #{e.message}"
        pdf.text "Error generating QR code", align: :center, color: "FF0000"
      end
    end
  end

  def generate_hybrid_label(pdf, item)
    pdf.font_size(12) do
      pdf.text "Item: #{item.name}", align: :center, size: 10
      pdf.move_down 5

      begin
        # Generate QR code
        qr = RQRCode::QRCode.new(item.sku.to_s)
        qr_png = qr.as_png(
          bit_depth: 1,
          border_modules: 4,
          color_mode: ChunkyPNG::COLOR_GRAYSCALE,
          color: 'black',
          file: nil,
          fill: 'white',
          module_px_size: 6,
          size: 120
        )

        # Generate barcode
        barcode = Barby::Code128.new(item.sku.to_s)
        barcode_png = Barby::PngOutputter.new(barcode).to_png(height: 30, margin: 5)

        # Calculate positions for side-by-side layout
        available_width = pdf.bounds.width
        qr_width = 80
        barcode_width = 140
        total_width = qr_width + barcode_width
        spacing = (available_width - total_width) / 2
        
        # Position QR code on the left
        pdf.image StringIO.new(qr_png.to_blob), 
                 at: [spacing, pdf.cursor],
                 width: qr_width

        # Position barcode on the right
        pdf.image StringIO.new(barcode_png),
                 at: [spacing + qr_width, pdf.cursor - 25],
                 width: barcode_width

        # Move cursor below both images
        pdf.move_down 90
        pdf.text "SKU: #{item.sku}", align: :center, size: 10
      rescue => e
        Rails.logger.error "Failed to generate hybrid label: #{e.message}"
        pdf.text "Error generating images", align: :center, color: "FF0000"
      end
    end
  end
end 