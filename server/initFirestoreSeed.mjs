import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import path from 'path'

// Cargar credenciales del SDK (archivo presente en la raíz del proyecto)
const serviceAccountPath = path.resolve(process.cwd(), 'ramd-b7538-firebase-adminsdk-fbsvc-0bf44802bc.json')
let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch (err) {
  console.error('No se pudo leer el archivo de credenciales:', serviceAccountPath)
  console.error(err)
  process.exit(1)
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function seed() {
  const now = admin.firestore.Timestamp.now()

  // Productos de ejemplo
  const products = [
    { code: 'P001', name: 'Producto A', costPrice: 3000, salePrice: 5000, stock: 100 },
    { code: 'P002', name: 'Producto B', costPrice: 7000, salePrice: 10000, stock: 50 },
    { code: 'P003', name: 'Producto C', costPrice: 2000, salePrice: 3000, stock: 200 }
  ]

  console.log('Sembrando productos...')
  for (const p of products) {
    const ref = db.collection('products').doc(p.code)
    await ref.set({
      ...p,
      createdAt: now,
      updatedAt: now
    }, { merge: true })
    console.log(`  -> ${p.code}`)
  }

  // Clientes de ejemplo
  const clients = [
    { name: 'Cliente Uno', phone: '8888-0001', email: 'cliente1@example.com' },
    { name: 'Cliente Dos', phone: '8888-0002', email: 'cliente2@example.com' }
  ]

  console.log('Sembrando clientes...')
  for (const c of clients) {
    const docRef = db.collection('clients').doc()
    await docRef.set({
      ...c,
      createdAt: now,
      updatedAt: now
    })
    console.log(`  -> ${c.name} (id: ${docRef.id})`)
  }

  // Lista blanca de emails autorizados (config simple)
  const whitelist = {
    'jamoralescr@gmail.com': 'admin',
    'yopicayoly@gmail.com': 'user',
    'mery301190@gmail.com': 'user'
  }

  console.log('Sembrando configuración (whitelist)...')
  await db.collection('config').doc('whitelist').set({ users: whitelist, updatedAt: now }, { merge: true })

  console.log('\nSeed completado correctamente.')
}

seed().then(() => process.exit(0)).catch(err => {
  console.error('Error en seed:', err)
  process.exit(1)
})
