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
    orderBy,
    writeBatch
} from 'firebase/firestore'

/**
 * MÓDULO DE COMPRAS
 * 
 * Gestiona las entradas de inventario:
 * 1. Registra la compra con proveedor, productos y costos
 * 2. Actualiza automáticamente el stock de los productos
 * 3. Mantiene historial de compras
 */

// Crear una nueva compra y actualizar inventario
export const createPurchase = async (purchaseData, userId) => {
    const { supplierId, supplierName, items, notes } = purchaseData

    if (!items || items.length === 0) {
        throw new Error('Debe agregar al menos un producto a la compra')
    }

    const batch = writeBatch(db)

    // Calcular totales
    let totalAmount = 0
    let totalItems = 0

    for (const item of items) {
        totalAmount += item.quantity * item.unitCost
        totalItems += item.quantity
    }

    // Crear documento de compra
    const purchaseId = doc(collection(db, 'purchases')).id
    const purchaseRef = doc(db, 'purchases', purchaseId)

    batch.set(purchaseRef, {
        supplierId: supplierId || null,
        supplierName: supplierName || 'Proveedor General',
        items: items.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            unitCost: item.unitCost,
            subtotal: item.quantity * item.unitCost
        })),
        totalAmount,
        totalItems,
        notes: notes || '',
        status: 'completed',
        userId,
        date: new Date(),
        createdAt: new Date()
    })

    // Actualizar stock de cada producto
    for (const item of items) {
        const productRef = doc(db, 'products', item.productId)
        const productSnap = await getDoc(productRef)

        if (!productSnap.exists()) {
            throw new Error(`Producto ${item.productName} no encontrado`)
        }

        const currentStock = productSnap.data().stock || 0
        const newStock = currentStock + item.quantity

        batch.update(productRef, {
            stock: newStock,
            lastPurchaseDate: new Date(),
            lastPurchaseCost: item.unitCost,
            updatedAt: new Date()
        })
    }

    await batch.commit()

    return {
        purchaseId,
        totalAmount,
        totalItems
    }
}

// Obtener todas las compras
export const getPurchases = async () => {
    const q = query(collection(db, 'purchases'), orderBy('date', 'desc'))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date()
    }))
}

// Obtener compra por ID
export const getPurchaseById = async (id) => {
    const docSnap = await getDoc(doc(db, 'purchases', id))
    if (!docSnap.exists()) return null

    return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date?.toDate?.() || new Date()
    }
}

// Obtener compras por rango de fechas
export const getPurchasesByDateRange = async (startDate, endDate) => {
    const q = query(
        collection(db, 'purchases'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate?.() || new Date()
    }))
}

// Obtener resumen de compras
export const getPurchasesSummary = async () => {
    const purchases = await getPurchases()

    const totalPurchases = purchases.length
    const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
    const totalItems = purchases.reduce((sum, p) => sum + (p.totalItems || 0), 0)

    // Compras del mes actual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlyPurchases = purchases.filter(p => p.date >= startOfMonth)
    const monthlyAmount = monthlyPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)

    return {
        totalPurchases,
        totalAmount,
        totalItems,
        monthlyPurchases: monthlyPurchases.length,
        monthlyAmount
    }
}
