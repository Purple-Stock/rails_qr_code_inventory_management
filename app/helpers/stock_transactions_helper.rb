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

  def number_with_sign(number)
    return number if number.zero?
    number.positive? ? "+#{number}" : number.to_s
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
