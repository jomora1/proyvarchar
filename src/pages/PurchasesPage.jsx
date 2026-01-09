import React, { useState, useEffect } from 'react'
import { getPurchases, createPurchase, getPurchasesSummary } from '../services/purchaseService'
import { getProducts } from '../services/productService'
import { formatCurrency } from '../utils/helpers'
import { auth } from '../firebase'

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState([])
    const [products, setProducts] = useState([])
    const [summary, setSummary] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [processing, setProcessing] = useState(false)

    // Estado del formulario
    const [supplierName, setSupplierName] = useState('')
    const [notes, setNotes] = useState('')
    const [purchaseItems, setPurchaseItems] = useState([])

    // Estado para agregar items
    const [selectedProductId, setSelectedProductId] = useState('')
    const [quantity, setQuantity] = useState('')
    const [unitCost, setUnitCost] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [purchasesData, productsData, summaryData] = await Promise.all([
                getPurchases(),
                getProducts(),
                getPurchasesSummary()
            ])
            setPurchases(purchasesData)
            setProducts(productsData)
            setSummary(summaryData)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAddItem = () => {
        if (!selectedProductId || !quantity || !unitCost) {
            setError('Complete todos los campos del producto')
            return
        }

        const product = products.find(p => p.id === selectedProductId)
        if (!product) return

        // Verificar si ya existe el producto en la lista
        const existingIndex = purchaseItems.findIndex(item => item.productId === selectedProductId)

        if (existingIndex >= 0) {
            // Actualizar cantidad existente
            const updatedItems = [...purchaseItems]
            updatedItems[existingIndex].quantity += parseInt(quantity)
            updatedItems[existingIndex].unitCost = parseFloat(unitCost)
            setPurchaseItems(updatedItems)
        } else {
            // Agregar nuevo item
            setPurchaseItems([...purchaseItems, {
                productId: selectedProductId,
                productName: product.name,
                productCode: product.code,
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost)
            }])
        }

        // Limpiar campos
        setSelectedProductId('')
        setQuantity('')
        setUnitCost('')
        setError('')
    }

    const handleRemoveItem = (index) => {
        setPurchaseItems(purchaseItems.filter((_, i) => i !== index))
    }

    const calculateTotal = () => {
        return purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (purchaseItems.length === 0) {
            setError('Debe agregar al menos un producto')
            return
        }

        setProcessing(true)
        setError('')

        try {
            const result = await createPurchase({
                supplierName,
                items: purchaseItems,
                notes
            }, auth.currentUser?.uid)

            setSuccessMessage(`¡Compra registrada exitosamente! Total: ${formatCurrency(result.totalAmount)} (${result.totalItems} unidades)`)

            // Limpiar formulario
            setShowForm(false)
            setSupplierName('')
            setNotes('')
            setPurchaseItems([])

            // Recargar datos
            await loadData()

            setTimeout(() => setSuccessMessage(''), 5000)
        } catch (err) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const handleProductSelect = (productId) => {
        setSelectedProductId(productId)
        const product = products.find(p => p.id === productId)
        if (product && product.costPrice) {
            setUnitCost(product.costPrice.toString())
        }
    }

    if (loading) return <p>Cargando compras...</p>

    return (
        <div className="purchases-page">
            <h1>🛍️ Gestión de Compras</h1>

            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}

            {/* Resumen */}
            {summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <h3>📦 Total Compras</h3>
                        <p className="summary-value">{summary.totalPurchases}</p>
                    </div>
                    <div className="summary-card">
                        <h3>💰 Inversión Total</h3>
                        <p className="summary-value">{formatCurrency(summary.totalAmount)}</p>
                    </div>
                    <div className="summary-card">
                        <h3>📅 Este Mes</h3>
                        <p className="summary-value">{formatCurrency(summary.monthlyAmount)}</p>
                        <p className="summary-subtitle">{summary.monthlyPurchases} compras</p>
                    </div>
                </div>
            )}

            <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary"
            >
                {showForm ? 'Cancelar' : '+ Nueva Compra'}
            </button>

            {/* Formulario de nueva compra */}
            {showForm && (
                <form onSubmit={handleSubmit} className="purchase-form">
                    <h2>📝 Registrar Compra</h2>

                    <div className="form-section">
                        <div className="form-group">
                            <label>Proveedor:</label>
                            <input
                                type="text"
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                placeholder="Nombre del proveedor"
                            />
                        </div>
                    </div>

                    {/* Agregar productos */}
                    <div className="form-section">
                        <h3>Agregar Productos</h3>
                        <div className="add-item-row">
                            <select
                                value={selectedProductId}
                                onChange={(e) => handleProductSelect(e.target.value)}
                            >
                                <option value="">Seleccione un producto</option>
                                {products.map(product => (
                                    <option key={product.id} value={product.id}>
                                        {product.code} - {product.name} (Stock: {product.stock || 0})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="Cantidad"
                            />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unitCost}
                                onChange={(e) => setUnitCost(e.target.value)}
                                placeholder="Costo unitario"
                            />
                            <button type="button" onClick={handleAddItem} className="btn-add">
                                + Agregar
                            </button>
                        </div>
                    </div>

                    {/* Lista de items */}
                    {purchaseItems.length > 0 && (
                        <div className="items-list">
                            <h3>Productos a Comprar</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Costo Unit.</th>
                                        <th>Subtotal</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purchaseItems.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.productCode}</td>
                                            <td>{item.productName}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency(item.unitCost)}</td>
                                            <td>{formatCurrency(item.quantity * item.unitCost)}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="btn-remove"
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="4"><strong>TOTAL</strong></td>
                                        <td colSpan="2"><strong>{formatCurrency(calculateTotal())}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Notas:</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observaciones adicionales..."
                            rows="3"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={processing || purchaseItems.length === 0}
                    >
                        {processing ? 'Procesando...' : `💾 Guardar Compra (${formatCurrency(calculateTotal())})`}
                    </button>
                </form>
            )}

            {/* Historial de compras */}
            <div className="purchases-history">
                <h2>📋 Historial de Compras</h2>
                {purchases.length === 0 ? (
                    <p className="no-data">No hay compras registradas</p>
                ) : (
                    <table className="purchases-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Proveedor</th>
                                <th>Productos</th>
                                <th>Unidades</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(purchase => (
                                <tr key={purchase.id}>
                                    <td>{purchase.date?.toLocaleDateString?.() || 'N/A'}</td>
                                    <td>{purchase.supplierName}</td>
                                    <td>
                                        <ul className="items-mini-list">
                                            {purchase.items?.map((item, i) => (
                                                <li key={i}>{item.productName} x{item.quantity}</li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td>{purchase.totalItems}</td>
                                    <td><strong>{formatCurrency(purchase.totalAmount)}</strong></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
        .purchases-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          border-radius: 12px;
          text-align: center;
        }

        .summary-card h3 {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          opacity: 0.9;
        }

        .summary-value {
          font-size: 1.8rem;
          font-weight: bold;
          margin: 0;
        }

        .summary-subtitle {
          font-size: 0.85rem;
          opacity: 0.8;
          margin: 0.5rem 0 0;
        }

        .btn-primary {
          background: #4F46E5;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
        }

        .btn-primary:hover {
          background: #4338CA;
        }

        .purchase-form {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          margin: 2rem 0;
        }

        .purchase-form h2 {
          margin: 0 0 1.5rem;
          color: #333;
        }

        .purchase-form h3 {
          margin: 1rem 0;
          color: #555;
          font-size: 1rem;
        }

        .form-section {
          margin-bottom: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #eee;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: #555;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .add-item-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr auto;
          gap: 1rem;
          align-items: end;
        }

        .btn-add {
          background: #10B981;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }

        .btn-add:hover {
          background: #059669;
        }

        .items-list {
          margin: 1.5rem 0;
        }

        .items-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-list th,
        .items-list td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .items-list th {
          background: #f5f5f5;
          font-weight: bold;
        }

        .items-list tfoot td {
          background: #f0f0f0;
          font-size: 1.1rem;
        }

        .btn-remove {
          background: #EF4444;
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
        }

        .btn-remove:hover {
          background: #DC2626;
        }

        .btn-submit {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1rem;
          font-weight: bold;
          width: 100%;
          margin-top: 1rem;
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .purchases-history {
          margin-top: 3rem;
        }

        .purchases-history h2 {
          margin-bottom: 1rem;
          color: #333;
        }

        .purchases-table {
          width: 100%;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .purchases-table th,
        .purchases-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .purchases-table th {
          background: #4F46E5;
          color: white;
        }

        .purchases-table tbody tr:hover {
          background: #f9f9f9;
        }

        .items-mini-list {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 0.85rem;
        }

        .items-mini-list li {
          padding: 0.2rem 0;
        }

        .no-data {
          text-align: center;
          color: #888;
          padding: 2rem;
          background: #f5f5f5;
          border-radius: 8px;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .success-message {
          background: #e8f5e9;
          color: #2e7d32;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-weight: bold;
        }

        @media (max-width: 768px) {
          .add-item-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    )
}
