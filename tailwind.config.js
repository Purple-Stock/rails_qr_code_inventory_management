/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/views/**/*.html.erb',
    './app/helpers/**/*.rb',
    './app/assets/stylesheets/**/*.css',
    './app/javascript/**/*.js'
  ],
  theme: {
    screens: {
      // Mobile-first responsive breakpoints
      'xs': '320px',   // Extra small devices (small phones)
      'sm': '640px',   // Small devices (phones)
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (desktops)
      'xl': '1280px',  // Extra large devices
      '2xl': '1536px', // 2X large devices
      
      // Custom breakpoints for specific responsive behavior
      'mobile': {'max': '767px'},     // Mobile-only styles
      'tablet': {'min': '768px', 'max': '1023px'}, // Tablet-only styles
      'desktop': {'min': '1024px'},   // Desktop and up
      
      // Touch device detection (approximate)
      'touch': {'raw': '(hover: none) and (pointer: coarse)'},
      'no-touch': {'raw': '(hover: hover) and (pointer: fine)'}
    },
    extend: {
      // Enhanced spacing for touch targets
      spacing: {
        '11': '2.75rem',  // 44px - minimum touch target size
        '18': '4.5rem',   // 72px - comfortable touch target
        '22': '5.5rem',   // 88px - large touch target
      },
      
      // Enhanced font sizes for mobile readability
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        
        // Mobile-optimized sizes
        'mobile-xs': ['0.8125rem', { lineHeight: '1.125rem' }],
        'mobile-sm': ['0.9375rem', { lineHeight: '1.375rem' }],
        'mobile-base': ['1.0625rem', { lineHeight: '1.625rem' }],
        'mobile-lg': ['1.1875rem', { lineHeight: '1.875rem' }],
      },
      
      // Enhanced z-index scale for layered mobile UI
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'modal': '1000',
        'overlay': '1100',
        'dropdown': '1200',
        'tooltip': '1300',
        'notification': '1400',
      },
      
      // Animation and transition enhancements
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
        '400': '400ms',
        '600': '600ms',
      },
      
      // Enhanced border radius for modern mobile UI
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      
      // Enhanced shadows for depth perception
      boxShadow: {
        'mobile': '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
        'mobile-lg': '0 4px 16px 0 rgba(0, 0, 0, 0.15)',
        'touch': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'touch-lg': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      
      // Container sizes for responsive layouts
      maxWidth: {
        'mobile': '100%',
        'tablet': '768px',
        'desktop': '1024px',
        'wide': '1280px',
      },
      
      // Enhanced color palette for accessibility
      colors: {
        // Touch feedback colors
        'touch-feedback': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
        },
        
        // Enhanced purple palette for branding
        'purple-brand': {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        }
      }
    },
  },
  plugins: [
    // Plugin for touch-friendly utilities
    function({ addUtilities, theme }) {
      const touchUtilities = {
        '.touch-target': {
          minHeight: theme('spacing.11'),
          minWidth: theme('spacing.11'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.touch-target-lg': {
          minHeight: theme('spacing.18'),
          minWidth: theme('spacing.18'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '.mobile-container': {
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: '100%',
        },
        '.tablet-container': {
          paddingLeft: theme('spacing.6'),
          paddingRight: theme('spacing.6'),
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: theme('maxWidth.tablet'),
        },
        '.desktop-container': {
          paddingLeft: theme('spacing.8'),
          paddingRight: theme('spacing.8'),
          marginLeft: 'auto',
          marginRight: 'auto',
          maxWidth: theme('maxWidth.desktop'),
        },
      }
      
      addUtilities(touchUtilities)
    },
    
    // Plugin for responsive typography
    function({ addUtilities, theme }) {
      const responsiveTypography = {
        '.text-responsive-xs': {
          fontSize: theme('fontSize.xs[0]'),
          lineHeight: theme('fontSize.xs[1].lineHeight'),
          '@media (max-width: 767px)': {
            fontSize: theme('fontSize.mobile-xs[0]'),
            lineHeight: theme('fontSize.mobile-xs[1].lineHeight'),
          }
        },
        '.text-responsive-sm': {
          fontSize: theme('fontSize.sm[0]'),
          lineHeight: theme('fontSize.sm[1].lineHeight'),
          '@media (max-width: 767px)': {
            fontSize: theme('fontSize.mobile-sm[0]'),
            lineHeight: theme('fontSize.mobile-sm[1].lineHeight'),
          }
        },
        '.text-responsive-base': {
          fontSize: theme('fontSize.base[0]'),
          lineHeight: theme('fontSize.base[1].lineHeight'),
          '@media (max-width: 767px)': {
            fontSize: theme('fontSize.mobile-base[0]'),
            lineHeight: theme('fontSize.mobile-base[1].lineHeight'),
          }
        },
        '.text-responsive-lg': {
          fontSize: theme('fontSize.lg[0]'),
          lineHeight: theme('fontSize.lg[1].lineHeight'),
          '@media (max-width: 767px)': {
            fontSize: theme('fontSize.mobile-lg[0]'),
            lineHeight: theme('fontSize.mobile-lg[1].lineHeight'),
          }
        },
      }
      
      addUtilities(responsiveTypography)
    }
  ],
}