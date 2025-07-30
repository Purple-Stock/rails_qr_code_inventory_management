# Performance Helper
# Provides utilities for performance optimization including image optimization,
# critical CSS extraction, and resource loading optimization
module PerformanceHelper
  # Generate optimized image tag with lazy loading and WebP support
  def optimized_image_tag(source, options = {})
    # Extract lazy loading options
    lazy = options.delete(:lazy) { true }
    webp = options.delete(:webp) { true }
    
    # Generate WebP source if supported
    webp_source = webp ? generate_webp_source(source) : nil
    
    # Set up lazy loading attributes
    if lazy
      options[:loading] = 'lazy'
      options[:data] ||= {}
      options[:data][:src] = options[:src] || asset_path(source)
      options[:data][:webp_src] = webp_source if webp_source
      options[:src] = generate_placeholder_image(options[:width], options[:height])
      options[:class] = "#{options[:class]} lazy-loading".strip
    end
    
    # Add performance attributes
    options[:decoding] = 'async'
    options[:importance] = options.delete(:priority) ? 'high' : 'low'
    
    # Generate responsive srcset if sizes provided
    if options[:responsive]
      options[:srcset] = generate_responsive_srcset(source, options[:responsive])
      options[:sizes] = options[:responsive][:sizes] if options[:responsive][:sizes]
    end
    
    image_tag(lazy ? options[:data][:src] : source, options)
  end

  # Generate WebP source path
  def generate_webp_source(source)
    return nil unless source.is_a?(String)
    
    # Convert extension to .webp
    webp_source = source.gsub(/\.(jpg|jpeg|png)$/i, '.webp')
    
    # Check if WebP version exists
    webp_path = Rails.root.join('app', 'assets', 'images', webp_source)
    return asset_path(webp_source) if File.exist?(webp_path)
    
    nil
  end

  # Generate placeholder image (base64 encoded)
  def generate_placeholder_image(width = 300, height = 200)
    # Generate a simple gray placeholder
    "data:image/svg+xml;base64,#{Base64.strict_encode64(
      "<svg width='#{width}' height='#{height}' xmlns='http://www.w3.org/2000/svg'>" \
      "<rect width='100%' height='100%' fill='#f3f4f6'/>" \
      "<text x='50%' y='50%' text-anchor='middle' dy='.3em' fill='#9ca3af' font-family='sans-serif' font-size='14'>Loading...</text>" \
      "</svg>"
    )}"
  end

  # Generate responsive srcset
  def generate_responsive_srcset(source, responsive_config)
    return nil unless responsive_config.is_a?(Hash)
    
    srcset_parts = []
    
    responsive_config[:breakpoints]&.each do |breakpoint, width|
      # Generate different sized versions
      resized_source = generate_resized_source(source, width)
      srcset_parts << "#{asset_path(resized_source)} #{width}w"
    end
    
    srcset_parts.join(', ')
  end

  # Generate resized source path (placeholder - would integrate with image processing)
  def generate_resized_source(source, width)
    # In a real implementation, this would integrate with image processing
    # For now, return the original source
    source
  end

  # Generate critical CSS link tag
  def critical_css_tag(css_file)
    css_path = Rails.root.join('app', 'assets', 'stylesheets', 'critical', "#{css_file}.css")
    
    if File.exist?(css_path)
      content_tag :style, File.read(css_path).html_safe, type: 'text/css'
    else
      # Fallback to regular stylesheet link
      stylesheet_link_tag css_file, media: 'all', 'data-turbo-track': 'reload'
    end
  end

  # Generate preload link for critical resources
  def preload_link_tag(source, options = {})
    as_type = options.delete(:as) || detect_resource_type(source)
    
    tag.link(
      rel: 'preload',
      href: asset_path(source),
      as: as_type,
      **options
    )
  end

  # Generate prefetch link for non-critical resources
  def prefetch_link_tag(source, options = {})
    tag.link(
      rel: 'prefetch',
      href: asset_path(source),
      **options
    )
  end

  # Generate DNS prefetch link
  def dns_prefetch_tag(domain)
    tag.link rel: 'dns-prefetch', href: "//#{domain}"
  end

  # Generate preconnect link
  def preconnect_tag(domain, crossorigin: false)
    options = { rel: 'preconnect', href: "//#{domain}" }
    options[:crossorigin] = 'anonymous' if crossorigin
    tag.link(**options)
  end

  # Detect resource type from file extension
  def detect_resource_type(source)
    case File.extname(source).downcase
    when '.css'
      'style'
    when '.js'
      'script'
    when '.woff', '.woff2', '.ttf', '.otf'
      'font'
    when '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'
      'image'
    when '.mp4', '.webm', '.ogg'
      'video'
    when '.mp3', '.wav', '.ogg'
      'audio'
    else
      'fetch'
    end
  end

  # Generate performance monitoring script
  def performance_monitoring_script
    return '' unless Rails.env.production?
    
    javascript_tag do
      <<~JS.html_safe
        // Core Web Vitals monitoring
        if ('PerformanceObserver' in window) {
          // Monitor LCP
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
          }).observe({entryTypes: ['largest-contentful-paint']});
          
          // Monitor FID
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              console.log('FID:', entry.processingStart - entry.startTime);
            });
          }).observe({entryTypes: ['first-input']});
          
          // Monitor CLS
          let clsValue = 0;
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            console.log('CLS:', clsValue);
          }).observe({entryTypes: ['layout-shift']});
        }
      JS
    end
  end

  # Generate resource hints for critical external domains
  def resource_hints
    hints = []
    
    # DNS prefetch for external domains
    external_domains = %w[
      fonts.googleapis.com
      fonts.gstatic.com
      cdn.jsdelivr.net
    ]
    
    external_domains.each do |domain|
      hints << dns_prefetch_tag(domain)
    end
    
    # Preconnect to critical external resources
    preconnect_domains = %w[
      fonts.gstatic.com
    ]
    
    preconnect_domains.each do |domain|
      hints << preconnect_tag(domain, crossorigin: true)
    end
    
    safe_join(hints, "\n")
  end

  # Check if user is on a slow connection
  def slow_connection?
    # This would typically be determined by JavaScript and stored in session
    session[:slow_connection] == true
  end

  # Generate optimized loading strategy based on connection
  def loading_strategy
    if slow_connection?
      {
        images: :lazy,
        css: :critical_only,
        js: :essential_only,
        fonts: :system_fallback
      }
    else
      {
        images: :progressive,
        css: :full,
        js: :full,
        fonts: :web_fonts
      }
    end
  end

  # Generate bundle splitting configuration
  def bundle_config
    {
      critical: %w[application stimulus],
      deferred: %w[charts analytics notifications],
      lazy: %w[admin reports dashboard]
    }
  end
end