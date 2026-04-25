import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import ToastContainer from './Toast.jsx'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/products': 'Productos',
  '/categories': 'Categorías',
  '/promotions': 'Promociones',
  '/orders': 'Pedidos',
  '/customers': 'Clientes',
}

function useServerStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) })
        if (mounted) setStatus(res.ok ? 'online' : 'offline')
      } catch {
        if (mounted) setStatus('offline')
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  return status
}

export default function Layout() {
  const location = useLocation()
  const serverStatus = useServerStatus()
  const title = PAGE_TITLES[location.pathname] || 'Admin'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <div className="server-status">
              <span className={`status-dot ${serverStatus === 'online' ? 'online' : serverStatus === 'offline' ? 'offline' : ''}`} />
              <span>
                {serverStatus === 'online' ? 'Servidor online' : serverStatus === 'offline' ? 'Servidor offline' : 'Verificando...'}
              </span>
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
        <footer className="admin-footer">
          Powered by{' '}
          <a
            href="https://wa.me/542236352372"
            target="_blank"
            rel="noopener noreferrer"
            className="admin-footer-link"
          >
            Sebastian Lasia
          </a>
        </footer>
      </div>
      <ToastContainer />
    </div>
  )
}
