import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../store'
import {
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearPurchasedItems,
} from '../../lib/firestore'
import type { ShoppingItem } from '../../types'

interface SwipeableItemProps {
  item: ShoppingItem
  onSwipeRight: () => void
  children: React.ReactNode
}

function SwipeableItem({ item, onSwipeRight, children }: SwipeableItemProps) {
  const touchStartX = useRef<number>(0)
  const touchCurrentX = useRef<number>(0)
  const [offset, setOffset] = useState(0)
  const [swiped, setSwiped] = useState(false)
  const canSwipe = item.status === 'approved' && !swiped

  function handleTouchStart(e: React.TouchEvent) {
    if (!canSwipe) return
    touchStartX.current = e.touches[0].clientX
    touchCurrentX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!canSwipe) return
    const dx = e.touches[0].clientX - touchStartX.current
    if (dx > 0) {
      touchCurrentX.current = e.touches[0].clientX
      setOffset(Math.min(dx, 120))
    }
  }

  function handleTouchEnd() {
    if (!canSwipe) return
    if (offset > 80) {
      setSwiped(true)
      setOffset(120)
      setTimeout(() => {
        onSwipeRight()
        setOffset(0)
        setSwiped(false)
      }, 300)
    } else {
      setOffset(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Green background hint */}
      <div
        className="absolute inset-0 bg-green-500 flex items-center px-4 rounded-2xl transition-opacity"
        style={{ opacity: Math.min(offset / 80, 1) }}
      >
        <span className="text-white font-bold text-lg">🛍️ נרכש!</span>
      </div>
      <div
        style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? 'transform 0.2s' : 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

const CATEGORIES = [
  { key: 'produce', emoji: '🥦' },
  { key: 'dairy', emoji: '🥛' },
  { key: 'meat', emoji: '🥩' },
  { key: 'bakery', emoji: '🍞' },
  { key: 'pantry', emoji: '🥫' },
  { key: 'frozen', emoji: '🧊' },
  { key: 'drinks', emoji: '🧃' },
  { key: 'cleaning', emoji: '🧹' },
  { key: 'personal', emoji: '🧴' },
  { key: 'other', emoji: '📦' },
]

type FilterStatus = 'all' | 'pending' | 'approved' | 'purchased'

export default function ShoppingPage() {
  const { t } = useTranslation()
  const { currentUser, family, shoppingItems } = useAppStore()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'יחידות', category: 'other', notes: '' })
  const [loading, setLoading] = useState(false)

  const isParent = currentUser?.role === 'parent'

  const filtered = shoppingItems.filter((item) => {
    if (filter === 'all') return item.status !== 'rejected'
    return item.status === filter
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newItem.name.trim() || !currentUser || !family) return
    setLoading(true)
    try {
      await addShoppingItem({
        familyId: family.id,
        name: newItem.name.trim(),
        quantity: newItem.quantity,
        unit: newItem.unit,
        category: newItem.category,
        addedBy: currentUser.id,
        addedByName: currentUser.displayName,
        addedByEmoji: currentUser.avatarEmoji,
        status: isParent ? 'approved' : 'pending',
        sortOrder: Date.now(),
        notes: newItem.notes,
      })
      setNewItem({ name: '', quantity: 1, unit: 'יחידות', category: 'other', notes: '' })
      setShowAdd(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(item: ShoppingItem, status: ShoppingItem['status']) {
    await updateShoppingItem(item.id, {
      status,
      ...(status === 'approved' ? { approvedBy: currentUser?.id } : {}),
    })
  }

  async function handleDelete(itemId: string) {
    if (!confirm('למחוק פריט זה?')) return
    await deleteShoppingItem(itemId)
  }

  async function handleClearPurchased() {
    if (!family || !confirm('לנקות כל הנרכשים?')) return
    await clearPurchasedItems(family.id)
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    purchased: 'bg-slate-100 text-slate-500 line-through',
    rejected: 'bg-red-100 text-red-600',
  }

  const statusLabels: Record<string, string> = {
    pending: '⏳ ' + t('shopping.pending'),
    approved: '✅ ' + t('shopping.approved'),
    purchased: '🛍️ ' + t('shopping.purchased'),
    rejected: '❌ ' + t('shopping.rejected'),
  }

  return (
    <div className="page-container pt-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">🛒 {t('shopping.title')}</h1>
        <div className="flex gap-2">
          {isParent && shoppingItems.some((i) => i.status === 'purchased') && (
            <button onClick={handleClearPurchased} className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all">
              🗑️ {t('shopping.clearPurchased')}
            </button>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary-500 text-white text-sm font-semibold px-4 py-2 rounded-xl active:scale-95 transition-all shadow-sm"
          >
            + {t('shopping.addItem')}
          </button>
        </div>
      </div>

      {/* Add Item Form */}
      {showAdd && (
        <div className="card mb-4 animate-slide-up">
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              className="input-field"
              placeholder={t('shopping.itemName')}
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
              autoFocus
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  className="input-field"
                  placeholder={t('shopping.quantity')}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                  min={1}
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  className="input-field"
                  placeholder={t('shopping.unit')}
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
              </div>
            </div>

            {/* Category picker */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setNewItem({ ...newItem, category: cat.key })}
                  className={`flex-none text-xl p-2 rounded-xl transition-all ${
                    newItem.category === cat.key ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-slate-50'
                  }`}
                >
                  {cat.emoji}
                </button>
              ))}
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

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'purchased'] as FilterStatus[]).map((f) => {
          const count = f === 'all'
            ? shoppingItems.filter((i) => i.status !== 'rejected').length
            : shoppingItems.filter((i) => i.status === f).length
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-none px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                filter === f ? 'bg-primary-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {f === 'all' ? 'הכל' : t(`shopping.${f}`)} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Items list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🛒</div>
          <p className="text-slate-500 font-medium">{t('shopping.empty')}</p>
          <p className="text-slate-400 text-sm mt-1">{t('shopping.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const catEmoji = CATEGORIES.find((c) => c.key === item.category)?.emoji || '📦'
            return (
              <SwipeableItem
                key={item.id}
                item={item}
                onSwipeRight={() => handleStatusChange(item, 'purchased')}
              >
              <div
                className={`card flex items-center gap-3 transition-all ${
                  item.status === 'purchased' ? 'opacity-60' : ''
                }`}
              >
                <span className="text-2xl flex-none">{catEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-slate-800 ${item.status === 'purchased' ? 'line-through' : ''}`}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">
                      {item.quantity} {item.unit}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">
                      {item.addedByEmoji} {item.addedByName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[item.status]}`}>
                    {statusLabels[item.status]}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {isParent && item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(item, 'approved')}
                          className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                        >
                          {t('shopping.approve')}
                        </button>
                        <button
                          onClick={() => handleStatusChange(item, 'rejected')}
                          className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                        >
                          {t('shopping.reject')}
                        </button>
                      </>
                    )}
                    {item.status === 'approved' && (
                      <button
                        onClick={() => handleStatusChange(item, 'purchased')}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                      >
                        {t('shopping.markPurchased')}
                      </button>
                    )}
                    {(isParent || item.addedBy === currentUser?.id) && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg active:scale-95 transition-all"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
              </SwipeableItem>
            )
          })}
        </div>
      )}
    </div>
  )
}
