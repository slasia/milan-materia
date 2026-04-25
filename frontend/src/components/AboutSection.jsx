import { useState } from 'react';

export default function AboutSection() {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <div className="about-bg">
      <div className="about-inner">
        <div className="about-vis">
          <div className="about-emblem">
            {!logoFailed ? (
              <img
                src={`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/img/logo-full.png`}
                alt="Milán Matería"
                className="about-emblem-logo"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <>
                <div className="about-emblem-mm">MM</div>
                <div className="about-emblem-name">MILÁN MATERÍA</div>
              </>
            )}
            <div className="about-emblem-sub">Mar del Plata · Argentina</div>
          </div>
        </div>
        <div className="about-txt">
          <h2>Otra forma de<br /><em>vivir el Mate</em></h2>
          <p>
            En Milán Matería no fabricamos mates en serie. Cada pieza nace de nuestras manos,
            con materiales nobles cuidadosamente seleccionados: calabaza natural, cuero genuino,
            alpaca trabajada con técnicas artesanales heredadas.
          </p>
          <p>
            La combinación única de estilo, material y trabajo hace que cada mate sea irrepetible.
            No somos una máquina. Somos artesanos que encuentran en el mate una excusa para crear
            arte con identidad propia.
          </p>
          <div className="about-stats">
            <div>
              <div className="stat-num">100%</div>
              <div className="stat-lbl">Artesanal</div>
            </div>
            <div>
              <div className="stat-num">+500</div>
              <div className="stat-lbl">Clientes felices</div>
            </div>
            <div>
              <div className="stat-num">8</div>
              <div className="stat-lbl">Líneas de producto</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
