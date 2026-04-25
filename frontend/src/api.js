const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ── helpers ─────────────────────────────────────────────────────────────────

function getToken() {
  try {
    const raw = localStorage.getItem('mm_customer_auth');
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || `Error ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join('. ') : msg);
  }
  return data;
}

// ── Products & Categories ────────────────────────────────────────────────────

export const getProducts = (category) =>
  fetch(`${API}/products${category ? '?category=' + category : ''}`).then(r => r.json());

export const getCategories = () =>
  fetch(`${API}/categories`).then(r => r.json());

export const getPromotions = () =>
  fetch(`${API}/promotions/active`).then(r => r.json());

// ── Checkout ─────────────────────────────────────────────────────────────────
// shippingData: { customerName?, customerEmail?, customerPhone?,
//                 shippingAddress?, shippingCity?, shippingProvince?, shippingZip?, notes? }

export const createCheckout = (items, shippingData = {}) =>
  fetch(`${API}/payments/create-checkout-session`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items, ...shippingData }),
  }).then(handleResponse);

// ── Shipping ──────────────────────────────────────────────────────────────────

export const getShippingQuote = (postalCode) =>
  fetch(`${API}/shipping/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postalCode }),
  }).then(r => r.json()).catch(() => ({ available: false, costCents: 0, estimatedDays: null }));

// ── Orders ───────────────────────────────────────────────────────────────────

export const getOrder = (id) =>
  fetch(`${API}/orders/${id}`).then(r => r.json());

// ── Customer Auth ─────────────────────────────────────────────────────────────

export const customerRegister = (data) =>
  fetch(`${API}/auth/customer/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const customerLogin = (data) =>
  fetch(`${API}/auth/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const customerVerify = (code) =>
  fetch(`${API}/auth/customer/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  }).then(handleResponse);

export const customerResendVerification = () =>
  fetch(`${API}/auth/customer/resend-verification`, {
    method: 'POST',
    headers: authHeaders(),
  }).then(handleResponse);

export const customerMe = () =>
  fetch(`${API}/auth/customer/me`, {
    headers: authHeaders(),
  }).then(handleResponse);

export const customerUpdate = (data) =>
  fetch(`${API}/auth/customer/me`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const customerOrders = () =>
  fetch(`${API}/auth/customer/me/orders`, {
    headers: authHeaders(),
  }).then(handleResponse);

export const customerForgotPassword = (email) =>
  fetch(`${API}/auth/customer/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then(handleResponse);

export const customerResetPassword = (email, code, password) =>
  fetch(`${API}/auth/customer/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password }),
  }).then(handleResponse);

// ── Utils ────────────────────────────────────────────────────────────────────

export const imgUrl = (path) => path ? `${API}/${path}` : null;

export const formatPrice = (cents) =>
  '$\u202f' + Math.round(cents / 100).toLocaleString('es-AR');
