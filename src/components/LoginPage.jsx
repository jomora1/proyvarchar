import React, { useState } from 'react'
import { loginWithGoogle, logout } from '../services/authService'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await loginWithGoogle()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sistema de Gestión de Inventario</h1>
        <p>Iniciar sesión con Google</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="btn-google"
        >
          {loading ? 'Cargando...' : '🔐 Iniciar sesión con Google'}
        </button>

        <p className="info-text">
          Solo usuarios autorizados pueden acceder al sistema.
        </p>
      </div>

      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .login-card {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
        }

        .login-card h1 {
          margin: 0 0 1rem;
          color: #333;
        }

        .login-card p {
          margin: 0 0 2rem;
          color: #666;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .btn-google {
          width: 100%;
          padding: 0.75rem;
          background: #4285f4;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.3s;
        }

        .btn-google:hover {
          background: #357ae8;
        }

        .btn-google:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .info-text {
          margin-top: 2rem;
          font-size: 0.875rem;
          color: #999;
        }
      `}</style>
    </div>
  )
}
