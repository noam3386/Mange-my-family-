import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'

const tabs = [
  { path: '/', icon: '🏠', key: 'home' },
  { path: '/shopping', icon: '🛒', key: 'shopping' },
  { path: '/tasks', icon: '✅', key: 'tasks' },
  { path: '/calendar', icon: '📅', key: 'calendar' },
  { path: '/family', icon: '👨‍👩‍👧', key: 'family' },
]

export default function MainLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, shoppingItems, tasks } = useAppStore()

  const pendingItems = shoppingItems.filter((i) => i.status === 'pending').length
  const todayTasks = tasks.filter((t) => t.status !== 'done' && t.assignedTo === currentUser?.id).length

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="font-bold text-slate-800 text-base">{t('app.name')}</span>
        </div>
        <button
          onClick={() => navigate('/family')}
          className="flex items-center gap-2 bg-slate-50 rounded-full px-3 py-1.5 active:scale-95 transition-all"
        >
          <span className="text-xl">{currentUser?.avatarEmoji || '😊'}</span>
          <span className="text-sm font-medium text-slate-700 max-w-[80px] truncate">{currentUser?.displayName}</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 safe-bottom z-10 shadow-lg">
        <div className="flex max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path
            const badge = tab.key === 'shopping' ? pendingItems : tab.key === 'tasks' ? todayTasks : 0

            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-all active:scale-90 relative ${
                  isActive ? 'text-primary-600' : 'text-slate-400'
                }`}
              >
                <span className={`text-2xl transition-transform ${isActive ? 'scale-110' : ''}`}>{tab.icon}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary-600' : 'text-slate-400'}`}>
                  {t(`nav.${tab.key}`)}
                </span>
                {badge > 0 && (
                  <span className="absolute top-1 right-[calc(50%-8px)] bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
