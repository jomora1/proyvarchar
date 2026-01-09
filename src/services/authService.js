import { auth, db } from '../firebase'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const googleProvider = new GoogleAuthProvider()

// Usuarios autorizados (whitelist)
const AUTHORIZED_USERS = {
  'jamoralescr@gmail.com': 'admin',
  'yopicayoly@gmail.com': 'admin',
  'mery301190@gmail.com': 'admin'
}

export const loginWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence)
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Validar si el usuario está autorizado
    if (!AUTHORIZED_USERS[user.email]) {
      await signOut(auth)
      throw new Error(`Usuario ${user.email} no está autorizado`)
    }

    // Crear o actualizar documento de usuario
    await ensureUserDocument(user)

    return user
  } catch (error) {
    throw new Error(`Error de login: ${error.message}`)
  }
}

export const ensureUserDocument = async (user) => {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      role: AUTHORIZED_USERS[user.email],
      createdAt: new Date(),
      updatedAt: new Date()
    })
  } else {
    // Actualizar información del usuario
    await setDoc(userRef, {
      displayName: user.displayName,
      photoURL: user.photoURL,
      updatedAt: new Date()
    }, { merge: true })
  }
}

export const logout = async () => {
  try {
    await signOut(auth)
  } catch (error) {
    throw new Error(`Error al cerrar sesión: ${error.message}`)
  }
}

export const getCurrentUser = async () => {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe()
      if (user && AUTHORIZED_USERS[user.email]) {
        const userRef = doc(db, 'users', user.uid)
        const userSnap = await getDoc(userRef)
        resolve({ ...user, ...userSnap.data() })
      } else {
        resolve(null)
      }
    })
  })
}

export const getAuthorizedUsers = () => AUTHORIZED_USERS
