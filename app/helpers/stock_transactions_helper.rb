module StockTransactionsHelper
  def transaction_type_badge_class(type)
    base_classes = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
    
    case type
    when 'stock_in'
      "#{base_classes} bg-green-100 text-green-800"
    when 'stock_out'
      "#{base_classes} bg-red-100 text-red-800"
    when 'adjust'
      "#{base_classes} bg-yellow-100 text-yellow-800"
    when 'move'
      "#{base_classes} bg-blue-100 text-blue-800"
    when 'count'
      "#{base_classes} bg-purple-100 text-purple-800"
    else
      "#{base_classes} bg-gray-100 text-gray-800"
    end
  end

  def number_with_sign(number)
    return number if number.zero?
    number.positive? ? "+#{number}" : number.to_s
  end
end 