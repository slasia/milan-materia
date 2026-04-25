import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts'

const STATUS_COLORS = {
  paid: '#4bb98c',
  pending: '#c8a96a',
  shipped: '#e8cb8a',
  delivered: '#4bb98c',
  cancelled: '#d94f38',
  processing: '#64a0dc',
}

const STATUS_LABELS = {
  paid: 'Pagado',
  pending: 'Pendiente',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  processing: 'Procesando',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null
  const { name, value } = payload[0]
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{STATUS_LABELS[name] || name}</div>
      <div className="chart-tooltip-value">{value} pedidos</div>
    </div>
  )
}

export default function StatusChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Pedidos por estado</div>
        <div className="empty-state" style={{ height: 220 }}>Sin datos de pedidos</div>
      </div>
    )
  }

  const mapped = data.map(d => ({
    name: d.status,
    value: d._count?.status ?? d._count ?? 0,
  }))

  return (
    <div className="chart-card">
      <div className="chart-title">Pedidos por estado</div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={mapped}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              paddingAngle={2}
            >
              {mapped.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name] || '#9a8870'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-legend">
        {mapped.map(entry => (
          <div key={entry.name} className="legend-item">
            <span
              className="legend-dot"
              style={{ background: STATUS_COLORS[entry.name] || '#9a8870' }}
            />
            {STATUS_LABELS[entry.name] || entry.name} ({entry.value})
          </div>
        ))}
      </div>
    </div>
  )
}
