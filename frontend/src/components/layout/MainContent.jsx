const MainContent = ({ children, className = '' }) => {
  return (
    <main className={`flex-1 flex flex-col overflow-hidden min-h-0 ${className}`}>
      {children}
    </main>
  )
}

export default MainContent
