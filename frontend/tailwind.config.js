/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LUNA Warm White Palette — all use CSS vars so dark mode switches automatically
        bg: {
          primary: 'var(--color-bg-primary)',
          secondary: 'var(--color-bg-secondary)',
          tertiary: 'var(--color-bg-tertiary)',
        },
        surface: 'var(--color-surface)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
        },
        luna: {
          bubble: 'var(--color-luna-bubble)',
          border: 'var(--color-luna-border)',
        },
        user: {
          bubble: 'var(--color-user-bubble)',
        },
        success: '#7B9E7B',
        warning: '#C9A86C',
        error: '#B85C5C',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],
        'sm': ['0.875rem', { lineHeight: '1.5' }],
        'base': ['1rem', { lineHeight: '1.5' }],
        'lg': ['1.125rem', { lineHeight: '1.5' }],
        'xl': ['1.25rem', { lineHeight: '1.25' }],
        '2xl': ['1.5rem', { lineHeight: '1.25' }],
        '3xl': ['1.875rem', { lineHeight: '1.25' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1': '0.25rem',
        '2': '0.5rem',
        '3': '0.75rem',
        '4': '1rem',
        '5': '1.25rem',
        '6': '1.5rem',
        '8': '2rem',
        '10': '2.5rem',
        '12': '3rem',
        '16': '4rem',
        '20': '5rem',
        '24': '6rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(45, 42, 40, 0.05)',
        'DEFAULT': '0 4px 6px rgba(45, 42, 40, 0.07)',
        'lg': '0 10px 15px rgba(45, 42, 40, 0.1)',
      },
      transitionDuration: {
        '150': '150ms',
        '300': '300ms',
        '500': '500ms',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      transitionDelay: {
        '75': '75ms',
        '150': '150ms',
      },
    },
  },
  plugins: [],
}
