import React, { useState, useEffect } from 'react'
import { getClients, createClient, updateClient, getClientById, getClientHistory } from '../services/clientService'
import { applyCascadingPayment } from '../services/paymentService'
import { formatCurrency } from '../utils/helpers'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

export default function ClientsPage() {
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Estado para modal de abono
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentClient, setPaymentClient] = useState(null)
  const [pendingSales, setPendingSales] = useState([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const data = await getClients()
      // Enriquecer con saldos pendientes
      const enriched = await Promise.all(
        data.map(async (client) => {
          const fullData = await getClientById(client.id)
          return fullData
        })
      )
      setClients(enriched)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedClient) {
        await updateClient(selectedClient.id, formData)
      } else {
        await createClient(formData)
      }
      setFormData({ name: '', phone: '', email: '' })
      setShowForm(false)
      setSelectedClient(null)
      await loadClients()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleEdit = (client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email
    })
    setShowForm(true)
  }

  // Función para abrir el modal de abono
  const handleOpenPaymentModal = async (client) => {
    try {
      setError('')
      setPaymentClient(client)

      // Cargar ventas pendientes del cliente
      const history = await getClientHistory(client.id)
      const pending = history.filter(sale => sale.status !== 'paid' && (sale.total - sale.paid) > 0)

      if (pending.length === 0) {
        setError('Este cliente no tiene ventas pendientes de pago')
        return
      }

      setPendingSales(pending)
      setSelectedSaleId(pending[0]?.id || '')
      setPaymentAmount('')
      setShowPaymentModal(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // Función para procesar el abono
  const handleProcessPayment = async (e) => {
    e.preventDefault()

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Por favor ingrese un monto válido')
      return
    }

    setProcessingPayment(true)
    setError('')

    try {
      const amount = parseFloat(paymentAmount)
      const result = await applyCascadingPayment(paymentClient.id, amount, auth.currentUser?.uid, selectedSaleId)

      let message = `¡Abono de ${formatCurrency(result.totalApplied)} aplicado exitosamente!`
      if (result.remainingBalance > 0) {
        message += ` (Sobrante: ${formatCurrency(result.remainingBalance)})`
      }
      setSuccessMessage(message)
      setShowPaymentModal(false)
      setPaymentAmount('')
      setSelectedSaleId('')
      setPaymentClient(null)

      // Recargar clientes para actualizar saldos
      await loadClients()

      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingPayment(false)
    }
  }

  // Obtener saldo pendiente de la venta seleccionada
  const getSelectedSalePending = () => {
    const sale = pendingSales.find(s => s.id === selectedSaleId)
    return sale ? (sale.total - sale.paid) : 0
  }

  if (loading) return <p>Cargando clientes...</p>

  return (
    <div className="clients-page">
      <div className="header-container">
        <img src={logo} alt="Logo Sharlyne Store" className="brand-logo" />
        <h1>👥 Gestión de Clientes</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <button onClick={() => {
        setShowForm(!showForm)
        setSelectedClient(null)
        setFormData({ name: '', phone: '', email: '' })
      }} className="btn-primary">
        {showForm ? 'Cancelar' : '+ Nuevo Cliente'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Teléfono"
            value={formData.phone}
            onChange={handleInputChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleInputChange}
          />
          <button type="submit" className="btn-primary">
            {selectedClient ? 'Actualizar' : 'Guardar'}
          </button>
        </form>
      )}

      <div className="clients-grid">
        {clients.map(client => (
          <div key={client.id} className="client-card">
            <h3>{client.name}</h3>
            <p className="contact">{client.phone}</p>
            <p className="contact">{client.email}</p>

            <div className="balance-section">
              <span className={`status ${client.status}`}>
                {client.status === 'al_día' ? '✓ Al día' : '⚠ Con deuda'}
              </span>
              <p className="balance">
                Saldo pendiente: {formatCurrency(client.pendingBalance || 0)}
              </p>
            </div>

            <div className="card-actions">
              <button onClick={() => handleEdit(client)} className="btn-secondary">
                Editar
              </button>
              <button
                onClick={() => handleOpenPaymentModal(client)}
                className="btn-primary"
                disabled={client.status === 'al_día'}
              >
                Registrar Abono
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Registro de Abono */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>💰 Registrar Abono</h2>
            <p className="modal-subtitle">Cliente: <strong>{paymentClient?.name}</strong></p>

            <form onSubmit={handleProcessPayment}>
              <div className="form-group">
                <label>Seleccionar Venta:</label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => setSelectedSaleId(e.target.value)}
                >
                  <option value="">-- Aplicar a deuda más antigua (Automático) --</option>
                  {pendingSales.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      Venta del {sale.date?.toDate?.()?.toLocaleDateString() || 'N/A'} -
                      Pendiente: {formatCurrency(sale.total - sale.paid)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Saldo pendiente de esta venta:</label>
                <p className="pending-amount">{formatCurrency(getSelectedSalePending())}</p>
              </div>

              <div className="form-group">
                <label>Monto del Abono:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Ingrese el monto"
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="btn-secondary"
                  disabled={processingPayment}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Procesando...' : 'Aplicar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .clients-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: 2rem 0;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .form input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .clients-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }

        .client-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .client-card h3 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .contact {
          color: #666;
          margin: 0.5rem 0;
          font-size: 0.9rem;
        }

        .balance-section {
          margin: 1.5rem 0;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .status {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: bold;
        }

        .status.al_día {
          background: #e8f5e9;
          color: #2e7d32;
        }

        .status.deuda {
          background: #ffebee;
          color: #c62828;
        }

        .balance {
          margin: 0.5rem 0 0;
          color: #333;
          font-weight: bold;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1.5rem;
        }

        .card-actions button {
          flex: 1;
          padding: 0.75rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .card-actions button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #888;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #666;
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

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal h2 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .modal-subtitle {
          color: #666;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: bold;
          color: #555;
        }

        .form-group select,
        .form-group input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .pending-amount {
          font-size: 1.5rem;
          font-weight: bold;
          color: #c62828;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .modal-actions button {
          flex: 1;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: bold;
        }

        .btn-primary {
          background: #4F46E5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338CA;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
      `}</style>
    </div>
  )
}
