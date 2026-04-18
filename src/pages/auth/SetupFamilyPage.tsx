import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { createFamily } from '../../lib/firestore'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAppStore } from '../../store'

export default function SetupFamilyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser } = useAppStore()
  const [familyName, setFamilyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!familyName.trim()) return
    if (!currentUser) {
      setError('משתמש לא מחובר - נסה להתנתק ולהתחבר מחדש')
      return
    }
    setLoading(true)
    setError('')

    try {
      const family = await createFamily(familyName.trim(), currentUser.id)
      await updateDoc(doc(db, 'users', currentUser.id), { familyId: family.id })
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || ''
      setError(msg.length < 100 ? msg : 'אירעה שגיאה ביצירת המשפחה. נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-slate-800">{t('auth.createFamily')}</h1>
          <p className="text-slate-500 mt-1">תנו שם למשפחה שלכם</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.familyName')}</label>
            <input
              type="text"
              className="input-field text-center text-xl font-semibold"
              placeholder="משפחת כהן"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !familyName.trim()}>
            {loading ? t('common.loading') : 'צור משפחה! 🏠'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/join" className="text-primary-600 font-semibold text-sm hover:underline">
            {t('auth.orJoin')} →
          </Link>
        </div>
      </div>
    </div>
  )
}
