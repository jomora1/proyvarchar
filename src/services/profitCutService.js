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
    .sort((a, b) => {
      const dateA = a.date?.toMillis ? a.date.toMillis() : (a.date instanceof Date ? a.date.getTime() : 0)
      const dateB = b.date?.toMillis ? b.date.toMillis() : (b.date instanceof Date ? b.date.getTime() : 0)
      return dateB - dateA
    })

  return cuts[0]
}

export const createProfitCut = async (userId) => {
  // 1. Obtener todos los productos para tener los costos a mano
  const productsSnap = await getDocs(collection(db, 'products'))
  const productsMap = {}
  productsSnap.docs.forEach(doc => {
    productsMap[doc.id] = doc.data()
  })

  // 2. Obtener todos los items de venta (sin filtros de DB para evitar problemas de índices)
  const itemsSnap = await getDocs(collection(db, 'saleItems'))
  console.log('Total items fetched:', itemsSnap.size)

  let totalRevenue = 0
  let totalCost = 0
  let itemsCount = 0
  const itemsToUpdate = []

  for (const itemDoc of itemsSnap.docs) {
    const item = { id: itemDoc.id, ...itemDoc.data() }

    // Filtro en memoria: ignorar items ya incluidos completamente en cortes
    if (item.isCutIncluded === true) continue

    // Datos del item
    const unitPrice = item.unitPrice || 0
    if (unitPrice === 0) continue

    const paidAmount = item.paid || 0
    const previouslyCutUnits = item.cutUnits || 0
    const quantity = item.quantity || 0

    // Calcular cuántas unidades están COMPLETAMENTE pagadas
    const paidUnits = Math.floor(paidAmount / unitPrice)
    const newUnitsToCut = Math.min(paidUnits - previouslyCutUnits, quantity - previouslyCutUnits)

    if (newUnitsToCut > 0) {
      itemsCount += newUnitsToCut
      totalRevenue += (newUnitsToCut * unitPrice)

      const product = productsMap[item.productId]
      if (product) {
        totalCost += (product.costPrice * newUnitsToCut)
      }

      const totalCutUnits = previouslyCutUnits + newUnitsToCut
      const isFullyCut = totalCutUnits >= quantity

      itemsToUpdate.push({
        id: item.id,
        newCutUnits: totalCutUnits,
        isFullyCut
      })
    }
  }

  if (itemsCount === 0) {
    throw new Error('No se encontraron nuevos productos completamente pagados para incluir en un corte.')
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
