import { useState, useEffect, useMemo } from 'react';
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
  const [cardImg, setCardImg] = useState(0);

  const inCartNow = cartItems.some(i => i.productId === product.id);

  // Build gallery: prefer images[], fall back to legacy imageUrl
  const gallery = useMemo(() => {
    if (product.images?.length > 0) return product.images.map(i => i.url);
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  // Reset index if product changes (e.g. filter re-renders same slot)
  useEffect(() => { setCardImg(0); setImgFailed(false); }, [product.id]);

  // Reset flash after animation
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

  const prevImg = (e) => {
    e.stopPropagation();
    setCardImg(i => (i - 1 + gallery.length) % gallery.length);
  };

  const nextImg = (e) => {
    e.stopPropagation();
    setCardImg(i => (i + 1) % gallery.length);
  };

  const cuotas = product.price
    ? `3 cuotas de ${formatPrice(Math.round(product.price / 3))}`
    : null;

  const catSlug = product.category?.slug ?? product.category ?? '';
  const catName = product.category?.name ?? (typeof product.category === 'string' ? product.category : '');

  const currentUrl = gallery[cardImg];

  return (
    <div className="prod-card" onClick={onClick} data-cat={catSlug}>
      <div className="prod-img-wrap">
        {!imgFailed && currentUrl ? (
          <img
            src={imgUrl(currentUrl)}
            alt={`${product.name}${gallery.length > 1 ? ` — ${cardImg + 1} / ${gallery.length}` : ''}`}
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

        {/* Mini carousel — only renders when there are multiple images */}
        {gallery.length > 1 && (
          <>
            <button
              className="card-nav-btn card-nav-prev"
              onClick={prevImg}
              aria-label="Imagen anterior"
            >‹</button>
            <button
              className="card-nav-btn card-nav-next"
              onClick={nextImg}
              aria-label="Imagen siguiente"
            >›</button>

            <div className="card-dots">
              {gallery.map((_, i) => (
                <span
                  key={i}
                  className={`card-dot${i === cardImg ? ' active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
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
            {product.originalPrice > 0 && (
              <div className="prod-original-price">{formatPrice(product.originalPrice)}</div>
            )}
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
