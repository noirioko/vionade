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
  apiKey: "AIzaSyDwI53N1u-VL7JTQHPsdc3wUj-GBCcwYb8",
  authDomain: "lavender-ledge.firebaseapp.com",
  projectId: "lavender-ledge",
  storageBucket: "lavender-ledge.firebasestorage.app",
  messagingSenderId: "100489858744",
  appId: "1:100489858744:web:cd177d04b0ec2e5b3f6e4d",
  measurementId: "G-L8R8V7SRKG"
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
