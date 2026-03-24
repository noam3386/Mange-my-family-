import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import { addTask, updateTask, completeTask, deleteTask } from '../../lib/firestore'
import type { Task } from '../../types'

const CHORE_TEMPLATES = [
  { key: 'dishes', icon: '🍽️', points: 5 },
  { key: 'vacuum', icon: '🧹', points: 10 },
  { key: 'laundry', icon: '👕', points: 10 },
  { key: 'cooking', icon: '👨‍🍳', points: 15 },
  { key: 'garbage', icon: '🗑️', points: 5 },
  { key: 'shopping', icon: '🛒', points: 10 },
  { key: 'bathroom', icon: '🚿', points: 15 },
  { key: 'floor', icon: '🧽', points: 10 },
  { key: 'room', icon: '🛏️', points: 8 },
  { key: 'table', icon: '🍴', points: 5 },
  { key: 'pet', icon: '🐶', points: 8 },
  { key: 'garden', icon: '🌱', points: 12 },
  { key: 'ironing', icon: '👔', points: 10 },
  { key: 'windows', icon: '🪟', points: 12 },
  { key: 'fridge', icon: '❄️', points: 10 },
  { key: 'recycle', icon: '♻️', points: 5 },
  { key: 'car', icon: '🚗', points: 15 },
  { key: 'mail', icon: '📬', points: 3 },
  { key: 'oven', icon: '🍳', points: 12 },
  { key: 'homework', icon: '📚', points: 10 },
]

type ViewMode = 'board' | 'list'

export default function TasksPage() {
  const { t } = useTranslation()
  const { currentUser, family, tasks, familyMembers } = useAppStore()
  const [view, setView] = useState<ViewMode>('board')
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState<'template' | 'custom'>('template')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof CHORE_TEMPLATES[0] | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customIcon, setCustomIcon] = useState('⭐')
  const [assignTo, setAssignTo] = useState<string>('')
  const [points, setPoints] = useState(5)
  const [loading, setLoading] = useState(false)

  const isParent = currentUser?.role === 'parent'

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!family || !currentUser) return
    const title = addMode === 'template' && selectedTemplate
      ? t(`tasks.templates.${selectedTemplate.key}`)
      : customTitle.trim()
    if (!title) return

    setLoading(true)
    try {
      const assignedMember = familyMembers.find((m) => m.id === assignTo)
      await addTask({
        familyId: family.id,
        title,
        icon: addMode === 'template' ? selectedTemplate!.icon : customIcon,
        points: addMode === 'template' ? selectedTemplate!.points : points,
        assignedTo: assignTo || undefined,
        assignedToName: assignedMember?.displayName,
        createdBy: currentUser.id,
        status: 'todo',
        isRecurring: false,
      })
      setShowAdd(false)
      setSelectedTemplate(null)
      setCustomTitle('')
      setAssignTo('')
    } finally {
      setLoading(false)
    }
  }

  async function handleComplete(task: Task) {
    if (!currentUser) return
    await completeTask(task.id, currentUser.id, task.points)
  }

  async function handleStatusChange(task: Task, status: Task['status']) {
    await updateTask(task.id, { status })
  }

  async function handleDelete(taskId: string) {
    if (!confirm('למחוק משימה זו?')) return
    await deleteTask(taskId)
  }

  // Board view: columns per family member + unassigned
  const boardColumns = [
    { id: 'unassigned', label: 'לא מוקצה', emoji: '📋', tasks: tasks.filter((t) => !t.assignedTo && t.status !== 'done') },
    ...familyMembers.map((m) => ({
      id: m.id,
      label: m.displayName,
      emoji: m.avatarEmoji,
      color: m.color,
      tasks: tasks.filter((t) => t.assignedTo === m.id && t.status !== 'done'),
    })),
  ]

  const completedTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">✅ {t('tasks.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView(view === 'board' ? 'list' : 'board')}
            className="text-sm bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl"
          >
            {view === 'board' ? '📋 רשימה' : '📊 לוח'}
          </button>
          {isParent && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
            >
              + {t('tasks.addTask')}
            </button>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      {showAdd && isParent && (
        <div className="card mb-4 animate-slide-up">
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setAddMode('template')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                addMode === 'template' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              📋 {t('tasks.fromTemplate')}
            </button>
            <button
              type="button"
              onClick={() => setAddMode('custom')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                addMode === 'custom' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              ✏️ {t('tasks.customTask')}
            </button>
          </div>

          <form onSubmit={handleAddTask} className="space-y-3">
            {addMode === 'template' ? (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {CHORE_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`flex flex-col items-center p-2 rounded-xl text-center transition-all ${
                      selectedTemplate?.key === tmpl.key
                        ? 'bg-primary-100 ring-2 ring-primary-400'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-2xl">{tmpl.icon}</span>
                    <span className="text-[10px] text-slate-600 mt-1 leading-tight">
                      {t(`tasks.templates.${tmpl.key}`)}
                    </span>
                    <span className="text-[10px] text-amber-600 font-semibold">+{tmpl.points}⭐</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field"
                    placeholder="כותרת המשימה"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field text-center text-2xl"
                    placeholder="📌"
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    maxLength={2}
                  />
                  <div className="flex-1">
                    <input
                      type="number"
                      className="input-field"
                      placeholder="נקודות"
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Assign to */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('tasks.assignTo')}</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setAssignTo('')}
                  className={`flex-none flex flex-col items-center p-2 rounded-xl transition-all ${
                    !assignTo ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-slate-50'
                  }`}
                >
                  <span className="text-xl">📋</span>
                  <span className="text-[10px] text-slate-600 mt-0.5">כולם</span>
                </button>
                {familyMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setAssignTo(member.id)}
                    className={`flex-none flex flex-col items-center p-2 rounded-xl transition-all ${
                      assignTo === member.id ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-slate-50'
                    }`}
                  >
                    <span className="text-xl">{member.avatarEmoji}</span>
                    <span className="text-[10px] text-slate-600 mt-0.5 max-w-[50px] truncate">{member.displayName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2 text-sm">
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-2 text-sm"
                disabled={loading || (addMode === 'template' && !selectedTemplate) || (addMode === 'custom' && !customTitle.trim())}
              >
                {loading ? t('common.loading') : t('common.add')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Board View */}
      {view === 'board' ? (
        <div className="space-y-4">
          {boardColumns.map((col) => (
            col.tasks.length > 0 && (
              <div key={col.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{col.emoji}</span>
                  <h3 className="font-semibold text-slate-700">{col.label}</h3>
                  <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {col.tasks.length}
                  </span>
                  {'color' in col && (
                    <span className="w-3 h-3 rounded-full flex-none" style={{ backgroundColor: col.color }} />
                  )}
                </div>
                <div className="space-y-2">
                  {col.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      currentUserId={currentUser?.id || ''}
                      isParent={isParent}
                      onComplete={() => handleComplete(task)}
                      onStatusChange={(s) => handleStatusChange(task, s)}
                      onDelete={() => handleDelete(task.id)}
                    />
                  ))}
                </div>
              </div>
            )
          ))}

          {tasks.filter((t) => t.status !== 'done').length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-slate-500 font-medium">אין משימות פתוחות!</p>
            </div>
          )}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-500 text-sm mb-2">✅ הושלמו ({completedTasks.length})</h3>
              <div className="space-y-2 opacity-60">
                {completedTasks.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    currentUserId={currentUser?.id || ''}
                    isParent={isParent}
                    onComplete={() => {}}
                    onStatusChange={(s) => handleStatusChange(task, s)}
                    onDelete={() => handleDelete(task.id)}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-slate-500 font-medium">{t('tasks.empty')}</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                currentUserId={currentUser?.id || ''}
                isParent={isParent}
                onComplete={() => handleComplete(task)}
                onStatusChange={(s) => handleStatusChange(task, s)}
                onDelete={() => handleDelete(task.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface TaskCardProps {
  task: Task
  currentUserId: string
  isParent: boolean
  onComplete: () => void
  onStatusChange: (status: Task['status']) => void
  onDelete: () => void
  compact?: boolean
}

function TaskCard({ task, currentUserId, isParent, onComplete, onDelete, compact }: TaskCardProps) {
  const { familyMembers } = useAppStore()
  const isDone = task.status === 'done'
  const isAssignedToMe = task.assignedTo === currentUserId
  const canComplete = isAssignedToMe || isParent

  const assignedMember = familyMembers.find((m) => m.id === task.assignedTo)

  return (
    <div className={`card flex items-center gap-3 transition-all ${isDone ? 'opacity-60' : ''}`}>
      {/* Complete button */}
      <button
        onClick={canComplete && !isDone ? onComplete : undefined}
        disabled={!canComplete || isDone}
        className={`flex-none w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
          isDone
            ? 'bg-green-100 border-green-400 text-green-600'
            : canComplete
            ? 'border-slate-300 hover:border-primary-400 hover:bg-primary-50'
            : 'border-slate-200 cursor-default'
        }`}
      >
        {isDone ? '✓' : ''}
      </button>

      <span className="text-xl flex-none">{task.icon}</span>

      <div className="flex-1 min-w-0">
        <p className={`font-medium text-slate-800 truncate ${isDone ? 'line-through text-slate-400' : ''}`}>
          {task.title}
        </p>
        {!compact && (
          <div className="flex items-center gap-2 mt-0.5">
            {assignedMember && (
              <span className="text-xs text-slate-500">
                {assignedMember.avatarEmoji} {assignedMember.displayName}
              </span>
            )}
            {!task.assignedTo && <span className="text-xs text-slate-400">לכולם</span>}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
          +{task.points}⭐
        </span>
        {(isParent || task.assignedTo === currentUserId || task.createdBy === currentUserId) && !isDone && (
          <button
            onClick={onDelete}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  )
}
