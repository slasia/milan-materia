export default function StatCard({ label, value, sub, highlight = false }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" style={highlight ? { color: 'var(--gold-bright)' } : {}}>
        {value}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}
