import { useEffect, useRef, useState } from 'react';
import { getProducts, getCategories } from '../api';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';

export default function ProductSection() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activecat, setActivecat] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [modalProduct, setModalProduct] = useState(null);
  const filterBusy = useRef(false);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()])
      .then(([prods, cats]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const handleFilter = (cat) => {
    if (filterBusy.current || cat === activecat) return;
    filterBusy.current = true;
    setFiltering(true);
    setTimeout(() => {
      setActivecat(cat);
      requestAnimationFrame(() => {
        setFiltering(false);
        filterBusy.current = false;
      });
    }, 450);
  };

  const visible = activecat === 'todos'
    ? products
    : products.filter(p => p.category === activecat);

  const catNames = categories.map(c => (typeof c === 'string' ? c : c.name || c.slug || String(c)));

  return (
    <section id="mates">
      <div className="wrap sec">
        <div className="sec-hd">
          <div className="sec-eye">Nuestra Colección</div>
          <h2 className="sec-title">Mates <em>Milán Matería</em></h2>
          <p className="sec-sub">Otra forma de vivir el Mate — cada pieza única, hecha a mano en Mar del Plata</p>
        </div>

        <div className="chips">
          <button
            className={`chip${activecat === 'todos' ? ' active' : ''}`}
            onClick={() => handleFilter('todos')}
          >
            Todos
          </button>
          {catNames.map(cat => (
            <button
              key={cat}
              className={`chip${activecat === cat ? ' active' : ''}`}
              onClick={() => handleFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className={`prod-grid${filtering ? ' filtering' : ''}`}>
          {loading && (
            <div className="loading-state">Cargando colección...</div>
          )}
          {error && !loading && (
            <div className="error-state">
              <p>No se pudo cargar la colección</p>
              <p style={{ fontSize: '12px' }}>Verificá que el servidor esté activo</p>
            </div>
          )}
          {!loading && !error && visible.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setModalProduct(product)}
            />
          ))}
          {!loading && !error && visible.length === 0 && (
            <div className="loading-state">No hay productos en esta categoría</div>
          )}
        </div>
      </div>

      {modalProduct && (
        <ProductModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
        />
      )}
    </section>
  );
}
