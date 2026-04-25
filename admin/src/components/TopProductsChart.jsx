import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label" style={{ maxWidth: 160, wordBreak: 'break-word' }}>
        {d.fullName}
      </div>
      <div className="chart-tooltip-value">{d.quantity} vendidos</div>
    </div>
  )
}

export default function TopProductsChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="chart-card">
        <div className="chart-title">Top productos</div>
        <div className="empty-state" style={{ height: 220 }}>Sin datos de productos</div>
      </div>
    )
  }

  const mapped = data.map(d => {
    const name = d.product?.name || 'Producto'
    return {
      name: name.length > 12 ? name.slice(0, 12) + '…' : name,
      fullName: name,
      quantity: d.totalQuantity || 0,
    }
  })

  return (
    <div className="chart-card">
      <div className="chart-title">Top productos</div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mapped} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#332b20" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9a8870', fontSize: 10 }}
              axisLine={{ stroke: '#332b20' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#9a8870', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200,169,106,0.07)' }} />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
              {mapped.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === 0 ? '#e8cb8a' : i === 1 ? '#c8a96a' : '#a07840'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
