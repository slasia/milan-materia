import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOrder, formatPrice } from '../api';
import { useCart } from '../store/cart';
import { ENABLE_AUTH } from '../config';

function padId(id) {
  return String(id).padStart(6, '0');
}

function Comprobante({ order, orderId }) {
  const items = order?.items || [];
  const total = order?.total || 0;
  const now = new Date();
  const fecha = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora  = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="receipt">
      <div className="receipt-header">
        <div className="receipt-logo">MM</div>
        <div className="receipt-brand">MILÁN MATERÍA</div>
        <div className="receipt-sub">Mar del Plata · Argentina</div>
      </div>

      <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>

      <div className="receipt-order-num">
        <div className="receipt-order-label">NÚMERO DE ORDEN</div>
        <div className="receipt-order-val">#{padId(order?.id || orderId)}</div>
      </div>

      <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>

      <div className="receipt-meta">
        <span>Fecha: {fecha}</span>
        <span>Hora: {hora}</span>
      </div>

      {items.length > 0 && (
        <>
          <div className="receipt-items">
            {items.map((item, i) => (
              <div className="receipt-item" key={i}>
                <span className="receipt-item-name">
                  {item.name || item.product?.name || `Producto #${item.productId}`}
                  {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                </span>
                <span className="receipt-item-price">
                  {formatPrice((item.unitPrice || item.price || 0) * (item.quantity || 1))}
                </span>
              </div>
            ))}
          </div>
          <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
          <div className="receipt-total-row">
            <span>TOTAL PAGADO</span>
            <span>{formatPrice(total)}</span>
          </div>
        </>
      )}

      <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>

      <div className="receipt-notice">
        ⚠ Guardá este comprobante.<br />
        En caso de consulta o reclamo<br />
        mencioná tu número de orden.
      </div>

      <div className="receipt-divider">- - - - - - - - - - - - - - - - - -</div>
      <div className="receipt-thanks">¡Gracias por tu compra! 🧉</div>
    </div>
  );
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order') || searchParams.get('collection_id') || searchParams.get('preference_id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const clear = useCart(s => s.clear);

  useEffect(() => {
    clear();
    if (orderId) {
      getOrder(orderId)
        .then(data => { setOrder(data); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [orderId]);

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">✅</div>
        <h1>¡Pago confirmado!</h1>
        <p className="success-subtitle">
          Tu pedido fue recibido con éxito. Te contactaremos para coordinar la entrega.
        </p>

        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Cargando detalle...</p>
        ) : (order || orderId) ? (
          <Comprobante order={order} orderId={orderId} />
        ) : null}

        <Link to="/" className="success-back">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
