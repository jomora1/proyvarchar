import React, { useEffect, useState } from 'react'
import { auth } from './firebase'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/Dashboard'
import ProductsPage from './pages/ProductsPage'
import ClientsPage from './pages/ClientsPage'
import SalesPage from './pages/SalesPage'
import ProfitCutsPage from './pages/ProfitCutsPage'
import PurchasesPage from './pages/PurchasesPage'
import { logout } from './services/authService'
import './App.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      setUser(currentUser)
    })
    return unsubscribe
  }, [])

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  if (!user) {
    return <ProtectedRoute><Dashboard /></ProtectedRoute>
  }

  return (
    <ProtectedRoute>
      <div className="app-container">
        <nav className={`main-nav ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="nav-header">
            <h1>📊 Gestión</h1>
            <button className="toggle-sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
          </div>

          <div className="nav-links">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={currentPage === 'dashboard' ? 'active' : ''}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentPage('products')}
              className={currentPage === 'products' ? 'active' : ''}
            >
              📦 Productos
            </button>
            <button
              onClick={() => setCurrentPage('purchases')}
              className={currentPage === 'purchases' ? 'active' : ''}
            >
              🛍️ Compras
            </button>
            <button
              onClick={() => setCurrentPage('clients')}
              className={currentPage === 'clients' ? 'active' : ''}
            >
              👥 Clientes
            </button>
            <button
              onClick={() => setCurrentPage('sales')}
              className={currentPage === 'sales' ? 'active' : ''}
            >
              🛒 Ventas
            </button>
            <button
              onClick={() => setCurrentPage('profit-cuts')}
              className={currentPage === 'profit-cuts' ? 'active' : ''}
            >
              💰 Cortes
            </button>
          </div>

          <div className="nav-footer">
            <div className="user-info">
              <img src={user?.photoURL} alt={user?.displayName} className="user-avatar" />
              <div>
                <p className="user-name">{user?.displayName}</p>
                <p className="user-email">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Cerrar sesión
            </button>
          </div>
        </nav>

        <main className="main-content">
          {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
          {currentPage === 'products' && <ProductsPage />}
          {currentPage === 'clients' && <ClientsPage />}
          {currentPage === 'sales' && <SalesPage />}
          {currentPage === 'profit-cuts' && <ProfitCutsPage />}
          {currentPage === 'purchases' && <PurchasesPage />}
        </main>
      </div>
    </ProtectedRoute>
  )
}
