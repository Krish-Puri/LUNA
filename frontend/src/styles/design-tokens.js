// LUNA Design Tokens
// These constants are the source of truth for the design system

export const colors = {
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
}

export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
}

export const spacing = {
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
}

export const borderRadius = {
  sm: '0.375rem',
  DEFAULT: '0.5rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  full: '9999px',
}

export const shadows = {
  sm: '0 1px 2px rgba(45, 42, 40, 0.05)',
  DEFAULT: '0 4px 6px rgba(45, 42, 40, 0.07)',
  lg: '0 10px 15px rgba(45, 42, 40, 0.1)',
}

export const transitions = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
}

// Layout constants
export const layout = {
  sidebarWidth: '280px',
  sidebarCollapsedWidth: '0px',
  headerHeight: '64px',
  inputComposerHeight: '80px',
}

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  toast: 400,
}
