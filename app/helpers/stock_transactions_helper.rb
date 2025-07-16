module StockTransactionsHelper
  def transaction_type_badge_class(type)
    base_classes = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full"

    case type
    when "stock_in"
      "#{base_classes} bg-green-100 text-green-800"
    when "stock_out"
      "#{base_classes} bg-red-100 text-red-800"
    when "adjust"
      "#{base_classes} bg-yellow-100 text-yellow-800"
    when "move"
      "#{base_classes} bg-blue-100 text-blue-800"
    when "count"
      "#{base_classes} bg-purple-100 text-purple-800"
    else
      "#{base_classes} bg-gray-100 text-gray-800"
    end
  end

  # Generate JavaScript configuration for transaction controllers
  def transaction_js_config(transaction_type, team_id, overrides = {})
    begin
      # Get the base configuration from the TransactionConfig concern
      config = StockTransaction.transaction_config(transaction_type)
      
      # Build JavaScript-compatible configuration
      js_config = {
        type: config.type,
        title: config.title,
        color: config.color,
        locations: config.locations,
        validation_rules: config.validation_rules,
        quantity_behavior: config.quantity_behavior,
        description: config.description,
        ui_behavior: {
          show_current_stock: true,
          allow_negative_quantity: config.quantity_behavior == :adjustment,
          require_location_selection: true,
          default_quantity: config.quantity_behavior == :adjustment ? 0 : 1,
          quantity_step: 1,
          quantity_min: config.quantity_behavior == :positive ? 1 : nil,
          validate_stock_availability: config.requires_stock_availability_check?,
          require_different_locations: config.requires_both_locations?
        },
        api_endpoints: {
          search: "/teams/#{team_id}/items/search",
          transaction: transaction_type == :move ? 
            "/teams/#{team_id}/transactions/move" : 
            "/teams/#{team_id}/transactions"
        },
        validation_messages: get_validation_messages(transaction_type),
        css_classes: get_css_classes(config.color)
      }
      
      # Merge with any overrides
      js_config.deep_merge(overrides)
    rescue => e
      Rails.logger.error "Failed to generate JS config for #{transaction_type}: #{e.message}"
      # Return fallback configuration
      fallback_js_config(transaction_type, team_id)
    end
  end

  # Generate data attributes for Stimulus controller
  def transaction_stimulus_data(transaction_type, team_id, overrides = {})
    config = transaction_js_config(transaction_type, team_id, overrides)
    {
      'stock-transaction-team-id-value': team_id,
      'stock-transaction-type-value': transaction_type,
      'stock-transaction-config-value': config.to_json
    }
  end

  def number_with_sign(number)
    return number if number.zero?
    number.positive? ? "+#{number}" : number.to_s
  end

  private

  def get_validation_messages(transaction_type)
    case transaction_type.to_sym
    when :stock_in
      {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Quantity must be positive',
        insufficient_stock: 'Not enough stock available'
      }
    when :stock_out
      {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Quantity must be positive',
        insufficient_stock: 'Not enough stock available for this item'
      }
    when :adjust
      {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Please enter a valid quantity',
        no_adjustment: 'No adjustment needed - quantity matches current stock'
      }
    when :move
      {
        no_source_location: 'Please select a source location',
        no_destination_location: 'Please select a destination location',
        same_locations: 'Source and destination locations must be different',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Quantity must be positive',
        insufficient_stock: 'Not enough stock available at source location'
      }
    else
      {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Please enter a valid quantity'
      }
    end
  end

  def get_css_classes(color)
    {
      primary_color: "#{color}-600",
      hover_color: "#{color}-700",
      border_color: "#{color}-200",
      bg_color: "#{color}-50",
      text_color: "#{color}-600"
    }
  end

  def fallback_js_config(transaction_type, team_id)
    {
      type: transaction_type,
      title: transaction_type.to_s.humanize,
      color: 'blue',
      locations: ['destination'],
      validation_rules: ['positive_quantity'],
      quantity_behavior: 'positive',
      ui_behavior: {
        show_current_stock: true,
        allow_negative_quantity: false,
        require_location_selection: true,
        default_quantity: 1
      },
      api_endpoints: {
        search: "/teams/#{team_id}/items/search",
        transaction: "/teams/#{team_id}/transactions"
      },
      validation_messages: {
        no_location: 'Please select a location',
        no_items: 'Please add items and quantities',
        invalid_quantity: 'Please enter a valid quantity'
      },
      css_classes: {
        primary_color: 'blue-600',
        hover_color: 'blue-700'
      }
    }
  end

  def transaction_type_icon(type)
    case type
    when "stock_in"
      '<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>'.html_safe
    when "stock_out"
      '<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>'.html_safe
    when "adjust"
      '<svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>'.html_safe
    else
      '<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'.html_safe
    end
  end

  def transaction_description(transaction)
    case transaction.transaction_type
    when "stock_in"
      "#{transaction.user.email} adicionou #{transaction.quantity} #{transaction.item.name}"
    when "stock_out"
      "#{transaction.user.email} removeu #{transaction.quantity.abs} #{transaction.item.name}"
    when "adjust"
      "#{transaction.user.email} ajustou #{transaction.item.name} para #{transaction.quantity}"
    else
      "#{transaction.user.email} moveu #{transaction.quantity} #{transaction.item.name}"
    end
  end
end
