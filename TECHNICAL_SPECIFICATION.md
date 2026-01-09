# 📋 Especificación Técnica - Sistema de Gestión de Inventario y Ventas

## 🗄️ Estructura de Firestore

### Colecciones y Documentos

#### 1. **users** (Colección)
```
users/
  {userId}/
    uid: string
    email: string
    displayName: string
    photoURL: string
    role: "admin" | "user"
    createdAt: timestamp
    updatedAt: timestamp
```

**Usuarios Autorizados:**
- `jamoralescr@gmail.com` → admin
- `yopicayoly@gmail.com` → user
- `mery301190@gmail.com` → user

---

#### 2. **products** (Colección)
```
products/
  {code}/  # ID es el código del producto
    code: string (único, ej: "PROD-001")
    name: string
    costPrice: number (precio de costo)
    salePrice: number (precio de venta)
    stock: number (disponible)
    createdAt: timestamp
    updatedAt: timestamp
```

**Validaciones:**
- `costPrice < salePrice`
- `code` es único
- `stock >= 0`

---

#### 3. **clients** (Colección)
```
clients/
  {clientId}/
    name: string
    phone: string
    email: string
    createdAt: timestamp
    updatedAt: timestamp
```

**Campos Calculados (en Cliente):**
- `pendingBalance`: suma de (total - paid) de todas sus ventas
- `status`: "al_día" | "deuda"

---

#### 4. **sales** (Colección)
```
sales/
  {saleId}/
    clientId: reference → clients/{clientId}
    total: number (suma de todos los items)
    paid: number (monto pagado hasta ahora)
    paymentType: "total" | "partial"
    status: "paid" | "partial"
    date: timestamp
    userId: reference → users/{userId}
    isCutIncluded: boolean (si está incluida en un corte)
    cutId: string (ID del corte si está incluida)
    createdAt: timestamp
    updatedAt: timestamp
```

---

#### 5. **saleItems** (Tabla Intermedia)
```
saleItems/
  {itemId}/
    saleId: reference → sales/{saleId}
    productId: reference → products/{productId}
    quantity: number
    unitPrice: number (precio de venta en el momento)
    subtotal: number (unitPrice * quantity)
    paid: number (monto pagado de este item)
    pending: number (monto pendiente de este item)
```

**Importante:**
- El campo `paid` se actualiza con cada abono
- El campo `pending` = `subtotal - paid`

---

#### 6. **payments** (Colección de Abonos)
```
payments/
  {paymentId}/
    saleId: reference → sales/{saleId}
    amount: number
    date: timestamp
    userId: reference → users/{userId}
    createdAt: timestamp
```

**Regla Crítica de Abonos:**
1. Ordena items de la venta por `unitPrice` ascendente
2. Liquida cada item completamente antes de pasar al siguiente
3. Actualiza `paid` y `pending` en cada `saleItem`
4. Si el total de `paid` >= `total`, marca la venta como `"paid"`

**Ejemplo de Aplicación:**
```
Items:
  - Producto C: ₡3.000 × 1 = ₡3.000 (pending)
  - Producto A: ₡5.000 × 1 = ₡5.000 (pending)
  - Producto B: ₡10.000 × 1 = ₡10.000 (pending)

Abono de ₡7.000:
  1. Liquida C: ₡3.000 (quedan ₡4.000)
  2. Liquida A: ₡4.000 de ₡5.000 (quedan ₡0)

Resultado:
  - C: paid=₡3.000, pending=₡0 ✓
  - A: paid=₡4.000, pending=₡1.000
  - B: paid=₡0, pending=₡10.000
```

---

#### 7. **profitCuts** (Cortes de Ganancias)
```
profitCuts/
  {cutId}/
    salesCount: number (cantidad de ventas incluidas)
    totalRevenue: number (suma de total de ventas)
    totalCost: number (suma de costo de productos vendidos)
    netProfit: number (totalRevenue - totalCost)
    date: timestamp
    userId: reference → users/{userId}
    salesIds: array<string> (IDs de las ventas incluidas)
    createdAt: timestamp
```

**Reglas del Corte:**
- Solo incluye ventas con `status === "paid"`
- Solo considera ventas después del último corte
- No duplica ventas ya cortadas
- Acumulativo y consecutivo

---

## 🔐 Reglas de Seguridad Firestore (rules.json)

```json
{
  "rules": {
    "users": {
      "{userId}": {
        ".read": "request.auth.uid == userId",
        ".write": "request.auth.uid == userId"
      }
    },
    "products": {
      ".read": "request.auth != null",
      ".write": "root.child('users').child(request.auth.uid).child('role').val() == 'admin'"
    },
    "clients": {
      ".read": "request.auth != null",
      ".write": "request.auth != null"
    },
    "sales": {
      ".read": "request.auth != null",
      ".write": "request.auth != null"
    },
    "saleItems": {
      ".read": "request.auth != null",
      ".write": "request.auth != null"
    },
    "payments": {
      ".read": "request.auth != null",
      ".write": "request.auth != null"
    },
    "profitCuts": {
      ".read": "root.child('users').child(request.auth.uid).child('role').val() == 'admin'",
      ".write": "root.child('users').child(request.auth.uid).child('role').val() == 'admin'"
    }
  }
}
```

---

## 📊 Flujos Principales

### 1. **Crear Venta**
```
POST /sales
- clientId: string
- items: [{ productId, quantity, unitPrice }]
- paymentType: "total" | "partial"
- amountPaid: number (si es partial)

Acciones:
1. Crear documento en `sales`
2. Crear documentos en `saleItems` (uno por producto)
3. Decrementar `stock` en cada producto
4. Si paymentType="partial", crear primer abono en `payments`
```

### 2. **Aplicar Abono**
```
POST /payments
- saleId: string
- amount: number
- userId: string

Acciones:
1. Validar saldo pendiente
2. Obtener items ordenados por unitPrice ASC
3. Aplicar abono siguiendo regla crítica
4. Actualizar `paid` y `pending` en cada item
5. Crear registro en `payments`
6. Si venta está 100% pagada, cambiar status a "paid"
```

### 3. **Corte de Ganancias**
```
POST /profitCuts
- userId: string

Acciones:
1. Obtener último corte (si existe)
2. Buscar ventas con status="paid" posteriores al último corte
3. Calcular totalRevenue, totalCost, netProfit
4. Crear documento en `profitCuts`
5. Marcar ventas con cutId y isCutIncluded=true
```

---

## 💰 Optimización de Costos Firebase

### Estrategia de Lectura/Escritura Eficiente

1. **Índices Compuestos Necesarios:**
   - `sales`: (clientId, date)
   - `sales`: (status, date)
   - `saleItems`: (saleId)
   - `payments`: (saleId)

2. **Caché Local:** Implementar `React Context` + `localStorage` para datos frecuentes:
   - Lista de productos
   - Usuario actual
   - Ventas recientes

3. **Batch Operations:** Usar `writeBatch` para operaciones múltiples (costo = 1 escritura, no N)

4. **Aggregation:** Usar `FieldValue.serverTimestamp()` para cálculos en servidor

---

## 🛡️ Autenticación y Autorización

### Google OAuth + Whitelist

```javascript
// Solo estos emails pueden acceder:
- jamoralescr@gmail.com (admin)
- yopicayoly@gmail.com (user)
- mery301190@gmail.com (user)

// Flujo:
1. Google login
2. Validar email en whitelist
3. Crear/actualizar documento en `users`
4. Asignar rol según email
5. Guardar sesión con browserLocalPersistence
```

---

## 📱 Componentes React Necesarios

- **Auth:** LoginPage, ProtectedRoute
- **Dashboard:** Resumen de ventas, últimos movimientos
- **Products:** ProductList, ProductForm, ProductEdit
- **Clients:** ClientList, ClientForm, ClientDetail
- **Sales:** SaleList, SaleForm, SaleDetail
- **Payments:** PaymentForm, PaymentHistory
- **ProfitCuts:** ProfitCutList, ProfitCutDetail

---

## 🚀 Stack Tecnológico Recomendado

- **Frontend:** React 18 + Vite
- **Backend:** Firebase (Firestore + Functions)
- **Auth:** Firebase Auth (Google OAuth)
- **Base de Datos:** Firestore (documento-orientada)
- **UI:** React + Tailwind CSS (bajo costo visual)
- **Estado:** React Context API (sin dependencias externas)
- **Hosting:** Firebase Hosting (gratis hasta 1GB/mes)

---

## ✅ Checklist de Implementación

- [ ] Configurar Firestore Collections
- [ ] Implementar Google OAuth
- [ ] Validar whitelist de usuarios
- [ ] CRUD de productos
- [ ] CRUD de clientes
- [ ] CRUD de ventas
- [ ] Lógica de abonos (regla crítica)
- [ ] Lógica de cortes de ganancia
- [ ] Dashboards
- [ ] Reportes
- [ ] Reglas de seguridad Firestore
- [ ] Deploy a Firebase Hosting
