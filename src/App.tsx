import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
import { useAuth } from './hooks/useAuth'
import { useRealtimeData } from './hooks/useRealtimeData'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import RegisterGooglePage from './pages/auth/RegisterGooglePage'
import JoinFamilyPage from './pages/auth/JoinFamilyPage'
import SetupFamilyPage from './pages/auth/SetupFamilyPage'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import ShoppingPage from './pages/shopping/ShoppingPage'
import TasksPage from './pages/tasks/TasksPage'
import CalendarPage from './pages/calendar/CalendarPage'
import FamilyPage from './pages/family/FamilyPage'

function AppContent() {
  useAuth()
  useRealtimeData()

  const { currentUser, family, isAuthLoading } = useAppStore()

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🏠</div>
          <p className="text-primary-600 font-semibold text-lg">טוען...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-google" element={<RegisterGooglePage />} />
        <Route path="/join" element={<JoinFamilyPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (!family) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupFamilyPage />} />
        <Route path="/join" element={<JoinFamilyPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shopping" element={<ShoppingPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/family" element={<FamilyPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()
  if (!needRefresh) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary-500 text-white text-sm flex items-center justify-between px-4 py-2 shadow-lg">
      <span>עדכון חדש זמין!</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-white text-primary-600 font-semibold px-3 py-1 rounded-lg text-xs"
      >
        עדכן עכשיו
      </button>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UpdateBanner />
      <AppContent />
    </BrowserRouter>
  )
}
