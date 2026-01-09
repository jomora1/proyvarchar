import { db } from '../firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore'

// CRUD para clientes
export const getClients = async () => {
  const querySnapshot = await getDocs(collection(db, 'clients'))
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getClientById = async (id) => {
  const docSnap = await getDoc(doc(db, 'clients', id))
  if (!docSnap.exists()) return null
  
  const clientData = { id: docSnap.id, ...docSnap.data() }
  
  // Calcular saldo pendiente
  const salesQuery = query(collection(db, 'sales'), where('clientId', '==', id))
  const salesSnap = await getDocs(salesQuery)
  
  let totalPending = 0
  salesSnap.docs.forEach(saleDoc => {
    const sale = saleDoc.data()
    totalPending += (sale.total - sale.paid) || 0
  })
  
  clientData.pendingBalance = totalPending
  clientData.status = totalPending > 0 ? 'deuda' : 'al_día'
  
  return clientData
}

export const createClient = async (clientData) => {
  const { name, phone, email } = clientData
  const clientId = doc(collection(db, 'clients')).id
  
  await setDoc(doc(db, 'clients', clientId), {
    name,
    phone,
    email,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  
  return clientId
}

export const updateClient = async (id, updates) => {
  const updateData = {
    ...updates,
    updatedAt: new Date()
  }
  await updateDoc(doc(db, 'clients', id), updateData)
}

export const deleteClient = async (id) => {
  // Verificar que no tenga ventas pendientes
  const salesQuery = query(collection(db, 'sales'), where('clientId', '==', id))
  const salesSnap = await getDocs(salesQuery)
  
  if (salesSnap.docs.length > 0) {
    throw new Error('No se puede eliminar un cliente con historial de ventas')
  }
  
  await deleteDoc(doc(db, 'clients', id))
}

export const getClientHistory = async (clientId) => {
  const salesQuery = query(collection(db, 'sales'), where('clientId', '==', clientId))
  const salesSnap = await getDocs(salesQuery)
  
  const sales = await Promise.all(
    salesSnap.docs.map(async (saleDoc) => {
      const saleData = { id: saleDoc.id, ...saleDoc.data() }
      
      // Obtener detalles de la venta
      const itemsQuery = query(
        collection(db, 'saleItems'),
        where('saleId', '==', saleDoc.id)
      )
      const itemsSnap = await getDocs(itemsQuery)
      saleData.items = itemsSnap.docs.map(d => d.data())
      
      return saleData
    })
  )
  
  return sales.sort((a, b) => b.date - a.date)
}
