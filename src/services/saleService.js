import { db } from '../firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore'
import { decrementProductStock } from './productService'

export const getSales = async () => {
  const querySnapshot = await getDocs(collection(db, 'sales'))
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getSaleById = async (id) => {
  const docSnap = await getDoc(doc(db, 'sales', id))
  if (!docSnap.exists()) return null
  
  const saleData = { id: docSnap.id, ...docSnap.data() }
  
  // Obtener items de la venta
  const itemsQuery = query(collection(db, 'saleItems'), where('saleId', '==', id))
  const itemsSnap = await getDocs(itemsQuery)
  saleData.items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  
  return saleData
}

export const createSale = async (saleData) => {
  const {
    clientId,
    items, // Array de { productId, quantity, unitPrice }
    paymentType, // 'total' o 'partial'
    amountPaid,
    userId
  } = saleData

  // Calcular total
  let total = 0
  items.forEach(item => {
    total += item.unitPrice * item.quantity
  })

  const saleId = doc(collection(db, 'sales')).id
  const now = new Date()

  const batch = writeBatch(db)

  // Crear venta
  batch.set(doc(db, 'sales', saleId), {
    clientId,
    total,
    paid: amountPaid || (paymentType === 'total' ? total : 0),
    paymentType,
    status: paymentType === 'total' ? 'paid' : 'partial',
    date: now,
    userId,
    createdAt: now,
    updatedAt: now
  })

  // Crear items de venta
  for (const item of items) {
    const itemId = doc(collection(db, 'saleItems')).id
    batch.set(doc(db, 'saleItems', itemId), {
      saleId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      paid: 0, // Será actualizado con abonos
      pending: item.unitPrice * item.quantity
    })

    // Decrementar stock
    await decrementProductStock(item.productId, item.quantity)
  }

  // Si hay pago parcial, crear abono automático
  if (paymentType === 'partial' && amountPaid > 0) {
    const paymentId = doc(collection(db, 'payments')).id
    batch.set(doc(db, 'payments', paymentId), {
      saleId,
      amount: amountPaid,
      date: now,
      userId,
      createdAt: now
    })
  }

  await batch.commit()
  return saleId
}

export const getSalesByClient = async (clientId) => {
  const q = query(collection(db, 'sales'), where('clientId', '==', clientId))
  const querySnapshot = await getDocs(q)
  
  const sales = await Promise.all(
    querySnapshot.docs.map(async (doc) => {
      const saleData = { id: doc.id, ...doc.data() }
      const itemsQuery = query(collection(db, 'saleItems'), where('saleId', '==', doc.id))
      const itemsSnap = await getDocs(itemsQuery)
      saleData.items = itemsSnap.docs.map(d => d.data())
      return saleData
    })
  )
  
  return sales
}
