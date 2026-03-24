import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'

export default function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, family, shoppingItems, tasks, events, announcements, familyMembers } = useAppStore()

  const today = new Date()
  const pendingItems = shoppingItems.filter((i) => i.status === 'pending').length
  const approvedItems = shoppingItems.filter((i) => i.status === 'approved').length
  const myTasks = tasks.filter((t) => t.assignedTo === currentUser?.id && t.status !== 'done')
  const todayEvents = events.filter((e) => {
    const d = new Date(e.startTime)
    return d.toDateString() === today.toDateString()
  })
  const pinnedAnnouncements = announcements.filter((a) => a.pinned).slice(0, 2)

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'בוקר טוב'
    if (h < 17) return 'צהריים טובים'
    return 'ערב טוב'
  }

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Greeting */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">
          {greeting()}, {currentUser?.displayName} {currentUser?.avatarEmoji}
        </h2>
        <p className="text-slate-500 text-sm">
          {format(today, 'EEEE, d MMMM yyyy', { locale: he })} • {family?.name}
        </p>
      </div>

      {/* Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-2 mb-5">
          {pinnedAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="card flex items-start gap-3 border-r-4"
              style={{ borderRightColor: ann.color }}
            >
              <span className="text-xl">{ann.createdByEmoji}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{ann.content}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ann.createdByName}</p>
              </div>
              <span className="text-xs text-yellow-500 mr-auto">📌</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate('/shopping')}
          className="card text-center active:scale-95 transition-all hover:shadow-md"
        >
          <div className="text-3xl mb-1">🛒</div>
          <div className="text-2xl font-bold text-slate-800">{approvedItems + pendingItems}</div>
          <div className="text-xs text-slate-500">{t('nav.shopping')}</div>
          {pendingItems > 0 && (
            <div className="mt-1 badge bg-orange-100 text-orange-600">{pendingItems} ממתינים</div>
          )}
        </button>

        <button
          onClick={() => navigate('/tasks')}
          className="card text-center active:scale-95 transition-all hover:shadow-md"
        >
          <div className="text-3xl mb-1">✅</div>
          <div className="text-2xl font-bold text-slate-800">{myTasks.length}</div>
          <div className="text-xs text-slate-500">המשימות שלי</div>
          {myTasks.length > 0 && (
            <div className="mt-1 badge bg-blue-100 text-blue-600">לביצוע</div>
          )}
        </button>
      </div>

      {/* Today's Events */}
      {todayEvents.length > 0 && (
        <div className="mb-5">
          <h3 className="section-title">📅 אירועים היום</h3>
          <div className="space-y-2">
            {todayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate('/calendar')}
                className="card w-full text-right flex items-center gap-3 active:scale-95 transition-all"
              >
                <div
                  className="w-1 self-stretch rounded-full flex-none"
                  style={{ backgroundColor: event.color || '#0ea5e9' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{event.title}</p>
                  {!event.isAllDay && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(event.startTime), 'HH:mm')}
                      {event.endTime && ` - ${format(new Date(event.endTime), 'HH:mm')}`}
                    </p>
                  )}
                  {event.isAllDay && <p className="text-xs text-slate-500">כל היום</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* My Tasks */}
      {myTasks.length > 0 && (
        <div className="mb-5">
          <h3 className="section-title">✅ המשימות שלי</h3>
          <div className="space-y-2">
            {myTasks.slice(0, 3).map((task) => (
              <button
                key={task.id}
                onClick={() => navigate('/tasks')}
                className="card w-full text-right flex items-center gap-3 active:scale-95 transition-all"
              >
                <span className="text-2xl">{task.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{task.title}</p>
                  {task.dueDate && (
                    <p className="text-xs text-slate-500">
                      עד {format(new Date(task.dueDate), 'dd/MM')}
                    </p>
                  )}
                </div>
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                  +{task.points}⭐
                </span>
              </button>
            ))}
            {myTasks.length > 3 && (
              <button onClick={() => navigate('/tasks')} className="text-primary-600 text-sm font-medium w-full text-center py-1">
                ועוד {myTasks.length - 3} משימות →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Family Points Leaderboard */}
      {familyMembers.length > 1 && (
        <div className="mb-5">
          <h3 className="section-title">🏆 ניקוד השבוע</h3>
          <div className="card space-y-3">
            {[...familyMembers]
              .sort((a, b) => b.points - a.points)
              .slice(0, 4)
              .map((member, idx) => (
                <div key={member.id} className="flex items-center gap-3">
                  <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                  <span className="text-xl">{member.avatarEmoji}</span>
                  <span className="flex-1 font-medium text-slate-800 truncate">
                    {member.displayName}
                    {member.id === currentUser?.id && ' (אני)'}
                  </span>
                  <span className="font-bold text-primary-600">{member.points}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
