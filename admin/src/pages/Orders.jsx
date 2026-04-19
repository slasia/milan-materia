import { useState, useEffect } from 'react'
import { getOrders, getOrder, updateOrderStatus, fmt, fmtDate } from '../api.js'
import Modal from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'

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
                <span style={{ fontFamily: 'monospace' }}>#{order.id?.toString().slice(-8).toUpperCase()}</span>
              </div>
              <div className="order-detail-field">
                <label>Estado</label>
                <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`} style={{ display: 'inline-flex', marginTop: 2 }}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>
              <div className="order-detail-field">
                <label>Fecha</label>
                <span>{order.createdAt ? fmtDate(order.createdAt) : '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Total</label>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(order.total || 0)}</span>
              </div>
            </div>
          </div>

          <div className="order-detail-section">
            <div className="order-detail-section-title">Cliente</div>
            <div className="order-detail-grid">
              <div className="order-detail-field">
                <label>Email</label>
                <span>{order.customerEmail || order.email || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Nombre</label>
                <span>{order.customerName || order.name || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Teléfono</label>
                <span>{order.customerPhone || order.phone || '—'}</span>
              </div>
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

export default function Orders() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewingOrderId, setViewingOrderId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

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

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId)
    try {
      await updateOrderStatus(orderId, newStatus)
      showToast('Estado actualizado', 'success')
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch (e) {
      showToast(e.message || 'Error al actualizar estado', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

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
          {orders.length} pedido{orders.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="table-card">
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No hay pedidos aún</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Cambiar estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td
                      className="td-muted"
                      style={{ fontFamily: 'monospace', fontSize: 11 }}
                    >
                      #{order.id?.toString().slice(-6).toUpperCase()}
                    </td>
                    <td>{order.customerEmail || order.email || '—'}</td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {fmt(order.total || 0)}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="td-muted">{order.createdAt ? fmtDate(order.createdAt) : '—'}</td>
                    <td>
                      <select
                        className="status-select"
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={e => handleStatusChange(order.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Ver detalle"
                        onClick={() => setViewingOrderId(order.id)}
                      >
                        <EyeIcon />
                      </button>
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
    </>
  )
}
