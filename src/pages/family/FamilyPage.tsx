import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { useAppStore } from '../../store'
import { addAnnouncement, deleteAnnouncement } from '../../lib/firestore'
import { db } from '../../lib/firebase'
import { updateDoc, doc } from 'firebase/firestore'
import { setAppLanguage } from '../../i18n'

const ANNOUNCEMENT_COLORS = [
  '#fbbf24', '#34d399', '#60a5fa', '#f87171',
  '#a78bfa', '#f472b6', '#2dd4bf', '#fb923c',
]

export default function FamilyPage() {
  const { t } = useTranslation()
  const { currentUser, family, familyMembers, announcements } = useAppStore()
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false)
  const [annText, setAnnText] = useState('')
  const [annColor, setAnnColor] = useState(ANNOUNCEMENT_COLORS[0])
  const [loading, setLoading] = useState(false)

  const isParent = currentUser?.role === 'parent'

  async function handleCopyCode() {
    if (!family) return
    await navigator.clipboard.writeText(family.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function getInviteLink() {
    if (!family) return ''
    return `https://famliy-app-planning.web.app/join?code=${family.inviteCode}`
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(getInviteLink())
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  async function handleShareCode() {
    if (!family || !navigator.share) {
      handleCopyCode()
      return
    }
    try {
      await navigator.share({
        title: `הצטרף למשפחת ${family.name}`,
        text: `הצטרף אלינו! קוד הזמנה: ${family.inviteCode}`,
        url: getInviteLink(),
      })
    } catch {
      handleCopyCode()
    }
  }

  async function handleAddAnnouncement(e: React.FormEvent) {
    e.preventDefault()
    if (!annText.trim() || !currentUser || !family) return
    setLoading(true)
    try {
      await addAnnouncement({
        familyId: family.id,
        content: annText.trim(),
        createdBy: currentUser.id,
        createdByName: currentUser.displayName,
        createdByEmoji: currentUser.avatarEmoji,
        color: annColor,
        pinned: false,
      })
      setAnnText('')
      setShowAnnouncement(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePin(annId: string, pinned: boolean) {
    await updateDoc(doc(db, 'announcements', annId), { pinned: !pinned })
  }

  async function handleDeleteAnn(annId: string) {
    if (!confirm('למחוק הודעה זו?')) return
    await deleteAnnouncement(annId)
  }

  async function handleLogout() {
    if (!confirm('להתנתק?')) return
    await signOut(auth)
  }

  function handleLanguage(lang: 'he' | 'en') {
    setAppLanguage(lang)
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.id), { language: lang })
    }
  }

  // Sorted leaderboard
  const leaderboard = [...familyMembers].sort((a, b) => b.points - a.points)

  function getMemberBadges(member: typeof familyMembers[0]) {
    const badges: { icon: string; label: string }[] = []
    if (member.points >= 1) badges.push({ icon: '🌟', label: 'משימה ראשונה' })
    if (member.streak >= 3) badges.push({ icon: '🔥', label: '3 ימים ברצף' })
    if (member.streak >= 7) badges.push({ icon: '💪', label: 'שבוע שלם' })
    if (member.points >= 50) badges.push({ icon: '⭐', label: '50 נקודות' })
    if (member.points >= 100) badges.push({ icon: '🏆', label: '100 נקודות' })
    if (member.points >= 250) badges.push({ icon: '👑', label: 'אלוף!' })
    return badges
  }

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">👨‍👩‍👧 {t('family.title')}</h1>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-red-500 transition-colors">
          {t('auth.logout')}
        </button>
      </div>

      {/* Family Info + Invite Code */}
      {family && (
        <div className="card mb-4 bg-gradient-to-br from-primary-500 to-primary-700 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-primary-100 text-xs">{t('family.title')}</p>
              <h2 className="text-xl font-bold">{family.name}</h2>
              <p className="text-primary-100 text-xs mt-0.5">
                {familyMembers.length} חברים
              </p>
            </div>
            <span className="text-5xl">🏠</span>
          </div>
          <div className="bg-white/20 rounded-xl p-3 flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-primary-100">{t('family.inviteCode')}</p>
              <p className="text-2xl font-bold tracking-widest" dir="ltr">{family.inviteCode}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCode}
                className="bg-white/30 text-white text-sm px-3 py-1.5 rounded-xl active:scale-95 transition-all"
              >
                {copied ? '✅ ' + t('family.copied') : t('family.copyCode')}
              </button>
              {'share' in navigator && (
                <button
                  onClick={handleShareCode}
                  className="bg-white/30 text-white text-sm px-3 py-1.5 rounded-xl active:scale-95 transition-all"
                >
                  📤
                </button>
              )}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary-100 mb-0.5">🔗 קישור הצטרפות ישיר</p>
              <p className="text-xs text-white/70 truncate dir-ltr" dir="ltr">
                {getInviteLink()}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="bg-white/30 text-white text-xs px-2.5 py-1.5 rounded-lg active:scale-95 transition-all flex-none"
            >
              {copiedLink ? '✅' : '📋 העתק'}
            </button>
          </div>
        </div>
      )}

      {/* Family Members */}
      <div className="mb-4">
        <h3 className="section-title">{t('family.members')}</h3>
        <div className="space-y-2">
          {familyMembers.map((member) => (
            <div key={member.id} className="card flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-none"
                style={{ backgroundColor: member.color + '20', border: `2px solid ${member.color}` }}
              >
                {member.avatarEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800 truncate">{member.displayName}</p>
                  {member.id === currentUser?.id && (
                    <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">אני</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {member.role === 'parent' ? '👨‍👩‍ הורה' : '👦 ילד/ה'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-600">{member.points}</p>
                <p className="text-xs text-slate-400">נקודות</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mb-4">
        <h3 className="section-title">🏆 {t('family.leaderboard')}</h3>
        <div className="card space-y-3">
          {leaderboard.map((member, idx) => (
            <div key={member.id} className="flex items-center gap-3">
              <span className="text-xl w-6 text-center">
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-none"
                style={{ backgroundColor: member.color + '20' }}
              >
                {member.avatarEmoji}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">
                  {member.displayName}
                  {member.id === currentUser?.id && ' 👈'}
                </p>
                {member.streak > 0 && (
                  <p className="text-xs text-orange-500">🔥 {member.streak} ימים ברצף</p>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold text-primary-600 text-lg">{member.points}</div>
                <div className="text-xs text-slate-400">נקודות</div>
              </div>
              {idx === 0 && member.id !== currentUser?.id && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">מוביל!</span>
              )}
              {idx === 0 && member.id === currentUser?.id && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">אלוף! 🎉</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Badges per member */}
      {familyMembers.some((m) => getMemberBadges(m).length > 0) && (
        <div className="mb-4">
          <h3 className="section-title">🎖️ עיטורים</h3>
          <div className="space-y-2">
            {familyMembers.map((member) => {
              const badges = getMemberBadges(member)
              if (badges.length === 0) return null
              return (
                <div key={member.id} className="card flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-none"
                    style={{ backgroundColor: member.color + '20', border: `2px solid ${member.color}` }}
                  >
                    {member.avatarEmoji}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{member.displayName}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          title={b.label}
                          className="text-lg"
                          aria-label={b.label}
                        >
                          {b.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mr-auto text-right">
                    <p className="text-xs text-slate-400">{badges.length} עיטורים</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Announcements */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-title mb-0">📌 {t('family.announcements')}</h3>
          <button
            onClick={() => setShowAnnouncement(!showAnnouncement)}
            className="text-sm text-primary-600 font-medium"
          >
            + {t('family.addAnnouncement')}
          </button>
        </div>

        {showAnnouncement && (
          <form onSubmit={handleAddAnnouncement} className="card mb-3 space-y-3 animate-slide-up">
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="הכניסו הודעה למשפחה..."
              value={annText}
              onChange={(e) => setAnnText(e.target.value)}
              required
              autoFocus
            />
            <div className="flex gap-2">
              {ANNOUNCEMENT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAnnColor(color)}
                  className={`w-7 h-7 rounded-full transition-all flex-none ${
                    annColor === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAnnouncement(false)} className="btn-secondary flex-1 py-2 text-sm">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn-primary flex-1 py-2 text-sm" disabled={loading}>
                {loading ? t('common.loading') : t('common.add')}
              </button>
            </div>
          </form>
        )}

        {announcements.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm">אין הודעות עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="card flex items-start gap-3 border-r-4"
                style={{ borderRightColor: ann.color }}
              >
                <span className="text-xl">{ann.createdByEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{ann.content}</p>
                  <p className="text-xs text-slate-400 mt-1">{ann.createdByName}</p>
                </div>
                <div className="flex gap-1 flex-none">
                  {isParent && (
                    <button
                      onClick={() => handleTogglePin(ann.id, ann.pinned)}
                      className="text-sm"
                      title={ann.pinned ? t('family.unpin') : t('family.pin')}
                    >
                      {ann.pinned ? '📌' : '📍'}
                    </button>
                  )}
                  {(isParent || ann.createdBy === currentUser?.id) && (
                    <button
                      onClick={() => handleDeleteAnn(ann.id)}
                      className="text-slate-300 hover:text-red-400 text-sm transition-colors"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Language Toggle */}
      <div className="mb-4">
        <h3 className="section-title">⚙️ הגדרות</h3>
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">שפת ממשק</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleLanguage('he')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  currentUser?.language === 'he' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                🇮🇱 עברית
              </button>
              <button
                onClick={() => handleLanguage('en')}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  currentUser?.language === 'en' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                🇺🇸 English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="pb-2">
        <button onClick={handleLogout} className="btn-ghost w-full text-red-500 py-3">
          🚪 {t('auth.logout')}
        </button>
      </div>

      <div className="pb-6 text-center">
        <p className="text-xs text-slate-300">גרסה 1.2.0</p>
      </div>
    </div>
  )
}
