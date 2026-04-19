const API = 'http://localhost:3001'

function headers() {
  const token = localStorage.getItem('mm_admin_token')
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function req(path, opts = {}) {
  const res = await fetch(API + path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } })
  if (res.status === 401) {
    localStorage.removeItem('mm_admin_token')
    window.location.hash = '#/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.message || res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export const login = (email, password) =>
  fetch(API + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }).then(r => r.json())

export const getDashboard = () => req('/admin/dashboard')
export const getProducts = () => req('/admin/products')
export const getProduct = (id) => req('/products/' + id)
export const createProduct = (data) => req('/admin/products', { method: 'POST', body: JSON.stringify(data) })
export const updateProduct = (id, data) => req('/admin/products/' + id, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteProduct = (id) => req('/admin/products/' + id, { method: 'DELETE' })
export const uploadImage = (id, file) => {
  const fd = new FormData()
  fd.append('image', file)
  return fetch(API + '/admin/products/' + id + '/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('mm_admin_token')}` },
    body: fd
  }).then(r => r.json())
}
export const getCategories = () => req('/categories')
export const getPromotions = () => req('/admin/promotions')
export const createPromotion = (data) => req('/admin/promotions', { method: 'POST', body: JSON.stringify(data) })
export const updatePromotion = (id, data) => req('/admin/promotions/' + id, { method: 'PATCH', body: JSON.stringify(data) })
export const deletePromotion = (id) => req('/admin/promotions/' + id, { method: 'DELETE' })
export const getOrders = () => req('/admin/orders')
export const getOrder = (id) => req('/admin/orders/' + id)
export const updateOrderStatus = (id, status) =>
  req('/admin/orders/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) })

export const fmt = (cents) => '$\u202f' + Math.round(cents / 100).toLocaleString('es-AR')
export const fmtDate = (d) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
export const imgUrl = (path) => path ? `${API}/${path}` : null
