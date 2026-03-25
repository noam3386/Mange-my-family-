import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFamilyByInviteCode } from '../../lib/firestore'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAppStore } from '../../store'

export default function JoinFamilyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { currentUser } = useAppStore()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code || code.length < 6) return
    setLoading(true)
    setError('')

    try {
      const family = await getFamilyByInviteCode(code.trim().toUpperCase())
      if (!family) {
        setError(t('auth.errors.invalidCode'))
        return
      }

      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.id), { familyId: family.id })
        navigate('/')
      } else {
        // Save for after registration
        sessionStorage.setItem('pendingFamilyId', family.id)
        navigate('/register')
      }
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🔗</div>
          <h1 className="text-2xl font-bold text-slate-800">{t('auth.joinFamily')}</h1>
          <p className="text-slate-500 mt-1">הכניסו את קוד ההזמנה מהמשפחה</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.inviteCode')}</label>
            <input
              type="text"
              className="input-field text-center text-2xl font-bold tracking-widest uppercase"
              placeholder="ABC123"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || code.length < 6}>
            {loading ? t('common.loading') : t('auth.joinWithCode')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/login')} className="text-slate-500 text-sm hover:text-slate-700">
            ← {t('common.back')}
          </button>
        </div>
      </div>
    </div>
  )
}
