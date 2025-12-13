import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Sign in anonymously (no login required, but data is tied to device)
// You can upgrade to email/password later if you want cross-device sync
// Auth state listener callback
let authCallback = null

export function setAuthCallback(callback) {
  authCallback = callback
}

export async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (authCallback) authCallback(user)
        resolve(user)
      } else {
        try {
          const result = await signInAnonymously(auth)
          if (authCallback) authCallback(result.user)
          resolve(result.user)
        } catch (error) {
          console.error('Auth error:', error)
          resolve(null)
        }
      }
    })
  })
}

// Google Sign In
const googleProvider = new GoogleAuthProvider()

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error('Google sign in error:', error)
    throw error
  }
}

// Sign Out
export async function signOutUser() {
  try {
    await signOut(auth)
    // Sign in anonymously again after sign out
    const result = await signInAnonymously(auth)
    return result.user
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export { db, auth }
