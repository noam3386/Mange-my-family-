import { useEffect } from 'react'
import { useAppStore } from '../store'
import {
  subscribeToShoppingItems,
  subscribeToTasks,
  subscribeToEvents,
  subscribeToFamilyMembers,
  subscribeToAnnouncements,
} from '../lib/firestore'

export function useRealtimeData() {
  const { currentUser, setShoppingItems, setTasks, setEvents, setFamilyMembers, setAnnouncements } = useAppStore()
  const familyId = currentUser?.familyId

  useEffect(() => {
    if (!familyId) return

    const unsubs = [
      subscribeToShoppingItems(familyId, setShoppingItems),
      subscribeToTasks(familyId, setTasks),
      subscribeToEvents(familyId, setEvents),
      subscribeToFamilyMembers(familyId, setFamilyMembers),
      subscribeToAnnouncements(familyId, setAnnouncements),
    ]

    return () => unsubs.forEach((u) => u())
  }, [familyId, setShoppingItems, setTasks, setEvents, setFamilyMembers, setAnnouncements])
}
