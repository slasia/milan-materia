import { useState, useEffect, useRef } from 'react'
import Modal from './Modal.jsx'
import { createProduct, updateProduct, addProductImage, deleteProductImage, imgUrl } from '../api.js'
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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Image gallery state
  const [galleryImages, setGalleryImages] = useState([])   // saved images from DB
  const [pendingImages, setPendingImages] = useState([])   // new files queued for upload
  const [deletingImgId, setDeletingImgId] = useState(null)

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
        setGalleryImages(product.images || [])
      } else {
        setForm({ name: '', description: '', price: '', originalPrice: '', categoryId: '', badge: '', badgeType: '', stock: '0', featured: false })
        setGalleryImages([])
      }
      setPendingImages([])
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

  // Pick new image files (multiple allowed)
  function handleFilePick(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const newPending = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    setPendingImages(p => [...p, ...newPending])
    e.target.value = ''
  }

  // Remove a pending (not-yet-uploaded) image from the queue
  function removePending(idx) {
    setPendingImages(p => {
      URL.revokeObjectURL(p[idx].preview)
      return p.filter((_, i) => i !== idx)
    })
  }

  // Delete an already-saved image (calls API immediately for editing products)
  async function handleDeleteSavedImage(img) {
    if (!product?.id) return
    setDeletingImgId(img.id)
    try {
      await deleteProductImage(product.id, img.id)
      setGalleryImages(g => g.filter(i => i.id !== img.id))
    } catch (e) {
      showToast(e.message || 'Error al eliminar imagen', 'error')
    } finally {
      setDeletingImgId(null)
    }
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

      // Upload any queued images
      if (pendingImages.length > 0) {
        const productId = isEditing ? product.id : saved?.id
        if (productId) {
          await Promise.all(pendingImages.map(p => addProductImage(productId, p.file)))
        }
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

  const totalImages = galleryImages.length + pendingImages.length

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

        {/* ── IMAGE GALLERY ── */}
        <div className="form-group">
          <label className="form-label">
            Imágenes
            {totalImages > 0 && (
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 6 }}>
                ({totalImages} imagen{totalImages > 1 ? 'es' : ''} · la primera es la portada)
              </span>
            )}
          </label>

          {/* Saved images from DB */}
          {galleryImages.length > 0 && (
            <div className="pf-gallery">
              {galleryImages.map((img, i) => (
                <div className="pf-gallery-item" key={img.id}>
                  <img src={imgUrl(img.url)} alt={`Imagen ${i + 1}`} />
                  {i === 0 && <span className="pf-img-tag pf-img-main">Portada</span>}
                  <button
                    type="button"
                    className="pf-img-delete"
                    onClick={() => handleDeleteSavedImage(img)}
                    disabled={deletingImgId === img.id}
                    title="Eliminar imagen"
                  >
                    {deletingImgId === img.id ? '…' : '×'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pending images (queued, not yet uploaded) */}
          {pendingImages.length > 0 && (
            <div className="pf-gallery" style={{ marginTop: galleryImages.length > 0 ? 8 : 0 }}>
              {pendingImages.map((p, i) => (
                <div className="pf-gallery-item pf-gallery-pending" key={i}>
                  <img src={p.preview} alt={`Nueva ${i + 1}`} />
                  <span className="pf-img-tag pf-img-new">Nueva</span>
                  <button
                    type="button"
                    className="pf-img-delete"
                    onClick={() => removePending(i)}
                    title="Quitar"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFilePick}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: totalImages > 0 ? 10 : 0 }}
            onClick={() => fileRef.current?.click()}
          >
            + Agregar imagen{totalImages > 0 ? '' : 'es'}
          </button>
          {totalImages === 0 && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              Podés agregar varias imágenes. La primera se usará como portada.
            </p>
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
