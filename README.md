# 📊 Sistema de Gestión de Inventario y Ventas

Aplicación web full-stack para pequeños negocios, con control de clientes, productos, ventas, abonos (pagos parciales) y cortes de ganancia, utilizando **React + Vite + Firebase**.

## 🚀 Características Principales

### ✅ Autenticación
- **Google OAuth** (OAuth 2.0)
- Whitelist de usuarios autorizados
- Control de sesión persistente
- Roles (admin / usuario)

### ✅ Gestión de Productos
- CRUD completo
- Código único por producto
- Validación de precios (costo < venta)
- Control automático de stock
- Margen de ganancia calculado

### ✅ Gestión de Clientes
- CRUD de clientes
- Saldo pendiente en tiempo real
- Historial de compras
- Estado: al día / con deuda

### ✅ Módulo de Ventas
- Registro de ventas a clientes
- Múltiples productos por venta
- Pago total o parcial
- Cálculo automático de totales

### ✅ Sistema de Abonos (Pagos Parciales)
**LÓGICA CRÍTICA:**
- Liquida primero el producto más barato
- Aplica abono secuencialmente en orden ascendente de precio
- Recalcula saldos automáticamente

**Ejemplo:**
```
Productos: A (₡5.000), B (₡10.000), C (₡3.000)
Abono: ₡7.000

Resultado:
✓ C: ₡3.000 (pagado completamente)
✓ A: ₡4.000 de ₡5.000 (quedan ₡1.000)
  B: ₡0 (sin afectar)
```

### ✅ Cortes de Ganancias
- Solo considera ventas 100% pagadas
- Calcula: ingresos, costos, ganancia neta
- Cortes acumulativos sin duplicados
- Historial de cortes

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18 + Vite |
| **Backend** | Firebase (Functions/Realtime) |
| **BD** | Firestore (documento-orientada) |
| **Auth** | Firebase Auth + Google OAuth |
| **Hosting** | Firebase Hosting |
| **UI** | CSS nativo + estilos inline |

## 📦 Instalación

### Requisitos
- Node.js 18+ (ya instalado: v24.12.0)
- npm 11+ (ya instalado: v11.6.2)
- Cuenta Firebase con Firestore habilitado

### Pasos

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar Firebase:**
   - Crear proyecto en [Firebase Console](https://console.firebase.google.com)
   - Habilitar **Firestore Database**
   - Habilitar **Google OAuth** en Authentication
   - Copiar configuración web

3. **Actualizar `src/firebase.js`:**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "ramd-b7538",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
}
```

4. **Copiar JSON del SDK Admin:**
   - El archivo `ramd-b7538-firebase-adminsdk-fbsvc-0bf44802bc.json` ya está en la raíz del proyecto

5. **Ejecutar servidor de desarrollo:**
```bash
npm run dev
```

Acceso: `http://localhost:5173`

## 🔐 Usuarios Autorizados

| Email | Rol |
|-------|-----|
| jamoralescr@gmail.com | admin |
| yopicayoly@gmail.com | user |
| mery301190@gmail.com | user |

## 📁 Estructura de Carpetas

```
src/
├── services/
│   ├── authService.js         # Google OAuth + whitelist
│   ├── productService.js      # CRUD productos
│   ├── clientService.js       # CRUD clientes
│   ├── saleService.js         # CRUD ventas
│   ├── paymentService.js      # Lógica de abonos (CRÍTICA)
│   └── profitCutService.js    # Cortes de ganancias
├── components/
│   ├── LoginPage.jsx          # Pantalla login
│   ├── ProtectedRoute.jsx     # Protección de rutas
│   └── Dashboard.jsx          # Panel principal
├── pages/
│   ├── ProductsPage.jsx       # Gestión productos
│   ├── ClientsPage.jsx        # Gestión clientes
│   ├── SalesPage.jsx          # Registro ventas
│   └── ProfitCutsPage.jsx     # Cortes ganancias
├── hooks/
│   └── (custom hooks)
├── utils/
│   ├── helpers.js             # Funciones comunes
│   └── firestoreConfig.js     # Índices y reglas
├── firebase.js                # Configuración Firebase
├── App.jsx                    # Componente principal
└── index.css                  # Estilos globales
```

## 🗄️ Estructura Firestore

**Colecciones:**
- `users` → Usuarios autenticados con roles
- `products` → Inventario (ID = código del producto)
- `clients` → Clientes
- `sales` → Ventas (con total, pagado, estado)
- `saleItems` → Items de cada venta (tabla intermedia)
- `payments` → Registro de abonos
- `profitCuts` → Cortes de ganancias

Ver [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md) para detalles completos.

## 🔄 Flujos Principales

### 1. Crear Venta
```
Cliente selecciona productos → Total calculado automático
→ Elige: Pago total / Pago parcial
→ Si es parcial: Primer abono registrado
→ Stock decrementado automáticamente
```

### 2. Aplicar Abono
```
Venta con saldo pendiente
→ Usuario registra monto de abono
→ Sistema aplica regla crítica:
   • Ordena items por precio ASC
   • Liquida cada item secuencialmente
→ Recalcula saldos
→ Si total pagado ≥ total venta → status = "paid"
```

### 3. Hacer Corte
```
Usuario admin solicita corte
→ Sistema busca ventas status="paid" desde último corte
→ Calcula:
   • totalRevenue (suma de totales de ventas)
   • totalCost (suma de costos de productos)
   • netProfit (Revenue - Cost)
→ Genera reporte
→ Marca ventas como "cortadas"
```

## 💰 Optimización de Costos

### Estrategia Firestore
- **Índices compuestos** solo en campos necesarios
- **Batch operations** para múltiples escrituras
- **Caché local** (localStorage) para datos frecuentes
- **Lectura selectiva** (solo campos necesarios)

### Estimado Mensual
- Hasta 50,000 lecturas/mes: **GRATIS** (tier gratuito)
- Hasta 20,000 escrituras/mes: **GRATIS**
- Almacenamiento: 1GB gratis

## 🧪 Testing

```bash
# Próximamente: Tests unitarios con Jest
npm run test

# Build para producción
npm run build

# Vista previa del build
npm run preview
```

## 🚀 Deploy a Firebase Hosting

```bash
# Instalar CLI (si no está)
npm install -g firebase-tools

# Login a Firebase
firebase login

# Deploy
firebase deploy
```

## 📋 Checklist de Configuración

- [ ] Configurar Firestore Collections
- [ ] Habilitar Google OAuth
- [ ] Validar whitelist de usuarios
- [ ] Importar reglas de seguridad Firestore
- [ ] Actualizar `src/firebase.js` con credenciales
- [ ] Pruebas de autenticación
- [ ] CRUD de productos
- [ ] CRUD de clientes
- [ ] Registro de ventas
- [ ] Abonos con regla crítica
- [ ] Cortes de ganancias
- [ ] Deploy a producción

## 📞 Soporte

- Firebase Console: https://console.firebase.google.com/project/ramd-b7538
- Documentación: Ver [TECHNICAL_SPECIFICATION.md](./TECHNICAL_SPECIFICATION.md)
- Código fuente: `/src/services` para lógica de negocio

## 📄 Licencia

Privado - Proyecto para pequeño negocio

---

**Última actualización:** Enero 7, 2026
