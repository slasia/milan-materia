import { useState } from 'react';
import { customerLogin, customerRegister } from '../api';
import { useAuth } from '../store/auth';

export default function AuthModal({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const setAuth = useAuth(s => s.setAuth);

  // ── Login state ────────────────────────────────────────────────
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Register state ─────────────────────────────────────────────
  const [regForm, setRegForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '',
    address: '', city: '', province: '', zip: '',
  });
  const [regErr, setRegErr] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  if (!open) return null;

  // ── Handlers ───────────────────────────────────────────────────

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginErr('');
    setLoginLoading(true);
    try {
      const data = await customerLogin({ email: loginForm.email, password: loginForm.password });
      setAuth(data.access_token, data.customer);
      onSuccess?.();
      onClose();
    } catch (err) {
      setLoginErr(err.message || 'Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegErr('');
    if (regForm.password !== regForm.confirmPassword) {
      setRegErr('Las contraseñas no coinciden');
      return;
    }
    setRegLoading(true);
    try {
      const { confirmPassword, ...payload } = regForm;
      const data = await customerRegister(payload);
      setAuth(data.access_token, data.customer);
      onSuccess?.();
      onClose();
    } catch (err) {
      setRegErr(err.message || 'Error al crear la cuenta');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="auth-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="auth-modal" role="dialog" aria-modal="true">
        <button className="auth-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <div className="auth-modal-logo">
          <span className="auth-logo-mm">MM</span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' active' : ''}`}
            onClick={() => { setTab('login'); setLoginErr(''); setRegErr(''); }}
          >
            Iniciar sesión
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' active' : ''}`}
            onClick={() => { setTab('register'); setLoginErr(''); setRegErr(''); }}
          >
            Crear cuenta
          </button>
        </div>

        {/* ── LOGIN ─── */}
        {tab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="auth-field">
              <label>Contraseña</label>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            {loginErr && <p className="auth-error">{loginErr}</p>}
            <button className="auth-submit" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
            <p className="auth-switch">
              ¿No tenés cuenta?{' '}
              <button type="button" onClick={() => setTab('register')}>Registrate</button>
            </p>
          </form>
        )}

        {/* ── REGISTER ─── */}
        {tab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister} noValidate>
            <p className="auth-section-label">Datos personales</p>

            <div className="auth-row">
              <div className="auth-field">
                <label>Nombre completo *</label>
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={regForm.name}
                  onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="auth-field">
                <label>Teléfono</label>
                <input
                  type="tel"
                  placeholder="223 666-7793"
                  value={regForm.phone}
                  onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Email *</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-row">
              <div className="auth-field">
                <label>Contraseña *</label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={regForm.password}
                  onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="auth-field">
                <label>Confirmar contraseña *</label>
                <input
                  type="password"
                  placeholder="Repetí tu contraseña"
                  value={regForm.confirmPassword}
                  onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <p className="auth-section-label">Dirección de envío</p>

            <div className="auth-field">
              <label>Calle y número</label>
              <input
                type="text"
                placeholder="Av. Independencia 1234"
                value={regForm.address}
                onChange={e => setRegForm(f => ({ ...f, address: e.target.value }))}
                autoComplete="street-address"
              />
            </div>

            <div className="auth-row auth-row-3">
              <div className="auth-field">
                <label>Ciudad</label>
                <input
                  type="text"
                  placeholder="Mar del Plata"
                  value={regForm.city}
                  onChange={e => setRegForm(f => ({ ...f, city: e.target.value }))}
                  autoComplete="address-level2"
                />
              </div>
              <div className="auth-field">
                <label>Provincia</label>
                <input
                  type="text"
                  placeholder="Buenos Aires"
                  value={regForm.province}
                  onChange={e => setRegForm(f => ({ ...f, province: e.target.value }))}
                  autoComplete="address-level1"
                />
              </div>
              <div className="auth-field">
                <label>Código postal</label>
                <input
                  type="text"
                  placeholder="7600"
                  value={regForm.zip}
                  onChange={e => setRegForm(f => ({ ...f, zip: e.target.value }))}
                  autoComplete="postal-code"
                />
              </div>
            </div>

            {regErr && <p className="auth-error">{regErr}</p>}
            <button className="auth-submit" type="submit" disabled={regLoading}>
              {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
            <p className="auth-switch">
              ¿Ya tenés cuenta?{' '}
              <button type="button" onClick={() => setTab('login')}>Ingresá</button>
            </p>
          </form>
        )}
      </div>
    </>
  );
}
