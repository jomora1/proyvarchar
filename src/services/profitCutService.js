import { db } from '../firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore'

/**
 * CORTE DE GANANCIAS
 * 
 * Reglas:
 * - Solo considera ventas 100% pagadas (status === 'paid')
 * - Calcula: ingresos (suma de totales), costos (suma de costos), ganancia neta
 * - Los cortes son acumulativos y consecutivos
 * - No duplica ventas ya cortadas
 */

export const getLastProfitCut = async () => {
  const q = query(collection(db, 'profitCuts'))
  const querySnapshot = await getDocs(q)

  if (querySnapshot.docs.length === 0) return null

  const cuts = querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => b.date - a.date)

  return cuts[0]
}

export const createProfitCut = async (userId) => {
  const lastCut = await getLastProfitCut()
  const lastCutDate = lastCut ? lastCut.date.toDate() : new Date(0)

  // 1. Obtener todas las ventas con actividad reciente
  const salesQuery = query(collection(db, 'sales'))
  const salesSnap = await getDocs(salesQuery)

  const relevantSales = salesSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(sale => {
      const updatedAt = sale.updatedAt?.toDate ? sale.updatedAt.toDate() : (sale.updatedAt || new Date(0))
      return updatedAt > lastCutDate
    })

  if (relevantSales.length === 0) {
    throw new Error('No hay actividad reciente para generar un corte')
  }

  let totalRevenue = 0
  let totalCost = 0
  let itemsCount = 0
  const itemsToUpdate = [] // { id, saleId, newCutUnits, isFullyCut }

  // 2. Iterar ventas y buscar UNIDADES pagadas pendientes de corte
  for (const sale of relevantSales) {
    const itemsQuery = query(collection(db, 'saleItems'), where('saleId', '==', sale.id))
    const itemsSnap = await getDocs(itemsQuery)

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data()

      // Datos actuales del item
      const quantity = item.quantity
      const unitPrice = item.unitPrice
      const paidAmount = item.paid || 0
      const previouslyCutUnits = item.cutUnits || 0

      // Calcular cuántas unidades están COMPLETAMENTE pagadas con el monto actual
      // Ejemplo: 2 cremas @ 5500 = 11000. Pago 6000.
      // paidUnits = floor(6000 / 5500) = 1 unidad.
      const paidUnits = Math.floor(paidAmount / unitPrice)

      // Determinar cuántas de esas son NUEVAS para este corte
      // newUnitsToCut = 1 - 0 (previos) = 1.
      const newUnitsToCut = paidUnits - previouslyCutUnits

      if (newUnitsToCut > 0) {
        itemsCount += newUnitsToCut

        // Sumar ingresos solo por las unidades nuevas
        totalRevenue += (newUnitsToCut * unitPrice)

        // Sumar costos
        const productRef = doc(db, 'products', item.productId)
        const productSnap = await getDoc(productRef)

        if (productSnap.exists()) {
          const product = productSnap.data()
          totalCost += (product.costPrice * newUnitsToCut)
        }

        const totalCutUnits = previouslyCutUnits + newUnitsToCut
        const isFullyCut = totalCutUnits >= quantity

        itemsToUpdate.push({
          id: itemDoc.id,
          saleId: sale.id,
          newCutUnits: totalCutUnits,
          isFullyCut
        })
      }
    }
  }

  if (itemsCount === 0) {
    throw new Error('No hay nuevas unidades completamente pagadas para incluir en el corte')
  }

  const netProfit = totalRevenue - totalCost
  const cutId = doc(collection(db, 'profitCuts')).id
  const now = new Date()

  const batch = writeBatch(db)

  // 3. Crear corte
  batch.set(doc(db, 'profitCuts', cutId), {
    itemsCount,
    totalRevenue,
    totalCost,
    netProfit,
    date: now,
    userId,
    includedItemIds: itemsToUpdate.map(i => i.id),
    createdAt: now
  })

  // 4. Actualizar items con las nuevas unidades cortadas
  for (const update of itemsToUpdate) {
    const updateData = {
      cutUnits: update.newCutUnits,
      cutId: cutId // Referencia al último corte donde participó
    }

    if (update.isFullyCut) {
      updateData.isCutIncluded = true
    }

    batch.update(doc(db, 'saleItems', update.id), updateData)
  }

  await batch.commit()

  return {
    cutId,
    itemsCount,
    totalRevenue,
    totalCost,
    netProfit,
    date: now
  }
}

export const getProfitCuts = async () => {
  const querySnapshot = await getDocs(collection(db, 'profitCuts'))
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => b.date - a.date)
}

export const getProfitCutById = async (id) => {
  const docSnap = await getDoc(doc(db, 'profitCuts', id))
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
}
