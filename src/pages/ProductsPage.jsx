import React, { useState, useEffect } from 'react'
import { getProducts, createProduct, updateProduct, deleteProduct } from '../services/productService'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    costPrice: '',
    salePrice: '',
    stock: ''
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await getProducts()
      setProducts(data)
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
      await createProduct(formData)
      setFormData({ code: '', name: '', costPrice: '', salePrice: '', stock: '' })
      setShowForm(false)
      await loadProducts()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar producto?')) {
      try {
        await deleteProduct(id)
        await loadProducts()
      } catch (err) {
        setError(err.message)
      }
    }
  }

  if (loading) return <p>Cargando productos...</p>

  return (
    <div className="products-page">
      <h1>📦 Gestión de Productos</h1>

      {error && <div className="error-message">{error}</div>}

      <button onClick={() => setShowForm(!showForm)} className="btn-primary">
        {showForm ? 'Cancelar' : '+ Nuevo Producto'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="form">
          <input
            type="text"
            name="code"
            placeholder="Código"
            value={formData.code}
            onChange={handleInputChange}
            required
          />
          <input
            type="text"
            name="name"
            placeholder="Nombre"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
          <input
            type="number"
            name="costPrice"
            placeholder="Precio de costo"
            value={formData.costPrice}
            onChange={handleInputChange}
            step="0.01"
            required
          />
          <input
            type="number"
            name="salePrice"
            placeholder="Precio de venta"
            value={formData.salePrice}
            onChange={handleInputChange}
            step="0.01"
            required
          />
          <input
            type="number"
            name="stock"
            placeholder="Stock"
            value={formData.stock}
            onChange={handleInputChange}
            required
          />
          <button type="submit" className="btn-primary">Guardar</button>
        </form>
      )}

      <table className="products-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Precio Costo</th>
            <th>Precio Venta</th>
            <th>Stock</th>
            <th>Ganancia %</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => {
            const margin = (((product.salePrice - product.costPrice) / product.costPrice) * 100).toFixed(2)
            return (
              <tr key={product.id}>
                <td>{product.code}</td>
                <td>{product.name}</td>
                <td>₡{product.costPrice.toFixed(2)}</td>
                <td>₡{product.salePrice.toFixed(2)}</td>
                <td>{product.stock}</td>
                <td>{margin}%</td>
                <td>
                  <button onClick={() => handleDelete(product.id)} className="btn-delete">
                    Eliminar
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <style>{`
        .products-page {
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

        .products-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 2rem;
        }

        .products-table th {
          background: #667eea;
          color: white;
          padding: 1rem;
          text-align: left;
        }

        .products-table td {
          padding: 1rem;
          border-bottom: 1px solid #ddd;
        }

        .products-table tr:hover {
          background: #f5f5f5;
        }

        .btn-delete {
          padding: 0.5rem 1rem;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  )
}
