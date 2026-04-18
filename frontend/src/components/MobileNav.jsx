export default function MobileNav({ open, onClose }) {
  return (
    <nav className={`mob-nav${open ? ' open' : ''}`} aria-label="Menú mobile">
      <a href="#mates"      onClick={onClose}>Mates</a>
      <a href="#imperiales" onClick={onClose}>Imperiales</a>
      <a href="#torpedos"   onClick={onClose}>Torpedos</a>
      <a href="#algarrobo"  onClick={onClose}>Algarrobo</a>
      <a href="#acero"      onClick={onClose}>Acero Inox</a>
      <a href="#bombillas"  onClick={onClose}>Bombillas</a>
      <a href="#yerbas"     onClick={onClose}>Yerbas</a>
      <a href="#contacto"   onClick={onClose}>Contacto</a>
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
