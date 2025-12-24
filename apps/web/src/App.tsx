import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import InsightsPage from './pages/InsightsPage'
import JournalPage from './pages/JournalPage'
import HistoryPage from './pages/HistoryPage'
import Nav from './components/navigation/Nav'

function App() {
  return (
    <Router>
      <div className='w-screen min-h-screen bg-slate-50'>
        <Nav />
        <main className='pb-16'>
          <Routes>
            <Route path='/' element={<InsightsPage />} />
            <Route path='/journal' element={<JournalPage />} />
            <Route path='/entries' element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
