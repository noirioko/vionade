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

// Auth state listener callback
let authCallback = null
let authReady = false
let authReadyResolve = null
const authReadyPromise = new Promise((resolve) => {
  authReadyResolve = resolve
})

export function setAuthCallback(callback) {
  authCallback = callback
}

// Wait for auth to be ready, then return current user
export async function waitForAuth() {
  if (authReady) return auth.currentUser
  await authReadyPromise
  return auth.currentUser
}

// Initialize auth - just listen for state changes, don't auto sign in
export async function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!authReady) {
        authReady = true
        authReadyResolve(user)
      }
      if (authCallback) authCallback(user)
      resolve(user)
    })
  })
}

// Sign in as guest (anonymous)
export async function signInAsGuest() {
  try {
    const result = await signInAnonymously(auth)
    return result.user
  } catch (error) {
    console.error('Guest sign in error:', error)
    throw error
  }
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

// Sign Out - truly signs out, returns to landing page
export async function signOutUser() {
  try {
    await signOut(auth)
    return null
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export { db, auth }
