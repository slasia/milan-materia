import { useState, useEffect } from 'react';

const slides = [
  {
    badge: '✦ Colección Premium 2024',
    h1: ['Mates ', 'Imperiales', '\nde Autor'],
    p: 'Calabaza natural, cuero genuino y alpaca artesanal. Cada mate es una obra única que nace de nuestras manos.',
    cta1: { text: 'Ver Imperiales', href: '#imperial' },
    cta2: { text: 'Toda la colección', href: '#mates' },
    img: 'img/products/imperial-chocolate.jpg',
    imgAlt: 'Imperial Premium Chocolate',
    label: 'Imperial',
  },
  {
    badge: '✦ Línea Torpedo',
    h1: ['Mates ', 'Torpedo', '\nUruguayo Criollo'],
    p: 'Forma torpedo clásica con virola de alpaca cincelada. Arte y tradición en cada detalle artesanal.',
    cta1: { text: 'Ver Torpedos', href: '#torpedo' },
    cta2: { text: 'Consultanos', href: '#contacto' },
    img: 'img/products/torpedo-algarrobo.jpg',
    imgAlt: 'Torpedo Algarrobo',
    label: 'Torpedo',
  },
  {
    badge: '✦ Línea Acero',
    h1: ['Mates ', 'Térmicos', '\nAcero 304'],
    p: 'Doble pared, máxima durabilidad. Para los que eligen el mate en cualquier momento y lugar del mundo.',
    cta1: { text: 'Ver Acero Inox', href: '#acero' },
    cta2: { text: 'Consultanos', href: '#contacto' },
    img: 'img/products/acero-termico.jpg',
    imgAlt: 'Mate Térmico Acero',
    label: 'Acero Inox',
  },
];

function HeroSlide({ slide, active }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className={`hero-slide${active ? ' active' : ''}`}>
      <div className="hero-content">
        <div className="hero-badge">{slide.badge}</div>
        <h1>
          {slide.h1[0]}
          <em>{slide.h1[1]}</em>
          {slide.h1[2].split('\n').map((line, i) =>
            i === 0 ? null : <><br key={i} />{line}</>
          )}
        </h1>
        <p>{slide.p}</p>
        <div className="hero-btns">
          <a href={slide.cta1.href} className="btn-primary">{slide.cta1.text}</a>
          <a href={slide.cta2.href} className="btn-outline">{slide.cta2.text}</a>
        </div>
      </div>
      <div className="hero-visual">
        <div className="hero-frame">
          <div className="hero-ring"></div>
          <div className="hero-ring"></div>
          <div className="hero-img-wrap">
            {!imgFailed ? (
              <img
                src={`/${slide.img}`}
                alt={slide.imgAlt}
                className="hero-product-img"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div className="hero-img-placeholder">
                <div style={{
                  fontFamily: "'Josefin Sans', sans-serif",
                  fontSize: '64px',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg,#f5d98a,#c8a96a)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  lineHeight: 1,
                }}>MM</div>
                <span className="hero-label">{slide.label}</span>
              </div>
            )}
          </div>
          <div className="hero-corner"></div>
          <div className="hero-corner"></div>
          <div className="hero-corner"></div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSlider() {
  const [cur, setCur] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCur(c => (c + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="hero" aria-label="Destacados">
      <div className="hero-slides">
        {slides.map((slide, i) => (
          <HeroSlide key={i} slide={slide} active={i === cur} />
        ))}
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`hero-dot${i === cur ? ' active' : ''}`}
            onClick={() => setCur(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
