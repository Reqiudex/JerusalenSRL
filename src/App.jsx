import React, { useState } from 'react';
import MarbleBackground from './components/MarbleBackground';
import LandingPage from './components/LandingPage';
import StoreCatalog from './components/StoreCatalog';
import PosCashier from './components/PosCashier';
import AdminStockDashboard from './components/AdminStockDashboard';
import LinktreeSection from './components/LinktreeSection';
import CattleManagement from './components/CattleManagement';
import { INITIAL_PRODUCTS, INITIAL_IMPORT_ORDERS, COMPANY_CONTACTS } from './data';
import { INITIAL_CATTLE_DATA } from './dataCattle';
import logoImg from './assets/jerusalen-logo.png';
import { 
  Building2, 
  Store, 
  LayoutDashboard, 
  Share2, 
  MessageCircle, 
  Moon, 
  Sun, 
  ShieldCheck, 
  Phone,
  Sparkles,
  MapPin,
  Clock,
  Home,
  CreditCard,
  Zap,
  GitBranch
} from 'lucide-react';
import './App.css';

function App() {
  const [viewMode, setViewMode] = useState('landing'); // 'landing' | 'store' | 'pos' | 'admin' | 'linktree' | 'cattle'
  const [marbleMode, setMarbleMode] = useState('auto'); // 'auto' | 'light' | 'dark'
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cattleList, setCattleList] = useState(INITIAL_CATTLE_DATA);
  const [importOrders, setImportOrders] = useState(INITIAL_IMPORT_ORDERS);
  const [salesHistory, setSalesHistory] = useState([
    {
      invoiceNumber: 'FAC-2026-081',
      dateTime: '2026-10-18 16:30',
      cashierId: 'CAJ-01',
      cashierName: 'Carlos Roca - Cajero SCZ',
      terminal: 'Caja 1 (Showroom 4to Anillo)',
      clientName: 'Constructora Urubó Gold S.A.',
      clientNit: '491029102',
      paymentMethod: 'Transferencia',
      items: [{ name: 'Mármol Blanco Calacatta Brasil Extra', quantity: 2, priceUsd: 1150, priceBs: 7990 }],
      totalUsd: 2300,
      totalBs: 15980
    }
  ]);

  // Stock operations
  const handleAddStockPiece = (productId) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, piecesInStock: p.piecesInStock + 1 };
      }
      return p;
    }));
  };

  const handleReduceStockPiece = (productId) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId && p.piecesInStock > 0) {
        return { ...p, piecesInStock: p.piecesInStock - 1 };
      }
      return p;
    }));
  };

  // Complete POS Sale
  const handleCompleteSale = (saleData) => {
    // 1. Deduct stock for all items sold
    saleData.items.forEach(cartItem => {
      setProducts(prev => prev.map(p => {
        if (p.id === cartItem.id) {
          return { ...p, piecesInStock: Math.max(0, p.piecesInStock - cartItem.quantity) };
        }
        return p;
      }));
    });

    // 2. Add to sales history
    setSalesHistory(prev => [saleData, ...prev]);
  };

  // Import operations
  const handleCreateImportOrder = (newOrder) => {
    setImportOrders(prev => [newOrder, ...prev]);
  };

  const handleUpdateOrderStatus = (orderId) => {
    setImportOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        if (o.progress < 50) {
          return { 
            ...o, 
            status: 'En Tránsito Internacional (Aduana Corumbá / Pto Quijarro)', 
            progress: 75 
          };
        } else if (o.progress < 100) {
          // Add imported pieces to stock automatically
          const targetProduct = products.find(p => o.material.includes(p.name));
          if (targetProduct) {
            handleAddStockPiece(targetProduct.id);
          }
          return { 
            ...o, 
            status: 'Entregado en Almacén Santa Cruz', 
            progress: 100,
            notes: 'Recibido y verificado en almacén del 4to anillo. Stock actualizado automáticamente.'
          };
        }
      }
      return o;
    }));
  };

  // Cattle handlers
  const handleAddAnimal = (newAnimal) => {
    setCattleList(prev => [newAnimal, ...prev]);
  };

  const handleUpdateAnimal = (id, updatedAnimal) => {
    setCattleList(prev => prev.map(a => a.id === id ? updatedAnimal : a));
  };

  const toggleMarbleMode = () => {
    if (marbleMode === 'auto') setMarbleMode('dark');
    else if (marbleMode === 'dark') setMarbleMode('light');
    else setMarbleMode('auto');
  };

  return (
    <div className="app-root">
      {/* High Performance Animated Marble Canvas */}
      <MarbleBackground mode={marbleMode} />

      {/* Main Top Navigation Header */}
      <header className="main-nav-header glass-panel">
        <div className="header-brand" onClick={() => setViewMode('landing')} style={{ cursor: 'pointer' }}>
          <img src={logoImg} alt="Jerusalén S.R.L." className="brand-logo-img" />
          <div className="brand-texts">
            <span className="brand-title">JERUSALÉN S.R.L.</span>
            <span className="brand-subtitle">STONE TECH CENTER & AGROGANADERA 🇧🇴 🇧🇷</span>
          </div>
        </div>

        {/* View Switcher Tabs with Swipe Hint Banner */}
        <div className="nav-tabs-container">
          {showSwipeHint && (
            <div className="nav-swipe-hint-banner" onClick={() => setShowSwipeHint(false)}>
              <span className="swipe-hand-icon">👈👉</span>
              <span>Desliza para ver más pestañas</span>
              <button className="swipe-close-btn" title="Entendido">✕</button>
            </div>
          )}
          <nav className={`nav-tabs ${showSwipeHint ? 'nav-tabs-hinting' : ''}`}>
            <button 
              className={`nav-btn ${viewMode === 'landing' ? 'active' : ''}`}
              onClick={() => { setViewMode('landing'); setShowSwipeHint(false); }}
            >
              <Home size={17} />
              <span>Inicio</span>
            </button>

            <button 
              className={`nav-btn ${viewMode === 'store' ? 'active' : ''}`}
              onClick={() => { setViewMode('store'); setShowSwipeHint(false); }}
            >
              <Store size={17} />
              <span>Tienda en Línea</span>
            </button>

            <button 
              className={`nav-btn ${viewMode === 'pos' ? 'active' : ''}`}
              onClick={() => { setViewMode('pos'); setShowSwipeHint(false); }}
            >
              <CreditCard size={17} />
              <span>Cajero POS (Ventas)</span>
            </button>

            <button 
              className={`nav-btn ${viewMode === 'admin' ? 'active' : ''}`}
              onClick={() => { setViewMode('admin'); setShowSwipeHint(false); }}
            >
              <LayoutDashboard size={17} />
              <span>Admin Stock & Compras</span>
            </button>

            <button 
              className={`nav-btn ${viewMode === 'cattle' ? 'active' : ''}`}
              onClick={() => { setViewMode('cattle'); setShowSwipeHint(false); }}
            >
              <GitBranch size={17} />
              <span>Gestión Ganadera & Pedigrí</span>
            </button>

            <button 
              className={`nav-btn ${viewMode === 'linktree' ? 'active' : ''}`}
              onClick={() => { setViewMode('linktree'); setShowSwipeHint(false); }}
            >
              <Share2 size={17} />
              <span>Linktree</span>
            </button>
          </nav>
        </div>

        {/* Quick Utilities */}
        <div className="header-actions">
          <button 
            className="theme-mode-btn" 
            onClick={toggleMarbleMode} 
            title={`Modo mármol: ${marbleMode === 'auto' ? 'Automático' : marbleMode}`}
          >
            {marbleMode === 'auto' ? (
              <Sparkles size={15} className="gold-text" />
            ) : marbleMode === 'dark' ? (
              <Moon size={15} />
            ) : (
              <Sun size={15} />
            )}
            <span className="mode-label">
              {marbleMode === 'auto' ? 'Auto Mármol' : marbleMode === 'dark' ? 'Noir' : 'Calacatta'}
            </span>
          </button>

          <a 
            href={`https://wa.me/59170314442?text=${encodeURIComponent('Buenas tardes quiero hacer una consulta')}`}
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-header-whatsapp"
          >
            <MessageCircle size={15} />
            <span className="wp-number">+591 70314442</span>
          </a>
        </div>
      </header>

      {/* Main View Area */}
      <main className="main-viewport">
        {viewMode === 'landing' && (
          <LandingPage 
            onExploreCatalog={() => setViewMode('store')}
            onOpenLinktree={() => setViewMode('linktree')}
          />
        )}

        {viewMode === 'store' && (
          <StoreCatalog 
            products={products} 
            onSelectProduct={() => {}} 
            onReservePiece={handleReduceStockPiece} 
          />
        )}

        {viewMode === 'pos' && (
          <PosCashier 
            products={products}
            onCompleteSale={handleCompleteSale}
          />
        )}

        {viewMode === 'admin' && (
          <AdminStockDashboard 
            products={products}
            importOrders={importOrders}
            salesHistory={salesHistory}
            onAddStockPiece={handleAddStockPiece}
            onReduceStockPiece={handleReduceStockPiece}
            onCreateImportOrder={handleCreateImportOrder}
            onUpdateOrderStatus={handleUpdateOrderStatus}
          />
        )}

        {viewMode === 'cattle' && (
          <CattleManagement 
            cattleList={cattleList}
            onAddAnimal={handleAddAnimal}
            onUpdateAnimal={handleUpdateAnimal}
          />
        )}

        {viewMode === 'linktree' && (
          <LinktreeSection 
            onSelectProduct={() => setViewMode('store')} 
          />
        )}
      </main>

      {/* Persistent Bottom Floating Quick WhatsApp Contact Bar */}
      <footer className="global-footer glass-panel">
        <div className="footer-left">
          <MapPin size={16} className="gold-text" />
          <span><strong>Showroom:</strong> 4to anillo y Av. Piraí | <strong>Almacén:</strong> 4to anillo entre Av. Roca Coronado y Centenario</span>
        </div>
        <div className="footer-right">
          <Clock size={16} className="gold-text" />
          <span>Atención: Lun-Vie 08:00-12:00 / 14:00-18:00 | Sáb 08:00-13:00</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
