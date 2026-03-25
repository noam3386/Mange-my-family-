export type UserRole = 'parent' | 'child'

export interface FamilyMember {
  id: string
  displayName: string
  email: string
  role: UserRole
  familyId: string
  avatarEmoji: string
  color: string
  points: number
  streak: number
  language: 'he' | 'en'
  createdAt: Date
}

export interface Family {
  id: string
  name: string
  inviteCode: string
  inviteLinkToken: string
  createdBy: string
  googleCalendarEnabled: boolean
  googleCalendarId?: string
  createdAt: Date
}

export interface ShoppingItem {
  id: string
  familyId: string
  name: string
  quantity: number
  unit: string
  category: string
  addedBy: string
  addedByName: string
  addedByEmoji: string
  status: 'pending' | 'approved' | 'purchased' | 'rejected'
  approvedBy?: string
  sortOrder: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Task {
  id: string
  familyId: string
  title: string
  description?: string
  assignedTo?: string
  assignedToName?: string
  createdBy: string
  status: 'todo' | 'in_progress' | 'done'
  dueDate?: Date
  isRecurring: boolean
  recurrenceRule?: string
  points: number
  icon: string
  templateId?: string
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface ChoreTemplate {
  id: string
  titleHe: string
  titleEn: string
  icon: string
  defaultPoints: number
  category: string
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: string
  familyId: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  isAllDay: boolean
  location?: string
  createdBy: string
  attendees: string[]
  color: string
  recurrence?: RecurrenceType
  googleEventId?: string
  syncSource: 'local' | 'google' | 'both'
  createdAt: Date
  updatedAt: Date
}

export interface FamilyAnnouncement {
  id: string
  familyId: string
  content: string
  createdBy: string
  createdByName: string
  createdByEmoji: string
  color: string
  pinned: boolean
  createdAt: Date
}

export interface Badge {
  id: string
  titleHe: string
  titleEn: string
  icon: string
  condition: string
  threshold: number
}

// Member colors for UI
export const MEMBER_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

// Default avatar emojis for family members
export const AVATAR_EMOJIS = [
  '😊', '🦁', '🐻', '🐼', '🦊', '🐸', '🦄', '🐯',
  '🐧', '🦋', '🌟', '🌈', '🚀', '⚽', '🎮', '🎨',
  '🍕', '🌺', '🐬', '🦅',
]
