const WASmallIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '17px', height: '17px', flexShrink: 0 }}>
    <path fill="currentColor" d="M16 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.37.63 4.59 1.728 6.51L2.667 29.333l6.99-1.698A13.267 13.267 0 0016 29.333c7.364 0 13.333-5.97 13.333-13.333S23.364 2.667 16 2.667zm0 2.4c6.032 0 10.933 4.9 10.933 10.933S22.032 26.933 16 26.933a10.91 10.91 0 01-5.532-1.5l-.397-.234-4.151 1.007 1.052-3.998-.258-.41A10.895 10.895 0 015.067 16C5.067 9.968 9.968 5.067 16 5.067zm-3.42 4.8c-.222 0-.581.083-.886.416-.305.333-1.163 1.136-1.163 2.77 0 1.634 1.19 3.213 1.356 3.437.166.222 2.316 3.736 5.706 5.088 2.821 1.112 3.392.89 4.004.835.61-.055 1.969-.804 2.247-1.581.278-.776.278-1.441.195-1.58-.083-.139-.305-.222-.638-.39-.333-.167-1.968-.972-2.274-1.082-.305-.112-.527-.167-.748.166-.222.333-.858 1.082-1.052 1.304-.194.222-.388.25-.721.083-.333-.166-1.406-.518-2.678-1.652-.99-.883-1.659-1.972-1.853-2.306-.194-.333-.02-.513.147-.679.15-.149.333-.388.5-.583.165-.194.22-.333.332-.555.111-.222.055-.416-.028-.583-.083-.167-.741-1.807-1.027-2.474-.264-.617-.535-.534-.748-.544-.194-.009-.416-.011-.638-.011z"/>
  </svg>
);

const IGSmallIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ width: '17px', height: '17px', flexShrink: 0 }}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

export default function ContactSection() {
  return (
    <div className="contact-bg" id="contacto">
      <div className="contact-inner">
        <div className="contact-block">
          <h3>Contacto</h3>
          <a
            href="https://wa.me/5492236667793?text=Hola!%20Quiero%20consultar%20por%20los%20mates%20🧉"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            <WASmallIcon /> 223 666-7793
          </a>
          <a
            href="https://instagram.com/milan.materia"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            <IGSmallIcon /> @milan.materia
          </a>
          <a
            href="mailto:milan.materia@gmail.com"
            style={{ display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            milan.materia@gmail.com
          </a>
        </div>

        <div className="contact-block">
          <h3>Colección</h3>
          <a href="#imperiales">Línea Imperial</a>
          <a href="#torpedos">Torpedos</a>
          <a href="#algarrobo">Algarrobo</a>
          <a href="#acero">Acero Inox</a>
          <a href="#bombillas">Bombillas</a>
          <a href="#yerbas">Yerbas y Accesorios</a>
        </div>

        <div className="contact-block">
          <h3>Medios de pago</h3>
          <p style={{ fontSize: '12px' }}>Aceptamos todas las tarjetas y medios de pago</p>
          <div className="pay-icons">
            <span className="pay-chip">VISA</span>
            <span className="pay-chip">MASTER</span>
            <span className="pay-chip">AMEX</span>
            <span className="pay-chip">MERCADO PAGO</span>
            <span className="pay-chip">DÉBITO</span>
            <span className="pay-chip">TRANSFERENCIA</span>
            <span className="pay-chip">EFECTIVO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
