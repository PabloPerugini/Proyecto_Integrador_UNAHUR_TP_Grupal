import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CareerSelectionProvider } from './context/CareerContext'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import PageLoader from './components/PageLoader'
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'
import SplashScreen from './components/SplashScreen'
import Favicon from './components/Favicon'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

const PlanAdmin = lazy(() => import('./pages/PlanAdmin'))
const MyProgress = lazy(() => import('./pages/MyProgress'))
const PlanGraph = lazy(() => import('./pages/PlanGraph'))
const PlanBoard = lazy(() => import('./pages/PlanBoard'))
const UploadPlan = lazy(() => import('./pages/UploadPlan'))
const Error404 = lazy(() => import('./pages/Error404'))

const SPLASH_DURATION_MS = 2600
const SPLASH_FADE_MS = 600

function PageSuspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader text="Abriendo." />}>{children}</Suspense>
}

function AuthShell() {
  const { user, status } = useAuth();

  if (status === 'loading') {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-app">
      <main className="w-100 d-flex justify-content-center">
        <Outlet />
      </main>
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
      <AuthProvider>
        <CareerSelectionProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AuthShell />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
              <Route element={<ProtectedRoute />}>
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
              </Route>
            </Routes>
          </BrowserRouter>
        </CareerSelectionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}