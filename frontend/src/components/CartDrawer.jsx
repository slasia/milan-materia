import { useState } from 'react';
import { useCart } from '../store/cart';
import { imgUrl, formatPrice, createCheckout } from '../api';

export default function CartDrawer({ open, onClose }) {
  const items = useCart(s => s.items);
  const changeQty = useCart(s => s.changeQty);
  const removeItem = useCart(s => s.removeItem);
  const total = useCart(s => s.total());
  const clear = useCart(s => s.clear);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      const payload = items.map(i => ({ productId: i.productId, quantity: i.quantity }));
      const data = await createCheckout(payload);
      if (data && data.url) {
        clear();
        window.location.href = data.url;
      } else {
        alert('No se pudo iniciar el pago. Intente de nuevo.');
      }
    } catch (err) {
      alert('Error al conectar con el servidor de pagos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`cart-overlay${open ? ' open' : ''}`}
        onClick={onClose}
      />
      <div className={`cart-drawer${open ? ' open' : ''}`}>
        <div className="cart-drawer-hd">
          <span>🛍 Mi Carrito</span>
          <button className="cart-drawer-close" onClick={onClose} aria-label="Cerrar carrito">
            ✕
          </button>
        </div>

        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              Tu carrito está vacío
            </div>
          ) : (
            items.map(item => (
              <div className="cart-item" key={item.productId}>
                <img
                  src={item.imageUrl ? imgUrl(item.imageUrl) : ''}
                  alt={item.name}
                  onError={e => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => changeQty(item.productId, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => changeQty(item.productId, 1)}>+</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="cart-footer">
          <div className="cart-footer-total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            className="checkout-btn"
            onClick={handleCheckout}
            disabled={items.length === 0 || loading}
          >
            {loading ? 'Procesando...' : 'Finalizar compra'}
          </button>
        </div>
      </div>
    </>
  );
}
