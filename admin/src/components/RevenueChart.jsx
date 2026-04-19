import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { fmt } from '../api.js'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{fmt(d.revenue)}</div>
      <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 3 }}>
        {d.count} {d.count === 1 ? 'pedido' : 'pedidos'}
      </div>
    </div>
  )
}

function fmtAxis(val) {
  if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return '$' + (val / 1000).toFixed(0) + 'k'
  return '$' + val
}

export default function RevenueChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Ingresos últimos 30 días</div>
        <div className="empty-state" style={{ height: 220 }}>Sin datos de ingresos</div>
      </div>
    )
  }

  const mapped = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    revenue: Math.round((d.revenue || 0) / 100),
    count: d.count || 0,
    rawRevenue: d.revenue || 0,
  }))

  return (
    <div className="chart-card">
      <div className="chart-title">Ingresos últimos 30 días</div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mapped} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#332b20" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9a8870', fontSize: 10 }}
              axisLine={{ stroke: '#332b20' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#9a8870', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={fmtAxis}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#c8a96a"
              strokeWidth={2}
              dot={{ fill: '#c8a96a', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#e8cb8a', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
