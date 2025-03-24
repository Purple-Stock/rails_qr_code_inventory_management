module ApplicationHelper
  def qr_code_tag(text, options = {})
    size = options[:size] || '100x40'
    qr = RQRCode::QRCode.new(text)
    svg = qr.as_svg(
      color: "000",
      shape_rendering: "crispEdges",
      module_size: 2,
      standalone: true,
      use_path: true,
      size: size.split('x').first.to_i
    )
    
    content_tag(:div, svg.html_safe, class: "qr-code", style: "width: #{size.split('x').first}px")
  end
end
