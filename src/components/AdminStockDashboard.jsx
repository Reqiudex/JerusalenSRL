import React, { useState } from 'react';
import { 
  Boxes, 
  Truck, 
  PlusCircle, 
  AlertTriangle, 
  DollarSign, 
  Globe, 
  Plus, 
  Search,
  FileSpreadsheet,
  FileDown,
  Printer
} from 'lucide-react';
import { exportToExcel, generatePurchasesReportPDF } from '../utils/exportUtils';

export default function AdminStockDashboard({ 
  products, 
  importOrders, 
  onAddStockPiece, 
  onReduceStockPiece,
  onCreateImportOrder,
  onUpdateOrderStatus,
  salesHistory = []
}) {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'imports' | 'new-import' | 'sales'
  const [stockSearch, setStockSearch] = useState('');
  
  // New Import Form state
  const [newOrder, setNewOrder] = useState({
    supplier: 'Mineração Capixaba S.A. (Vitória, Brasil)',
    cargoPort: 'Porto de Vitória (ES) -> Corumbá -> Santa Cruz',
    transportType: 'Camión Plataforma Especial Pesada',
    material: 'Mármol Blanco Calacatta Brasil Extra (20mm)',
    pieces: 20,
    unitCostUsd: 480,
    freightAndCustomsUsd: 3800,
    estimatedArrival: '2026-11-10',
    notes: 'Planchas de primera calidad para reposición de stock en Santa Cruz'
  });

  const totalPiecesInStock = products.reduce((sum, p) => sum + p.piecesInStock, 0);
  const totalStockValueUsd = products.reduce((sum, p) => sum + (p.piecesInStock * p.pricePerPieceUsd), 0);
  const lowStockCount = products.filter(p => p.piecesInStock <= p.minAlertStock).length;
  const inTransitPieces = importOrders
    .filter(o => o.status !== 'Entregado en Almacén Santa Cruz')
    .reduce((sum, o) => sum + o.pieces, 0);

  const handleCreateOrderSubmit = (e) => {
    e.preventDefault();
    if (!newOrder.material || newOrder.pieces <= 0) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    const orderObj = {
      id: `IMP-BR-${Math.floor(1000 + Math.random() * 9000)}`,
      country: 'Brasil',
      supplier: newOrder.supplier,
      cargoPort: newOrder.cargoPort,
      transportType: newOrder.transportType,
      material: newOrder.material,
      pieces: parseInt(newOrder.pieces, 10),
      totalAreaM2: (parseInt(newOrder.pieces, 10) * 5.5).toFixed(1),
      unitCostUsd: parseFloat(newOrder.unitCostUsd),
      totalFOBUsd: parseInt(newOrder.pieces, 10) * parseFloat(newOrder.unitCostUsd),
      freightAndCustomsUsd: parseFloat(newOrder.freightAndCustomsUsd),
      totalLandedUsd: (parseInt(newOrder.pieces, 10) * parseFloat(newOrder.unitCostUsd)) + parseFloat(newOrder.freightAndCustomsUsd),
      departureDate: new Date().toISOString().split('T')[0],
      estimatedArrival: newOrder.estimatedArrival,
      status: 'En Preparación Cantera Brasil',
      progress: 15,
      trackingCode: `BR-SCZ-${Math.floor(100000 + Math.random() * 900000)}`,
      notes: newOrder.notes
    };

    onCreateImportOrder(orderObj);
    alert('¡Orden de Importación desde Brasil creada con éxito!');
    setActiveTab('imports');
  };

  return (
    <div className="admin-container">
      {/* Header with KPI cards and EXCEL / PDF export buttons */}
      <div className="admin-header glass-panel-gold">
        <div className="admin-header-main">
          <div>
            <span className="admin-badge">Panel de Administración de Compras e Importaciones</span>
            <h1 className="admin-title">Control de Stock por Pieza & Logística Brasil</h1>
            <p className="admin-sub">
              Seguimiento de fletes internacionales de mármol, trámites de aduana en Corumbá y stock físico en Santa Cruz.
            </p>
          </div>

          {/* Export Buttons */}
          <div className="admin-export-actions">
            <button 
              className="btn-export-excel" 
              onClick={() => exportToExcel(products, importOrders)}
              title="Descargar base de datos en formato Excel (.xlsx)"
            >
              <FileSpreadsheet size={18} />
              <span>Exportar a Excel (.xlsx)</span>
            </button>
            <button 
              className="btn-export-pdf" 
              onClick={() => generatePurchasesReportPDF(products, importOrders)}
              title="Generar informe oficial para gerencia en PDF"
            >
              <FileDown size={18} />
              <span>Reporte de Compras PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap gold">
            <Boxes size={24} />
          </div>
          <div>
            <span className="kpi-label">Planchas en Almacén SCZ</span>
            <h2 className="kpi-value">{totalPiecesInStock} <small>piezas</small></h2>
            <span className="kpi-footnote">Disponibles para entrega inmediata</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap blue">
            <Truck size={24} />
          </div>
          <div>
            <span className="kpi-label">Piezas en Tránsito desde Brasil</span>
            <h2 className="kpi-value">{inTransitPieces} <small>planchas</small></h2>
            <span className="kpi-footnote">En aduana o carretera internacional</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className="kpi-icon-wrap green">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="kpi-label">Valorización de Stock (Venta)</span>
            <h2 className="kpi-value">${totalStockValueUsd.toLocaleString()} <small>USD</small></h2>
            <span className="kpi-footnote">Equivalente a Bs. {(totalStockValueUsd * 6.96).toLocaleString()}</span>
          </div>
        </div>

        <div className="kpi-card glass-panel">
          <div className={`kpi-icon-wrap ${lowStockCount > 0 ? 'red' : 'green'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="kpi-label">Alertas de Stock Mínimo</span>
            <h2 className="kpi-value">{lowStockCount} <small>modelos</small></h2>
            <span className="kpi-footnote">Requieren nueva orden de compra</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          <Boxes size={18} /> Inventario Físico por Pieza ({products.length})
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'imports' ? 'active' : ''}`}
          onClick={() => setActiveTab('imports')}
        >
          <Globe size={18} /> Órdenes de Importación Brasil ({importOrders.length})
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'new-import' ? 'active' : ''}`}
          onClick={() => setActiveTab('new-import')}
        >
          <PlusCircle size={18} /> Crear Pedido a Cantera de Brasil
        </button>
        <button 
          className={`admin-tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          <Printer size={18} /> Historial de Ventas POS ({salesHistory.length})
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Inventario Detallado de Planchas de Mármol</h3>
              <p>Control exacto por unidad/pieza con aviso automático de reposición.</p>
            </div>
            <div className="search-box-sm">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Filtrar por código o nombre..." 
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cód / Muestra</th>
                  <th>Material & Acabado</th>
                  <th>Origen (Brasil)</th>
                  <th>Dimensiones / Espesor</th>
                  <th>Costo FOB</th>
                  <th>PVP Pieza</th>
                  <th>Stock Piezas</th>
                  <th>Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(p => p.name.toLowerCase().includes(stockSearch.toLowerCase()) || p.id.toLowerCase().includes(stockSearch.toLowerCase()))
                  .map((item) => {
                    const isLow = item.piecesInStock <= item.minAlertStock;
                    return (
                      <tr key={item.id} className={isLow ? 'row-alert' : ''}>
                        <td>
                          <div className="table-item-cell">
                            <img src={item.image} alt={item.name} className="table-thumb" />
                            <span className="code-pill">{item.id}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{item.name}</strong>
                          <div className="sub-text">{item.category} • {item.finish}</div>
                        </td>
                        <td>
                          <span className="origin-tag">🇧🇷 {item.origin}</span>
                        </td>
                        <td>
                          <div>{item.dimensions}</div>
                          <div className="sub-text">{item.thickness}</div>
                        </td>
                        <td>
                          <div className="cost-tag">${item.costPerPieceUsd} USD</div>
                        </td>
                        <td>
                          <strong className="pvp-tag">${item.pricePerPieceUsd} USD</strong>
                          <div className="sub-text">Bs. {item.pricePerPieceBs}</div>
                        </td>
                        <td>
                          <div className="stock-counter-badge">
                            <span className={`stock-status-pill ${isLow ? 'pill-low' : 'pill-ok'}`}>
                              {item.piecesInStock} unid.
                            </span>
                            {isLow && <span className="low-stock-warning">¡Mínimo {item.minAlertStock}!</span>}
                          </div>
                        </td>
                        <td>
                          <div className="table-actions-row">
                            <button 
                              className="btn-counter-add"
                              title="Ingresar plancha al stock"
                              onClick={() => onAddStockPiece(item.id)}
                            >
                              +1 Plancha
                            </button>
                            <button 
                              className="btn-counter-sub"
                              title="Salida por venta o corte"
                              onClick={() => onReduceStockPiece(item.id)}
                              disabled={item.piecesInStock <= 0}
                            >
                              -1 Plancha
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: IMPORT ORDERS FROM BRAZIL */}
      {activeTab === 'imports' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Importaciones en Tránsito & Aduana (Brasil → Bolivia)</h3>
              <p>Seguimiento de despachos desde canteras en Vitória, Minas Gerais y Paraná.</p>
            </div>
            <button className="btn-gold-action" onClick={() => setActiveTab('new-import')}>
              <Plus size={16} /> Nueva Importación
            </button>
          </div>

          <div className="imports-list">
            {importOrders.map((order) => (
              <div key={order.id} className="import-order-card glass-panel-gold">
                <div className="order-top">
                  <div className="order-id-block">
                    <span className="order-id">{order.id}</span>
                    <span className="tracking-pill">Rastreo: {order.trackingCode}</span>
                  </div>
                  <div className={`status-pill status-${order.progress === 100 ? 'done' : order.progress > 50 ? 'customs' : 'transit'}`}>
                    {order.status}
                  </div>
                </div>

                <div className="order-grid-details">
                  <div className="detail-col">
                    <span className="detail-lbl">Proveedor Brasileño</span>
                    <strong>{order.supplier}</strong>
                    <span className="detail-sub">{order.cargoPort}</span>
                  </div>
                  <div className="detail-col">
                    <span className="detail-lbl">Cargamento / Material</span>
                    <strong>{order.material}</strong>
                    <span className="detail-sub">{order.pieces} planchas enteras (~{order.totalAreaM2} m²)</span>
                  </div>
                  <div className="detail-col">
                    <span className="detail-lbl">Costos de Importación</span>
                    <strong>FOB: ${order.totalFOBUsd.toLocaleString()} USD</strong>
                    <span className="detail-sub">+ Flete/Aduana: ${order.freightAndCustomsUsd.toLocaleString()} USD</span>
                    <span className="detail-total">Total Puesto Almacén: ${order.totalLandedUsd.toLocaleString()} USD</span>
                  </div>
                  <div className="detail-col">
                    <span className="detail-lbl">Fechas y Logística</span>
                    <div>Despacho: {order.departureDate}</div>
                    <div className="gold-text">Llegada Est.: {order.estimatedArrival}</div>
                    <div className="detail-sub">{order.transportType}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="order-progress-wrap">
                  <div className="progress-labels">
                    <span>Salida Cantera Brasil</span>
                    <span>Aduana Corumbá / Pto Quijarro</span>
                    <span>Almacén Santa Cruz (Disponible)</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar-fill" style={{ width: `${order.progress}%` }}></div>
                  </div>
                </div>

                <div className="order-footer-notes">
                  <span className="note-text"><strong>Observación:</strong> {order.notes}</span>
                  {order.progress < 100 && (
                    <button 
                      className="btn-advance-status"
                      onClick={() => onUpdateOrderStatus(order.id)}
                    >
                      Avanzar Estado Logístico
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: NEW IMPORT FORM */}
      {activeTab === 'new-import' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Registrar Nueva Orden de Importación desde Brasil</h3>
              <p>Genera el cálculo automático de costo FOB, flete terrestre/marítimo y aranceles de importación.</p>
            </div>
          </div>

          <form onSubmit={handleCreateOrderSubmit} className="import-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Cantera / Proveedor en Brasil *</label>
                <select 
                  value={newOrder.supplier} 
                  onChange={(e) => setNewOrder({ ...newOrder, supplier: e.target.value })}
                >
                  <option value="Mineração Capixaba S.A. (Vitória, Espírito Santo)">Mineração Capixaba S.A. (Vitória, Espírito Santo)</option>
                  <option value="Granitos do Brasil Export Ltda (Minas Gerais)">Granitos do Brasil Export Ltda (Minas Gerais)</option>
                  <option value="Sinterizados Paraná Tech (Curitiba)">Sinterizados Paraná Tech (Curitiba)</option>
                  <option value="Quartzo do Sul Brasil (Cachoeiro de Itapemirim)">Quartzo do Sul Brasil (Cachoeiro)</option>
                  <option value="Pedras Raras da Bahia (Salvador)">Pedras Raras da Bahia (Salvador)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ruta de Tránsito & Frontera *</label>
                <input 
                  type="text" 
                  value={newOrder.cargoPort}
                  onChange={(e) => setNewOrder({ ...newOrder, cargoPort: e.target.value })}
                  placeholder="Ej: Vitória -> Corumbá -> Santa Cruz de la Sierra"
                />
              </div>

              <div className="form-group">
                <label>Tipo de Transporte Especializado</label>
                <select 
                  value={newOrder.transportType} 
                  onChange={(e) => setNewOrder({ ...newOrder, transportType: e.target.value })}
                >
                  <option value="Camión Plataforma Especial Pesada">Camión Plataforma Especial Pesada con Caballete</option>
                  <option value="Contenedor Open Top 20ft Marítimo + Carretero">Contenedor Open Top 20ft Marítimo + Carretero</option>
                  <option value="Camión Suspensión Neumática para Piedra Sinterizada">Camión Suspensión Neumática para Piedra Sinterizada</option>
                </select>
              </div>

              <div className="form-group">
                <label>Material / Plancha Seleccionada *</label>
                <select 
                  value={newOrder.material}
                  onChange={(e) => setNewOrder({ ...newOrder, material: e.target.value })}
                >
                  {products.map(p => (
                    <option key={p.id} value={`${p.name} (${p.thickness})`}>
                      {p.name} ({p.thickness})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Cantidad de Planchas (Piezas) *</label>
                <input 
                  type="number" 
                  min="1" 
                  value={newOrder.pieces}
                  onChange={(e) => setNewOrder({ ...newOrder, pieces: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Costo Unitario FOB Brasil ($ USD / pieza) *</label>
                <input 
                  type="number" 
                  min="10" 
                  value={newOrder.unitCostUsd}
                  onChange={(e) => setNewOrder({ ...newOrder, unitCostUsd: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Flete Internacional + Gastos Aduana Corumbá ($ USD)</label>
                <input 
                  type="number" 
                  value={newOrder.freightAndCustomsUsd}
                  onChange={(e) => setNewOrder({ ...newOrder, freightAndCustomsUsd: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Fecha Estimada de Llegada a Santa Cruz</label>
                <input 
                  type="date" 
                  value={newOrder.estimatedArrival}
                  onChange={(e) => setNewOrder({ ...newOrder, estimatedArrival: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Notas de Inspección o Embalaje</label>
              <textarea 
                rows="3"
                value={newOrder.notes}
                onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                placeholder="Detalles sobre caballetes de madera tratada, seguros de rotura en ruta..."
              />
            </div>

            {/* Live calculation banner */}
            <div className="cost-calculation-banner glass-panel-gold">
              <div>
                <span className="calc-title">Resumen de Inversión de Importación</span>
                <p>Costo FOB: ${(newOrder.pieces * newOrder.unitCostUsd).toLocaleString()} USD | Flete/Aduana: ${parseFloat(newOrder.freightAndCustomsUsd || 0).toLocaleString()} USD</p>
              </div>
              <div className="calc-grand-total">
                <small>Costo Total Puesto en Almacén:</small>
                <strong>${((newOrder.pieces * newOrder.unitCostUsd) + parseFloat(newOrder.freightAndCustomsUsd || 0)).toLocaleString()} USD</strong>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-gold-action large">
                <PlusCircle size={20} /> Emitir Orden de Compra Internacional
              </button>
              <button type="button" className="btn-cancel" onClick={() => setActiveTab('imports')}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: SALES HISTORY ATTRIBUTED TO CASHIERS */}
      {activeTab === 'sales' && (
        <div className="tab-pane glass-panel">
          <div className="pane-header-row">
            <div>
              <h3>Historial de Ventas Atribuidas por Cajero</h3>
              <p>Registro de transacciones generadas en el módulo POS.</p>
            </div>
          </div>

          {salesHistory.length === 0 ? (
            <div className="empty-state-notice">
              <p>Aún no se han emitido ventas en esta sesión. Realice una venta en la pestaña "Caja POS" para verla registrada aquí.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>N° Factura</th>
                    <th>Fecha y Hora</th>
                    <th>Cajero / Operador</th>
                    <th>Cliente</th>
                    <th>Planchas Vendidas</th>
                    <th>Total USD</th>
                    <th>Total Bs</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map((s, idx) => (
                    <tr key={idx}>
                      <td><span className="code-pill">{s.invoiceNumber}</span></td>
                      <td>{s.dateTime}</td>
                      <td><strong>{s.cashierName}</strong></td>
                      <td>{s.clientName} (NIT: {s.clientNit})</td>
                      <td>{s.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}</td>
                      <td><strong className="pvp-tag">${s.totalUsd?.toLocaleString()} USD</strong></td>
                      <td><span className="cost-tag">Bs. {s.totalBs?.toLocaleString()}</span></td>
                      <td><span className="origin-tag">{s.paymentMethod}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
