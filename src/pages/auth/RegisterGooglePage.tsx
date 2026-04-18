import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { completeGoogleProfile } from '../../lib/googleAuth'
import { AVATAR_EMOJIS } from '../../types'
import type { UserRole } from '../../types'

export default function RegisterGooglePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { uid: string; displayName: string; email: string } | null

  const [role, setRole] = useState<UserRole>('parent')
  const [avatarEmoji, setAvatarEmoji] = useState('😊')
  const [displayName, setDisplayName] = useState(state?.displayName || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!state?.uid) {
    navigate('/login')
    return null
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    setLoading(true)
    setError('')
    try {
      await completeGoogleProfile(state.uid, displayName, state.email, role, avatarEmoji)
      navigate(role === 'parent' ? '/setup' : '/join')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') setError('האימייל כבר רשום במערכת')
      else setError('אירעה שגיאה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">{avatarEmoji}</div>
          <h1 className="text-2xl font-bold text-slate-800">עוד שלב אחד!</h1>
          <p className="text-slate-500 mt-1">ספר לנו קצת עליך</p>
        </div>

        <form onSubmit={handleComplete} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">שם תצוגה</label>
            <input
              type="text"
              className="input-field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">תפקיד במשפחה</label>
            <div className="grid grid-cols-2 gap-3">
              {(['parent', 'child'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    role === r
                      ? 'border-primary-400 bg-primary-50 text-primary-700'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-3xl mb-1">{r === 'parent' ? '👨‍👩‍👧' : '👦'}</div>
                  <div className="font-semibold text-sm">{r === 'parent' ? 'הורה' : 'ילד/ה'}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">בחר אווטאר</label>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarEmoji(emoji)}
                  className={`text-2xl p-2 rounded-xl transition-all ${
                    avatarEmoji === emoji
                      ? 'bg-primary-100 ring-2 ring-primary-400 scale-110'
                      : 'bg-slate-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'שומר...' : 'התחל! 🎉'}
          </button>
        </form>
      </div>
    </div>
  )
}
