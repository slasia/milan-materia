export default function MobileNav({ open, onClose, categories = [] }) {
  return (
    <nav className={`mob-nav${open ? ' open' : ''}`} aria-label="Menú mobile">
      {categories.map(cat => (
        <a key={cat.id} href={`#${cat.slug}`} onClick={onClose}>{cat.name}</a>
      ))}
      <a href="#contacto" onClick={onClose}>Contacto</a>
      <div className="mob-nav-socials">
        <a href="https://instagram.com/milan.materia" target="_blank" rel="noreferrer">
          @milan.materia
        </a>
        <a href="https://wa.me/5492236667793" target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </div>
    </nav>
  );
}
