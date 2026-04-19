import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { customerOrders, formatPrice } from '../api';
import { useAuth } from '../store/auth';

const STATUS_STEPS = [
  { key: 'pending',    label: 'Recibido',       icon: '📥' },
  { key: 'paid',       label: 'Pago confirmado', icon: '✅' },
  { key: 'processing', label: 'En preparación',  icon: '🧉' },
  { key: 'shipped',    label: 'Enviado',          icon: '🚚' },
  { key: 'delivered',  label: 'Entregado',        icon: '🏠' },
];

const STATUS_ORDER = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

const STATUS_CANCELLED = 'cancelled';

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function OrderTracker({ status }) {
  if (status === STATUS_CANCELLED) {
    return (
      <div className="order-tracker">
        <div className="order-tracker-cancelled">
          <span>❌</span> Pedido cancelado
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(status);

  return (
    <div className="order-tracker">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className={`tracker-step${done ? ' done' : ''}${active ? ' active' : ''}`}>
            <div className="tracker-icon">{step.icon}</div>
            <div className="tracker-label">{step.label}</div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`tracker-line${done && i < currentIdx ? ' done' : ''}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const items = order.items || [];

  return (
    <div className="myorder-card">
      <div className="myorder-card-hd" onClick={() => setExpanded(o => !o)}>
        <div className="myorder-card-id">
          Pedido <span>#{String(order.id).padStart(6, '0')}</span>
        </div>
        <div className="myorder-card-meta">
          <span className="myorder-card-date">{fmtDate(order.createdAt)}</span>
          <span className="myorder-card-total">{formatPrice(order.total || 0)}</span>
          <span className="myorder-expand-btn">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      <OrderTracker status={order.status} />

      {expanded && (
        <div className="myorder-card-body">
          {order.trackingNumber && (
            <div className="myorder-tracking">
              <span>🚚</span>
              <div>
                <div className="myorder-tracking-label">Número de seguimiento</div>
                <div className="myorder-tracking-num">{order.trackingNumber}</div>
              </div>
            </div>
          )}
          {order.adminNotes && (
            <div className="myorder-admin-note">
              <span>💬</span>
              <div>{order.adminNotes}</div>
            </div>
          )}
          <div className="myorder-items">
            {items.map((item, i) => (
              <div className="myorder-item-row" key={i}>
                <span className="myorder-item-name">
                  {item.product?.name || `Producto #${item.productId}`}
                </span>
                <span className="myorder-item-qty">× {item.quantity}</span>
                <span className="myorder-item-price">
                  {formatPrice(item.total || item.unitPrice * item.quantity || 0)}
                </span>
              </div>
            ))}
          </div>
          {order.shippingAddress && (
            <div className="myorder-address">
              <span>📍</span> {order.shippingAddress}
            </div>
          )}
          {order.notes && (
            <div className="myorder-notes">
              <span>📝</span> {order.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyOrders({ onClose }) {
  const customer = useAuth(s => s.customer);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    customerOrders()
      .then(data => { setOrders(Array.isArray(data) ? data : []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="myorders-overlay">
      <div className="myorders-modal">
        <div className="myorders-hd">
          <div>
            <h2>Mis Pedidos</h2>
            {customer?.name && <p className="myorders-greeting">Hola, {customer.name.split(' ')[0]}</p>}
          </div>
          <button className="myorders-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="myorders-loading">
            <div className="spinner-dark" />
          </div>
        )}

        {error && (
          <div className="myorders-error">
            No pudimos cargar tus pedidos. Intentá de nuevo más tarde.
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="myorders-empty">
            <div className="myorders-empty-icon">🛍</div>
            <p>Todavía no tenés pedidos</p>
            <button className="myorders-shop-btn" onClick={onClose}>
              Ir a la tienda
            </button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="myorders-list">
            {orders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
