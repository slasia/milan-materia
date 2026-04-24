// ── Feature flags ─────────────────────────────────────────────────────────────
// VITE_ENABLE_AUTH=true  → muestra login, registro, mis pedidos
// VITE_ENABLE_AUTH=false → compra anónima, sin login (default)

export const ENABLE_AUTH = import.meta.env.VITE_ENABLE_AUTH === 'true';
