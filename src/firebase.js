import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase configuration for ramd-b7538 project
const firebaseConfig = {
  apiKey: "AIzaSyCqKF9U3gBW2x321hazn_Z3V_0Uq09Wq1Q",
  authDomain: "ramd-b7538.firebaseapp.com",
  projectId: "ramd-b7538",
  storageBucket: "ramd-b7538.firebasestorage.app",
  messagingSenderId: "703920258452",
  appId: "1:703920258452:web:fb12e440de6cbbc2c0e381",
  measurementId: "G-LCT44HFXG5"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
