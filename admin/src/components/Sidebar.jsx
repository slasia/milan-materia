import { NavLink, useNavigate } from 'react-router-dom'
import { clearToken } from '../auth.js'

const DashIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="7" rx="1.5"/>
    <rect x="11" y="2" width="7" height="7" rx="1.5"/>
    <rect x="2" y="11" width="7" height="7" rx="1.5"/>
    <rect x="11" y="11" width="7" height="7" rx="1.5"/>
  </svg>
)

const TagIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h6l8 8a2 2 0 010 2.83l-3.17 3.17a2 2 0 01-2.83 0L3 9V3z"/>
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
)

const StarIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 2l2.39 4.84 5.34.78-3.86 3.76.91 5.32L10 14.27l-4.78 2.53.91-5.32L2.27 7.62l5.34-.78L10 2z"/>
  </svg>
)

const ClipboardIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 3H5a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
    <rect x="7" y="1" width="6" height="4" rx="1.5"/>
    <path d="M7 9h6M7 13h4"/>
  </svg>
)

const UsersIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 11c2.21 0 4 1.79 4 4v1H3v-1c0-2.21 1.79-4 4-4h6z"/>
    <circle cx="10" cy="6" r="3"/>
  </svg>
)

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3h4a1 1 0 011 1v12a1 1 0 01-1 1h-4M9 14l4-4-4-4M13 10H3"/>
  </svg>
)

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashIcon /> },
  { to: '/products', label: 'Productos', icon: <TagIcon /> },
  { to: '/promotions', label: 'Promociones', icon: <StarIcon /> },
  { to: '/orders', label: 'Pedidos', icon: <ClipboardIcon /> },
  { to: '/customers', label: 'Clientes', icon: <UsersIcon /> },
]

export default function Sidebar() {
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">MM</div>
        <div className="sidebar-logo-sub">Panel Admin</div>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="btn-logout" onClick={handleLogout}>
          <LogoutIcon />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  )
}
