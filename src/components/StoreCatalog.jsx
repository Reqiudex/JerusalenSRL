import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  Ruler, 
  Layers, 
  MapPin, 
  MessageCircle, 
  CheckCircle2, 
  Sparkles,
  Info,
  ChevronRight,
  Shield,
  Truck
} from 'lucide-react';
import { COMPANY_CONTACTS } from '../data';

export default function StoreCatalog({ products, onSelectProduct, onReservePiece }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('Todos');
  const [quoteSuccessModal, setQuoteSuccessModal] = useState(null);

  const categories = ['Todos', 'Mármol', 'Granito', 'Cuarzo', 'Piedra Sinterizada'];

  const filteredProducts = products.filter((item) => {
    const matchCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.origin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleQuickInquiry = (product) => {
    const text = `Buenas tardes, quiero hacer una consulta sobre la pieza ${product.name} (Cód: ${product.id}) de origen ${product.origin}. ¿Tienen disponibilidad inmediata para entrega?`;
    const url = `https://wa.me/59170314442?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDirectReserve = (product) => {
    if (product.piecesInStock <= 0) {
      alert('Lo sentimos, esta referencia se encuentra temporalmente agotada.');
      return;
    }
    onReservePiece(product.id);
    setQuoteSuccessModal(product);
  };

  return (
    <div className="store-container">
      {/* Hero Banner with marble luxury appeal */}
      <div className="store-hero glass-panel-gold">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={16} className="gold-text" />
            <span>Venta Exclusiva por Pieza y Plancha Entera</span>
          </div>
          <h1 className="hero-title">
            Planchas de Mármol & Piedra Sinterizada Importadas de Brasil
          </h1>
          <p className="hero-desc">
            Venta directa desde nuestros almacenes en Santa Cruz de la Sierra. 
            Cada pieza es única, seleccionada en canteras de Espírito Santo y Minas Gerais con vetas continuas de primera calidad.
          </p>
          <div className="hero-stats-row">
            <div className="stat-card">
              <span className="stat-num">{products.reduce((acc, p) => acc + p.piecesInStock, 0)}</span>
              <span className="stat-label">Planchas en Stock Físico</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">100%</span>
              <span className="stat-label">Importación Brasileña</span>
            </div>
            <div className="stat-card">
              <span className="stat-num">24h</span>
              <span className="stat-label">Inspección en Showroom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar glass-panel">
        <div className="search-input-wrap">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, origen (Brasil), cuarzo, calacatta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="categories-pills">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-grid">
        {filteredProducts.map((prod) => (
          <div key={prod.id} className="product-card glass-panel">
            <div className="product-image-container">
              <img src={prod.image} alt={prod.name} loading="lazy" />
              <div className="product-badge-overlay">
                <span className="badge-chip">{prod.badge}</span>
                <span className="origin-chip">🇧🇷 {prod.origin.split(',')[0]}</span>
              </div>
              <div className="stock-counter-floating">
                <span className={`stock-dot ${prod.piecesInStock <= 3 ? 'low-stock' : 'in-stock'}`} />
                {prod.piecesInStock > 0 ? `${prod.piecesInStock} planchas disp.` : 'Agotado'}
              </div>
            </div>

            <div className="product-body">
              <div className="product-header">
                <span className="category-label">{prod.category} • {prod.finish}</span>
                <h3 className="product-title">{prod.name}</h3>
                <p className="product-desc">{prod.description}</p>
              </div>

              {/* Spec Pills */}
              <div className="specs-list">
                <div className="spec-badge">
                  <Ruler size={14} className="gold-text" />
                  <span>{prod.dimensions}</span>
                </div>
                <div className="spec-badge">
                  <Layers size={14} className="gold-text" />
                  <span>Espesor: {prod.thickness}</span>
                </div>
              </div>

              {/* Price block */}
              <div className="price-container">
                <div>
                  <div className="price-usd">${prod.pricePerPieceUsd.toLocaleString()} <span className="currency">USD / pieza</span></div>
                  <div className="price-bs">Bs. {prod.pricePerPieceBs.toLocaleString()} (Aprox.)</div>
                </div>
                <div className="price-note">
                  Incluye factura fiscal
                </div>
              </div>

              {/* Action buttons */}
              <div className="product-actions">
                <button
                  className="btn-reserve-piece"
                  onClick={() => handleDirectReserve(prod)}
                  disabled={prod.piecesInStock <= 0}
                >
                  <ShoppingCart size={16} />
                  <span>Apartar Pieza en Línea</span>
                </button>

                <button
                  className="btn-whatsapp-inquiry"
                  onClick={() => handleQuickInquiry(prod)}
                  title="Consultar por WhatsApp con mensaje predeterminado"
                >
                  <MessageCircle size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking confirmation modal */}
      {quoteSuccessModal && (
        <div className="modal-backdrop" onClick={() => setQuoteSuccessModal(null)}>
          <div className="modal-card glass-panel-gold" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <CheckCircle2 size={40} className="gold-text" />
              <h3>¡Reserva de Pieza Registrada en Sistema!</h3>
            </div>
            <p className="modal-sub">
              Hemos apartado preventivamente 1 plancha en el sistema demo de almacén para:
            </p>
            <div className="modal-product-summary">
              <strong>{quoteSuccessModal.name}</strong>
              <p>Dimensiones: {quoteSuccessModal.dimensions} | Origen: {quoteSuccessModal.origin}</p>
              <p className="summary-price">${quoteSuccessModal.pricePerPieceUsd} USD / pieza</p>
            </div>
            <p className="modal-note">
              Para coordinar el corte a medida o la inspección en el almacén del 4to anillo con un asesor comercial,
              continúa por WhatsApp:
            </p>
            <div className="modal-actions">
              <a
                href={`https://wa.me/59170314442?text=${encodeURIComponent(
                  `Buenas tardes, acabo de apartar en línea la pieza: ${quoteSuccessModal.name} (Cód: ${quoteSuccessModal.id}). Quisiera coordinar la inspección en el showroom/almacén.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wp-confirm"
              >
                <MessageCircle size={18} /> Confirmar con Asesor (+591 70314442)
              </a>
              <button className="btn-close-modal" onClick={() => setQuoteSuccessModal(null)}>
                Seguir viendo catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
