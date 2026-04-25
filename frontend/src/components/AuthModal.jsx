import { useState, useRef } from 'react';
import { useAuth } from '../store/auth';
import {
  customerRegister,
  customerLogin,
  customerVerify,
  customerResendVerification,
  customerForgotPassword,
  customerResetPassword,
} from '../api';

const PROVINCES = [
  'Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja',
  'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan',
  'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero',
  'Tierra del Fuego', 'Tucumán',
];

// ── Verification step ─────────────────────────────────────────────────────────
function VerifyStep({ email, onSuccess, onSkip }) {
  const updateCustomer = useAuth(s => s.updateCustomer);
  const [digits, setDigits] = useState(['', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [resent, setResent] = useState(false);
  const inputs = useRef([]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setErr('');
    if (val && i < 4) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (text.length === 5) {
      setDigits(text.split(''));
      inputs.current[4]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 5) { setErr('Ingresá los 5 dígitos'); return; }
    setLoading(true);
    try {
      const res = await customerVerify(code);
      updateCustomer({ emailVerified: true });
      onSuccess(res);
    } catch (e) {
      setErr(e.message || 'Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await customerResendVerification();
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (e) {
      setErr(e.message || 'Error al reenviar');
    }
  };

  return (
    <div className="auth-verify">
      <div className="auth-verify-icon">📧</div>
      <h3 className="auth-verify-title">Verificá tu email</h3>
      <p className="auth-verify-sub">
        Enviamos un código de 5 dígitos a<br />
        <strong>{email}</strong>
      </p>

      <div className="auth-code-inputs" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            className="auth-code-digit"
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {err && <p className="auth-error" style={{ textAlign: 'center' }}>{err}</p>}
      {resent && <p className="auth-success">¡Código reenviado!</p>}

      <button
        className="auth-submit"
        onClick={handleVerify}
        disabled={loading || digits.join('').length < 5}
      >
        {loading ? 'Verificando...' : 'Verificar cuenta'}
      </button>

      <p className="auth-switch">
        ¿No recibiste el código?{' '}
        <button className="auth-link" onClick={handleResend}>Reenviar</button>
      </p>
      <p className="auth-switch" style={{ marginTop: 4 }}>
        <button className="auth-link" onClick={onSkip}>Verificar más tarde</button>
      </p>
    </div>
  );
}

// ── Forgot password step (enter email) ────────────────────────────────────────
function ForgotStep({ onCodeSent, onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setErr('Ingresá tu email'); return; }
    setLoading(true); setErr('');
    try {
      await customerForgotPassword(email);
      onCodeSent(email);
    } catch (e) {
      setErr(e.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-forgot">
      <div className="auth-forgot-icon">🔑</div>
      <h3 className="auth-forgot-title">Recuperar contraseña</h3>
      <p className="auth-forgot-sub">
        Ingresá tu email y te enviamos un código de 5 dígitos para crear una nueva contraseña.
      </p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label>Email de tu cuenta</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoFocus
            autoComplete="email"
          />
        </div>
        {err && <p className="auth-error">{err}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar código'}
        </button>
        <p className="auth-switch">
          <button type="button" className="auth-link" onClick={onBack}>← Volver al inicio de sesión</button>
        </p>
      </form>
    </div>
  );
}

// ── Reset password step (enter code + new password) ───────────────────────────
function ResetStep({ email, onSuccess, onBack }) {
  const [digits, setDigits] = useState(['', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const inputs = useRef([]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setErr('');
    if (val && i < 4) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    if (text.length === 5) { setDigits(text.split('')); inputs.current[4]?.focus(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 5) { setErr('Ingresá los 5 dígitos del código'); return; }
    if (password.length < 6) { setErr('La contraseña debe tener al menos 6 caracteres'); return; }
    if (password !== password2) { setErr('Las contraseñas no coinciden'); return; }
    setLoading(true); setErr('');
    try {
      const res = await customerResetPassword(email, code, password);
      onSuccess(res);
    } catch (e) {
      setErr(e.message || 'Código incorrecto o expirado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-forgot">
      <div className="auth-forgot-icon">🔐</div>
      <h3 className="auth-forgot-title">Nueva contraseña</h3>
      <p className="auth-forgot-sub">
        Enviamos un código a <strong>{email}</strong>.<br />Ingresalo y elegí tu nueva contraseña.
      </p>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-code-inputs" onPaste={handlePaste} style={{ marginBottom: 16 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={el => inputs.current[i] = el}
              className="auth-code-digit"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
            />
          ))}
        </div>
        <div className="auth-field">
          <label>Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
        </div>
        <div className="auth-field">
          <label>Repetir contraseña</label>
          <input
            type="password"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        {err && <p className="auth-error">{err}</p>}
        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
        </button>
        <p className="auth-switch">
          <button type="button" className="auth-link" onClick={onBack}>← Cambiar email</button>
        </p>
      </form>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function AuthModal({ open, onClose, onSuccess }) {
  const setAuth    = useAuth(s => s.setAuth);
  const customer   = useAuth(s => s.customer);
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('form'); // 'form' | 'verify' | 'forgot' | 'reset'
  const [pendingEmail, setPendingEmail] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState('');

  // Register state
  const [reg, setReg] = useState({
    name: '', email: '', phone: '', password: '', password2: '',
    address: '', city: '', province: '', zip: '',
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regErr, setRegErr] = useState('');

  const reset = () => {
    setTab('login');
    setStep('form');
    setPendingEmail('');
    setLoginEmail(''); setLoginPass(''); setLoginErr('');
    setReg({ name: '', email: '', phone: '', password: '', password2: '', address: '', city: '', province: '', zip: '' });
    setRegErr('');
  };

  // ── Forgot/Reset callbacks ─────────────────────────────────────────────────
  const handleForgotCodeSent = (email) => {
    setPendingEmail(email);
    setStep('reset');
  };

  const handleResetSuccess = (res) => {
    setAuth(res.access_token, res.customer);
    reset();
    onSuccess?.(res.customer);
  };

  const handleClose = () => { reset(); onClose(); };

  const switchTab = (t) => { setTab(t); setLoginErr(''); setRegErr(''); setStep('form'); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true); setLoginErr('');
    try {
      const data = await customerLogin({ email: loginEmail, password: loginPass });
      setAuth(data.access_token, data.customer);
      reset();
      onSuccess?.(data.customer);
    } catch (err) {
      setLoginErr(err.message || 'Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (reg.password !== reg.password2) { setRegErr('Las contraseñas no coinciden'); return; }
    if (reg.password.length < 6) { setRegErr('La contraseña debe tener al menos 6 caracteres'); return; }
    setRegLoading(true); setRegErr('');
    try {
      const { password2, ...payload } = reg;
      const data = await customerRegister(payload);
      setAuth(data.access_token, data.customer);
      setPendingEmail(reg.email);
      setStep('verify');
    } catch (err) {
      setRegErr(err.message || 'Error al crear la cuenta');
    } finally {
      setRegLoading(false);
    }
  };

  // ── Verification callbacks ─────────────────────────────────────────────────
  const handleVerifySuccess = (res) => {
    reset();
    onSuccess?.(res.customer);
  };

  const handleSkipVerify = () => {
    reset();
    onSuccess?.(null);
  };

  if (!open) return null;

  return (
    <>
      <div className="auth-modal-backdrop" onClick={handleClose} />
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label={tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
      >
        <button className="auth-modal-close" onClick={handleClose} aria-label="Cerrar">✕</button>

        <div className="auth-modal-logo">
          <span className="auth-logo-mm">MM</span>
        </div>

        {/* Email verification status banner — visible cuando ya hay sesión */}
        {step !== 'verify' && customer && (
          <div className={`auth-verify-banner ${customer.emailVerified ? 'verified' : 'unverified'}`}>
            {customer.emailVerified
              ? <><span>✔</span> Email verificado</>
              : <><span>⚠</span> Email sin verificar — revisá tu casilla o <button className="auth-link" onClick={() => { setPendingEmail(customer.email); setStep('verify'); }}>verificá ahora</button></>
            }
          </div>
        )}

        {step === 'forgot' ? (
          <ForgotStep
            onCodeSent={handleForgotCodeSent}
            onBack={() => setStep('form')}
          />
        ) : step === 'reset' ? (
          <ResetStep
            email={pendingEmail}
            onSuccess={handleResetSuccess}
            onBack={() => setStep('forgot')}
          />
        ) : step === 'verify' ? (
          <VerifyStep
            email={pendingEmail || customer?.email || ''}
            onSuccess={handleVerifySuccess}
            onSkip={handleSkipVerify}
          />
        ) : (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>
                Iniciar sesión
              </button>
              <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>
                Crear cuenta
              </button>
            </div>

            {/* ── Login form ── */}
            {tab === 'login' && (
              <form className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="auth-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="auth-field">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    value={loginPass}
                    onChange={e => setLoginPass(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
                {loginErr && <p className="auth-error">{loginErr}</p>}
                <button className="auth-submit" type="submit" disabled={loginLoading}>
                  {loginLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
                <p className="auth-switch">
                  <button type="button" className="auth-link" onClick={() => setStep('forgot')}>
                    ¿Olvidaste tu contraseña?
                  </button>
                </p>
                <p className="auth-switch">
                  ¿No tenés cuenta?{' '}
                  <button type="button" className="auth-link" onClick={() => switchTab('register')}>
                    Crear una gratis
                  </button>
                </p>
              </form>
            )}

            {/* ── Register form ── */}
            {tab === 'register' && (
              <form className="auth-form" onSubmit={handleRegister} noValidate>
                <p className="auth-section-label">Datos personales</p>

                <div className="auth-row">
                  <div className="auth-field">
                    <label>Nombre completo *</label>
                    <input
                      type="text"
                      value={reg.name}
                      onChange={e => setReg(r => ({ ...r, name: e.target.value }))}
                      placeholder="Juan García"
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label>Teléfono</label>
                    <input
                      type="tel"
                      value={reg.phone}
                      onChange={e => setReg(r => ({ ...r, phone: e.target.value }))}
                      placeholder="223 555-1234"
                      autoComplete="tel"
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={reg.email}
                    onChange={e => setReg(r => ({ ...r, email: e.target.value }))}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="auth-row">
                  <div className="auth-field">
                    <label>Contraseña *</label>
                    <input
                      type="password"
                      value={reg.password}
                      onChange={e => setReg(r => ({ ...r, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="auth-field">
                    <label>Repetir contraseña *</label>
                    <input
                      type="password"
                      value={reg.password2}
                      onChange={e => setReg(r => ({ ...r, password2: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <p className="auth-section-label">Domicilio (para pre-completar envíos)</p>

                <div className="auth-field">
                  <label>Calle y número</label>
                  <input
                    type="text"
                    value={reg.address}
                    onChange={e => setReg(r => ({ ...r, address: e.target.value }))}
                    placeholder="Av. Colón 1234, Piso 3"
                    autoComplete="street-address"
                  />
                </div>

                <div className="auth-row auth-row-3">
                  <div className="auth-field">
                    <label>Ciudad</label>
                    <input
                      type="text"
                      value={reg.city}
                      onChange={e => setReg(r => ({ ...r, city: e.target.value }))}
                      placeholder="Mar del Plata"
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className="auth-field">
                    <label>Provincia</label>
                    <select
                      value={reg.province}
                      onChange={e => setReg(r => ({ ...r, province: e.target.value }))}
                      autoComplete="address-level1"
                    >
                      <option value="">— Seleccioná —</option>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="auth-field">
                    <label>Código postal</label>
                    <input
                      type="text"
                      value={reg.zip}
                      onChange={e => setReg(r => ({ ...r, zip: e.target.value }))}
                      placeholder="7600"
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
                  <button type="button" className="auth-link" onClick={() => switchTab('login')}>
                    Iniciar sesión
                  </button>
                </p>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}
