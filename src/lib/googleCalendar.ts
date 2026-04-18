import { GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup, linkWithPopup } from 'firebase/auth'
import { auth, db } from './firebase'
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  attendees?: { email: string; displayName?: string }[]
  colorId?: string
}

// Google Calendar color mapping
const GCAL_COLORS: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
}

export async function connectGoogleCalendar(): Promise<string> {
  const provider = new GoogleAuthProvider()
  provider.addScope(CALENDAR_SCOPE)
  provider.setCustomParameters({ prompt: 'consent' })

  const user = auth.currentUser
  if (!user) throw new Error('לא מחובר')

  const isGoogleUser = user.providerData.some((p) => p.providerId === 'google.com')

  let result
  if (isGoogleUser) {
    result = await reauthenticateWithPopup(user, provider)
  } else {
    try {
      result = await linkWithPopup(user, provider)
    } catch (err: unknown) {
      // Already linked — fall back to signInWithPopup just for the token
      if ((err as { code?: string }).code === 'auth/provider-already-linked' ||
          (err as { code?: string }).code === 'auth/credential-already-in-use') {
        result = await signInWithPopup(auth, provider)
      } else {
        throw err
      }
    }
  }

  const credential = GoogleAuthProvider.credentialFromResult(result)
  if (!credential?.accessToken) throw new Error('לא התקבל טוקן')
  return credential.accessToken
}

export interface GoogleCalendarInfo {
  id: string
  summary: string
  backgroundColor?: string
  primary?: boolean
}

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarInfo[]> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'שגיאה בטעינת רשימת יומנים')
  }
  const data = await res.json()
  return (data.items || []).filter((c: GoogleCalendarInfo) => c.id && c.summary)
}

export async function fetchGoogleCalendarEvents(accessToken: string, calendarId = 'primary'): Promise<GoogleCalendarEvent[]> {
  const now = new Date()
  const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'שגיאה בטעינת אירועי גוגל')
  }

  const data = await res.json()
  return data.items || []
}

export async function importGoogleEventsToFirestore(
  events: GoogleCalendarEvent[],
  familyId: string,
  userId: string
): Promise<number> {
  // Get existing google events for this family to avoid duplicates
  const existingSnap = await getDocs(
    query(
      collection(db, 'events'),
      where('familyId', '==', familyId),
      where('syncSource', 'in', ['google', 'both'])
    )
  )
  const existingGoogleIds = new Set(
    existingSnap.docs.map((d) => d.data().googleEventId).filter(Boolean)
  )

  let imported = 0
  for (const ev of events) {
    if (existingGoogleIds.has(ev.id)) continue

    const isAllDay = !ev.start.dateTime
    const startTime = ev.start.dateTime
      ? new Date(ev.start.dateTime)
      : new Date(ev.start.date + 'T00:00:00')
    const endTime = ev.end.dateTime
      ? new Date(ev.end.dateTime)
      : ev.end.date
      ? new Date(ev.end.date + 'T00:00:00')
      : undefined

    const color = ev.colorId ? GCAL_COLORS[ev.colorId] || '#039be5' : '#039be5'

    await addDoc(collection(db, 'events'), {
      familyId,
      title: ev.summary || '(ללא כותרת)',
      description: ev.description || '',
      location: ev.location || '',
      isAllDay,
      startTime: Timestamp.fromDate(startTime),
      endTime: endTime ? Timestamp.fromDate(endTime) : null,
      color,
      attendees: [],
      createdBy: userId,
      syncSource: 'google',
      googleEventId: ev.id,
      recurrence: 'none',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    imported++
  }
  return imported
}
