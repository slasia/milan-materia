import { useState, useEffect } from 'react'
import { getOrders, getOrder, updateOrderStatus, fmt, fmtDate } from '../api.js'
import Modal from '../components/Modal.jsx'
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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'processing', label: 'Procesando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

const STATUS_BADGE = {
  paid: 'badge-green',
  pending: 'badge-gray',
  shipped: 'badge-gold',
  delivered: 'badge-green',
  cancelled: 'badge-red',
  processing: 'badge-blue',
}

const STATUS_LABELS = {
  paid: 'Pagado',
  pending: 'Pendiente',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  processing: 'Procesando',
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/>
      <circle cx="10" cy="10" r="3"/>
    </svg>
  )
}

function OrderDetailModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    setError(null)
    getOrder(orderId)
      .then(setOrder)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <Modal isOpen={!!orderId} onClose={onClose} title="Detalle del Pedido" large>
      {loading && <div className="loading-wrap"><div className="spinner" /></div>}
      {error && (
        <div className="error-state">
          <p>Error al cargar el pedido</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        </div>
      )}
      {!loading && !error && order && (
        <>
          <div className="order-detail-section">
            <div className="order-detail-section-title">Información del pedido</div>
            <div className="order-detail-grid">
              <div className="order-detail-field">
                <label>ID</label>
                <span style={{ fontFamily: 'monospace' }}>#{String(order.id).padStart(6, '0')}</span>
              </div>
              <div className="order-detail-field">
                <label>Estado</label>
                <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`} style={{ display: 'inline-flex', marginTop: 2 }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <div className="order-detail-field">
                <label>Fecha y hora</label>
                <span>{order.createdAt ? fmtDate(order.createdAt) : '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Última actualización</label>
                <span style={{ fontSize: 12 }}>{order.updatedAt ? fmtDate(order.updatedAt) : '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Subtotal</label>
                <span>{fmt(order.subtotal || 0)}</span>
              </div>
              {order.discountAmt > 0 && (
                <div className="order-detail-field">
                  <label>Descuento {order.promoCode ? `(${order.promoCode})` : ''}</label>
                  <span style={{ color: '#4ade80' }}>− {fmt(order.discountAmt)}</span>
                </div>
              )}
              <div className="order-detail-field">
                <label>Total</label>
                <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 16 }}>{fmt(order.total || 0)}</span>
              </div>
              {order.paymentMethod && (
                <div className="order-detail-field">
                  <label>Método de pago</label>
                  <span style={{ textTransform: 'capitalize' }}>{order.paymentMethod.replace(/_/g, ' ')}</span>
                </div>
              )}
              {order.mpPaymentId && (
                <div className="order-detail-field">
                  <label>ID MercadoPago</label>
                  <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.mpPaymentId}</span>
                </div>
              )}
            </div>
          </div>

          <div className="order-detail-section">
            <div className="order-detail-section-title">Cliente</div>
            <div className="order-detail-grid">
              <div className="order-detail-field">
                <label>Nombre</label>
                <span>{order.customerName || order.customer?.name || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Email</label>
                <span>{order.customerEmail || order.customer?.email || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Teléfono</label>
                <span>{order.customerPhone || order.customer?.phone || '—'}</span>
              </div>
              {order.customer?.id && (
                <div className="order-detail-field">
                  <label>Cuenta registrada</label>
                  <span style={{ color: 'var(--gold)', fontSize: 12 }}>Cliente #{order.customer.id}</span>
                </div>
              )}
            </div>
          </div>

          {(order.address || order.shippingAddress) && (
            <div className="order-detail-section">
              <div className="order-detail-section-title">Dirección de envío</div>
              <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.6 }}>
                {(() => {
                  const addr = order.shippingAddress || order.address
                  if (typeof addr === 'string') return addr
                  if (typeof addr === 'object') {
                    return [addr.street, addr.city, addr.province, addr.zip, addr.country]
                      .filter(Boolean).join(', ')
                  }
                  return '—'
                })()}
              </div>
            </div>
          )}

          {(order.notes || order.adminNotes || order.trackingNumber) && (
            <div className="order-detail-section">
              <div className="order-detail-section-title">Seguimiento y notas</div>
              {order.trackingNumber && (
                <div className="order-detail-field" style={{ marginBottom: 10 }}>
                  <label>Número de seguimiento</label>
                  <span style={{ fontFamily: 'monospace', color: 'var(--gold)', fontWeight: 700 }}>{order.trackingNumber}</span>
                </div>
              )}
              {order.adminNotes && (
                <div className="order-detail-field" style={{ marginBottom: 10 }}>
                  <label>Notas para el cliente</label>
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>{order.adminNotes}</span>
                </div>
              )}
              {order.notes && (
                <div className="order-detail-field">
                  <label>Notas del comprador</label>
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>{order.notes}</span>
                </div>
              )}
            </div>
          )}

          <div className="order-detail-section">
            <div className="order-detail-section-title">Productos</div>
            {Array.isArray(order.items) && order.items.length > 0 ? (
              <div className="order-items-list">
                {order.items.map((item, i) => (
                  <div key={i} className="order-item-row">
                    <span className="order-item-name">
                      {item.productName || item.product?.name || `Producto #${item.productId}`}
                    </span>
                    <span className="order-item-qty">× {item.quantity}</span>
                    <span className="order-item-price">{fmt(item.total || item.subtotal || (item.unitPrice * item.quantity) || 0)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 12 }}>Sin items</p>
            )}
            <div className="order-total-row">
              <span className="order-total-label">Total</span>
              <span className="order-total-value">{fmt(order.total || 0)}</span>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4l5 5L6 19l-5 1 1-5L11 4z"/>
    </svg>
  )
}

function UpdateOrderModal({ order, onClose, onUpdated }) {
  const { showToast } = useToast()
  const [status, setStatus] = useState(order.status)
  const [tracking, setTracking] = useState(order.trackingNumber || '')
  const [notes, setNotes] = useState(order.adminNotes || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateOrderStatus(order.id, { status, trackingNumber: tracking, adminNotes: notes })
      showToast('Pedido actualizado', 'success')
      onUpdated({ status, trackingNumber: tracking, adminNotes: notes })
      onClose()
    } catch (e) {
      showToast(e.message || 'Error al actualizar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Actualizar pedido #${String(order.id).padStart(6, '0')}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Estado
          </label>
          <select
            className="status-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ width: '100%' }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Número de seguimiento
          </label>
          <input
            type="text"
            className="form-input"
            placeholder="Ej: AR123456789"
            value={tracking}
            onChange={e => {
              const val = e.target.value
              setTracking(val)
              // Auto-switch to "shipped" when a tracking number is entered
              if (val.trim() && status !== 'shipped' && status !== 'delivered') {
                setStatus('shipped')
              }
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            Notas para el cliente
          </label>
          <textarea
            className="form-input"
            placeholder="Ej: Tu pedido está listo para despacho, coordinaremos la entrega esta tarde."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0' }}>
            Este mensaje se incluye en el email de notificación al cliente.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar y notificar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function Orders() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewingOrderId, setViewingOrderId] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [search, setSearch] = useState('')

  async function load() {
    try {
      const data = await getOrders()
      setOrders(Array.isArray(data) ? data : data?.data || data?.orders || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleUpdated(orderId, changes) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...changes } : o))
  }

  // ── Derived state — must be before any early returns (Rules of Hooks) ──
  const q = search.trim().toLowerCase()
  const filtered = q
    ? orders.filter(o => {
        const name = (o.customerName || o.customer?.name || '').toLowerCase()
        const email = (o.customerEmail || o.customer?.email || '').toLowerCase()
        const status = (STATUS_LABELS[o.status] || o.status || '').toLowerCase()
        const id = String(o.id)
        return name.includes(q) || email.includes(q) || status.includes(q) || id.includes(q)
      })
    : orders

  const { sorted, sortKey, sortDir, handleSort } = useSortable(filtered, 'createdAt', 'desc')

  if (loading) return <div className="loading-wrap"><div className="spinner" /></div>

  if (error) {
    return (
      <div className="error-state">
        <p>Error al cargar pedidos</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>Reintentar</button>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Pedidos</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {filtered.length}{q ? ` de ${orders.length}` : ''} pedido{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="customers-search-wrap">
        <div className="customers-search-inner">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8.5" cy="8.5" r="5.5"/><line x1="13" y1="13" x2="18" y2="18"/>
          </svg>
          <input
            className="customers-search-input"
            type="text"
            placeholder="Buscar por cliente, email, ID o estado..."
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
            <div className="empty-state-icon">📋</div>
            <p>{q ? 'Sin resultados para la búsqueda' : 'No hay pedidos aún'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <SortTh label="ID"         sortKey="id"          active={sortKey === 'id'}          dir={sortDir} onSort={handleSort} />
                  <SortTh label="Cliente"    sortKey="customerName" active={sortKey === 'customerName'} dir={sortDir} onSort={handleSort} />
                  <SortTh label="Total"      sortKey="total"       active={sortKey === 'total'}       dir={sortDir} onSort={handleSort} />
                  <SortTh label="Estado"     sortKey="status"      active={sortKey === 'status'}      dir={sortDir} onSort={handleSort} />
                  <SortTh label="Fecha y hora" sortKey="createdAt" active={sortKey === 'createdAt'}   dir={sortDir} onSort={handleSort} />
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(order => (
                  <tr key={order.id}>
                    <td
                      className="td-muted"
                      style={{ fontFamily: 'monospace', fontSize: 11 }}
                    >
                      #{order.id?.toString().slice(-6).toUpperCase()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{order.customerName || order.customer?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.customerEmail || order.customer?.email || ''}</div>
                    </td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {fmt(order.total || 0)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="td-muted">
                      {order.createdAt ? fmtDate(order.createdAt) : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Ver detalle"
                          onClick={() => setViewingOrderId(order.id)}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Actualizar pedido"
                          onClick={() => setEditingOrder(order)}
                        >
                          <EditIcon />
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

      <OrderDetailModal
        orderId={viewingOrderId}
        onClose={() => setViewingOrderId(null)}
      />

      {editingOrder && (
        <UpdateOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdated={(changes) => { handleUpdated(editingOrder.id, changes); }}
        />
      )}
    </>
  )
}
