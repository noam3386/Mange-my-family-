import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../../lib/firebase'
import { createUserProfile, getFamilyByInviteCode } from '../../lib/firestore'
import { useTranslation } from 'react-i18next'
import { AVATAR_EMOJIS } from '../../types'
import type { UserRole } from '../../types'
import { updateDoc, doc } from 'firebase/firestore'

export default function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<UserRole>('parent')
  const [avatarEmoji, setAvatarEmoji] = useState('😊')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) {
      if (!email || !password || !displayName) return
      setStep(2)
      return
    }

    setLoading(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await createUserProfile(cred.user.uid, {
        displayName,
        email,
        role,
        familyId: '',
        avatarEmoji,
        language: 'he',
      })

      const pendingFamilyId = sessionStorage.getItem('pendingFamilyId')
      const pendingInviteCode = sessionStorage.getItem('pendingInviteCode')

      if (pendingFamilyId) {
        sessionStorage.removeItem('pendingFamilyId')
        await updateDoc(doc(db, 'users', cred.user.uid), { familyId: pendingFamilyId })
        navigate('/')
      } else if (pendingInviteCode) {
        sessionStorage.removeItem('pendingInviteCode')
        const family = await getFamilyByInviteCode(pendingInviteCode)
        if (family) {
          await updateDoc(doc(db, 'users', cred.user.uid), { familyId: family.id })
          navigate('/')
        } else {
          navigate('/join')
        }
      } else {
        navigate(role === 'parent' ? '/setup' : '/join')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') setError(t('auth.errors.emailInUse'))
      else if (code === 'auth/weak-password') setError(t('auth.errors.weakPassword'))
      else setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">{avatarEmoji}</div>
          <h1 className="text-2xl font-bold text-slate-800">{t('auth.registerTitle')}</h1>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.displayName')}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('auth.displayName')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password')}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="לפחות 6 תווים"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  dir="ltr"
                />
              </div>
              <button type="submit" className="btn-primary">
                המשך →
              </button>
            </>
          ) : (
            <>
              {/* Role selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('auth.role')}</label>
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
                      <div className="font-semibold text-sm">{t(`auth.${r}`)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar picker */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('auth.avatarPicker')}</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatarEmoji(emoji)}
                      className={`text-2xl p-2 rounded-xl transition-all ${
                        avatarEmoji === emoji
                          ? 'bg-primary-100 ring-2 ring-primary-400 scale-110'
                          : 'bg-slate-50 hover:bg-slate-100'
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

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost flex-none px-4">
                  ←
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? t('common.loading') : t('auth.register')}
                </button>
              </div>
            </>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
