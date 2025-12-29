import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import InsightsPage from './pages/Home'
import JournalPage from './pages/JournalPage'
import HistoryPage from './pages/HistoryPage'
import Nav from './components/navigation/Nav'
import SettingsPage from './pages/Settings'

function App() {
  return (
    <Router>
      <div className='w-screen min-h-screen bg-neutral-50 text-slate-800'>
        <Nav />
        <main className='pb-16 md:ml-56 md:pb-0'>
          <Routes>
            <Route path='/' element={<InsightsPage />} />
            <Route path='/journal' element={<JournalPage />} />
            <Route path='/entries' element={<HistoryPage />} />
            <Route path='/settings' element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App