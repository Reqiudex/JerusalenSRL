import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  ShoppingCart, 
  Printer, 
  Trash2, 
  Search, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Zap, 
  CheckCircle2, 
  Plus, 
  Minus,
  Sparkles,
  Layers,
  FileText,
  Phone
} from 'lucide-react';
import { generateInvoicePDF } from '../utils/exportUtils';

export default function PosCashier({ products, onCompleteSale }) {
  // Cashier identification
  const cashiers = [
    { id: 'CAJ-01', name: 'Carlos Roca - Cajero SCZ', terminal: 'Caja 1 (Showroom 4to Anillo)' },
    { id: 'CAJ-02', name: 'Mariela Vaca - Cajero Almacén', terminal: 'Caja 2 (Almacén Central)' },
    { id: 'CAJ-03', name: 'Roberto Justiniano - Asesor Ventas', terminal: 'Caja 3 (Ventas Obra)' }
  ];

  const [selectedCashier, setSelectedCashier] = useState(cashiers[0]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Efectivo'); // 'Efectivo' | 'QR Simple' | 'Tarjeta' | 'Transferencia'
  
  // Client details
  const [clientName, setClientName] = useState('Cliente Particular');
  const [clientNit, setClientNit] = useState('0');
  const [clientPhone, setClientPhone] = useState('70314442');
  
  // Invoice state modal
  const [lastInvoice, setLastInvoice] = useState(null);

  const searchInputRef = useRef(null);

  // Keyboard Shortcuts (F2: focus search, F4: Cash payment, F8: QR payment, F9 / Enter: Finalize sale)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMethod('Efectivo');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setPaymentMethod('QR Simple');
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleFinishSale();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, selectedCashier, clientName, clientNit, clientPhone, paymentMethod]);

  const addToCart = (product) => {
    if (product.piecesInStock <= 0) {
      alert('Esta plancha no cuenta con stock disponible en almacén.');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.piecesInStock) {
          alert(`No hay más de ${product.piecesInStock} planchas físicas en almacén.`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        dimensions: product.dimensions,
        thickness: product.thickness,
        priceUsd: product.pricePerPieceUsd,
        priceBs: product.pricePerPieceBs,
        quantity: 1,
        maxStock: product.piecesInStock
      }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const nextQty = item.quantity + delta;
        if (nextQty <= 0) return null;
        if (nextQty > item.maxStock) {
          alert(`Solo hay ${item.maxStock} planchas disponibles.`);
          return item;
        }
        return { ...item, quantity: nextQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  const totalUsd = cart.reduce((sum, item) => sum + (item.priceUsd * item.quantity), 0);
  const totalBs = cart.reduce((sum, item) => sum + (item.priceBs * item.quantity), 0);

  const handleFinishSale = () => {
    if (cart.length === 0) {
      alert('Agregue al menos una plancha al carrito para cobrar.');
      return;
    }

    const invoiceNumber = `FAC-${Math.floor(10000 + Math.random() * 90000)}`;
    const saleData = {
      invoiceNumber,
      dateTime: new Date().toLocaleString(),
      cashierId: selectedCashier.id,
      cashierName: selectedCashier.name,
      terminal: selectedCashier.terminal,
      clientName: clientName || 'Sin Nombre',
      clientNit: clientNit || '0',
      clientPhone: clientPhone || '70314442',
      paymentMethod,
      items: cart,
      totalUsd,
      totalBs
    };

    // Deduct stock in parent component
    onCompleteSale(saleData);

    // Prompt PDF download
    generateInvoicePDF(saleData);

    setLastInvoice(saleData);
    setCart([]);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pos-container">
      {/* Top POS Status Bar & Cashier Switcher */}
      <div className="pos-top-bar glass-panel-gold">
        <div className="pos-cashier-block">
          <div className="cashier-avatar">
            <UserCheck size={20} className="gold-text" />
          </div>
          <div>
            <span className="pos-lbl">Cajero en Turno (Atribución de Ventas):</span>
            <select 
              value={selectedCashier.id}
              onChange={(e) => {
                const found = cashiers.find(c => c.id === e.target.value);
                if (found) setSelectedCashier(found);
              }}
              className="pos-cashier-select"
            >
              {cashiers.map(c => (
                <option key={c.id} value={c.id}>{c.name} — [{c.terminal}]</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shortcuts Ribbon */}
        <div className="shortcuts-ribbon">
          <span className="key-tag"><kbd>F2</kbd> Buscar</span>
          <span className="key-tag"><kbd>F4</kbd> Efectivo</span>
          <span className="key-tag"><kbd>F8</kbd> QR</span>
          <span className="key-tag enter"><kbd>F9 / Click</kbd> Cobrar e Imprimir PDF</span>
        </div>
      </div>

      <div className="pos-layout">
        {/* LEFT COLUMN: PRODUCT SELECTION GRID */}
        <div className="pos-products-col glass-panel">
          <div className="pos-search-row">
            <Search size={18} className="search-icon" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Buscar plancha rápida por código, mármol o cuarzo (F2)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pos-search-input"
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <div className="pos-quick-grid">
            {filteredProducts.map(p => (
              <div 
                key={p.id} 
                className={`pos-product-tile ${p.piecesInStock <= 0 ? 'disabled' : ''}`}
                onClick={() => addToCart(p)}
              >
                <div className="tile-thumb-wrap">
                  <img src={p.image} alt={p.name} />
                  <span className="tile-stock-chip">{p.piecesInStock} pzas</span>
                </div>
                <div className="tile-info">
                  <span className="tile-code">{p.id}</span>
                  <strong className="tile-name">{p.name}</strong>
                  <div className="tile-dims">{p.dimensions}</div>
                  <div className="tile-prices">
                    <span className="tile-usd">${p.pricePerPieceUsd} USD</span>
                    <span className="tile-bs">Bs. {p.pricePerPieceBs}</span>
                  </div>
                </div>
                <button className="btn-add-tile" title="Agregar plancha a la factura">
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CART & BILLING */}
        <div className="pos-cart-col glass-panel-gold">
          <div className="cart-header">
            <div className="cart-title-row">
              <ShoppingCart size={20} className="gold-text" />
              <h3>Boleta de Venta / Facturación</h3>
            </div>
            {cart.length > 0 && (
              <button className="btn-clear-cart" onClick={clearCart} title="Vaciar Carrito">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Client inputs for Invoice */}
          <div className="client-fields-grid">
            <div>
              <label>Razón Social / Nombre:</label>
              <input 
                type="text" 
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)} 
                placeholder="Nombre del cliente"
              />
            </div>
            <div>
              <label>NIT / Carnet:</label>
              <input 
                type="text" 
                value={clientNit} 
                onChange={(e) => setClientNit(e.target.value)} 
                placeholder="NIT o C.I."
              />
            </div>
            <div>
              <label>Teléfono (WhatsApp):</label>
              <input 
                type="text" 
                value={clientPhone} 
                onChange={(e) => setClientPhone(e.target.value)} 
                placeholder="+591 70314442"
              />
            </div>
          </div>

          {/* Cart items list */}
          <div className="cart-items-scroll">
            {cart.length === 0 ? (
              <div className="empty-cart-state">
                <Layers size={36} className="gold-text" />
                <p>No hay planchas seleccionadas.</p>
                <small>Haga click sobre cualquier mármol a la izquierda o use <kbd>F2</kbd> para buscar.</small>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="cart-item-row">
                  <div className="cart-item-main">
                    <strong>{item.name}</strong>
                    <div className="cart-item-sub">
                      Dim: {item.dimensions} | {item.thickness}
                    </div>
                    <div className="cart-item-unit-price">
                      ${item.priceUsd} USD / pza (Bs. {item.priceBs})
                    </div>
                  </div>

                  <div className="cart-qty-controls">
                    <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                    <span className="qty-number">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                  </div>

                  <div className="cart-item-total">
                    <span className="usd-total">${(item.quantity * item.priceUsd).toLocaleString()} USD</span>
                    <span className="bs-total">Bs. {(item.quantity * item.priceBs).toLocaleString()}</span>
                  </div>

                  <button className="btn-remove-item" onClick={() => removeFromCart(item.id)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="payment-methods-selector">
            <span className="section-title">Forma de Pago:</span>
            <div className="methods-buttons">
              {['Efectivo', 'QR Simple', 'Tarjeta', 'Transferencia'].map(method => (
                <button
                  key={method}
                  className={`method-btn ${paymentMethod === method ? 'active' : ''}`}
                  onClick={() => setPaymentMethod(method)}
                >
                  {method === 'Efectivo' && <DollarSign size={14} />}
                  {method === 'QR Simple' && <QrCode size={14} />}
                  {method === 'Tarjeta' && <CreditCard size={14} />}
                  {method === 'Transferencia' && <Zap size={14} />}
                  <span>{method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grand Totals */}
          <div className="cart-totals-banner">
            <div className="totals-line">
              <span>Total USD:</span>
              <strong className="grand-usd">${totalUsd.toLocaleString()} USD</strong>
            </div>
            <div className="totals-line">
              <span>Total Bolivianos:</span>
              <strong className="grand-bs">Bs. {totalBs.toLocaleString()}</strong>
            </div>
          </div>

          {/* Finalize Button */}
          <button 
            className="btn-finalize-sale"
            onClick={handleFinishSale}
            disabled={cart.length === 0}
          >
            <Printer size={20} />
            <span>Emitir Venta & Descargar Factura PDF (F9)</span>
          </button>
        </div>
      </div>

      {/* Success Notification Modal */}
      {lastInvoice && (
        <div className="modal-backdrop" onClick={() => setLastInvoice(null)}>
          <div className="modal-card glass-panel-gold" onClick={(e) => e.stopPropagation()}>
            <CheckCircle2 size={48} className="gold-text" />
            <h3 style={{ margin: '0.8rem 0 0.3rem' }}>¡Venta Completada con Éxito!</h3>
            <p style={{ color: '#555', fontSize: '0.9rem' }}>
              Factura <strong>{lastInvoice.invoiceNumber}</strong> generada y atribuida al cajero <strong>{lastInvoice.cashierName}</strong>.
            </p>
            <div className="modal-product-summary">
              <strong>Total Cobrado: ${lastInvoice.totalUsd.toLocaleString()} USD (Bs. {lastInvoice.totalBs.toLocaleString()})</strong>
              <p>Método de Pago: {lastInvoice.paymentMethod} | Cliente: {lastInvoice.clientName}</p>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-wp-confirm" 
                onClick={() => generateInvoicePDF(lastInvoice)}
              >
                <Printer size={18} /> Re-descargar Factura PDF
              </button>
              <button className="btn-close-modal" onClick={() => setLastInvoice(null)}>
                Continuar con Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
