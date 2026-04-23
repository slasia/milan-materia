import { useState, useEffect } from 'react';
import { useAuth } from '../store/auth';
import { customerOrders, imgUrl, formatPrice } from '../api';

const STATUS_LABEL = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLOR = {
  pending: '#c8a96a',
  paid: '#4bb98c',
  processing: '#64a0dc',
  shipped: '#e8cb8a',
  delivered: '#4bb98c',
  cancelled: '#d94f38',
};

export default function MyOrders({ onClose }) {
  const customer = useAuth(s => s.customer);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    customerOrders()
      .then(setOrders)
      .catch(e => setErr(e.message || 'Error al cargar pedidos'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="myorders-overlay" onClick={onClose}>
      <div
        className="myorders-modal"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <div className="myorders-hd">
          <div>
            <h2>Mis pedidos</h2>
            {customer?.name && (
              <p className="myorders-greeting">{customer.name}</p>
            )}
          </div>
          <button className="myorders-close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="myorders-list">
          {loading && <div className="myorders-loading">Cargando pedidos...</div>}
          {err && <div className="myorders-error">{err}</div>}
          {!loading && !err && orders.length === 0 && (
            <div className="myorders-empty">
              <div className="myorders-empty-icon">📦</div>
              <p>Todavía no hiciste ningún pedido</p>
            </div>
          )}

          {orders.map(order => (
            <div key={order.id} className="myorder-card">
              <div className="myorder-card-hd">
                <div>
                  <span className="myorder-num">#{String(order.id).padStart(6, '0')}</span>
                  <span
                    className="myorder-status"
                    style={{ color: STATUS_COLOR[order.status] || '#9a8870' }}
                  >
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="myorder-card-date">
                  {new Date(order.createdAt).toLocaleDateString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </div>
              </div>

              <div className="myorder-card-body">
                {order.trackingNumber && (
                  <div className="myorder-tracking">
                    <div>
                      <div className="myorder-tracking-label">Seguimiento</div>
                      <div className="myorder-tracking-num">{order.trackingNumber}</div>
                    </div>
                  </div>
                )}

                {order.adminNotes && (
                  <div className="myorder-admin-note">
                    <span>💬</span>
                    <span>{order.adminNotes}</span>
                  </div>
                )}

                <div className="myorder-items">
                  {order.items.map(item => (
                    <div key={item.id} className="myorder-item-row">
                      {item.product?.imageUrl && (
                        <img
                          src={imgUrl(item.product.imageUrl)}
                          alt={item.product.name}
                          className="myorder-item-img"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <span className="myorder-item-name">{item.product?.name ?? 'Producto'}</span>
                      <span className="myorder-item-qty">× {item.quantity}</span>
                      <span className="myorder-item-price">{formatPrice(item.total)}</span>
                    </div>
                  ))}
                </div>

                {order.shippingAddress && (
                  <div className="myorder-address">
                    <span>📍</span>
                    <span>{order.shippingAddress}</span>
                  </div>
                )}

                <div className="myorder-total">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
