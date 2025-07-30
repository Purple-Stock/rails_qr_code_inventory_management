module ApplicationHelper
  def qr_code_tag(text, options = {})
    size = options[:size] || "100x40"
    qr = RQRCode::QRCode.new(text)
    svg = qr.as_svg(
      color: "000",
      shape_rendering: "crispEdges",
      module_size: 2,
      standalone: true,
      use_path: true,
      size: size.split("x").first.to_i
    )

    content_tag(:div, svg.html_safe, class: "qr-code", style: "width: #{size.split('x').first}px")
  end

  def responsive_table(options = {}, &block)
    breakpoint = options[:breakpoint] || 768
    preserve_table = options[:preserve_table] || false
    css_classes = options[:class] || "responsive-table-container"
    
    content_tag(:div, 
      class: css_classes,
      data: {
        controller: "responsive-table",
        responsive_table_breakpoint_value: breakpoint,
        responsive_table_preserve_table_value: preserve_table
      }, &block)
  end

  def responsive_table_wrapper(table_content, options = {})
    card_container_class = options[:card_class] || "responsive-table-cards hidden"
    
    content = content_tag(:div, class: "table-scroll-container") do
      content_tag(:div, data: { responsive_table_target: "table" }) do
        table_content
      end
    end
    
    content += content_tag(:div, "", 
      class: card_container_class,
      data: { responsive_table_target: "cardContainer" })
    
    content
  end

  # Offline sync form helper
  def offline_sync_form_with(model: nil, url: nil, transaction_type: nil, **options, &block)
    # Determine transaction type from model or URL if not provided
    transaction_type ||= infer_transaction_type(model, url)
    
    # Set up offline sync data attributes
    sync_options = {
      data: {
        controller: "offline-sync",
        offline_sync_endpoint_value: url || polymorphic_path(model || :stock_transactions),
        offline_sync_transaction_type_value: transaction_type,
        **options.fetch(:data, {})
      }
    }
    
    # Merge with existing options
    form_options = options.merge(sync_options)
    
    form_with(model: model, url: url, **form_options) do |form|
      content = capture(form, &block)
      
      # Add offline sync status indicators
      sync_status = content_tag(:div, class: "offline-sync-status mt-4") do
        status_indicator = content_tag(:div, class: "flex items-center justify-between") do
          connection_status = content_tag(:div, class: "flex items-center space-x-2") do
            status_badge = content_tag(:span, "Online", 
              class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",
              data: { offline_sync_target: "status" })
            
            queue_badge = content_tag(:span, "0 pending", 
              class: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800",
              data: { offline_sync_target: "queue" },
              style: "display: none;")
            
            status_badge + queue_badge
          end
          
          sync_button = content_tag(:button, "Sync Now", 
            type: "button",
            class: "inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed",
            data: { 
              offline_sync_target: "syncButton",
              action: "click->offline-sync#syncNow"
            })
          
          connection_status + sync_button
        end
        
        status_indicator
      end
      
      content + sync_status
    end
  end

  private

  def infer_transaction_type(model, url)
    return nil unless model || url
    
    if model
      case model.class.name
      when 'StockTransaction'
        model.transaction_type || 'stock_transaction'
      when 'Item'
        model.persisted? ? 'item_update' : 'item_create'
      when 'Location'
        model.persisted? ? 'location_update' : 'location_create'
      else
        'unknown'
      end
    elsif url
      case url.to_s
      when /stock_transactions.*stock_in/
        'stock_in'
      when /stock_transactions.*stock_out/
        'stock_out'
      when /stock_transactions.*move/
        'stock_move'
      when /stock_transactions.*adjust/
        'stock_adjust'
      when /stock_transactions/
        'stock_transaction'
      when /items/
        'item_create'
      when /locations/
        'location_create'
      else
        'unknown'
      end
    end
  end
end
