import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { useAppStore } from '../store'
import type { Family, FamilyMember } from '../types'
import { Timestamp } from 'firebase/firestore'

export function useAuth() {
  const { setCurrentUser, setFamily, setAuthLoading } = useAppStore()

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null)
        setFamily(null)
        setAuthLoading(false)
        return
      }

      // Subscribe to user profile changes
      const userRef = doc(db, 'users', firebaseUser.uid)
      const unsubscribeUser = onSnapshot(userRef, async (userSnap) => {
        if (!userSnap.exists()) {
          setCurrentUser(null)
          setAuthLoading(false)
          return
        }

        const userData = userSnap.data()
        const user: FamilyMember = {
          id: firebaseUser.uid,
          displayName: userData.displayName,
          email: userData.email,
          role: userData.role,
          familyId: userData.familyId,
          avatarEmoji: userData.avatarEmoji || '😊',
          color: userData.color || '#6366f1',
          points: userData.points || 0,
          streak: userData.streak || 0,
          language: userData.language || 'he',
          createdAt: userData.createdAt instanceof Timestamp ? userData.createdAt.toDate() : new Date(),
        }
        setCurrentUser(user)

        // Load family data
        if (user.familyId) {
          const familySnap = await getDoc(doc(db, 'families', user.familyId))
          if (familySnap.exists()) {
            const fd = familySnap.data()
            const family: Family = {
              id: familySnap.id,
              name: fd.name,
              inviteCode: fd.inviteCode,
              inviteLinkToken: fd.inviteLinkToken,
              createdBy: fd.createdBy,
              googleCalendarEnabled: fd.googleCalendarEnabled || false,
              googleCalendarId: fd.googleCalendarId,
              createdAt: fd.createdAt instanceof Timestamp ? fd.createdAt.toDate() : new Date(),
            }
            setFamily(family)
          }
        }

        setAuthLoading(false)
      })

      return unsubscribeUser
    })

    return () => unsubscribeAuth()
  }, [setCurrentUser, setFamily, setAuthLoading])
}
