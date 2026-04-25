import { useEffect, useState, useMemo } from 'react';
import { useCart } from '../store/cart';
import { imgUrl, formatPrice } from '../api';

const WAIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function GalleryPlaceholder() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        fontFamily: "'Josefin Sans', sans-serif",
        fontSize: '80px',
        fontWeight: 900,
        background: 'linear-gradient(135deg,#f5d98a,#c8a96a,#8a6830)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}>MM</div>
      <div style={{ fontFamily: "'Josefin Sans', sans-serif", fontSize: '12px', letterSpacing: '0.2em', color: 'var(--gold)', textTransform: 'uppercase' }}>
        Milán Matería
      </div>
    </div>
  );
}

export default function ProductModal({ product, onClose }) {
  const addItem   = useCart(s => s.addItem);
  const openCart  = useCart(s => s.openCart);
  const cartItems = useCart(s => s.items);
  const [added, setAdded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);

  const inCartNow = product ? cartItems.some(i => i.productId === product.id) : false;

  // Build gallery: prefer images[], fall back to imageUrl
  const gallery = useMemo(() => {
    if (!product) return [];
    if (product.images?.length > 0) return product.images.map(i => i.url);
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  // Reset carousel index when product changes
  useEffect(() => {
    setCurrentImg(0);
    setImgFailed(false);
  }, [product?.id]);

  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [product]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && gallery.length > 1) setCurrentImg(i => (i - 1 + gallery.length) % gallery.length);
      if (e.key === 'ArrowRight' && gallery.length > 1) setCurrentImg(i => (i + 1) % gallery.length);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, gallery]);

  if (!product) return null;

  const inStock = product.active !== false && (product.stock === undefined || product.stock > 0);
  const cuotas = product.price
    ? `3 cuotas de ${formatPrice(Math.round(product.price / 3))} sin interés`
    : null;

  const waMsg = encodeURIComponent(`Hola! Quiero consultar por el producto: ${product.name} 🧉`);
  const waUrl = `https://wa.me/5492236667793?text=${waMsg}`;

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  const prevImg = () => setCurrentImg(i => (i - 1 + gallery.length) % gallery.length);
  const nextImg = () => setCurrentImg(i => (i + 1) % gallery.length);

  return (
    <div className="prod-modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="prod-modal" role="dialog" aria-modal="true">
        <button className="prod-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        {/* Image column with carousel */}
        <div className="prod-modal-img-col">
          {gallery.length > 0 && !imgFailed ? (
            <div className="prod-modal-gallery">
              <img
                key={currentImg}
                src={imgUrl(gallery[currentImg])}
                alt={`${product.name} — imagen ${currentImg + 1}`}
                onError={() => setImgFailed(true)}
                className="prod-modal-gallery-img"
              />

              {gallery.length > 1 && (
                <>
                  <button className="gallery-nav gallery-nav-prev" onClick={prevImg} aria-label="Anterior">‹</button>
                  <button className="gallery-nav gallery-nav-next" onClick={nextImg} aria-label="Siguiente">›</button>

                  {/* Dot indicators */}
                  <div className="gallery-dots">
                    {gallery.map((_, i) => (
                      <button
                        key={i}
                        className={`gallery-dot${i === currentImg ? ' active' : ''}`}
                        onClick={() => setCurrentImg(i)}
                        aria-label={`Imagen ${i + 1}`}
                      />
                    ))}
                  </div>

                  {/* Thumbnail strip */}
                  <div className="gallery-thumbs">
                    {gallery.map((url, i) => (
                      <button
                        key={i}
                        className={`gallery-thumb${i === currentImg ? ' active' : ''}`}
                        onClick={() => setCurrentImg(i)}
                      >
                        <img src={imgUrl(url)} alt={`Miniatura ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <GalleryPlaceholder />
          )}
        </div>

        {/* Info column */}
        <div className="prod-modal-info-col">
          {product.category && (
            <div className="prod-modal-badge">
              {product.category?.name ?? (typeof product.category === 'string' ? product.category : '')}
            </div>
          )}
          <div className="prod-modal-name">{product.name}</div>
          {product.description && (
            <div className="prod-modal-desc">{product.description}</div>
          )}
          <div className="prod-modal-sep"></div>
          {product.originalPrice > 0 && (
            <div className="prod-modal-original-price">{formatPrice(product.originalPrice)}</div>
          )}
          <div className="prod-modal-price">{formatPrice(product.price)}</div>
          {cuotas && <div className="prod-modal-cuotas">{cuotas}</div>}
          <div className="prod-modal-actions">
            <button
              className="prod-modal-add"
              onClick={handleAdd}
              disabled={!inStock}
            >
              {added ? '✓ Agregado al carrito' : inStock ? 'Agregar al carrito' : 'Sin stock'}
            </button>
            {inCartNow && (
              <button className="prod-modal-go-cart" onClick={() => { onClose(); openCart(); }}>
                🛒 Ir al carrito
              </button>
            )}
            <a href={waUrl} target="_blank" rel="noreferrer" className="prod-modal-wa">
              <WAIcon />
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
