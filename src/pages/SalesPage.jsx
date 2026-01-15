import React, { useState, useEffect } from 'react'
import { getSales, createSale, getSaleById } from '../services/saleService'
import { getClients } from '../services/clientService'
import { getProducts } from '../services/productService'
import { formatCurrency } from '../utils/helpers'
import { auth } from '../firebase'
import * as XLSX from 'xlsx'
import logo from '../assets/logo.png'

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    clientId: '',
    items: [],
    paymentType: 'total',
    amountPaid: ''
  })
  const [selectedProducts, setSelectedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSale, setSelectedSale] = useState(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [salesData, clientsData, productsData] = await Promise.all([
        getSales(),
        getClients(),
        getProducts()
      ])
      setSales(salesData)
      setClients(clientsData)
      setProducts(productsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = (productId, quantity) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    if (product.stock < quantity) {
      setError(`Stock insuficiente de ${product.name}`)
      return
    }

    const existingItem = selectedProducts.find(p => p.productId === productId)
    if (existingItem) {
      setSelectedProducts(selectedProducts.map(p =>
        p.productId === productId ? { ...p, quantity } : p
      ))
    } else {
      setSelectedProducts([...selectedProducts, {
        productId,
        quantity: parseInt(quantity),
        unitPrice: product.salePrice,
        productName: product.name
      }])
    }
  }

  const handleRemoveProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId))
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.clientId) {
      setError('Selecciona un cliente')
      return
    }

    if (selectedProducts.length === 0) {
      setError('Añade al menos un producto')
      return
    }

    const total = calculateTotal()

    if (formData.paymentType === 'partial' && formData.amountPaid === '') {
      setError('Ingresa el monto a pagar (puede ser 0)')
      return
    }

    if (formData.paymentType === 'partial' && parseFloat(formData.amountPaid) > total) {
      setError('El monto pagado no puede exceder el total')
      return
    }

    try {
      await createSale({
        clientId: formData.clientId,
        items: selectedProducts,
        paymentType: formData.paymentType,
        amountPaid: formData.paymentType === 'total' ? total : parseFloat(formData.amountPaid),
        userId: auth.currentUser.uid
      })

      setFormData({ clientId: '', items: [], paymentType: 'total', amountPaid: '' })
      setSelectedProducts([])
      setShowForm(false)
      await loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  const viewSaleDetails = async (saleId) => {
    setLoadingDetails(true)
    try {
      const sale = await getSaleById(saleId)

      // Enriquecer items con nombres de productos
      const itemsWithNames = sale.items.map(item => {
        const product = products.find(p => p.id === item.productId)
        return { ...item, productName: product ? product.name : 'Producto desconocido' }
      })

      setSelectedSale({ ...sale, items: itemsWithNames })
    } catch (err) {
      setError('Error al cargar detalles de la venta')
    } finally {
      setLoadingDetails(false)
    }
  }

  const closeDetails = () => {
    setSelectedSale(null)
  }

  const exportToExcel = () => {
    const data = sales.map(sale => {
      const client = clients.find(c => c.id === sale.clientId)
      return {
        Fecha: new Date(sale.date.toDate?.() || sale.date).toLocaleString(),
        Cliente: client?.name || 'Desconocido',
        Total: sale.total,
        Pagado: sale.paid,
        Pendiente: sale.total - sale.paid,
        Estado: sale.status === 'paid' ? 'Pagado' : 'Pendiente'
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Historial Ventas')
    XLSX.writeFile(wb, 'Historial_Ventas_Sharlyne.xlsx')
  }

  if (loading) return <p>Cargando ventas...</p>

  const total = calculateTotal()

  return (
    <div className="sales-page">
      <div className="header-container">
        <img src={logo} alt="Logo Sharlyne Store" className="brand-logo" />
        <h1>Sistema Inventario Sharlyne Store</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        {showForm ? 'Cancelar' : '+ Nueva Venta'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <div>
            <label>Cliente *</label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
            >
              <option value="">Selecciona un cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div>
            <h3>Productos</h3>
            <div className="products-selector">
              {products.map(product => (
                <div key={product.id} className="product-selector-item">
                  <span>{product.name} - {formatCurrency(product.salePrice)} (Stock: {product.stock})</span>
                  <input
                    type="number"
                    min="0"
                    max={product.stock}
                    placeholder="Cant."
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddProduct(product.id, e.target.value)
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="selected-items">
            <h3>Items de la venta:</h3>
            {selectedProducts.length === 0 ? (
              <p>No hay productos seleccionados</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(item => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.quantity * item.unitPrice)}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(item.productId)}
                          className="btn-delete-small"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="total-section">
            <h2>Total: {formatCurrency(total)}</h2>
          </div>

          <div>
            <label>Tipo de Pago *</label>
            <select
              value={formData.paymentType}
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
            >
              <option value="total">Pago Total</option>
              <option value="partial">Pago Parcial (Abono)</option>
            </select>
          </div>

          {formData.paymentType === 'partial' && (
            <div>
              <label>Monto a Pagar *</label>
              <input
                type="number"
                step="0.01"
                max={total}
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                placeholder="Monto"
              />
            </div>
          )}

          <button type="submit" className="btn-primary">Registrar Venta</button>
        </form>
      )}

      <div className="sales-list">
        <h2>Historial de Ventas</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 1).map(sale => { // Mostrar solo la última venta
              const client = clients.find(c => c.id === sale.clientId)
              const pending = sale.total - sale.paid
              return (
                <tr key={sale.id}>
                  <td>{new Date(sale.date.toDate?.() || sale.date).toLocaleDateString()}</td>
                  <td>{client?.name}</td>
                  <td>{formatCurrency(sale.total)}</td>
                  <td>{formatCurrency(sale.paid)}</td>
                  <td>{formatCurrency(pending)}</td>
                  <td><span className={`badge ${sale.status}`}>{sale.status}</span></td>
                  <td>
                    <button
                      className="btn-link"
                      onClick={() => viewSaleDetails(sale.id)}
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="export-section">
          <button onClick={exportToExcel} className="btn-success">
            📊 Exportar Historial Completo a Excel
          </button>
        </div>
      </div>

      {loadingDetails && <div className="loading-overlay">Cargando detalles...</div>}

      {
        selectedSale && (
          <div className="modal-backdrop" onClick={closeDetails}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Detalle de Venta</h2>
                <button className="close-btn" onClick={closeDetails}>&times;</button>
              </div>

              <div className="modal-body">
                <div className="sale-info-grid">
                  <div>
                    <strong>Fecha:</strong> {new Date(selectedSale.date.toDate ? selectedSale.date.toDate() : selectedSale.date).toLocaleString()}
                  </div>
                  <div>
                    <strong>Total:</strong> {formatCurrency(selectedSale.total)}
                  </div>
                  <div>
                    <strong>Pagado:</strong> {formatCurrency(selectedSale.paid)}
                  </div>
                  <div>
                    <strong>Pendiente:</strong> <span className={selectedSale.total - selectedSale.paid > 0 ? 'text-danger' : 'text-success'}>
                      {formatCurrency(selectedSale.total - selectedSale.paid)}
                    </span>
                  </div>
                </div>

                <h3>Degleso de Productos</h3>
                <div className="table-responsive">
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cant</th>
                        <th>Precio U.</th>
                        <th>Total</th>
                        <th>Abonado</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items.sort((a, b) => a.unitPrice - b.unitPrice).map((item, idx) => {
                        const isPaid = item.pending === 0 || item.paid >= item.subtotal
                        return (
                          <tr key={idx} className={isPaid ? 'row-paid' : 'row-pending'}>
                            <td>{item.productName}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unitPrice)}</td>
                            <td>{formatCurrency(item.subtotal)}</td>
                            <td>{formatCurrency(item.paid || 0)}</td>
                            <td>
                              {isPaid
                                ? <span className="badge paid">Pagado</span>
                                : <span className="badge partial">Pendiente ({formatCurrency(item.pending)})</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <style>{`
        .sales-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .form {
          background: #f9f9f9;
          padding: 2rem;
          border-radius: 8px;
          margin: 2rem 0;
        }

        .form div {
          margin-bottom: 1.5rem;
        }

        .form label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
        }

        .form input,
        .form select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .products-selector {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .product-selector-item {
          display: flex;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .product-selector-item span {
          flex: 1;
        }

        .product-selector-item input {
          width: 70px;
        }

        .selected-items {
          margin: 2rem 0;
        }

        .selected-items table {
          width: 100%;
          border-collapse: collapse;
        }

        .selected-items th {
          background: #667eea;
          color: white;
          padding: 1rem;
          text-align: left;
        }

        .selected-items td {
          padding: 1rem;
          border-bottom: 1px solid #ddd;
        }

        .btn-delete-small {
          padding: 0.5rem 1rem;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .total-section {
          background: #e8eaf6;
          padding: 1.5rem;
          border-radius: 4px;
          margin: 1rem 0;
        }

        .total-section h2 {
          margin: 0;
          color: #333;
        }

        .sales-list {
          margin-top: 3rem;
        }

        .sales-list table {
          width: 100%;
          border-collapse: collapse;
        }

        .sales-list th {
          background: #667eea;
          color: white;
          padding: 1rem;
          text-align: left;
        }

        .sales-list td {
          padding: 1rem;
          border-bottom: 1px solid #ddd;
        }

        .badge {
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .badge.paid {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .badge.partial {
          background: #fff3e0;
          color: #e65100;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .btn-link {
          background: none;
          border: none;
          color: #667eea;
          text-decoration: underline;
          cursor: pointer;
          font-weight: bold;
        }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 1rem;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          line-height: 1;
        }

        .sale-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 2rem;
        }

        .detail-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .detail-table th {
          background: #2c3e50;
          color: white;
          padding: 0.75rem;
          text-align: left;
        }

        .detail-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #eee;
        }

        .row-paid {
          background-color: #f1f8e9;
        }

        .text-danger { color: #d32f2f; font-weight: bold; }
        .text-success { color: #388e3c; font-weight: bold; }

        .loading-overlay {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: white;
          padding: 1rem 2rem;
          border-radius: 30px;
          z-index: 2000;
        }

        .header-container {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1rem 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .brand-logo {
          height: 80px;
          width: auto;
          object-fit: contain;
        }

        .export-section {
          margin-top: 2rem;
          text-align: right;
        }

        .btn-success {
          background-color: #217346; /* Color Excel */
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: bold;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-success:hover {
          background-color: #1e6b41;
        }
      `}</style>
    </div >
  )
}
