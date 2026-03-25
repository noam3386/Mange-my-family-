import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  limit,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Family, FamilyMember, ShoppingItem, Task, CalendarEvent, FamilyAnnouncement } from '../types'
import { MEMBER_COLORS } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function toDate(ts: Timestamp | Date | undefined): Date {
  if (!ts) return new Date()
  if (ts instanceof Date) return ts
  return (ts as Timestamp).toDate()
}

// ── Family ───────────────────────────────────────────────────────────────────

export async function createFamily(name: string, createdBy: string): Promise<Family> {
  const familyRef = doc(collection(db, 'families'))
  const inviteCode = generateInviteCode()
  const inviteLinkToken = crypto.randomUUID()

  const family: Omit<Family, 'id' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
    name,
    inviteCode,
    inviteLinkToken,
    createdBy,
    googleCalendarEnabled: false,
    createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>,
  }

  await setDoc(familyRef, family)
  return { ...family, id: familyRef.id, createdAt: new Date() }
}

export async function getFamilyByInviteCode(code: string): Promise<Family | null> {
  const q = query(collection(db, 'families'), where('inviteCode', '==', code.toUpperCase()), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt as Timestamp) } as Family
}

export async function updateFamilyGoogleCalendar(familyId: string, enabled: boolean, calendarId?: string) {
  await updateDoc(doc(db, 'families', familyId), {
    googleCalendarEnabled: enabled,
    ...(calendarId ? { googleCalendarId: calendarId } : {}),
  })
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function createUserProfile(
  userId: string,
  data: Pick<FamilyMember, 'displayName' | 'email' | 'role' | 'familyId' | 'avatarEmoji' | 'language'>
) {
  // Only query for color if the user already belongs to a family
  let colorIndex = 0
  if (data.familyId) {
    try {
      const existingMembers = await getDocs(query(collection(db, 'users'), where('familyId', '==', data.familyId)))
      colorIndex = existingMembers.size % MEMBER_COLORS.length
    } catch {
      colorIndex = Math.floor(Math.random() * MEMBER_COLORS.length)
    }
  } else {
    colorIndex = Math.floor(Math.random() * MEMBER_COLORS.length)
  }
  const color = MEMBER_COLORS[colorIndex]

  await setDoc(doc(db, 'users', userId), {
    ...data,
    color,
    points: 0,
    streak: 0,
    createdAt: serverTimestamp(),
  })
}

export async function getUserProfile(userId: string): Promise<FamilyMember | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  const d = snap.data()
  return { id: snap.id, ...d, createdAt: toDate(d.createdAt as Timestamp) } as FamilyMember
}

export function subscribeToFamilyMembers(familyId: string, cb: (members: FamilyMember[]) => void) {
  const q = query(collection(db, 'users'), where('familyId', '==', familyId))
  return onSnapshot(q, (snap) => {
    const members = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt as Timestamp),
    })) as FamilyMember[]
    cb(members)
  })
}

export async function updateUserPoints(userId: string, pointsToAdd: number) {
  const ref = doc(db, 'users', userId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const current = snap.data().points || 0
  await updateDoc(ref, { points: current + pointsToAdd })
}

// ── Shopping ─────────────────────────────────────────────────────────────────

export function subscribeToShoppingItems(familyId: string, cb: (items: ShoppingItem[]) => void) {
  const q = query(
    collection(db, 'shopping'),
    where('familyId', '==', familyId),
    orderBy('sortOrder', 'asc'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt as Timestamp),
      updatedAt: toDate(d.data().updatedAt as Timestamp),
    })) as ShoppingItem[]
    cb(items)
  })
}

export async function addShoppingItem(item: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(collection(db, 'shopping'))
  await setDoc(ref, {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateShoppingItem(itemId: string, updates: Partial<ShoppingItem>) {
  await updateDoc(doc(db, 'shopping', itemId), { ...updates, updatedAt: serverTimestamp() })
}

export async function deleteShoppingItem(itemId: string) {
  await deleteDoc(doc(db, 'shopping', itemId))
}

export async function clearPurchasedItems(familyId: string) {
  const q = query(collection(db, 'shopping'), where('familyId', '==', familyId), where('status', '==', 'purchased'))
  const snap = await getDocs(q)
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export function subscribeToTasks(familyId: string, cb: (tasks: Task[]) => void) {
  const q = query(
    collection(db, 'tasks'),
    where('familyId', '==', familyId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const tasks = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt as Timestamp),
      updatedAt: toDate(d.data().updatedAt as Timestamp),
      dueDate: d.data().dueDate ? toDate(d.data().dueDate as Timestamp) : undefined,
      completedAt: d.data().completedAt ? toDate(d.data().completedAt as Timestamp) : undefined,
    })) as Task[]
    cb(tasks)
  })
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(collection(db, 'tasks'))
  await setDoc(ref, {
    ...task,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateTask(taskId: string, updates: Partial<Task>) {
  await updateDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: serverTimestamp() })
}

export async function completeTask(taskId: string, userId: string, points: number) {
  await updateDoc(doc(db, 'tasks', taskId), {
    status: 'done',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  await updateUserPoints(userId, points)
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, 'tasks', taskId))
}

// ── Events ───────────────────────────────────────────────────────────────────

export function subscribeToEvents(familyId: string, cb: (events: CalendarEvent[]) => void) {
  const q = query(
    collection(db, 'events'),
    where('familyId', '==', familyId),
    orderBy('startTime', 'asc')
  )
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      startTime: toDate(d.data().startTime as Timestamp),
      endTime: d.data().endTime ? toDate(d.data().endTime as Timestamp) : undefined,
      createdAt: toDate(d.data().createdAt as Timestamp),
      updatedAt: toDate(d.data().updatedAt as Timestamp),
    })) as CalendarEvent[]
    cb(events)
  })
}

export async function addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = doc(collection(db, 'events'))
  await setDoc(ref, {
    ...event,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEvent(eventId: string, updates: Partial<CalendarEvent>) {
  await updateDoc(doc(db, 'events', eventId), { ...updates, updatedAt: serverTimestamp() })
}

export async function deleteEvent(eventId: string) {
  await deleteDoc(doc(db, 'events', eventId))
}

// ── Announcements ─────────────────────────────────────────────────────────────

export function subscribeToAnnouncements(familyId: string, cb: (items: FamilyAnnouncement[]) => void) {
  const q = query(
    collection(db, 'announcements'),
    where('familyId', '==', familyId),
    orderBy('pinned', 'desc'),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: toDate(d.data().createdAt as Timestamp),
    })) as FamilyAnnouncement[]
    cb(items)
  })
}

export async function addAnnouncement(item: Omit<FamilyAnnouncement, 'id' | 'createdAt'>) {
  const ref = doc(collection(db, 'announcements'))
  await setDoc(ref, { ...item, createdAt: serverTimestamp() })
  return ref.id
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, 'announcements', id))
}
