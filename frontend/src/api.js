const API = 'http://localhost:3001';

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

export const createCheckout = (items) =>
  fetch(`${API}/payments/create-checkout-session`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ items }),
  }).then(handleResponse);

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

// ── Utils ────────────────────────────────────────────────────────────────────

export const imgUrl = (path) => path ? `${API}/${path}` : null;

export const formatPrice = (cents) =>
  '$\u202f' + Math.round(cents / 100).toLocaleString('es-AR');
