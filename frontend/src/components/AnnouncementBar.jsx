import { useEffect, useState } from 'react';
import { getPromotions } from '../api';

export default function AnnouncementBar() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    getPromotions()
      .then(data => {
        const ann = Array.isArray(data)
          ? data.filter(p => p.type === 'announcement').map(p => p.title)
          : [];
        setItems(ann);
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="ann-bar" aria-label="Promociones">
      <div className="ann-ticker">
        {/* First copy — always visible */}
        <div className="ann-track">
          {items.map((item, i) => (
            <span key={i}>
              {item}
              <span className="ann-sep"> ✦ </span>
            </span>
          ))}
          {/* Second copy — hidden on desktop, visible on mobile for seamless loop */}
          {items.map((item, i) => (
            <span key={`dup-${i}`} className="ann-dup" aria-hidden="true">
              {item}
              <span className="ann-sep"> ✦ </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
