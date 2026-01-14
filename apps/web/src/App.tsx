import './App.css'
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './pages/ErrorBoundary';
import { Toaster } from 'sonner';

import Nav from './components/navigation/Nav'
import PageLoading from './components/ui/PageLoading';
import NotFound from './pages/NotFound';

const InsightsPage = lazy(() => import('./pages/Home'));
const JournalPage = lazy(() => import('./pages/JournalPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" richColors />
      <div className='w-screen min-h-screen'>
        <Nav />
        <main className='pb-16 md:ml-56 md:pb-0' role="main">
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path='/' element={
                <ErrorBoundary>
                  <InsightsPage />
                </ErrorBoundary>
              } />
              <Route path='/journal' element={
                <ErrorBoundary>
                  <JournalPage />
                </ErrorBoundary>
              } />
              <Route path='/entries' element={
                <ErrorBoundary>
                  <HistoryPage />
                </ErrorBoundary>
              } />
              <Route path='/settings' element={
                <ErrorBoundary>
                  <SettingsPage />
                </ErrorBoundary>
              } />
              <Route path='*' element={
                <ErrorBoundary>
                  <NotFound />
                </ErrorBoundary>
              } />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  )
}

export default App