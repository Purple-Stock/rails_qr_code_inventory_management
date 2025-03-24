require 'rqrcode'

module ItemsHelper
  def qr_code_tag(text)
    qr = RQRCode::QRCode.new(text)
    svg = qr.as_svg(
      color: "000",
      shape_rendering: "crispEdges",
      module_size: 4,
      standalone: true,
      use_path: true
    )
    content_tag(:div, svg.html_safe, class: "qr-code")
  end
end 