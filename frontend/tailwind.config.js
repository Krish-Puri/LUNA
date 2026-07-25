/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LUNA Warm White Palette
        bg: {
          primary: '#FDFBF9',
          secondary: '#F7F4F1',
          tertiary: '#EFEBE7',
        },
        surface: '#FFFFFF',
        border: {
          DEFAULT: '#E8E3DE',
          strong: '#D4CEC8',
        },
        text: {
          primary: '#2D2A28',
          secondary: '#6B6560',
          tertiary: '#9C958F',
          inverse: '#FDFBF9',
        },
        accent: {
          DEFAULT: '#B85C5C',
          hover: '#A14D4D',
          light: '#F5E8E8',
        },
        luna: {
          bubble: '#FFFFFF',
          border: '#E8E3DE',
        },
        user: {
          bubble: '#F7F4F1',
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
