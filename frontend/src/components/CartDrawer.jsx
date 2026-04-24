import { useState, useEffect, useRef } from 'react';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import { imgUrl, formatPrice, createCheckout, getShippingQuote } from '../api';
import AuthModal from './AuthModal';
import { ENABLE_AUTH } from '../config';

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

function buildShippingForm(customer) {
  return {
    customerName: customer?.name || '',
    customerEmail: customer?.email || '',
    customerEmailConfirm: customer?.email || '',
    customerPhone: customer?.phone || '',
    shippingAddress: customer?.address || '',
    shippingCity: customer?.city || '',
    shippingProvince: customer?.province || '',
    shippingZip: customer?.zip || '',
    notes: '',
  };
}

export default function CartDrawer({ open, onClose }) {
  const items = useCart(s => s.items);
  const changeQty = useCart(s => s.changeQty);
  const total = useCart(s => s.total());
  const clear = useCart(s => s.clear);

  const customer = useAuth(s => s.customer);
  const isLoggedIn = useAuth(s => s.isLoggedIn());

  const [step, setStep] = useState('cart');   // 'cart' | 'form'
  const [authOpen, setAuthOpen] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Shipping quote state
  const [shippingQuote, setShippingQuote] = useState(null); // { available, costCents, estimatedDays, provider }
  const [quotingShipping, setQuotingShipping] = useState(false);
  const quoteTimerRef = useRef(null);

  const handleClose = () => { setStep('cart'); onClose(); setShippingQuote(null); };

  // Debounced shipping quote — fires 800ms after user stops typing the postal code
  useEffect(() => {
    const zip = form.shippingZip?.trim();
    if (!zip || zip.length < 4) { setShippingQuote(null); return; }
    clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = setTimeout(async () => {
      setQuotingShipping(true);
      const quote = await getShippingQuote(zip);
      setShippingQuote(quote);
      setQuotingShipping(false);
    }, 800);
    return () => clearTimeout(quoteTimerRef.current);
  }, [form.shippingZip]);

  // Open the shipping form, pre-filling from user profile if logged in
  const handleGoToForm = () => {
    setForm(buildShippingForm(customer));
    setErrors({});
    setStep('form');
  };

  // Si ENABLE_AUTH está activo y el usuario no está logueado, pedir login primero
  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    if (ENABLE_AUTH && !isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    handleGoToForm();
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    // Small delay so auth store updates propagate
    setTimeout(() => handleGoToForm(), 100);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (errors[name]) setErrors(er => ({ ...er, [name]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.customerName?.trim())    e.customerName    = 'Requerido';
    if (!form.customerEmail?.trim())   e.customerEmail   = 'Requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) e.customerEmail = 'Email inválido';
    if (!form.customerEmailConfirm?.trim()) e.customerEmailConfirm = 'Requerido';
    else if (form.customerEmail?.trim() !== form.customerEmailConfirm?.trim()) e.customerEmailConfirm = 'Los emails no coinciden';
    if (!form.customerPhone?.trim())   e.customerPhone   = 'Requerido';
    if (!form.shippingAddress?.trim()) e.shippingAddress = 'Requerido';
    if (!form.shippingCity?.trim())    e.shippingCity    = 'Requerido';
    if (!form.shippingProvince)        e.shippingProvince = 'Requerido';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = items.map(i => ({ productId: i.productId, quantity: i.quantity }));
      const data = await createCheckout(payload, form);
      if (data?.url) {
        clear();
        setStep('cart');
        window.location.href = data.url;
      } else {
        alert('No se pudo iniciar el pago. Intente de nuevo.');
      }
    } catch (err) {
      alert(err.message || 'Error al conectar con el servidor de pagos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className={`cart-overlay${open ? ' open' : ''}`} onClick={handleClose} />
      <div className={`cart-drawer${open ? ' open' : ''}`}>

        {/* ─── Paso 1: Carrito ─── */}
        {step === 'cart' && (
          <>
            <div className="cart-drawer-hd">
              <span>🛍 Mi Carrito</span>
              <button className="cart-drawer-close" onClick={handleClose} aria-label="Cerrar">✕</button>
            </div>

            <div className="cart-items">
              {items.length === 0 ? (
                <div className="cart-empty">Tu carrito está vacío</div>
              ) : (
                items.map(item => (
                  <div className="cart-item" key={item.productId}>
                    <img
                      src={item.imageUrl ? imgUrl(item.imageUrl) : ''}
                      alt={item.name}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">{formatPrice(item.price * item.quantity)}</div>
                      {item.stock != null && item.stock <= 5 && item.stock > 0 && (
                        <div className="cart-item-stock-warn">¡Últimas {item.stock} unidades!</div>
                      )}
                    </div>
                    <div className="cart-item-qty">
                      <button onClick={() => changeQty(item.productId, -1)}>−</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => changeQty(item.productId, 1)}
                        disabled={item.quantity >= (item.stock ?? 9999)}
                        title={item.quantity >= (item.stock ?? 9999) ? 'Stock máximo alcanzado' : ''}
                      >+</button>
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
              {ENABLE_AUTH && !isLoggedIn && items.length > 0 && (
                <p className="cart-login-hint">Iniciá sesión para continuar con la compra</p>
              )}
              <button
                className="checkout-btn"
                onClick={handleCheckoutClick}
                disabled={items.length === 0 || loading}
              >
                {ENABLE_AUTH && !isLoggedIn ? 'Iniciar sesión y comprar' : 'Finalizar compra'}
              </button>
            </div>
          </>
        )}

        {/* ─── Paso 2: Datos de envío ─── */}
        {step === 'form' && (
          <>
            <div className="cart-drawer-hd">
              <button className="cart-back-btn" onClick={() => setStep('cart')}>← Carrito</button>
              <span>Datos de envío</span>
              <button className="cart-drawer-close" onClick={handleClose} aria-label="Cerrar">✕</button>
            </div>

            <form className="checkout-form" onSubmit={handleSubmit} noValidate>
              <div className="checkout-form-scroll">

                <p className="checkout-section-title">Datos personales</p>

                <div className="cf-field">
                  <label>Nombre completo *</label>
                  <input type="text" name="customerName" value={form.customerName || ''}
                    onChange={handleFieldChange} placeholder="Juan García" autoComplete="name" />
                  {errors.customerName && <span className="cf-error">{errors.customerName}</span>}
                </div>

                <div className="cf-field">
                  <label>Email *</label>
                  <input type="email" name="customerEmail" value={form.customerEmail || ''}
                    onChange={handleFieldChange} placeholder="tu@email.com" autoComplete="email" />
                  {errors.customerEmail && <span className="cf-error">{errors.customerEmail}</span>}
                </div>

                <div className="cf-field">
                  <label>Confirmar email *</label>
                  <input type="email" name="customerEmailConfirm" value={form.customerEmailConfirm || ''}
                    onChange={handleFieldChange} placeholder="tu@email.com" autoComplete="off" />
                  {errors.customerEmailConfirm && <span className="cf-error">{errors.customerEmailConfirm}</span>}
                </div>

                <p className="cf-email-note">
                  📧 Tu email se usará para enviarte el comprobante y las actualizaciones de tu pedido.
                </p>

                <div className="cf-field">
                  <label>Teléfono *</label>
                  <input type="tel" name="customerPhone" value={form.customerPhone || ''}
                    onChange={handleFieldChange} placeholder="223 555-1234" autoComplete="tel" />
                  {errors.customerPhone && <span className="cf-error">{errors.customerPhone}</span>}
                </div>

                <p className="checkout-section-title" style={{ marginTop: '16px' }}>Dirección de envío</p>

                {ENABLE_AUTH && customer?.address && (
                  <p className="cf-prefill-note">
                    ✓ Pre-completado con tu domicilio guardado. Podés modificarlo si el envío es a otra dirección.
                  </p>
                )}

                <div className="cf-field">
                  <label>Calle y número *</label>
                  <input type="text" name="shippingAddress" value={form.shippingAddress || ''}
                    onChange={handleFieldChange} placeholder="Av. Colón 1234, Piso 3" autoComplete="street-address" />
                  {errors.shippingAddress && <span className="cf-error">{errors.shippingAddress}</span>}
                </div>

                <div className="cf-row">
                  <div className="cf-field">
                    <label>Ciudad *</label>
                    <input type="text" name="shippingCity" value={form.shippingCity || ''}
                      onChange={handleFieldChange} placeholder="Mar del Plata" autoComplete="address-level2" />
                    {errors.shippingCity && <span className="cf-error">{errors.shippingCity}</span>}
                  </div>
                  <div className="cf-field">
                    <label>Código postal</label>
                    <input type="text" name="shippingZip" value={form.shippingZip || ''}
                      onChange={handleFieldChange} placeholder="7600" autoComplete="postal-code" />
                  </div>
                </div>

                {/* Shipping quote result */}
                {quotingShipping && (
                  <div className="cf-shipping-quote cf-shipping-loading">
                    <span className="cf-shipping-spinner" /> Calculando costo de envío…
                  </div>
                )}
                {!quotingShipping && shippingQuote?.available && (
                  <div className="cf-shipping-quote cf-shipping-ok">
                    <span className="cf-shipping-icon">🚚</span>
                    <div>
                      <div className="cf-shipping-label">Envío por Andreani</div>
                      <div className="cf-shipping-detail">
                        {formatPrice(shippingQuote.costCents)} estimado · {shippingQuote.estimatedDays}
                      </div>
                    </div>
                  </div>
                )}
                {!quotingShipping && shippingQuote !== null && !shippingQuote.available && form.shippingZip?.trim().length >= 4 && (
                  <div className="cf-shipping-quote cf-shipping-na">
                    📦 El costo de envío se coordinará por separado al confirmar el pedido.
                  </div>
                )}

                <div className="cf-field">
                  <label>Provincia *</label>
                  <select name="shippingProvince" value={form.shippingProvince || ''}
                    onChange={handleFieldChange} autoComplete="address-level1">
                    <option value="">Seleccioná tu provincia</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.shippingProvince && <span className="cf-error">{errors.shippingProvince}</span>}
                </div>

                <div className="cf-field">
                  <label>Notas de entrega (opcional)</label>
                  <textarea name="notes" value={form.notes || ''}
                    onChange={handleFieldChange}
                    placeholder="Instrucciones, horario preferido..." rows={3} />
                </div>

              </div>

              {/* Resumen del pedido */}
              <div className="checkout-summary">
                <div className="checkout-summary-items">
                  {items.map(item => (
                    <div key={item.productId} className="checkout-summary-row">
                      <span>{item.name} × {item.quantity}</span>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="checkout-summary-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <div className="cart-footer" style={{ paddingTop: 0 }}>
                <button type="submit" className="checkout-btn" disabled={loading}>
                  {loading ? 'Procesando...' : '💳 Ir a pagar'}
                </button>
                <p className="checkout-secure-note">
                  🔒 Pago seguro vía MercadoPago · Recibirás confirmación por email
                </p>
              </div>
            </form>
          </>
        )}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
