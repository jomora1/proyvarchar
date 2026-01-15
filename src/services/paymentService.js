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

  if (amountPaid > pendingBalance + 0.01) {
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

export const applyCascadingPayment = async (clientId, totalAmount, userId, prioritySaleId = null) => {
  // 1. Obtener todas las ventas del cliente y filtrar en memoria
  // Esto evita la necesidad de un índice compuesto (clientId + status) que puede dar error
  const salesQuery = query(
    collection(db, 'sales'),
    where('clientId', '==', clientId)
  )
  const salesSnap = await getDocs(salesQuery)

  // Filtrar pendientes y mapear datos
  let pendingSales = salesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(sale => sale.status !== 'paid' && (sale.total - sale.paid) > 0)

  // 2. Ordenar: Prioridad > Más antiguas
  pendingSales.sort((a, b) => {
    if (prioritySaleId) {
      if (a.id === prioritySaleId) return -1
      if (b.id === prioritySaleId) return 1
    }
    // Ordenar por fecha (asumiendo que tiene campo date o createdAt)
    const dateA = a.date?.toMillis ? a.date.toMillis() : 0
    const dateB = b.date?.toMillis ? b.date.toMillis() : 0
    return dateA - dateB
  })

  let remainingMoney = totalAmount
  const results = []

  // 3. Iterar y pagar en cascada
  console.log(`[Payment] Starting distribution. Amount: ${totalAmount}, Pending Sales: ${pendingSales.length}`)

  for (const sale of pendingSales) {
    if (remainingMoney <= 0) break

    const pendingBalance = sale.total - sale.paid
    const paymentForSale = Math.min(remainingMoney, pendingBalance)

    console.log(`[Payment] Processing Sale ${sale.id}. Pending: ${pendingBalance}, Paying: ${paymentForSale}`)

    if (paymentForSale > 0) {
      // Reutilizamos la lógica de aplicar pago a una venta individual
      try {
        const result = await applyPaymentToSale(sale.id, paymentForSale, userId)
        results.push({
          saleId: sale.id,
          applied: paymentForSale,
          ...result
        })
        remainingMoney -= paymentForSale
      } catch (err) {
        console.error(`Error applying payment to sale ${sale.id}:`, err)
      }
    }
  }

  return {
    totalApplied: totalAmount - remainingMoney,
    remainingBalance: remainingMoney, // Debería ser 0 si hay suficiente deuda
    appliedTo: results
  }
}
