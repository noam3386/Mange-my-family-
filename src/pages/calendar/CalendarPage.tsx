import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { addEvent, deleteEvent } from '../../lib/firestore'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { he } from 'date-fns/locale'
import type { CalendarEvent, FamilyMember } from '../../types'

const EVENT_COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

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
  })
  const [loading, setLoading] = useState(false)

  const isParent = currentUser?.role === 'parent'

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const selectedDateEvents = selectedDate
    ? events.filter((e) => isSameDay(new Date(e.startTime), selectedDate))
    : []

  function getEventsForDay(day: Date) {
    return events.filter((e) => isSameDay(new Date(e.startTime), day))
  }

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

  const hebrewDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">📅 {t('calendar.title')}</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
        >
          + {t('calendar.addEvent')}
        </button>
      </div>

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
          {/* Empty cells for day of week offset */}
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
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span
                        key={ev.id}
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
              {selectedDateEvents.map((event) => (
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

      {/* Upcoming Events */}
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
        <p className="font-semibold text-slate-800 truncate">{event.title}</p>
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
