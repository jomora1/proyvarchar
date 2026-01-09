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
  writeBatch,
  arrayUnion
} from 'firebase/firestore'

/**
 * LÓGICA CRÍTICA DE ABONOS
 * 
 * El abono se aplica automáticamente a los items de la venta:
 * 1. Ordena items por precio unitario ascendente (más barato primero)
 * 2. Liquida cada item completamente antes de pasar al siguiente
 * 3. Recalcula saldos automáticamente
 */

export const applyPaymentToSale = async (saleId, amountPaid, userId) => {
  const saleRef = doc(db, 'sales', saleId)
  const saleSnap = await getDoc(saleRef)
  
  if (!saleSnap.exists()) throw new Error('Venta no encontrada')

  const sale = saleSnap.data()
  
  // Validar que hay saldo pendiente
  const pendingBalance = sale.total - sale.paid
  if (pendingBalance <= 0) {
    throw new Error('La venta está completamente pagada')
  }

  if (amountPaid > pendingBalance) {
    throw new Error(`El monto excede el saldo pendiente (₡${pendingBalance})`)
  }

  // Obtener items de la venta ordenados por precio
  const itemsQuery = query(collection(db, 'saleItems'), where('saleId', '==', saleId))
  const itemsSnap = await getDocs(itemsQuery)
  
  const items = itemsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.unitPrice - b.unitPrice)

  // Aplicar abono siguiendo la regla crítica
  let remainingPayment = amountPaid
  const batch = writeBatch(db)

  for (const item of items) {
    if (remainingPayment <= 0) break

    const itemPending = item.pending || (item.subtotal - (item.paid || 0))
    const paymentForItem = Math.min(remainingPayment, itemPending)

    batch.update(doc(db, 'saleItems', item.id), {
      paid: (item.paid || 0) + paymentForItem,
      pending: itemPending - paymentForItem
    })

    remainingPayment -= paymentForItem
  }

  // Crear registro de pago
  const paymentId = doc(collection(db, 'payments')).id
  batch.set(doc(db, 'payments', paymentId), {
    saleId,
    amount: amountPaid,
    date: new Date(),
    userId,
    createdAt: new Date()
  })

  // Actualizar venta
  const newPaidAmount = sale.paid + amountPaid
  const newStatus = newPaidAmount >= sale.total ? 'paid' : 'partial'

  batch.update(saleRef, {
    paid: newPaidAmount,
    status: newStatus,
    updatedAt: new Date()
  })

  await batch.commit()

  return {
    paymentId,
    amountApplied: amountPaid,
    newTotalPaid: newPaidAmount,
    newPendingBalance: sale.total - newPaidAmount,
    saleStatus: newStatus
  }
}

export const getSalePayments = async (saleId) => {
  const q = query(collection(db, 'payments'), where('saleId', '==', saleId))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getPayments = async () => {
  const querySnapshot = await getDocs(collection(db, 'payments'))
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
