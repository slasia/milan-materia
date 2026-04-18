const API = 'http://localhost:3001';

export const getProducts = (category) =>
  fetch(`${API}/products${category ? '?category=' + category : ''}`).then(r => r.json());

export const getCategories = () =>
  fetch(`${API}/categories`).then(r => r.json());

export const getPromotions = () =>
  fetch(`${API}/promotions/active`).then(r => r.json());

export const createCheckout = (items) =>
  fetch(`${API}/payments/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  }).then(r => r.json());

export const getOrder = (id) =>
  fetch(`${API}/orders/${id}`).then(r => r.json());

export const imgUrl = (path) => path ? `${API}/${path}` : null;

export const formatPrice = (cents) =>
  '$\u202f' + Math.round(cents / 100).toLocaleString('es-AR');
