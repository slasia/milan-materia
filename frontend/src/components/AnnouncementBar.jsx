import { useEffect, useState } from 'react';
import { getPromotions } from '../api';

const FALLBACK = [
  '🔥 20% OFF con efectivo o transferencia',
  '💳 25% OFF + 3 cuotas sin interés',
  '🚚 Envíos a todo el país',
  '🧉 Mates 100% artesanales'
];

export default function AnnouncementBar() {
  const [items, setItems] = useState(FALLBACK);

  useEffect(() => {
    getPromotions()
      .then(data => {
        const ann = Array.isArray(data)
          ? data.filter(p => p.type === 'announcement').map(p => p.text || p.title || p.message)
          : [];
        if (ann.length > 0) setItems(ann);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="ann-bar" aria-label="Promociones">
      <div className="ann-ticker">
        <div className="ann-track">
          {items.map((item, i) => (
            <span key={i}>
              {item}
              {i < items.length - 1 && <span className="ann-sep"> ✦ </span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
