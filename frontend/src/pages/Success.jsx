import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOrder, formatPrice } from '../api';
import { useCart } from '../store/cart';

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
        .then(data => {
          setOrder(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const items = order?.items || order?.orderItems || [];
  const total = order?.total || order?.totalAmount || 0;
  const status = order?.status || 'confirmado';

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">🧉</div>
        <h1>¡Gracias por tu compra!</h1>

        {loading ? (
          <p>Cargando detalle de tu pedido...</p>
        ) : order ? (
          <>
            <p>
              Tu pedido <strong style={{ color: 'var(--gold)' }}>#{order.id || orderId}</strong> fue{' '}
              recibido con éxito. Estado: <strong style={{ color: 'var(--gold)' }}>{status}</strong>
            </p>
            <p>
              Te contactaremos por WhatsApp para coordinar la entrega. ¡Gracias por elegirnos!
            </p>

            {items.length > 0 && (
              <div className="success-items">
                {items.map((item, i) => (
                  <div className="success-item" key={i}>
                    <span className="success-item-name">
                      {item.name || item.productName || `Producto #${item.productId}`}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </span>
                    <span>{formatPrice((item.price || item.unitPrice || 0) * (item.quantity || 1))}</span>
                  </div>
                ))}
                <div className="success-total">
                  <span>Total pagado</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p>
              Tu pago fue procesado correctamente. Te contactaremos a la brevedad para confirmar tu pedido.
            </p>
            {orderId && (
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                Referencia: {orderId}
              </p>
            )}
          </>
        )}

        <Link to="/" className="success-back">
          Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
