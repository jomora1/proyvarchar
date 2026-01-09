/**
 * SCRIPT DE INICIALIZACIÓN DE FIRESTORE
 * Ejecuta esto en la consola de Firebase o como Cloud Function
 * para crear índices y configuraciones iniciales
 */

// Para crear indexes en Firestore, usa Firebase Console:
// https://console.firebase.google.com/project/ramd-b7538/firestore/indexes

const firestoreIndexes = [
  {
    collectionPath: 'sales',
    fields: ['clientId', 'date']
  },
  {
    collectionPath: 'sales',
    fields: ['status', 'date']
  },
  {
    collectionPath: 'saleItems',
    fields: ['saleId']
  },
  {
    collectionPath: 'payments',
    fields: ['saleId', 'date']
  }
]

/**
 * REGLAS DE SEGURIDAD FIRESTORE
 * Copia esto en Firebase Console → Firestore → Rules
 */

const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuarios - solo lectura/escritura personal
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Productos - lectura para todos, escritura solo admin
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Clientes - lectura/escritura para usuarios autenticados
    match /clients/{clientId} {
      allow read, write: if request.auth != null;
    }

    // Ventas - lectura/escritura para usuarios autenticados
    match /sales/{saleId} {
      allow read, write: if request.auth != null;
    }

    // Items de ventas - lectura/escritura para usuarios autenticados
    match /saleItems/{itemId} {
      allow read, write: if request.auth != null;
    }

    // Pagos/Abonos - lectura/escritura para usuarios autenticados
    match /payments/{paymentId} {
      allow read, write: if request.auth != null;
    }

    // Cortes de ganancia - solo admin
    match /profitCuts/{cutId} {
      allow read, write: if request.auth != null && 
                            get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
`

// Exportar para documentación
module.exports = { firestoreIndexes, firestoreRules }
