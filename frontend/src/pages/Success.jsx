import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOrder, formatPrice } from '../api';
import { useCart } from '../store/cart';

function padId(id) {
  return String(id).padStart(6, '0');
}

const STATUS_LABEL = {
  pending:   { text: 'Pago pendiente',   color: '#e8a838' },
  paid:      { text: 'Pago confirmado',  color: '#4bb98c' },
  cancelled: { text: 'Cancelado',        color: '#f87171' },
  shipped:   { text: 'En camino',        color: '#60a5fa' },
  delivered: { text: 'Entregado',        color: '#4bb98c' },
};

function Comprobante({ order, orderId, isPending }) {
  const items  = order?.items || [];
  const total  = order?.total  ?? 0;
  const sub    = order?.subtotal ?? total;
  const disc   = order?.discountAmt ?? 0;
  const ship   = order?.shippingCost ?? 0;
  const fecha  = new Date(order?.createdAt || Date.now())
    .toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const statusInfo = STATUS_LABEL[order?.status] ?? STATUS_LABEL.pending;

  return (
    <div className="receipt">
      <div className="receipt-header">
        <div className="receipt-logo">MM</div>
        <div className="receipt-brand">MILÁN MATERÍA</div>
        <div className="receipt-sub">Mar del Plata · Argentina</div>
      </div>

      <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>

      <div className="receipt-order-num">
        <div className="receipt-order-label">NÚMERO DE ORDEN</div>
        <div className="receipt-order-val">#{padId(order?.id || orderId)}</div>
        <div className="receipt-status" style={{ color: statusInfo.color }}>
          {statusInfo.text}
        </div>
      </div>

      <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>

      <div className="receipt-meta">
        <span>Fecha: {fecha}</span>
        {order?.customerName && <span>Cliente: {order.customerName}</span>}
      </div>

      {order?.shippingAddress && (
        <div className="receipt-address">
          📦 {order.shippingAddress}
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>
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

          <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>

          {/* Subtotals */}
          {disc > 0 && (
            <div className="receipt-subtotal-row">
              <span>Subtotal</span><span>{formatPrice(sub)}</span>
            </div>
          )}
          {disc > 0 && (
            <div className="receipt-subtotal-row receipt-discount">
              <span>Descuento</span><span>-{formatPrice(disc)}</span>
            </div>
          )}
          {ship > 0 && (
            <div className="receipt-subtotal-row">
              <span>Envío (Andreani)</span><span>{formatPrice(ship)}</span>
            </div>
          )}

          <div className="receipt-total-row">
            <span>TOTAL</span>
            <span>{formatPrice(total)}</span>
          </div>
        </>
      )}

      <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>

      {isPending ? (
        <div className="receipt-notice receipt-notice-pending">
          🕐 Tu pago está siendo procesado.<br />
          Recibirás un email de confirmación<br />
          cuando se acredite.
        </div>
      ) : (
        <div className="receipt-notice">
          📧 Recibirás el comprobante por email.<br />
          En caso de consulta mencioná<br />
          tu número de orden.
        </div>
      )}

      <div className="receipt-divider">· · · · · · · · · · · · · · · · · · · ·</div>
      <div className="receipt-thanks">¡Gracias por tu compra! 🧉</div>
    </div>
  );
}

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId  = searchParams.get('order') || searchParams.get('collection_id');
  const status   = searchParams.get('status'); // 'pending' when MP redirects pending payments
  const isPending = status === 'pending';

  const [order, setOrder]   = useState(null);
  const [loading, setLoading] = useState(true);
  const clear = useCart(s => s.clear);

  useEffect(() => {
    clear();
    if (!orderId) { setLoading(false); return; }
    // Retry a couple of times — webhook may not have fired yet when MP redirects
    let attempts = 0;
    const fetch = () => {
      getOrder(orderId)
        .then(data => { setOrder(data); setLoading(false); })
        .catch(() => {
          if (attempts++ < 2) setTimeout(fetch, 1500);
          else setLoading(false);
        });
    };
    fetch();
  }, [orderId]);

  const icon     = isPending ? '🕐' : '✅';
  const heading  = isPending ? '¡Pedido recibido!' : '¡Pago confirmado!';
  const subtitle = isPending
    ? 'Tu pago está siendo procesado. Te notificaremos por email cuando se confirme.'
    : 'Tu pedido fue recibido con éxito. Pronto te contactamos para coordinar la entrega.';

  return (
    <div className="success-page">
      <div className="success-card">
        <div className="success-icon">{icon}</div>
        <h1>{heading}</h1>
        <p className="success-subtitle">{subtitle}</p>

        {loading ? (
          <div className="success-loading">
            <span className="success-spinner" />
            Cargando detalle del pedido...
          </div>
        ) : (order || orderId) ? (
          <Comprobante order={order} orderId={orderId} isPending={isPending} />
        ) : null}

        <div className="success-actions">
          <Link to="/" className="success-back">← Volver a la tienda</Link>
          {order?.customerEmail && (
            <a
              href={`https://wa.me/5492236667793?text=${encodeURIComponent(`Hola! Mi número de orden es #${padId(order.id)}. `)}`}
              target="_blank"
              rel="noreferrer"
              className="success-wa"
            >
              💬 Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
