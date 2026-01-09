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
  increment,
  writeBatch
} from 'firebase/firestore'

// CRUD para productos
export const getProducts = async () => {
  const querySnapshot = await getDocs(collection(db, 'products'))
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export const getProductById = async (id) => {
  const docSnap = await getDoc(doc(db, 'products', id))
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
}

export const getProductByCode = async (code) => {
  const q = query(collection(db, 'products'), where('code', '==', code))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.length > 0
    ? { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() }
    : null
}

export const createProduct = async (productData) => {
  const { code, name, costPrice, salePrice, stock } = productData

  // Validar unicidad del código
  const existing = await getProductByCode(code)
  if (existing) throw new Error('El código de producto ya existe')

  // Validar precios
  if (costPrice >= salePrice) throw new Error('El precio de venta debe ser mayor que el costo')

  const productId = code // Usar código como ID
  await setDoc(doc(db, 'products', productId), {
    code,
    name,
    costPrice: parseFloat(costPrice),
    salePrice: parseFloat(salePrice),
    stock: parseInt(stock),
    createdAt: new Date(),
    updatedAt: new Date()
  })

  return productId
}

export const updateProduct = async (id, updates) => {
  const { costPrice, salePrice } = updates
  
  if (costPrice && salePrice && costPrice >= salePrice) {
    throw new Error('El precio de venta debe ser mayor que el costo')
  }

  const updateData = {
    ...updates,
    updatedAt: new Date()
  }

  if (costPrice) updateData.costPrice = parseFloat(costPrice)
  if (salePrice) updateData.salePrice = parseFloat(salePrice)
  if (updates.stock !== undefined) updateData.stock = parseInt(updates.stock)

  await updateDoc(doc(db, 'products', id), updateData)
}

export const deleteProduct = async (id) => {
  await deleteDoc(doc(db, 'products', id))
}

export const incrementProductStock = async (productId, quantity) => {
  await updateDoc(doc(db, 'products', productId), {
    stock: increment(quantity),
    updatedAt: new Date()
  })
}

export const decrementProductStock = async (productId, quantity) => {
  const product = await getProductById(productId)
  if (!product || product.stock < quantity) {
    throw new Error('Stock insuficiente')
  }
  await updateDoc(doc(db, 'products', productId), {
    stock: increment(-quantity),
    updatedAt: new Date()
  })
}
