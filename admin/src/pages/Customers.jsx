import { useState, useEffect, useCallback } from 'react'
import { getCustomers, getCustomer, fmt, fmtDate } from '../api.js'
import Modal from '../components/Modal.jsx'

const STATUS_BADGE = {
  paid:       'badge-green',
  pending:    'badge-gray',
  shipped:    'badge-gold',
  delivered:  'badge-green',
  cancelled:  'badge-red',
  processing: 'badge-blue',
}
const STATUS_LABELS = {
  paid: 'Pagado', pending: 'Pendiente', shipped: 'Enviado',
  delivered: 'Entregado', cancelled: 'Cancelado', processing: 'Procesando',
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 10s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7z"/>
      <circle cx="10" cy="10" r="3"/>
    </svg>
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

function CustomerDetailModal({ customerId, onClose }) {
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) return
    setLoading(true)
    getCustomer(customerId)
      .then(setCustomer)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [customerId])

  const orders = customer?.orders || []
  const totalSpent = orders
    .filter(o => o.status === 'paid')
    .reduce((s, o) => s + o.total, 0)

  return (
    <Modal isOpen={!!customerId} onClose={onClose} title="Detalle del cliente" large>
      {loading && <div className="loading-wrap"><div className="spinner" /></div>}

      {!loading && customer && (
        <>
          {/* Header info */}
          <div className="customer-detail-header">
            <div className="customer-avatar">
              {customer.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="customer-detail-name">{customer.name}</div>
              <div className="customer-detail-email">{customer.email}</div>
            </div>
          </div>

          {/* Info grid */}
          <div className="order-detail-section">
            <div className="order-detail-section-title">Datos personales</div>
            <div className="order-detail-grid">
              <div className="order-detail-field">
                <label>Teléfono</label>
                <span>{customer.phone || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>Ciudad</label>
                <span>{[customer.city, customer.province].filter(Boolean).join(', ') || '—'}</span>
              </div>
              <div className="order-detail-field">
                <label>País</label>
                <span>{customer.country || 'Argentina'}</span>
              </div>
              <div className="order-detail-field">
                <label>Cliente desde</label>
                <span>{fmtDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="customer-stats-row">
            <div className="customer-stat">
              <div className="customer-stat-val">{orders.length}</div>
              <div className="customer-stat-lbl">Pedidos totales</div>
            </div>
            <div className="customer-stat">
              <div className="customer-stat-val">{orders.filter(o => o.status === 'paid').length}</div>
              <div className="customer-stat-lbl">Pedidos pagados</div>
            </div>
            <div className="customer-stat">
              <div className="customer-stat-val" style={{ color: 'var(--gold)' }}>{fmt(totalSpent)}</div>
              <div className="customer-stat-lbl">Total gastado</div>
            </div>
          </div>

          {/* Orders history */}
          <div className="order-detail-section">
            <div className="order-detail-section-title">Historial de pedidos</div>
            {orders.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin pedidos aún</p>
            ) : (
              <div className="order-items-list">
                {orders.map(order => (
                  <div key={order.id} className="customer-order-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>
                        #{String(order.id).padStart(6, '0')}
                      </span>
                      <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDate(order.createdAt)}</span>
                    </div>
                    <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{fmt(order.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [meta, setMeta] = useState({ total: 0, pages: 1, page: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [viewingId, setViewingId] = useState(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCustomers({ page, search: debouncedSearch })
      setCustomers(data.data || [])
      setMeta(data.meta || { total: 0, pages: 1, page: 1 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>
          {meta.total} cliente{meta.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search bar */}
      <div className="customers-search-wrap">
        <div className="customers-search-inner">
          <SearchIcon />
          <input
            className="customers-search-input"
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="customers-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p>Error al cargar clientes</p>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={load}>Reintentar</button>
        </div>
      )}

      <div className="table-card">
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <p>{debouncedSearch ? 'Sin resultados para la búsqueda' : 'No hay clientes registrados aún'}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Pedidos</th>
                  <th>Total gastado</th>
                  <th>Registrado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="customer-avatar-sm">
                          {c.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td-muted">{c.phone || '—'}</td>
                    <td className="td-muted">
                      {[c.city, c.province].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: 20, minWidth: 28, height: 22,
                        fontSize: 12, fontWeight: 700, color: 'var(--gold)', padding: '0 8px',
                      }}>
                        {c.orderCount}
                      </span>
                    </td>
                    <td style={{ color: 'var(--gold)', fontWeight: 600 }}>
                      {fmt(c.totalSpent || 0)}
                    </td>
                    <td className="td-muted" style={{ fontSize: 12 }}>
                      {fmtDate(c.createdAt)}
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        title="Ver detalle"
                        onClick={() => setViewingId(c.id)}
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

      {/* Pagination */}
      {meta.pages > 1 && (
        <div className="customers-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >← Anterior</button>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            Página {page} de {meta.pages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= meta.pages}
            onClick={() => setPage(p => p + 1)}
          >Siguiente →</button>
        </div>
      )}

      <CustomerDetailModal
        customerId={viewingId}
        onClose={() => setViewingId(null)}
      />
    </>
  )
}
