import './App.css'
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Nav from './components/navigation/Nav'
import PageLoading from './components/ui/PageLoading';

const InsightsPage = lazy(() => import('./pages/Home'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Router>
      <div className='w-screen min-h-screen bg-neutral-50 text-slate-800'>
        <Nav />
        <main className='pb-16 md:ml-56 md:pb-0'>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path='/' element={<InsightsPage />} />
              <Route path='/journal' element={<JournalPage />} />
              <Route path='/entries' element={<HistoryPage />} />
              <Route path='/settings' element={<SettingsPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  )
}

export default App