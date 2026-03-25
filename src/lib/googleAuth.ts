import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { createUserProfile } from './firestore'

const googleProvider = new GoogleAuthProvider()

export interface GoogleSignInResult {
  uid: string
  isNewUser: boolean
  displayName: string
  email: string
  photoURL?: string
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const result = await signInWithPopup(auth, googleProvider)
  const user = result.user

  // Check if user already has a profile in Firestore
  const profileRef = doc(db, 'users', user.uid)
  const profileSnap = await getDoc(profileRef)

  const isNewUser = !profileSnap.exists()

  return {
    uid: user.uid,
    isNewUser,
    displayName: user.displayName || 'משתמש',
    email: user.email || '',
    photoURL: user.photoURL || undefined,
  }
}

export async function completeGoogleProfile(
  uid: string,
  displayName: string,
  email: string,
  role: 'parent' | 'child',
  avatarEmoji: string
) {
  await createUserProfile(uid, {
    displayName,
    email,
    role,
    familyId: '',
    avatarEmoji,
    language: 'he',
  })
}
