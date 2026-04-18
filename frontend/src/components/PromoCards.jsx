import { useEffect, useState } from 'react';
import { getPromotions } from '../api';

const FALLBACK = [
  {
    num: '%20',
    label: 'Efectivo / Transferencia',
    sub: 'Descuento directo en todos los productos. Vigente hasta el 30 de Abril',
    numStyle: {},
    numContent: <><sup>%</sup>20</>
  },
  {
    num: '%25',
    label: 'Tarjeta de Crédito',
    sub: '25% OFF + 3 cuotas sin interés en todas las tarjetas',
    numContent: <><sup>%</sup>25</>
  },
  {
    num: '6x',
    label: 'Cuotas sin interés',
    sub: 'Financiación disponible en productos seleccionados de la colección',
    numContent: <>6<sup>×</sup></>
  },
  {
    num: '🚚',
    label: 'Envío gratis',
    sub: 'En compras superiores a $120.000 ARS a todo el país',
    numStyle: { fontSize: '48px', WebkitTextFillColor: 'unset', background: 'none' },
    numContent: <>🚚</>
  },
];

export default function PromoCards() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    getPromotions()
      .then(data => {
        const banners = Array.isArray(data)
          ? data.filter(p => p.type === 'banner')
          : [];
        if (banners.length > 0) setCards(banners);
      })
      .catch(() => {});
  }, []);

  const display = cards || FALLBACK;

  return (
    <div className="promo-bg">
      <div className="promo-grid">
        {display.map((card, i) => {
          if (card.numContent) {
            return (
              <div className="promo-card" key={i}>
                <div className="promo-num" style={card.numStyle || {}}>
                  {card.numContent}
                </div>
                <div className="promo-label">{card.label}</div>
                <div className="promo-sub">{card.sub}</div>
              </div>
            );
          }
          return (
            <div className="promo-card" key={i}>
              <div className="promo-num">
                {card.value || card.title || card.text || ''}
              </div>
              <div className="promo-label">{card.label || card.title || ''}</div>
              <div className="promo-sub">{card.description || card.sub || ''}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
