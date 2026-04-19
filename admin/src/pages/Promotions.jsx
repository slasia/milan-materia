import { useState, useEffect } from 'react'
import { getPromotions, createPromotion, updatePromotion, deletePromotion, fmtDate } from '../api.js'
import Modal from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'

const PROMO_TYPES = [
  { value: 'announcement', label: 'Anuncio' },
  { value: 'banner', label: 'Banner' },
  { value: 'discount_code', label: 'Código de descuento' },
]

const TYPE_BADGE = {
  announcement: 'badge-gold',
  banner: 'badge-blue',
  discount_code: 'badge-green',
}

const TYPE_LABELS = {
  announcement: 'Anuncio',
  banner: 'Banner',
  discount_code: 'Cód. descuento',
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

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'announcement',
  code: '',
  discountPct: '',
  maxUses: '',
  active: true,
}

export default function Promotions() {
  const { showToast } = useToast()
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  async function load() {
    try {
      const data = await getPromotions()
      setPromos(Array.isArray(data) ? data : data?.promotions || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(promo) {
    setEditing(promo)
    setForm({
      title: promo.title || '',
      description: promo.description || '',
      type: promo.type || 'announcement',
      code: promo.code || '',
      discountPct: promo.discountPct?.toString() || '',
      maxUses: promo.maxUses?.toString() || '',
      active: promo.active ?? true,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (formErrors[field]) setFormErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = 'El título es requerido'
    if (form.type === 'discount_code' && !form.code.trim()) e.code = 'El código es requerido'
    if (form.discountPct && (isNaN(Number(form.discountPct)) || Number(form.discountPct) < 0 || Number(form.discountPct) > 100)) {
      e.discountPct = 'Debe ser entre 0 y 100'
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        code: form.code.trim() || null,
        discountPct: form.discountPct ? Number(form.discountPct) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        active: form.active,
      }

      if (editing) {
        await updatePromotion(editing.id, payload)
        showToast('Promoción actualizada', 'success')
      } else {
        await createPromotion(payload)
        showToast('Promoción creada', 'success')
      }
      await load()
      setModalOpen(false)
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta promoción?')) return
    setDeletingId(id)
    try {
      await deletePromotion(id)
      showToast('Promoción eliminada', 'success')
      await load()
    } catch (e) {
      showToast(e.message || 'Error al eliminar', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  if (error) {
    return (
      <div className="error-state">
        <p>Error al cargar promociones</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Promociones</h1>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva Promoción
        </button>
      </div>

      <div className="table-card">
        {promos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⭐</div>
            <p>No hay promociones aún</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Estado</th>
                  <th>Creada</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promos.map(promo => (
                  <tr key={promo.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{promo.title}</div>
                      {promo.description && (
                        <div className="td-muted" style={{ marginTop: 2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {promo.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[promo.type] || 'badge-gray'}`}>
                        {TYPE_LABELS[promo.type] || promo.type}
                      </span>
                    </td>
                    <td>
                      {promo.code ? (
                        <code style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--gold)' }}>
                          {promo.code}
                        </code>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      {promo.discountPct != null ? (
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{promo.discountPct}%</span>
                      ) : (
                        <span className="td-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${promo.active ? 'badge-green' : 'badge-gray'}`}>
                        {promo.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="td-muted">
                      {promo.createdAt ? fmtDate(promo.createdAt) : '—'}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => openEdit(promo)}>
                          <EditIcon />
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Eliminar"
                          onClick={() => handleDelete(promo.id)}
                          disabled={deletingId === promo.id}
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Promoción' : 'Nueva Promoción'}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="ej. Envío gratis en compras +$50.000"
            />
            {formErrors.title && <div className="form-error">{formErrors.title}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Descripción opcional..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Tipo *</label>
              <select
                className="form-select"
                value={form.type}
                onChange={e => setField('type', e.target.value)}
              >
                {PROMO_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Código</label>
              <input
                className="form-input"
                value={form.code}
                onChange={e => setField('code', e.target.value.toUpperCase())}
                placeholder="ej. VERANO20"
              />
              {formErrors.code && <div className="form-error">{formErrors.code}</div>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Descuento (%)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                max="100"
                value={form.discountPct}
                onChange={e => setField('discountPct', e.target.value)}
                placeholder="0"
              />
              {formErrors.discountPct && <div className="form-error">{formErrors.discountPct}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Máximo de usos</label>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.maxUses}
                onChange={e => setField('maxUses', e.target.value)}
                placeholder="Sin límite"
              />
            </div>
          </div>

          <div className="promo-active-toggle">
            <label className="form-check">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setField('active', e.target.checked)}
              />
              Promoción activa
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Crear promoción')}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
