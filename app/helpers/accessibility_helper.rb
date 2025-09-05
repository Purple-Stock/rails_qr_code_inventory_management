# Accessibility Helper
# Provides utilities for implementing comprehensive accessibility features
module AccessibilityHelper
  # Generate ARIA attributes for interactive elements
  def aria_attributes(options = {})
    attributes = {}
    
    # Basic ARIA attributes
    attributes['aria-label'] = options[:label] if options[:label]
    attributes['aria-describedby'] = options[:described_by] if options[:described_by]
    attributes['aria-expanded'] = options[:expanded].to_s if options.key?(:expanded)
    attributes['aria-selected'] = options[:selected].to_s if options.key?(:selected)
    attributes['aria-current'] = options[:current] if options[:current]
    attributes['aria-hidden'] = options[:hidden].to_s if options.key?(:hidden)
    attributes['aria-live'] = options[:live] if options[:live]
    attributes['aria-atomic'] = options[:atomic].to_s if options.key?(:atomic)
    attributes['aria-busy'] = options[:busy].to_s if options.key?(:busy)
    
    # Role attribute
    attributes['role'] = options[:role] if options[:role]
    
    # Tabindex for focus management
    attributes['tabindex'] = options[:tabindex] if options[:tabindex]
    
    attributes
  end

  # Generate skip link for keyboard navigation
  def skip_link(target, text = nil)
    text ||= t('accessibility.skip_to_content')
    link_to text, "##{target}", 
            class: "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg",
            **aria_attributes(label: text)
  end

  # Generate screen reader only text
  def sr_only(text)
    content_tag :span, text, class: "sr-only"
  end

  # Generate focus indicator classes
  def focus_classes(base_classes = "")
    "#{base_classes} focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-white"
  end

  # Generate high contrast mode classes
  def high_contrast_classes(base_classes = "")
    "#{base_classes} contrast-more:border-2 contrast-more:border-black contrast-more:bg-white contrast-more:text-black"
  end

  # Generate reduced motion classes
  def motion_safe_classes(animation_classes = "")
    "motion-safe:#{animation_classes} motion-reduce:transition-none motion-reduce:animate-none"
  end

  # Generate touch target classes (minimum 44px)
  def touch_target_classes(base_classes = "")
    "#{base_classes} min-h-[44px] min-w-[44px] touch-manipulation"
  end

  # Generate landmark attributes
  def landmark_attributes(type, label = nil)
    attributes = { role: type }
    attributes['aria-label'] = label if label
    attributes
  end

  # Check if user prefers reduced motion
  def prefers_reduced_motion?
    # This would typically be set via JavaScript and stored in session/cookie
    session[:prefers_reduced_motion] == true
  end

  # Check if user prefers high contrast
  def prefers_high_contrast?
    # This would typically be set via JavaScript and stored in session/cookie
    session[:prefers_high_contrast] == true
  end

  # Generate announcement for screen readers
  def announce_to_screen_reader(message, priority = 'polite')
    content_tag :div, message,
                **aria_attributes(live: priority, atomic: true),
                class: "sr-only",
                id: "screen-reader-announcement-#{SecureRandom.hex(4)}"
  end

  # Generate loading announcement
  def loading_announcement(message = nil)
    message ||= t('accessibility.loading')
    announce_to_screen_reader(message, 'assertive')
  end

  # Generate error announcement
  def error_announcement(message)
    announce_to_screen_reader(message, 'assertive')
  end

  # Generate success announcement
  def success_announcement(message)
    announce_to_screen_reader(message, 'polite')
  end
end