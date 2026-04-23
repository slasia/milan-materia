import { useState, useEffect } from 'react';
import { useCart } from '../store/cart';
import { imgUrl, formatPrice } from '../api';

function getBadge(product) {
  if (!product.badge) return null;
  const clsMap = { excl: 'badge-excl', new: 'badge-new', sale: 'badge-sale' };
  return { text: product.badge, cls: clsMap[product.badgeType] || 'badge-excl' };
}

function ProductPlaceholder({ name }) {
  return (
    <div className="prod-placeholder">
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '36px',
        fontWeight: 900,
        background: 'linear-gradient(135deg,#f5d98a,#c8a96a)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}>MM</div>
      <div className="prod-placeholder-txt">{name || 'Milán'}</div>
    </div>
  );
}

export default function ProductCard({ product, onClick }) {
  const addItem   = useCart(s => s.addItem);
  const openCart  = useCart(s => s.openCart);
  const cartItems = useCart(s => s.items);
  const [wished, setWished] = useState(false);
  const [flash, setFlash] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const inCartNow = cartItems.some(i => i.productId === product.id);

  // reset flash after animation
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(t);
  }, [flash]);

  const badge = getBadge(product);
  const inStock = product.active !== false && (product.stock === undefined || product.stock > 0);

  const handleAdd = (e) => {
    e.stopPropagation();
    if (!inStock) return;
    addItem(product);
    setFlash(true);
  };

  const handleWish = (e) => {
    e.stopPropagation();
    setWished(w => !w);
  };

  const cuotas = product.price
    ? `3 cuotas de ${formatPrice(Math.round(product.price / 3))}`
    : null;

  const catSlug = product.category?.slug ?? product.category ?? '';
  const catName = product.category?.name ?? (typeof product.category === 'string' ? product.category : '');

  return (
    <div className="prod-card" onClick={onClick} data-cat={catSlug}>
      <div className="prod-img-wrap">
        {!imgFailed && product.imageUrl ? (
          <img
            src={imgUrl(product.imageUrl)}
            alt={product.name}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <ProductPlaceholder name={catName} />
        )}
        {badge && (
          <div className={`badge ${badge.cls}`}>{badge.text}</div>
        )}
        <button className="prod-wish" onClick={handleWish} title="Lista de deseos">
          {wished ? '❤️' : '🤍'}
        </button>
      </div>
      <div className="prod-body">
        {catName && <div className="prod-cat">{catName}</div>}
        <div className="prod-name">{product.name}</div>
        {product.description && (
          <div className="prod-desc">{product.description}</div>
        )}
        <div className="prod-sep"></div>
        <div className="prod-footer">
          <div className="prod-price-wrap">
            <div className="prod-price">{formatPrice(product.price)}</div>
            {cuotas && <div className="prod-cuotas">{cuotas}</div>}
          </div>
          <button
            className={`add-btn${flash ? ' added' : ''}`}
            onClick={handleAdd}
            disabled={!inStock}
            title={inStock ? 'Agregar al carrito' : 'Sin stock'}
          >
            {flash ? '✓ Listo' : inStock ? 'Agregar' : 'Sin stock'}
          </button>
        </div>
        {inCartNow && (
          <button
            className="go-cart-btn"
            onClick={e => { e.stopPropagation(); openCart(); }}
          >
            🛒 Ir al carrito
          </button>
        )}
      </div>
    </div>
  );
}
