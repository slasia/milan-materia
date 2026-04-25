import { useState, useEffect } from 'react'
import Modal from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { getAllCategories, createCategory, updateCategory, deleteCategory, bulkDeleteCategories } from '../api.js'
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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.5" cy="8.5" r="5.5"/>
      <line x1="13" y1="13" x2="18" y2="18"/>
    </svg>
  )
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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

const EMPTY_FORM = { name: '', slug: '', description: '', sortOrder: '0', active: true }

function CategoryForm({ isOpen, onClose, category, onSaved }) {
  const { showToast } = useToast()
  const isEditing = !!category?.id
  const [form, setForm] = useState(EMPTY_FORM)
  const [slugManual, setSlugManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setForm({
          name: category.name || '',
          slug: category.slug || '',
          description: category.description || '',
          sortOrder: category.sortOrder != null ? String(category.sortOrder) : '0',
          active: category.active ?? true,
        })
        setSlugManual(true)
      } else {
        setForm(EMPTY_FORM)
        setSlugManual(false)
      }
      setErrors({})
    }
  }, [isOpen, category])

  function handleName(e) {
    const val = e.target.value
    setForm(f => ({
      ...f,
      name: val,
      slug: slugManual ? f.slug : slugify(val),
    }))
    if (errors.name) setErrors(er => ({ ...er, name: null }))
  }

  function handleSlug(e) {
    setSlugManual(true)
    setForm(f => ({ ...f, slug: e.target.value }))
    if (errors.slug) setErrors(er => ({ ...er, slug: null }))
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'
    if (!form.slug.trim()) e.slug = 'El slug es requerido'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        sortOrder: parseInt(form.sortOrder) || 0,
        active: form.active,
      }
      if (isEditing) {
        await updateCategory(category.id, payload)
      } else {
        await createCategory(payload)
      }
      showToast(isEditing ? 'Categoría actualizada' : 'Categoría creada', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Categoría' : 'Nueva Categoría'}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={handleName}
            placeholder="ej. Imperial"
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Slug * <span style={{ fontSize: 11, color: 'var(--muted)' }}>(usado en URLs)</span></label>
          <input
            className="form-input"
            value={form.slug}
            onChange={handleSlug}
            placeholder="ej. imperial"
          />
          {errors.slug && <div className="form-error">{errors.slug}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descripción opcional de la categoría..."
            rows={2}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Orden de aparición</label>
            <input
              className="form-input"
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={e => set('sortOrder', e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <label className="form-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => set('active', e.target.checked)}
              />
              Categoría activa
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear categoría'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function Categories() {
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  async function load() {
    try {
      const cats = await getAllCategories()
      setCategories(Array.isArray(cats) ? cats : [])
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingCat(null)
    setModalOpen(true)
  }

  function openEdit(cat) {
    setEditingCat(cat)
    setModalOpen(true)
  }

  async function handleDelete(cat) {
    const productCount = cat._count?.products ?? 0
    const msg = productCount > 0
      ? `Esta categoría tiene ${productCount} producto${productCount > 1 ? 's' : ''}. ¿Querés eliminarla igual?`
      : `¿Eliminar la categoría "${cat.name}"?`
    if (!window.confirm(msg)) return

    setDeletingId(cat.id)
    try {
      await deleteCategory(cat.id)
      showToast('Categoría eliminada', 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!window.confirm(`¿Eliminar ${selected.size} categoría${selected.size > 1 ? 's' : ''}? Si tienen productos, la eliminación fallará.`)) return
    setBulkDeleting(true)
    try {
      const result = await bulkDeleteCategories([...selected])
      showToast(`${result.deleted} categoría${result.deleted !== 1 ? 's' : ''} eliminada${result.deleted !== 1 ? 's' : ''}`, 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error')
    } finally {
      setBulkDeleting(false)
    }
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
    ? categories.filter(cat =>
        cat.name?.toLowerCase().includes(q) ||
        cat.slug?.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q)
      )
    : categories

  const { sorted, sortKey, sortDir, handleSort } = useSortable(filtered)
  const visibleIds = sorted.map(c => c.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selected.has(id))

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  if (error) {
    return (
      <div className="error-state">
        <p>Error al cargar categorías</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorías</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Las categorías definen cómo se organizan los productos en la tienda y en el menú de navegación.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {selected.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? 'Eliminando...' : `Eliminar ${selected.size} seleccionada${selected.size > 1 ? 's' : ''}`}
            </button>
          )}
          <button className="btn btn-primary" onClick={openCreate}>
            + Nueva Categoría
          </button>
        </div>
      </div>

      <div className="customers-search-wrap">
        <div className="customers-search-inner">
          <SearchIcon />
          <input
            className="customers-search-input"
            type="text"
            placeholder="Buscar por nombre o slug..."
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
            <div className="empty-state-icon">🏷️</div>
            {q ? (
              <p>Sin resultados para la búsqueda</p>
            ) : (
              <>
                <p>No hay categorías aún</p>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                  Creá categorías para poder asignar productos y organizar la tienda.
                </p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                  + Crear primera categoría
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allVisibleSelected} onChange={() => toggleAll(visibleIds)} style={{ cursor: 'pointer' }} />
                  </th>
                  <SortTh label="Nombre"    sortKey="name"      active={sortKey === 'name'}      dir={sortDir} onSort={handleSort} />
                  <SortTh label="Slug"      sortKey="slug"      active={sortKey === 'slug'}      dir={sortDir} onSort={handleSort} />
                  <th>Descripción</th>
                  <SortTh label="Orden"     sortKey="sortOrder" active={sortKey === 'sortOrder'} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Productos" sortKey="_count.products" active={sortKey === '_count.products'} dir={sortDir} onSort={handleSort} />
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(cat => (
                  <tr key={cat.id} className={selected.has(cat.id) ? 'row-selected' : ''}>
                    <td>
                      <input type="checkbox" checked={selected.has(cat.id)} onChange={() => toggleSelect(cat.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td><code style={{ fontSize: 12, color: 'var(--muted)' }}>{cat.slug}</code></td>
                    <td className="td-muted" style={{ maxWidth: 200 }}>
                      {cat.description || <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td className="td-muted">{cat.sortOrder ?? 0}</td>
                    <td>
                      <span className={`badge ${(cat._count?.products || 0) > 0 ? 'badge-green' : 'badge-gray'}`}>
                        {cat._count?.products ?? 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${cat.active ? 'badge-green' : 'badge-red'}`}>
                        {cat.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Editar"
                          onClick={() => openEdit(cat)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Eliminar"
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryForm
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editingCat}
        onSaved={load}
      />
    </>
  )
}
