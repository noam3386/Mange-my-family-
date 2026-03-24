import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from './store'
import { useAuth } from './hooks/useAuth'
import { useRealtimeData } from './hooks/useRealtimeData'

// Pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
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

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
