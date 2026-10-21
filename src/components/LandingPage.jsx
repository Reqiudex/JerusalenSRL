import React from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Award, 
  Truck, 
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import { COMPANY_CONTACTS } from '../data';
import logoImg from '../assets/jerusalen-logo.png';

export default function LandingPage({ onExploreCatalog, onOpenLinktree }) {
  const marbleCategories = [
    {
      title: 'Mármoles Exóticos de Brasil',
      desc: 'Extracción directa de Vitória (Espírito Santo) y Minas Gerais. Vetas doradas, cristales translúcidos y acabados pulidos espejo.',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
      specs: 'Planchas de 20mm y 30mm • Venta por pieza entera'
    },
    {
      title: 'Cuarzo Statuario de Cero Porosidad',
      desc: 'Superficies antibacterianas ideales para islas de cocina de alta gastronomía y baños de lujo que requieren cero manchas.',
      image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
      specs: 'Garantía 10 años • Libre de selladores'
    },
    {
      title: 'Piedra Sinterizada High-Tech',
      desc: 'La evolución de la piedra: resiste sartenes ardiendo a más de 300°C, cortes directos de cuchillo y rayos UV en exteriores.',
      image: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1000&q=80',
      specs: 'Ultra compacta • Espesor 12mm velvet'
    },
    {
      title: 'Granitos Naturales Premium',
      desc: 'Resistencia milenaria contra la intemperie, sol y humedad tropical cruceña. Perfecto para áreas de churrasqueras y fachadas.',
      image: 'https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=1000&q=80',
      specs: 'Dureza extrema • Acabados Leather y Pulido'
    }
  ];

  const galleryShowcase = [
    {
      title: 'Isla de Cocina Calacatta Gold',
      location: 'Condominio Las Palmas, Santa Cruz',
      img: 'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Baño Principal en Negro Marquina',
      location: 'Equipetrol Norte, Santa Cruz',
      img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'
    },
    {
      title: 'Fachada en Piedra Sinterizada',
      location: 'Urbarí Residencial, Santa Cruz',
      img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80'
    }
  ];

  return (
    <div className="landing-container">
      {/* Hero Presentation */}
      <section className="landing-hero glass-panel-gold">
        <div className="landing-hero-content">
          <div className="landing-logo-wrap">
            <img src={logoImg} alt="Jerusalén S.R.L. Stone Tech Center" className="landing-official-logo" />
          </div>
          <div className="hero-origin-chip">
            <span className="flag-icon">🇧🇷</span> Importación Directa desde Canteras de Brasil a Bolivia
          </div>
          <h1 className="landing-main-title">
            La Pureza de la Piedra Natural Brasileña en su Máxima Expresión
          </h1>
          <p className="landing-lead">
            Provisión y comercialización de planchas enteras de mármol, granito exótico, cuarzo y piedra sinterizada. 
            Sin intermediarios, seleccionadas en origen pieza por pieza para arquitectos, constructoras y hogares de alta gama en Bolivia.
          </p>
          <div className="landing-cta-row">
            <button className="btn-landing-primary" onClick={onExploreCatalog}>
              <span>Ver Catálogo de Planchas en Stock</span>
              <ArrowRight size={18} />
            </button>
            <a 
              href={`https://wa.me/59170314442?text=${encodeURIComponent('Buenas tardes, deseo asesoramiento para una obra con mármoles importados de Brasil.')}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-landing-wp"
            >
              <MessageCircle size={18} /> Asesor WhatsApp (+591 70314442)
            </a>
            <button className="btn-landing-secondary" onClick={onOpenLinktree}>
              Linktree Oficial
            </button>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="landing-pillars-grid">
        <div className="pillar-card glass-panel">
          <div className="pillar-icon"><Award size={26} className="gold-text" /></div>
          <h3>Selección en Cantera</h3>
          <p>Inspección técnica visual en Vitória (Espírito Santo) garantizando vetas sin fisuras estructurales.</p>
        </div>
        <div className="pillar-card glass-panel">
          <div className="pillar-icon"><Layers size={26} className="gold-text" /></div>
          <h3>Venta por Pieza Entera</h3>
          <p>Disponibilidad física inmediata de planchas gigantes (hasta 3.20 x 1.95 m) para cortes continuos a libro (Bookmatch).</p>
        </div>
        <div className="pillar-card glass-panel">
          <div className="pillar-icon"><Truck size={26} className="gold-text" /></div>
          <h3>Logística Certificada</h3>
          <p>Transporte con caballetes A y suspensión especial desde Brasil directo a nuestro almacén en el 4to anillo SCZ.</p>
        </div>
        <div className="pillar-card glass-panel">
          <div className="pillar-icon"><ShieldCheck size={26} className="gold-text" /></div>
          <h3>Garantía & Factura</h3>
          <p>Emisión inmediata de factura comercial oficial con respaldo fiscal y trazabilidad de origen.</p>
        </div>
      </section>

      {/* Materials Showcase */}
      <section className="materials-section">
        <div className="section-title-wrap">
          <span className="section-sub">Línea de Productos</span>
          <h2 className="section-title">Nuestra Colección de Piedras de Alta Gama</h2>
        </div>
        <div className="materials-cards-grid">
          {marbleCategories.map((cat, idx) => (
            <div key={idx} className="material-showcase-card glass-panel">
              <div className="material-img-wrap">
                <img src={cat.image} alt={cat.title} />
              </div>
              <div className="material-body">
                <h3>{cat.title}</h3>
                <p>{cat.desc}</p>
                <div className="material-spec-pill">
                  <Sparkles size={14} className="gold-text" />
                  <span>{cat.specs}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Projects Gallery */}
      <section className="gallery-section glass-panel">
        <div className="section-title-wrap">
          <span className="section-sub">Inspiración Real</span>
          <h2 className="section-title">Obras y Diseños Ejecutados con Materiales de Jerusalén S.R.L.</h2>
        </div>
        <div className="gallery-grid">
          {galleryShowcase.map((item, idx) => (
            <div key={idx} className="gallery-tile">
              <img src={item.img} alt={item.title} />
              <div className="gallery-caption">
                <strong>{item.title}</strong>
                <span>{item.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Company Contact & Locations */}
      <section className="landing-locations glass-panel-gold">
        <div className="location-col">
          <div className="loc-title-row">
            <MapPin size={22} className="gold-text" />
            <h3>Showroom de Exhibición (SCZ)</h3>
          </div>
          <p><strong>Ubicación:</strong> 4to anillo y Av. Piraí, Santa Cruz de la Sierra.</p>
          <p>Medición de obras, presupuestos y muestras en vivo.</p>
          <div className="phones-pills">
            <span>📞 67981545</span>
            <span>📞 78457414</span>
            <span>📞 75387052</span>
          </div>
        </div>

        <div className="location-col">
          <div className="loc-title-row">
            <Building2 size={22} className="gold-text" />
            <h3>Almacén Central & Planchas Enteras</h3>
          </div>
          <p><strong>Ubicación:</strong> 4to anillo entre Av. Roca Coronado y Centenario.</p>
          <p>Venta de planchas enteras por mayor y menor con puente grúa.</p>
          <div className="phones-pills">
            <span>📞 77614004</span>
            <span className="wp-direct">WhatsApp Directo: +591 70314442</span>
          </div>
        </div>

        <div className="location-col">
          <div className="loc-title-row">
            <Clock size={22} className="gold-text" />
            <h3>Horarios de Atención</h3>
          </div>
          <p><strong>Lunes a Viernes:</strong> 08:00 a 12:00 pm | 14:00 a 18:00 pm</p>
          <p><strong>Sábados:</strong> 08:00 a 13:00 pm</p>
          <p><strong>Casa Matriz:</strong> Km 13 carretera a Camiri (Doble vía La Guardia)</p>
        </div>
      </section>
    </div>
  );
}
