import { useState, useEffect, useRef } from 'react'
import Modal from './Modal.jsx'
import { createProduct, updateProduct, uploadImage, imgUrl } from '../api.js'
import { useToast } from './Toast.jsx'

const BADGE_TYPES = [
  { value: '', label: 'Sin badge' },
  { value: 'excl', label: 'Exclusivo' },
  { value: 'new', label: 'Nuevo' },
  { value: 'sale', label: 'Oferta' },
]

export default function ProductForm({ isOpen, onClose, product, categories, onSaved }) {
  const { showToast } = useToast()
  const fileRef = useRef(null)
  const isEditing = !!product?.id

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    categoryId: '',
    badge: '',
    badgeType: '',
    stock: '0',
    featured: false,
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setForm({
          name: product.name || '',
          description: product.description || '',
          price: product.price != null ? Math.round(product.price / 100).toString() : '',
          originalPrice: product.originalPrice != null ? Math.round(product.originalPrice / 100).toString() : '',
          categoryId: product.categoryId?.toString() || product.category?.id?.toString() || '',
          badge: product.badge || '',
          badgeType: product.badgeType || '',
          stock: product.stock != null ? product.stock.toString() : '0',
          featured: product.featured ?? false,
        })
        setPreview(imgUrl(product.imagePath || product.imageUrl || product.image))
      } else {
        setForm({ name: '', description: '', price: '', originalPrice: '', categoryId: '', badge: '', badgeType: '', stock: '0', featured: false })
        setPreview(null)
      }
      setFile(null)
      setErrors({})
    }
  }, [isOpen, product])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Precio inválido'
    if (!form.categoryId) e.categoryId = 'Seleccioná una categoría'
    return e
  }

  function handleFileChange(e) {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: Math.round(Number(form.price) * 100),
        originalPrice: form.originalPrice ? Math.round(Number(form.originalPrice) * 100) : null,
        categoryId: Number(form.categoryId),
        badge: form.badge.trim() || null,
        badgeType: form.badgeType || null,
        stock: Math.max(0, parseInt(form.stock) || 0),
        featured: form.featured,
      }

      let saved
      if (isEditing) {
        saved = await updateProduct(product.id, payload)
      } else {
        saved = await createProduct(payload)
      }

      if (file && saved?.id) {
        await uploadImage(saved.id, file)
      }

      showToast(isEditing ? 'Producto actualizado' : 'Producto creado', 'success')
      onSaved()
      onClose()
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}
      large
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input
            className="form-input"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Nombre del producto"
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-textarea"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descripción del producto..."
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Precio (ARS) *</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.price}
              onChange={e => set('price', e.target.value)}
              placeholder="0"
            />
            {errors.price && <div className="form-error">{errors.price}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Precio original (tachado)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.originalPrice}
              onChange={e => set('originalPrice', e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Categoría *</label>
            <select
              className="form-select"
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
            >
              <option value="">Seleccioná...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.categoryId && <div className="form-error">{errors.categoryId}</div>}
          </div>
          <div className="form-group">
            <label className="form-label">Stock (unidades)</label>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={e => set('stock', e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Texto del badge</label>
            <input
              className="form-input"
              value={form.badge}
              onChange={e => set('badge', e.target.value)}
              placeholder="ej. Exclusivo"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de badge</label>
            <select
              className="form-select"
              value={form.badgeType}
              onChange={e => set('badgeType', e.target.value)}
            >
              {BADGE_TYPES.map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 18 }}>
          <label className="form-check">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => set('featured', e.target.checked)}
            />
            Destacado
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">Imagen</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
          >
            {preview ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </button>
          {preview && (
            <div className="image-preview-wrap">
              <img src={preview} alt="Preview" className="image-preview" />
              {file && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{file.name}</span>}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear producto')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
