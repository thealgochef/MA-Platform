import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // --- Color palette from :root custom properties ---
      colors: {
        // Core colors for text, primary actions, secondary elements, backgrounds, and surfaces
        'text': 'var(--color-text)',
        'primary': 'var(--color-primary)',
        'secondary': 'var(--color-secondary)',
        'bg': 'var(--color-background)', // used in (public)
        'surface': 'var(--color-surface)',

        // legacy bg color for (auth) pages
        'bg-light-gray': '#f7f8fa', 

        // Supplementary colors for borders, accents, etc.
        'subtle': 'var(--color-subtle)', 
        'faint': 'var(--color-faint)', 
        'btn-hover': 'var(--color-btn-hover)',

        // Semantic colors for status indicators, alerts, etc.
        'success': 'var(--color-success, #10B981)',
        'error': 'var(--color-error, #EF4444)',
        'warning': 'var(--color-warning, #F59E0B)',
        'info': 'var(--color-info, #3B82F6)',
      },

      // --- Font families ---
      fontFamily: {
        'display': 'var(--font-display, "Cormorant Garamond", Georgia, serif)',
        'body': 'var(--font-body, "Outfit", system-ui, sans-serif)',
      },

      // --- Box shadows: card-glow + service-card hover ---
      boxShadow: {
        'card-glow': '0 4px 40px rgba(45, 106, 79, 0.05)',
        'card-hover': '0 8px 50px rgba(45, 106, 79, 0.10)',
      },

      // --- Keyframe animations ---
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },

      // --- Animation utilities ---
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
      },

      // --- Transition timing: service-card cubic-bezier ---
      transitionTimingFunction: {
        'card': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      // --- Transition durations used across components ---
      transitionDuration: {
        '400': '400ms',
      },

      // --- Background images: hero-pattern, gradient-text, btn shimmer ---
      backgroundImage: {
        'hero-pattern': [
          'radial-gradient(circle at 20% 50%, rgba(45, 106, 79, 0.04) 0%, transparent 50%)',
          'radial-gradient(circle at 80% 80%, rgba(45, 106, 79, 0.02) 0%, transparent 50%)',
          'linear-gradient(180deg, #ffffff 0%, #f8f6f3 100%)',
        ].join(', '),
        'gradient-text':
          'linear-gradient(135deg, #2d6a4f 0%, #d4b87a 50%, #2d6a4f 100%)',
        'btn-shimmer':
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
    },
  },

  plugins: [],
}

export default config
