import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CareerSelectionProvider } from './context/CareerContext'
import PageLoader from './components/PageLoader'
import Sidebar from './components/Sidebar'
import type { SidebarVariant } from './components/Sidebar'
import Footer from './components/Footer'
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

function Shell({ variant = 'app' }: { variant?: SidebarVariant }) {
  return (
    <div className="app-root">
      <Sidebar variant={variant} />
      <div className="app-main">
        <main className="app-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
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
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<Home />} />
              <Route path="/progreso" element={<PageSuspense><MyProgress /></PageSuspense>} />
              <Route path="/grafo/:id?" element={<PageSuspense><PlanGraph /></PageSuspense>} />
              <Route path="/tablero/:id?" element={<PageSuspense><PlanBoard /></PageSuspense>} />
              <Route path="*" element={<PageSuspense><Error404 /></PageSuspense>} />
            </Route>
            <Route element={<Shell variant="admin" />}>
              <Route path="/cargar" element={<PageSuspense><UploadPlan /></PageSuspense>} />
              <Route path="/admin/:id?" element={<PageSuspense><PlanAdmin /></PageSuspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CareerSelectionProvider>
    </ThemeProvider>
  );
}