const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-accent text-text-inverse hover:bg-accent-hover active:scale-[0.98]',
    secondary: 'bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border active:scale-[0.98]',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    danger: 'bg-error text-text-inverse hover:opacity-90 active:scale-[0.98]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl',
    icon: 'p-2 rounded-lg',
  }

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
