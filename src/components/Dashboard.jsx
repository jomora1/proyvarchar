import React, { useEffect, useState } from 'react'
import { getCurrentUser } from '../services/authService'
import { getPurchasesSummary } from '../services/purchaseService'
import { formatCurrency } from '../utils/helpers'
import logo from '../assets/logo.png'

export default function Dashboard({ onNavigate }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purchaseSummary, setPurchaseSummary] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      try {
        const summary = await getPurchasesSummary()
        setPurchaseSummary(summary)
      } catch (error) {
        console.error("Error cargando resumen:", error)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <p>Cargando dashboard...</p>

  return (
    <div className="dashboard">
      <div className="welcome-banner">
        <div className="banner-content">
          <h1>👋 Hola, {user?.displayName}</h1>
          <p>Bienvenido al sistema de gestión de inventario</p>
        </div>
        <img src={logo} alt="Logo" className="banner-logo" />
      </div>

      <div className="dashboard-grid">
        <div className="card" onClick={() => onNavigate('products')}>
          <div className="card-icon">📦</div>
          <h2>Productos</h2>
          <p>Gestionar inventario y precios</p>
          <button className="btn-action">Ver Productos</button>
        </div>

        <div className="card" onClick={() => onNavigate('clients')}>
          <div className="card-icon">👥</div>
          <h2>Clientes</h2>
          <p>Gestionar clientes y abonos</p>
          <button className="btn-action">Ver Clientes</button>
        </div>

        <div className="card" onClick={() => onNavigate('sales')}>
          <div className="card-icon">🛒</div>
          <h2>Ventas</h2>
          <p>Registrar nuevas ventas</p>
          <button className="btn-action">Ir a Ventas</button>
        </div>

        <div className="card" onClick={() => onNavigate('purchases')}>
          <div className="card-icon">🛍️</div>
          <h2>Compras</h2>
          <p>Registrar entradas de stock</p>
          <button className="btn-action">Ver Compras</button>
        </div>

        <div className="card" onClick={() => onNavigate('profit-cuts')}>
          <div className="card-icon">💰</div>
          <h2>Cortes</h2>
          <p>Reportes de ganancias</p>
          <button className="btn-action">Ver Cortes</button>
        </div>
      </div>

      {purchaseSummary && (
        <div className="stats-section">
          <h3>Resumen Mensual</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Compras del Mes</span>
              <span className="stat-value">{formatCurrency(purchaseSummary.monthlyAmount)}</span>
            </div>
            {/* Aquí se podrían agregar más estadísticas de ventas si hubiera un servicio para ello */}
          </div>
        </div>
      )}

      <style>{`
        .dashboard {
          padding: 1rem;
        }

        .welcome-banner {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          border-radius: 12px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .banner-logo {
          height: 100px;
          width: auto;
          mix-blend-mode: multiply; /* Optional: might help blend if logo has white bg */
          background: white;
          padding: 10px;
          border-radius: 8px;
        }

        .welcome-banner h1 {
          margin: 0;
          font-size: 2rem;
        }

        .welcome-banner p {
          margin: 0.5rem 0 0;
          opacity: 0.9;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .card {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          text-align: center;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          border: 1px solid #eee;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
          border-color: #667eea;
        }

        .card-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .card h2 {
          margin: 0 0 0.5rem;
          color: #333;
        }

        .card p {
          color: #666;
          margin: 0 0 1.5rem;
          font-size: 0.9rem;
        }

        .btn-action {
          padding: 0.5rem 1.5rem;
          background: #f0f2f5;
          color: #333;
          border: none;
          border-radius: 20px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s;
        }

        .card:hover .btn-action {
          background: #667eea;
          color: white;
        }
        
        .stats-section {
          margin-top: 2rem;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border-left: 4px solid #667eea;
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
      `}</style>
    </div>
  )
}
