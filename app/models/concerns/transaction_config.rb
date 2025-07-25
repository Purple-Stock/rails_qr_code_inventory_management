# frozen_string_literal: true

module TransactionConfig
  extend ActiveSupport::Concern

  # Configuration constants for all transaction types
  TRANSACTION_CONFIGS = {
    stock_in: {
      title: 'Stock In',
      color: 'green',
      locations: [:destination],
      validation_rules: [:positive_quantity],
      quantity_behavior: :positive,
      description: 'Add items to inventory at a specific location'
    }.freeze,
    
    stock_out: {
      title: 'Stock Out',
      color: 'red', 
      locations: [:source],
      validation_rules: [:negative_quantity, :stock_availability],
      quantity_behavior: :negative,
      description: 'Remove items from inventory at a specific location'
    }.freeze,
    
    adjust: {
      title: 'Adjust Stock',
      color: 'blue',
      locations: [:destination],
      validation_rules: [:adjustment_calculation],
      quantity_behavior: :adjustment,
      description: 'Adjust item quantities to match actual counts'
    }.freeze,
    
    move: {
      title: 'Move Stock',
      color: 'purple',
      locations: [:source, :destination],
      validation_rules: [:positive_quantity, :stock_availability],
      quantity_behavior: :positive,
      description: 'Transfer items between locations'
    }.freeze,
    
    count: {
      title: 'Stock Count',
      color: 'yellow',
      locations: [:destination],
      validation_rules: [:positive_quantity],
      quantity_behavior: :positive,
      description: 'Record stock count for inventory verification'
    }.freeze
  }.freeze

  class_methods do
    # Get configuration for a specific transaction type
    def transaction_config(type)
      config = TRANSACTION_CONFIGS[type.to_sym]
      raise ArgumentError, "Unknown transaction type: #{type}" unless config
      
      TransactionConfigStruct.new(type.to_sym, config)
    end

    # Get all available transaction types
    def available_transaction_types
      TRANSACTION_CONFIGS.keys
    end

    # Check if a transaction type is valid
    def valid_transaction_type?(type)
      TRANSACTION_CONFIGS.key?(type.to_sym)
    end
  end

  included do
    # Instance method to get configuration for this transaction's type
    def config
      return nil unless transaction_type.present?
      self.class.transaction_config(transaction_type)
    end
  end

  # Struct-like class to provide convenient access to configuration data
  class TransactionConfigStruct
    attr_reader :type, :title, :color, :locations, :validation_rules, :quantity_behavior, :description

    def initialize(type, config_hash)
      @type = type
      @title = config_hash[:title]
      @color = config_hash[:color]
      @locations = config_hash[:locations]
      @validation_rules = config_hash[:validation_rules]
      @quantity_behavior = config_hash[:quantity_behavior]
      @description = config_hash[:description]
    end

    # Location requirement helper methods
    def requires_source_location?
      locations.include?(:source)
    end

    def requires_destination_location?
      locations.include?(:destination)
    end

    def requires_both_locations?
      requires_source_location? && requires_destination_location?
    end

    def requires_single_location?
      locations.length == 1
    end

    # Validation rule helper methods
    def requires_positive_quantity?
      validation_rules.include?(:positive_quantity)
    end

    def requires_negative_quantity?
      validation_rules.include?(:negative_quantity)
    end

    def requires_stock_availability_check?
      validation_rules.include?(:stock_availability)
    end

    def requires_adjustment_calculation?
      validation_rules.include?(:adjustment_calculation)
    end

    # Quantity behavior helper methods
    def quantity_should_be_positive?
      quantity_behavior == :positive
    end

    def quantity_should_be_negative?
      quantity_behavior == :negative
    end

    def quantity_is_adjustment?
      quantity_behavior == :adjustment
    end

    # UI helper methods
    def css_color_class
      "text-#{color}-600"
    end

    def bg_color_class
      "bg-#{color}-50"
    end

    def border_color_class
      "border-#{color}-200"
    end

    def button_color_class
      "bg-#{color}-600 hover:bg-#{color}-700"
    end

    # Convert to hash for JSON serialization
    def to_h
      {
        type: type,
        title: title,
        color: color,
        locations: locations,
        validation_rules: validation_rules,
        quantity_behavior: quantity_behavior,
        description: description
      }
    end

    def to_json(*args)
      to_h.to_json(*args)
    end
  end
end