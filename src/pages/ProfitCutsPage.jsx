import React, { useState, useEffect } from 'react'
import { getProfitCuts, createProfitCut } from '../services/profitCutService'
import { formatCurrency, formatDate } from '../utils/helpers'
import { auth } from '../firebase'
import logo from '../assets/logo.png'

export default function ProfitCutsPage() {
  const [cuts, setCuts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creatingCut, setCreatingCut] = useState(false)

  useEffect(() => {
    loadCuts()
  }, [])

  const loadCuts = async () => {
    try {
      const data = await getProfitCuts()
      setCuts(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCut = async () => {
    if (!window.confirm('¿Crear un nuevo corte de ganancias? Esto es irreversible.')) {
      return
    }

    setCreatingCut(true)
    try {
      const newCut = await createProfitCut(auth.currentUser.uid)
      setError('')
      await loadCuts()
    } catch (err) {
      console.error('Error creating profit cut:', err)
      setError(err.message)
    } finally {
      setCreatingCut(false)
    }
  }

  if (loading) return <p>Cargando cortes...</p>

  return (
    <div className="profit-cuts-page">
      <div className="header-container">
        <img src={logo} alt="Logo Sharlyne Store" className="brand-logo" />
        <h1>💰 Cortes de Ganancias</h1>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        onClick={handleCreateCut}
        disabled={creatingCut}
        className="btn-primary btn-create-cut"
      >
        {creatingCut ? 'Creando corte...' : '📊 Crear Nuevo Corte'}
      </button>

      {cuts.length === 0 ? (
        <p className="no-data">No hay cortes registrados. Crea el primer corte.</p>
      ) : (
        <div className="cuts-list">
          {cuts.slice(0, 1).map(cut => (
            <div key={cut.id} className="cut-card">
              <div className="cut-header">
                <h2>Corte #{cuts.length} (Último Corte)</h2>
                <span className="cut-date">{formatDate(cut.date.toDate?.() || cut.date)}</span>
              </div>

              <div className="cut-stats">
                <div className="stat">
                  <span className="stat-label">Registros Incluidos</span>
                  <span className="stat-value">{cut.itemsCount || cut.salesCount || 0}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">Ingresos Totales</span>
                  <span className="stat-value income">
                    {formatCurrency(cut.totalRevenue)}
                  </span>
                </div>

                <div className="stat">
                  <span className="stat-label">Costos Totales</span>
                  <span className="stat-value cost">
                    {formatCurrency(cut.totalCost)}
                  </span>
                </div>

                <div className="stat highlight">
                  <span className="stat-label">Ganancia Neta</span>
                  <span className="stat-value profit">
                    {formatCurrency(cut.netProfit)}
                  </span>
                </div>
              </div>

              <div className="cut-details">
                <p>
                  <strong>Margen de Ganancia:</strong>{' '}
                  {((cut.netProfit / cut.totalRevenue) * 100).toFixed(2)}%
                </p>
                <p>
                  <strong>Detalle:</strong>{' '}
                  {cut.salesIds ? (
                    <code>{cut.salesIds.slice(0, 3).join(', ')}{cut.salesIds.length > 3 ? '...' : ''}</code>
                  ) : (
                    <span>{cut.itemsCount} productos liquidados individualmente</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .profit-cuts-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .btn-create-cut {
          margin-bottom: 2rem;
        }

        .no-data {
          text-align: center;
          color: #666;
          padding: 2rem;
          background: #f9f9f9;
          border-radius: 8px;
        }

        .cuts-list {
          display: grid;
          gap: 2rem;
        }

        .cut-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          border-left: 4px solid #667eea;
        }

        .cut-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .cut-header h2 {
          margin: 0;
          color: #333;
        }

        .cut-date {
          color: #999;
          font-size: 0.9rem;
        }

        .cut-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat {
          padding: 1.5rem;
          background: #f9f9f9;
          border-radius: 8px;
          text-align: center;
        }

        .stat.highlight {
          background: #e8f5e9;
          border: 2px solid #4caf50;
        }

        .stat-label {
          display: block;
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
          color: #333;
        }

        .stat-value.income {
          color: #4caf50;
        }

        .stat-value.cost {
          color: #f44336;
        }

        .stat-value.profit {
          color: #4caf50;
          font-size: 1.8rem;
        }

        .cut-details {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .cut-details p {
          margin: 0.5rem 0;
        }

        .cut-details code {
          background: white;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-family: monospace;
          color: #c33;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
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
