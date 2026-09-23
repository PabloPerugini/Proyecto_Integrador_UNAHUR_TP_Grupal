import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CareerSelectionProvider } from './context/CareerContext'
import PageLoader from './components/PageLoader'
import ErrorBoundary from './components/ErrorBoundary'
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'
import SplashScreen from './components/SplashScreen'
import Favicon from './components/Favicon'
import Home from './pages/Home'

const PlanAdmin = lazy(() => import('./pages/PlanAdmin'))
const MyProgress = lazy(() => import('./pages/MyProgress'))
const PlanGraph = lazy(() => import('./pages/PlanGraph'))
const PlanBoard = lazy(() => import('./pages/PlanBoard'))
const UploadPlan = lazy(() => import('./pages/UploadPlan'))
const Error404 = lazy(() => import('./pages/Error404'))

const SPLASH_DURATION_MS = 2600
const SPLASH_FADE_MS = 600

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader text="Abriendo…" />}>{children}</Suspense>
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [fading, setFading] = useState(false)
  const started = useRef(false)

  const finishSplash = () => {
    if (started.current) return
    started.current = true
    setFading(true)
    setTimeout(() => setShowSplash(false), SPLASH_FADE_MS)
  }

  useEffect(() => {
    const t = setTimeout(finishSplash, SPLASH_DURATION_MS)
    return () => clearTimeout(t)
  }, [])

  if (showSplash) {
    return (
      <ThemeProvider>
        <Favicon />
        <BrowserRouter>
          <SplashScreen fading={fading} onFinish={finishSplash} />
        </BrowserRouter>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Favicon />
      <CareerSelectionProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route element={<UserLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/progreso" element={<PageSuspense><MyProgress /></PageSuspense>} />
                <Route path="/grafo/:id?" element={<PageSuspense><PlanGraph /></PageSuspense>} />
                <Route path="/tablero/:id?" element={<PageSuspense><PlanBoard /></PageSuspense>} />
                <Route path="*" element={<PageSuspense><Error404 /></PageSuspense>} />
              </Route>
              <Route element={<AdminLayout />}>
                <Route path="/cargar" element={<PageSuspense><UploadPlan /></PageSuspense>} />
                <Route path="/admin/:id?" element={<PageSuspense><PlanAdmin /></PageSuspense>} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </CareerSelectionProvider>
    </ThemeProvider>
  );
}