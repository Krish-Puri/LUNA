const Avatar = ({ name = 'LUNA', size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-12 h-12 text-lg',
  }

  const getInitials = (name) => {
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div
      className={`
        ${sizes[size]}
        rounded-full bg-accent text-text-inverse
        flex items-center justify-center
        font-semibold
        ${className}
      `}
    >
      {getInitials(name)}
    </div>
  )
}

export default Avatar
