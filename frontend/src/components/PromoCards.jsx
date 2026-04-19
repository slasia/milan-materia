import { useEffect, useState } from 'react';
import { getPromotions } from '../api';

// Visual config keyed by promotion title
const CARD_VISUALS = {
  'Efectivo / Transferencia': {
    numContent: <><sup>%</sup>20</>,
    numStyle: {},
  },
  'Tarjeta de Crédito': {
    numContent: <><sup>%</sup>25</>,
    numStyle: {},
  },
  'Cuotas sin interés': {
    numContent: <>6<sup>×</sup></>,
    numStyle: {},
  },
  'Envío gratis': {
    numContent: <>🚚</>,
    numStyle: { fontSize: '48px', WebkitTextFillColor: 'unset', background: 'none' },
  },
};

export default function PromoCards() {
  const [cards, setCards] = useState([]);

  useEffect(() => {
    getPromotions()
      .then(data => {
        const banners = Array.isArray(data) ? data.filter(p => p.type === 'banner') : [];
        setCards(banners);
      })
      .catch(() => {});
  }, []);

  if (cards.length === 0) return null;

  return (
    <div className="promo-bg">
      <div className="promo-grid">
        {cards.map((card, i) => {
          const title = card.title || '';
          const description = card.description || '';
          const visuals = CARD_VISUALS[title] || {};

          return (
            <div className="promo-card" key={card.id ?? i}>
              <div className="promo-num" style={visuals.numStyle || {}}>
                {visuals.numContent || title}
              </div>
              <div className="promo-label">{title}</div>
              <div className="promo-sub">{description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
