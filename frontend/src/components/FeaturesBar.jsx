const features = [
  { icon: '🚚', title: 'Envíos a todo el país', sub: 'Embalaje cuidadoso' },
  { icon: '🤝', title: '100% Artesanal', sub: 'Sin máquinas, sin serie' },
  { icon: '💳', title: '3 y 6 cuotas sin interés', sub: 'Todas las tarjetas' },
  { icon: '🛡️', title: 'Garantía de calidad', sub: 'Satisfacción garantizada' },
  { icon: '💰', title: '20% efectivo', sub: '25% tarjeta de crédito' },
];

export default function FeaturesBar() {
  return (
    <div className="feat-bar">
      <div className="feat-inner">
        {features.map((f, i) => (
          <div className="feat" key={i}>
            <span className="feat-icon">{f.icon}</span>
            <div>
              <strong>{f.title}</strong>
              <span>{f.sub}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
