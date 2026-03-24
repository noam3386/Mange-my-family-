import { create } from 'zustand'
import type { FamilyMember, Family, ShoppingItem, Task, CalendarEvent, FamilyAnnouncement } from '../types'

interface AppState {
  // Auth
  currentUser: FamilyMember | null
  family: Family | null
  familyMembers: FamilyMember[]
  isAuthLoading: boolean

  // Data
  shoppingItems: ShoppingItem[]
  tasks: Task[]
  events: CalendarEvent[]
  announcements: FamilyAnnouncement[]

  // UI
  activeTab: 'home' | 'shopping' | 'tasks' | 'calendar' | 'family'

  // Actions
  setCurrentUser: (user: FamilyMember | null) => void
  setFamily: (family: Family | null) => void
  setFamilyMembers: (members: FamilyMember[]) => void
  setAuthLoading: (loading: boolean) => void
  setShoppingItems: (items: ShoppingItem[]) => void
  setTasks: (tasks: Task[]) => void
  setEvents: (events: CalendarEvent[]) => void
  setAnnouncements: (items: FamilyAnnouncement[]) => void
  setActiveTab: (tab: AppState['activeTab']) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  family: null,
  familyMembers: [],
  isAuthLoading: true,
  shoppingItems: [],
  tasks: [],
  events: [],
  announcements: [],
  activeTab: 'home',

  setCurrentUser: (user) => set({ currentUser: user }),
  setFamily: (family) => set({ family }),
  setFamilyMembers: (members) => set({ familyMembers: members }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  setShoppingItems: (items) => set({ shoppingItems: items }),
  setTasks: (tasks) => set({ tasks }),
  setEvents: (events) => set({ events }),
  setAnnouncements: (items) => set({ announcements: items }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}))
