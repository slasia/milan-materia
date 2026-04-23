import { useState } from 'react';
import { useCart } from '../store/cart';
import { useAuth } from '../store/auth';
import MobileNav from './MobileNav';
import AuthModal from './AuthModal';

const IGIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const WAIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export default function Header({ onCartOpen, onMyOrders }) {
  const [mobOpen, setMobOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const count = useCart(s => s.count());
  const customer = useAuth(s => s.customer);
  const logout = useAuth(s => s.logout);
  const isLoggedIn = useAuth(s => s.isLoggedIn());

  const toggleMob = () => {
    setMobOpen(o => {
      document.body.style.overflow = !o ? 'hidden' : '';
      return !o;
    });
  };

  const closeMob = () => {
    setMobOpen(false);
    document.body.style.overflow = '';
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
  };

  const firstName = customer?.name?.split(' ')[0] || 'Mi cuenta';

  return (
    <>
      <header>
        <div className="header-inner">
          <a href="#" className="site-logo">
            <img
              src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/img/logo-full.png`}
              alt="Milán Matería"
              style={{ height: '52px', width: 'auto' }}
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="logo-svg-wrap" style={{ display: 'none' }}>
              <div className="logo-mm">MM</div>
              <div className="logo-divider"></div>
              <div className="logo-milan">Milán</div>
              <div className="logo-materia">Matería</div>
            </div>
          </a>

          <nav className="main-nav" aria-label="Navegación principal">
            <ul>
              <li><a href="#mates">Mates</a></li>
              <li><a href="#imperiales">Imperiales</a></li>
              <li><a href="#torpedos">Torpedos</a></li>
              <li><a href="#algarrobo">Algarrobo</a></li>
              <li><a href="#acero">Acero Inox</a></li>
              <li><a href="#bombillas">Bombillas</a></li>
              <li><a href="#yerbas">Yerbas</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </nav>

          <button
            className={`mob-menu-btn${mobOpen ? ' open' : ''}`}
            onClick={toggleMob}
            aria-label="Menú"
          >
            <span></span><span></span><span></span>
          </button>

          <div className="header-actions">
            <a href="https://instagram.com/milan.materia" target="_blank" rel="noreferrer"
              className="ha-icon" title="Instagram">
              <IGIcon />
            </a>
            <a href="https://wa.me/5492236667793" target="_blank" rel="noreferrer"
              className="ha-icon ha-wa" title="WhatsApp">
              <WAIcon />
            </a>

            {/* Auth area */}
            {isLoggedIn ? (
              <div className="ha-user-wrap">
                <button className="ha-user-btn" onClick={() => setUserMenuOpen(o => !o)} title="Mi cuenta">
                  <UserIcon />
                  <span className="ha-user-name">{firstName}</span>
                  {customer && !customer.emailVerified && (
                    <span className="ha-unverified-dot" title="Email sin verificar">!</span>
                  )}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="ha-user-menu-backdrop" onClick={() => setUserMenuOpen(false)} />
                    <div className="ha-user-menu">
                      <div className="ha-user-menu-email">{customer?.email}</div>
                      <div className="ha-user-menu-verify-status">
                        {customer?.emailVerified
                          ? <><span className="ha-verify-ok">✔</span><span className="ha-verify-ok">Email verificado</span></>
                          : <button
                              style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}
                              onClick={() => { setUserMenuOpen(false); setAuthOpen(true); }}
                            >
                              <span className="ha-verify-no">⚠</span>
                              <span className="ha-verify-no" style={{ textDecoration:'underline' }}>Email sin verificar — verificar</span>
                            </button>
                        }
                      </div>
                      <button
                        className="ha-user-menu-item"
                        onClick={() => { setUserMenuOpen(false); onMyOrders?.(); }}
                      >
                        Mis pedidos
                      </button>
                      <button className="ha-user-menu-item ha-user-logout" onClick={handleLogout}>
                        Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button className="ha-login-btn" onClick={() => setAuthOpen(true)} title="Iniciar sesión">
                <UserIcon />
                <span>Ingresar</span>
              </button>
            )}

            <button
              className="ha-cart"
              onClick={onCartOpen}
              title="Mi carrito"
              style={{ background: 'transparent', cursor: 'pointer' }}
            >
              <span className={`cart-badge${count > 0 ? ' visible' : ''}`}>
                {count > 0 ? count : ''}
              </span>
              <CartIcon />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={mobOpen} onClose={closeMob} />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
