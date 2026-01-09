# Guía del Proyecto: Sistema de Gestión de Inventario

Este documento detalla el funcionamiento, instalación y lógica de negocio del proyecto.

## 📋 Descripción General
Sistema web para la gestión de inventario, ventas, clientes y control de utilidades (Cortes).

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js instalado.
- Acceso a internet (para Firebase).

### Pasos
1.  **Instalar dependencias**:
    ```bash
    npm install
    ```
2.  **Iniciar servidor de desarrollo**:
    ```bash
    npm run dev
    ```
3.  **Acceder**:
    Abrir el navegador en la URL indicada (usualmente `http://localhost:5173`).

---

## 🛠 Funcionalidades Principales

### 1. Gestión de Productos
- Registro de productos con: Precio de Venta, Precio de Costo (para cálculo de utilidad) y Stock.
- Validación de stock al realizar ventas.

### 2. Registro de Ventas
- Selección de cliente y productos.
- **Tipos de Pago**:
    - **Total**: Se paga el 100% al momento.
    - **Parcial (Abono)**: Se abona una cantidad. El sistema rastrea el saldo pendiente.
- **Visualización Detallada**:
    - En el historial de ventas, el botón "Ver Detalle" permite ver el estado de pago de *cada producto individualmente*.

### 3. Cortes de Ganancias (Lógica Especial)
El sistema utiliza una lógica de **Corte por Unidad Pagada**:
- **Objetivo**: Reflejar ganancias solo sobre la mercancía que ya ha sido totalmente pagada por el cliente.
- **Comportamiento**:
    - Si una venta incluye 5 unidades de un producto.
    - Y el cliente abona el equivalente a 2 unidades.
    - El Corte de Ganancias incluirá **solo esas 2 unidades** como vendidas.
    - Las 3 unidades restantes quedarán pendientes para futuros cortes hasta que se cubra su precio.
- **Prioridad de Pago**: Los abonos cubren automáticamente los productos ordenados del precio menor al mayor (si hubiere variedad).

## 📱 Diseño Responsivo
La aplicación está optimizada para funcionar en dispositivos móviles:
- Menú lateral colapsable.
- Tablas con desplazamiento horizontal.
- Formularios adaptados a pantallas táctiles.

---

## 📂 Estructura del Proyecto
- **/src/pages**: Vistas principales (Ventas, Productos, Cortes).
- **/src/services**: Lógica de comunicación con Firebase.
    - `profitCutService.js`: Contiene la lógica crítica del prorrateo por unidades.
    - `paymentService.js`: Maneja la distribución de abonos.
- **/src/components**: Componentes reutilizables.
