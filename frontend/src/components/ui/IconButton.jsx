const IconButton = ({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-full'

  const variants = {
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    solid: 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary',
    accent: 'text-accent hover:text-accent-hover hover:bg-accent-light',
  }

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
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

export default IconButton
