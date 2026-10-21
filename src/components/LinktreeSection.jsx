import React, { useState } from 'react';
import { 
  Building2, 
  Phone, 
  MapPin, 
  ExternalLink, 
  MessageCircle, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  Clock, 
  Layers,
  ArrowUpRight,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { COMPANY_CONTACTS, INITIAL_PRODUCTS } from '../data';

export default function LinktreeSection({ onSelectProduct }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const directWpLink = (phone, msg) => {
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg || COMPANY_CONTACTS.defaultWhatsappMsg)}`;
  };

  const links = [
    {
      title: 'Atención Directa WhatsApp Oficial',
      subtitle: `Línea directa: ${COMPANY_CONTACTS.mainPhoneDisplay}`,
      icon: MessageCircle,
      badge: 'Respuesta Rápida',
      featured: true,
      href: directWpLink('59170314442', 'Buenas tardes, quiero hacer una consulta sobre planchas de mármol y cotizaciones')
    },
    {
      title: 'Cotizaciones y Showroom (4to Anillo & Piraí)',
      subtitle: 'Ventas 1: 67981545 | Ventas 2: 78457414 | Ventas 3: 75387052',
      icon: Phone,
      badge: 'Showroom SCZ',
      featured: false,
      href: directWpLink('59167981545', 'Buenas tardes, deseo cotizar material en el Showroom de Santa Cruz')
    },
    {
      title: 'Almacén Central - Planchas Enteras por Mayor y Menor',
      subtitle: '4to anillo entre Av. Roca Coronado y Centenario • Ventas: 77614004',
      icon: Layers,
      badge: 'Almacén Mayorista',
      featured: false,
      href: directWpLink('59177614004', 'Buenas tardes, me interesa cotizar planchas completas en el almacén central')
    },
    {
      title: 'Descargar Catálogo 2026 - Mármoles de Brasil',
      subtitle: 'Fichas técnicas, Calacatta, Marquina, Cuarzo y Piedra Sinterizada (PDF)',
      icon: Download,
      badge: 'PDF Gratis',
      featured: false,
      href: '#',
      onClick: (e) => {
        e.preventDefault();
        alert('Generando descarga del Catálogo Oficial 2026 de Jerusalén S.R.L. (Mármoles & Cuarzos de Brasil)...');
      }
    },
    {
      title: 'Ubicación Showroom en Google Maps',
      subtitle: '4to anillo y Av. Piraí, Santa Cruz de la Sierra',
      icon: MapPin,
      badge: 'Ver Mapa',
      featured: false,
      href: 'https://maps.google.com/?q=4to+anillo+y+av+pirai+Santa+Cruz+Bolivia'
    },
    {
      title: 'Planta Industrial & Casa Matriz',
      subtitle: 'Km 13 Carretera a Camiri (Doble vía La Guardia)',
      icon: Building2,
      badge: 'Fábrica',
      featured: false,
      href: 'https://maps.google.com/?q=Km+13+carretera+a+Camiri+Santa+Cruz+Bolivia'
    }
  ];

  return (
    <div className="linktree-container">
      {/* Profile Header */}
      <div className="linktree-card glass-panel-gold">
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="avatar-gold-ring">
              <div className="avatar-content">
                <span className="avatar-letter">J</span>
              </div>
            </div>
            <span className="verified-badge" title="Empresa Verificada">✓</span>
          </div>

          <h1 className="profile-title">{COMPANY_CONTACTS.companyName}</h1>
          <p className="profile-tagline">{COMPANY_CONTACTS.tagline}</p>
          <div className="origin-pill">
            <span className="origin-flag">🇧🇷</span> Importación Directa desde Brasil • Santa Cruz, Bolivia
          </div>

          <div className="action-buttons-row">
            <button className="gold-pill-btn" onClick={copyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? '¡Enlace Copiado!' : 'Compartir Perfil'}
            </button>
            <a 
              href={directWpLink('59170314442', 'Buenas tardes, quiero hacer una consulta')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="wp-pill-btn"
            >
              <MessageCircle size={16} /> Chatear (+591 70314442)
            </a>
          </div>
        </div>

        {/* Schedule & Trust info */}
        <div className="linktree-schedule-bar">
          <div className="schedule-item">
            <Clock size={15} className="gold-text" />
            <span><strong>Lun - Vie:</strong> 08:00 - 12:00 | 14:00 - 18:00</span>
          </div>
          <div className="schedule-item">
            <Clock size={15} className="gold-text" />
            <span><strong>Sábados:</strong> 08:00 - 13:00</span>
          </div>
        </div>

        {/* Main Links */}
        <div className="links-list">
          {links.map((link, idx) => {
            const Icon = link.icon;
            return (
              <a
                key={idx}
                href={link.href}
                onClick={link.onClick}
                target={link.href.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className={`linktree-row-btn ${link.featured ? 'featured-glow' : ''}`}
              >
                <div className="linktree-icon-box">
                  <Icon size={22} />
                </div>
                <div className="linktree-content-box">
                  <div className="link-title-line">
                    <span className="link-title">{link.title}</span>
                    {link.badge && <span className="link-badge">{link.badge}</span>}
                  </div>
                  <span className="link-desc">{link.subtitle}</span>
                </div>
                <ArrowUpRight size={18} className="link-arrow" />
              </a>
            );
          })}
        </div>

        {/* Quick Highlights / Mini Carrousel */}
        <div className="linktree-gallery-preview">
          <div className="preview-heading">
            <Sparkles size={16} className="gold-text" />
            <span>Planchas Destacadas en Stock Local (Por Pieza)</span>
          </div>
          <div className="preview-grid">
            {INITIAL_PRODUCTS.slice(0, 3).map((prod) => (
              <div 
                key={prod.id} 
                className="mini-product-card"
                onClick={() => onSelectProduct && onSelectProduct(prod)}
              >
                <img src={prod.image} alt={prod.name} />
                <div className="mini-info">
                  <strong>{prod.name}</strong>
                  <span className="mini-price">${prod.pricePerPieceUsd} USD / pieza</span>
                  <span className="mini-stock">{prod.piecesInStock} planchas disponibles</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="linktree-footer">
          <ShieldCheck size={18} className="gold-text" />
          <p>
            Planchas de origen brasileño certificadas con factura fiscal y corte a medida.
            Garantía de veta continua y alta pureza mineral.
          </p>
        </div>
      </div>
    </div>
  );
}
