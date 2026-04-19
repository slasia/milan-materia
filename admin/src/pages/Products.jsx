import { useState, useEffect, useRef } from 'react'
import { getProducts, getCategories, deleteProduct, uploadImage, fmt, imgUrl } from '../api.js'
import ProductForm from '../components/ProductForm.jsx'
import { useToast } from '../components/Toast.jsx'

const BADGE_COLORS = {
  excl: 'badge-gold',
  new: 'badge-green',
  sale: 'badge-red',
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7a2 2 0 012-2h1l1-2h8l1 2h1a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
      <circle cx="10" cy="11" r="3"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2l4 4-10 10H4v-4L14 2z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h14M8 5V3h4v2M5 5l1 13h8l1-13"/>
    </svg>
  )
}

export default function Products() {
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputRefs = useRef({})

  async function load() {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()])
      setProducts(Array.isArray(prods) ? prods : prods?.products || [])
      setCategories(Array.isArray(cats) ? cats : cats?.categories || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingProduct(null)
    setModalOpen(true)
  }

  function openEdit(product) {
    setEditingProduct(product)
    setModalOpen(true)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este producto?')) return
    setDeletingId(id)
    try {
      await deleteProduct(id)
      showToast('Producto eliminado', 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleImageUpload(productId, file) {
    try {
      await uploadImage(productId, file)
      showToast('Imagen actualizada', 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al subir imagen', 'error')
    }
  }

  function triggerFileInput(productId) {
    fileInputRefs.current[productId]?.click()
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  if (error) {
    return (
      <div className="error-state">
        <p>Error al cargar productos</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Productos</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Producto
        </button>
      </div>

      <div className="table-card">
        {products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>No hay productos aún</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Badge</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  const imgSrc = imgUrl(product.imagePath || product.image)
                  const catName = product.category?.name || categories.find(c => c.id === product.categoryId)?.name || '—'
                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {imgSrc ? (
                            <img src={imgSrc} alt={product.name} className="product-img" />
                          ) : (
                            <div className="product-img-placeholder">□</div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={el => { fileInputRefs.current[product.id] = el }}
                            onChange={e => {
                              const f = e.target.files[0]
                              if (f) handleImageUpload(product.id, f)
                              e.target.value = ''
                            }}
                          />
                          <button
                            className="img-upload-btn"
                            title="Cambiar imagen"
                            onClick={() => triggerFileInput(product.id)}
                          >
                            <CameraIcon />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{product.name}</div>
                        {product.featured && (
                          <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 2 }}>★ Destacado</div>
                        )}
                      </td>
                      <td className="td-muted">{catName}</td>
                      <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                        {fmt(product.price || 0)}
                      </td>
                      <td>
                        <span className={`badge ${product.inStock ? 'badge-green' : 'badge-red'}`}>
                          {product.inStock ? 'En stock' : 'Sin stock'}
                        </span>
                      </td>
                      <td>
                        {product.badge ? (
                          <span className={`badge ${BADGE_COLORS[product.badgeType] || 'badge-gray'}`}>
                            {product.badge}
                          </span>
                        ) : (
                          <span className="td-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Editar"
                            onClick={() => openEdit(product)}
                          >
                            <EditIcon />
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            title="Eliminar"
                            onClick={() => handleDelete(product.id)}
                            disabled={deletingId === product.id}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editingProduct}
        categories={categories}
        onSaved={load}
      />
    </>
  )
}
