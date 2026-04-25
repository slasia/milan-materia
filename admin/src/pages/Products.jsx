import { useState, useEffect, useRef } from 'react'
import { getProducts, getCategories, deleteProduct, bulkDeleteProducts, uploadImage, fmt, imgUrl } from '../api.js'
import ProductForm from '../components/ProductForm.jsx'
import { useToast } from '../components/Toast.jsx'
import { useSortable } from '../hooks/useSortable.js'

function SortTh({ label, sortKey, active, dir, onSort, className = '' }) {
  return (
    <th className={`sortable${active ? ' active' : ''}${className ? ' ' + className : ''}`} onClick={() => onSort(sortKey)}>
      <span className="th-inner">
        {label}
        <span className="sort-icon">
          <span className={`sort-icon-up${active && dir === 'asc' ? '' : ' dim'}`} />
          <span className={`sort-icon-down${active && dir === 'desc' ? '' : ' dim'}`} />
        </span>
      </span>
    </th>
  )
}

const BADGE_COLORS = {
  excl: 'badge-gold',
  new: 'badge-green',
  sale: 'badge-red',
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="5.5"/>
      <line x1="13" y1="13" x2="18" y2="18"/>
    </svg>
  )
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
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const fileInputRefs = useRef({})

  async function load() {
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()])
      setProducts(Array.isArray(prods) ? prods : prods?.products || [])
      setCategories(Array.isArray(cats) ? cats : cats?.categories || [])
      setSelected(new Set())
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

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`¿Eliminar ${selected.size} producto${selected.size > 1 ? 's' : ''}?`)) return
    setBulkDeleting(true)
    try {
      const result = await bulkDeleteProducts([...selected])
      showToast(`${result.deleted} producto${result.deleted !== 1 ? 's' : ''} eliminado${result.deleted !== 1 ? 's' : ''}`, 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error')
    } finally {
      setBulkDeleting(false)
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

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(visibleIds) {
    setSelected(prev => {
      const allSelected = visibleIds.every(id => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        visibleIds.forEach(id => next.delete(id))
        return next
      }
      const next = new Set(prev)
      visibleIds.forEach(id => next.add(id))
      return next
    })
  }

  // ── Derived state — must be before any early returns (Rules of Hooks) ──
  const q = search.trim().toLowerCase()
  const filtered = q
    ? products.filter(p => {
        const catName = p.category?.name || categories.find(c => c.id === p.categoryId)?.name || ''
        return (
          p.name?.toLowerCase().includes(q) ||
          catName.toLowerCase().includes(q) ||
          p.badge?.toLowerCase().includes(q)
        )
      })
    : products

  const { sorted, sortKey, sortDir, handleSort } = useSortable(filtered)
  const visibleIds = sorted.map(p => p.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))

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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Eliminando...' : `Eliminar ${selected.size} seleccionado${selected.size > 1 ? 's' : ''}`}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate}>
            + Nuevo Producto
          </button>
        </div>
      </div>

      <div className="customers-search-wrap">
        <div className="customers-search-inner">
          <SearchIcon />
          <input
            className="customers-search-input"
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="customers-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      <div className="table-card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>{q ? 'Sin resultados para la búsqueda' : 'No hay productos aún'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={() => toggleAll(visibleIds)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Imagen</th>
                  <SortTh label="Nombre"    sortKey="name"          active={sortKey === 'name'}          dir={sortDir} onSort={handleSort} />
                  <SortTh label="Categoría" sortKey="category.name" active={sortKey === 'category.name'} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Precio"    sortKey="price"         active={sortKey === 'price'}         dir={sortDir} onSort={handleSort} />
                  <SortTh label="Stock"     sortKey="stock"         active={sortKey === 'stock'}         dir={sortDir} onSort={handleSort} />
                  <th>Badge</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(product => {
                  const imgSrc = imgUrl(product.images?.[0]?.url || product.imageUrl)
                  const catName = product.category?.name || categories.find(c => c.id === product.categoryId)?.name || '—'
                  return (
                    <tr key={product.id} className={selected.has(product.id) ? 'row-selected' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(product.id)}
                          onChange={() => toggleSelect(product.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
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
                        <span
                          className={`badge ${product.stock > 0 ? (product.stock <= 5 ? 'badge-gold' : 'badge-green') : 'badge-red'}`}
                          title={`${product.stock ?? 0} unidades`}
                        >
                          {product.stock > 0 ? product.stock : 'Sin stock'}
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
