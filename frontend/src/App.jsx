import { BrowserRouter, Routes, Route } from 'react-router-dom'
import SessionsPage from './pages/SessionsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SessionsPage />} />
        <Route path="/session/:sessionId" element={<SessionsPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
