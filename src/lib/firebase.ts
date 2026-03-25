import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA7FKE5i7v7EXzgaNYUNYOhAPkf_HurDsE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'famliy-app-planning.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'famliy-app-planning',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'famliy-app-planning.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '73006563717',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:73006563717:web:1b35211644f611e07e84ec',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Messaging (optional - for push notifications)
export let messaging: ReturnType<typeof getMessaging> | null = null
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app)
  }
})

