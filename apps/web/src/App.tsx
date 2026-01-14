import './App.css'
import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './pages/ErrorBoundary';
import { Toaster } from 'sonner';

import Nav from './components/navigation/Nav'
import PageLoading from './pages/PageLoading';
import NotFound from './pages/NotFound';
import HomeSkeleton from './pages/HomeSkeleton';
import SettingsSkeleton from './pages/SettingsSkeleton';
import HistorySkeleton from './pages/HistorySkeleton';
import JournalSkeleton from './pages/JournalPageSkeleton';

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
                <Suspense fallback={<HomeSkeleton />}>
                  <ErrorBoundary>
                    <InsightsPage />
                  </ErrorBoundary>
                </Suspense>
              } />
              <Route path='/journal' element={
                <Suspense fallback={<JournalSkeleton />}>
                  <ErrorBoundary>
                    <JournalPage />
                  </ErrorBoundary>
                </Suspense>
              } />
              <Route path='/entries' element={
                <Suspense fallback={<HistorySkeleton />}>
                  <ErrorBoundary>
                    <HistoryPage />
                  </ErrorBoundary>
                </Suspense>
              } />
              <Route path='/settings' element={
                <Suspense fallback={<SettingsSkeleton />}>
                  <ErrorBoundary>
                    <SettingsPage />
                  </ErrorBoundary>
                </Suspense>
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