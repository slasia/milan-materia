import { useState, useEffect } from 'react'
import { getDashboard, fmt, fmtDate } from '../api.js'
import StatCard from '../components/StatCard.jsx'
import RevenueChart from '../components/RevenueChart.jsx'
import StatusChart from '../components/StatusChart.jsx'
import TopProductsChart from '../components/TopProductsChart.jsx'

const STATUS_LABELS = {
  paid: 'Pagado',
  pending: 'Pendiente',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  processing: 'Procesando',
}

const STATUS_BADGE = {
  paid: 'badge-green',
  pending: 'badge-gray',
  shipped: 'badge-gold',
  delivered: 'badge-green',
  cancelled: 'badge-red',
  processing: 'badge-blue',
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-state">
        <p>Error al cargar el dashboard</p>
        <p style={{ fontSize: 12, opacity: 0.7 }}>{error}</p>
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    )
  }

  const totalRevenue = data?.totalRevenue ?? 0
  const totalOrders = data?.totalOrders ?? 0
  const paidOrders = data?.paidOrders ?? 0
  const conversionRate = totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : '0.0'
  const dailyRevenue = Array.isArray(data?.dailyRevenue) ? data.dailyRevenue : []
  // ordersByStatus comes from backend as object { pending: 1, paid: 2 } — convert to array
  const ordersByStatus = data?.ordersByStatus && typeof data.ordersByStatus === 'object' && !Array.isArray(data.ordersByStatus)
    ? Object.entries(data.ordersByStatus).map(([status, count]) => ({ status, _count: count }))
    : Array.isArray(data?.ordersByStatus) ? data.ordersByStatus : []
  const topProducts = Array.isArray(data?.topProducts) ? data.topProducts : []
  const recentOrders = Array.isArray(data?.recentOrders) ? data.recentOrders.slice(0, 10) : []

  return (
    <>
      <div className="stats-grid">
        <StatCard
          label="Ingresos Totales"
          value={fmt(totalRevenue)}
          sub="Suma de pedidos pagados"
          highlight
        />
        <StatCard
          label="Total Pedidos"
          value={totalOrders.toLocaleString('es-AR')}
          sub="Todos los estados"
        />
        <StatCard
          label="Pedidos Pagados"
          value={paidOrders.toLocaleString('es-AR')}
          sub={`${conversionRate}% conversión`}
        />
        <StatCard
          label="Tasa de Conversión"
          value={`${conversionRate}%`}
          sub="Pagados / Total"
        />
      </div>

      <div className="charts-grid">
        <RevenueChart data={dailyRevenue} />
        <StatusChart data={ordersByStatus} />
        <TopProductsChart data={topProducts} />
      </div>

      <div className="table-card">
        <div className="table-header">
          <span className="table-header-title">Pedidos recientes</span>
        </div>
        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No hay pedidos recientes</p>
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
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id}>
                    <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>
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
                    <td className="td-muted">{fmtDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
