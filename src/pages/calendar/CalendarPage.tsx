import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { addEvent, deleteEvent } from '../../lib/firestore'
import { connectGoogleCalendar, fetchGoogleCalendarEvents, importGoogleEventsToFirestore } from '../../lib/googleCalendar'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { he } from 'date-fns/locale'
import type { CalendarEvent, FamilyMember, RecurrenceType } from '../../types'

const EVENT_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  none: 'לא חוזר',
  daily: 'כל יום',
  weekly: 'כל שבוע',
  monthly: 'כל חודש',
  yearly: 'כל שנה',
}

function isRecurringOnDay(event: CalendarEvent, day: Date): boolean {
  if (!event.recurrence || event.recurrence === 'none') return false
  const eventDate = new Date(event.startTime)
  // Only show recurrence from the day after the original
  if (day <= eventDate) return false
  switch (event.recurrence) {
    case 'daily': return true
    case 'weekly': return day.getDay() === eventDate.getDay()
    case 'monthly': return day.getDate() === eventDate.getDate()
    case 'yearly':
      return day.getDate() === eventDate.getDate() && day.getMonth() === eventDate.getMonth()
    default: return false
  }
}

export default function CalendarPage() {
  const { t } = useTranslation()
  const { currentUser, family, events, familyMembers } = useAppStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [showAdd, setShowAdd] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    isAllDay: true,
    color: EVENT_COLORS[0],
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: '',
    attendees: [] as string[],
    recurrence: 'none' as RecurrenceType,
  })
  const [loading, setLoading] = useState(false)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [gcalStatus, setGcalStatus] = useState('')

  const isParent = currentUser?.role === 'parent'

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  function getEventsForDay(day: Date): CalendarEvent[] {
    const direct = events.filter((e) => isSameDay(new Date(e.startTime), day))
    const recurring = events.filter((e) => isRecurringOnDay(e, day))
    return [...direct, ...recurring]
  }

  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : []

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newEvent.title.trim() || !currentUser || !family) return
    setLoading(true)
    try {
      const startDate = new Date(newEvent.startTime)
      const endDate = newEvent.endTime ? new Date(newEvent.endTime) : undefined

      await addEvent({
        familyId: family.id,
        title: newEvent.title.trim(),
        description: newEvent.description,
        location: newEvent.location,
        isAllDay: newEvent.isAllDay,
        startTime: startDate,
        endTime: endDate,
        color: newEvent.color,
        createdBy: currentUser.id,
        attendees: newEvent.attendees,
        syncSource: 'local',
        recurrence: newEvent.recurrence,
      })
      setShowAdd(false)
      setNewEvent({
        title: '',
        description: '',
        location: '',
        isAllDay: true,
        color: EVENT_COLORS[0],
        startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endTime: '',
        attendees: [],
        recurrence: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('למחוק אירוע זה?')) return
    await deleteEvent(eventId)
  }

  function toggleAttendee(memberId: string) {
    setNewEvent((prev) => ({
      ...prev,
      attendees: prev.attendees.includes(memberId)
        ? prev.attendees.filter((id) => id !== memberId)
        : [...prev.attendees, memberId],
    }))
  }

  async function handleConnectGoogleCalendar() {
    if (!currentUser || !family) return
    setGcalLoading(true)
    setGcalStatus('')
    try {
      const token = await connectGoogleCalendar()
      setGcalStatus('מוריד אירועים מגוגל...')
      const googleEvents = await fetchGoogleCalendarEvents(token)
      const count = await importGoogleEventsToFirestore(googleEvents, family.id, currentUser.id)
      setGcalStatus(`✅ יובאו ${count} אירועים חדשים מגוגל קלנדר!`)
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || 'שגיאה'
      if (!msg.includes('popup-closed')) {
        setGcalStatus(`❌ שגיאה: ${msg}`)
      } else {
        setGcalStatus('')
      }
    } finally {
      setGcalLoading(false)
    }
  }

  const hebrewDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">📅 {t('calendar.title')}</h1>
        <div className="flex gap-2">
          {isParent && (
            <button
              onClick={handleConnectGoogleCalendar}
              disabled={gcalLoading}
              className="bg-white border border-slate-200 text-slate-700 text-xs font-medium px-3 py-2 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {gcalLoading ? 'מסנכרן...' : 'סנכרן גוגל'}
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
          >
            + {t('calendar.addEvent')}
          </button>
        </div>
      </div>

      {/* Google Calendar status */}
      {gcalStatus && (
        <div className={`text-sm rounded-xl px-4 py-2 mb-3 ${
          gcalStatus.startsWith('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : gcalStatus.startsWith('❌')
            ? 'bg-red-50 text-red-600 border border-red-200'
            : 'bg-blue-50 text-blue-600 border border-blue-200'
        }`}>
          {gcalStatus}
        </div>
      )}

      {/* Add Event Form */}
      {showAdd && (
        <div className="card mb-4 animate-slide-up">
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              className="input-field"
              placeholder={t('calendar.eventTitle')}
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
              required
              autoFocus
            />

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={newEvent.isAllDay}
                  onChange={(e) => setNewEvent({ ...newEvent, isAllDay: e.target.checked })}
                  className="rounded"
                />
                {t('calendar.allDay')}
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('calendar.startTime')}</label>
                <input
                  type={newEvent.isAllDay ? 'date' : 'datetime-local'}
                  className="input-field text-sm py-2"
                  value={newEvent.isAllDay ? newEvent.startTime.split('T')[0] : newEvent.startTime}
                  onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('calendar.endTime')}</label>
                <input
                  type={newEvent.isAllDay ? 'date' : 'datetime-local'}
                  className="input-field text-sm py-2"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">🔁 חזרתיות</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as RecurrenceType[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewEvent({ ...newEvent, recurrence: r })}
                    className={`flex-none text-xs px-3 py-1.5 rounded-xl transition-all font-medium ${
                      newEvent.recurrence === r
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {RECURRENCE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              className="input-field"
              placeholder={t('calendar.location')}
              value={newEvent.location}
              onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
            />

            {/* Color picker */}
            <div className="flex gap-2">
              {EVENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewEvent({ ...newEvent, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    newEvent.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Attendees */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">{t('calendar.attendees')}</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {familyMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAttendee(member.id)}
                    className={`flex-none flex flex-col items-center p-2 rounded-xl transition-all ${
                      newEvent.attendees.includes(member.id)
                        ? 'bg-primary-100 ring-2 ring-primary-400'
                        : 'bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{member.avatarEmoji}</span>
                    <span className="text-[10px] text-slate-600 max-w-[50px] truncate">{member.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1 py-2 text-sm" disabled={loading}>
                {loading ? t('common.loading') : t('common.add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar Header */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl active:scale-95 transition-all">
            ←
          </button>
          <h2 className="font-bold text-slate-800">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h2>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-100 rounded-xl active:scale-95 transition-all">
            →
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 mb-1">
          {hebrewDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: monthStart.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const _isToday = isToday(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all active:scale-90 ${
                  isSelected
                    ? 'bg-primary-500 text-white'
                    : _isToday
                    ? 'bg-primary-50 text-primary-600 font-bold'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm font-medium">{format(day, 'd')}</span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, i) => (
                      <span
                        key={ev.id + i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: isSelected ? 'white' : ev.color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      {selectedDate && (
        <div>
          <h3 className="section-title">
            {isToday(selectedDate) ? '📅 היום' : format(selectedDate, 'EEEE, d MMMM', { locale: he })}
          </h3>
          {selectedDateEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-slate-400 text-sm">אין אירועים ביום זה</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map((event, i) => (
                <EventCard
                  key={event.id + i}
                  event={event}
                  isParent={isParent}
                  currentUserId={currentUser?.id || ''}
                  onDelete={() => handleDelete(event.id)}
                  familyMembers={familyMembers}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upcoming Events (when no date selected) */}
      {!selectedDate && (
        <div>
          <h3 className="section-title">📅 אירועים קרובים</h3>
          {events.filter((e) => new Date(e.startTime) >= new Date()).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-slate-400 text-sm">אין אירועים קרובים</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => new Date(e.startTime) >= new Date())
                .slice(0, 10)
                .map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isParent={isParent}
                    currentUserId={currentUser?.id || ''}
                    onDelete={() => handleDelete(event.id)}
                    familyMembers={familyMembers}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface EventCardProps {
  event: CalendarEvent
  isParent: boolean
  currentUserId: string
  onDelete: () => void
  familyMembers: FamilyMember[]
}

function EventCard({ event, isParent, currentUserId, onDelete, familyMembers }: EventCardProps) {
  const canDelete = isParent || event.createdBy === currentUserId

  return (
    <div className="card flex items-start gap-3">
      <div className="w-1 self-stretch rounded-full flex-none" style={{ backgroundColor: event.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-800 truncate">{event.title}</p>
          {event.recurrence && event.recurrence !== 'none' && (
            <span className="text-xs text-slate-400 flex-none">🔁</span>
          )}
          {event.syncSource === 'google' && (
            <span className="text-xs text-blue-400 flex-none">G</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {event.isAllDay
            ? 'כל היום'
            : format(new Date(event.startTime), 'HH:mm') +
              (event.endTime ? ` - ${format(new Date(event.endTime), 'HH:mm')}` : '')}
        </p>
        {event.location && (
          <p className="text-xs text-slate-400 mt-0.5">📍 {event.location}</p>
        )}
        {event.attendees.length > 0 && (
          <div className="flex gap-1 mt-1">
            {event.attendees.map((aid) => {
              const m = familyMembers.find((fm) => fm.id === aid)
              return m ? (
                <span key={aid} className="text-sm" title={m.displayName}>{m.avatarEmoji}</span>
              ) : null
            })}
          </div>
        )}
      </div>
      {canDelete && (
        <button onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors text-sm flex-none">
          🗑️
        </button>
      )}
    </div>
  )
}
