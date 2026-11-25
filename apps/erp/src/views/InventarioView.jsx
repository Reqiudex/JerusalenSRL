import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingUp, Plus, ArrowDownToLine, Search } from 'lucide-react';
import { fmtBs, fmtNum, MuestraPiedra, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

export default function InventarioView({ sucursal, usuario, onNotificar }) {
  const [materiales, setMateriales] = useState([]);
  const [queComprar, setQueComprar] = useState([]);
  const [retazos, setRetazos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [pestana, setPestana] = useState('todos'); // 'todos' | 'comprar' | 'retazos'
  const [categoria, setCategoria] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevo, setModalNuevo] = useState(false);

  // Nuevo material
  const [nombre, setNombre] = useState('');
  const [catNueva, setCatNueva] = useState('sinterizado');
  const [costoBs, setCostoBs] = useState(700);
  const [precioM2Bs, setPrecioM2Bs] = useState(1220);
  const [stockM2, setStockM2] = useState(25.5);
  const [minimoM2, setMinimoM2] = useState(15);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await apiFetch(`/api/erp/inventario?sucursal_id=${sucursal}`);
      setMateriales(res.materiales || []);
      setQueComprar(res.queComprar || []);
      setRetazos(res.retazos || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const darEntradaRapida = async (mat, m2Add = 15.3) => {
    try {
      await apiFetch(`/api/erp/inventario/${mat.id}/entrada`, {
        method: 'POST',
        body: JSON.stringify({ cantidad: m2Add }),
      });
      onNotificar?.(`Se ingresaron +${m2Add} m² a ${mat.nombre}.`);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const crearMaterial = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/erp/inventario', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          nombre,
          categoria: catNueva,
          costo_bs: Number(costoBs),
          precio_m2_bs: Number(precioM2Bs),
          stock: Number(stockM2),
          minimo: Number(minimoM2),
        }),
      });
      onNotificar?.(`Material ${nombre} agregado al inventario.`);
      setModalNuevo(false);
      setNombre('');
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const matsFiltrados = materiales.filter(m => {
    if (categoria !== 'todas' && m.categoria !== categoria) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return m.nombre.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q) || (m.proveedor || '').toLowerCase().includes(q);
  });

  const valorTotalStockBs = materiales.reduce((s, m) => s + (m.valor_stock_bs || 0), 0);

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Control de Planchas, Insumos y Retazos por Sucursal · Importación Brasil</p>
          <h1>Inventario y Lista de Qué Comprar</h1>
        </div>
        <button type="button" className="btn primario" onClick={() => setModalNuevo(true)}>
          <Plus size={16} /> Nuevo Material / Plancha
        </button>
      </div>

      <div className="mj-cifras">
        <div className="mj-cifra oro-top">
          <span>Materiales en Catálogo Interno</span>
          <strong>{materiales.length} ítems</strong>
          <small>Valor en stock: {fmtBs(valorTotalStockBs)}</small>
        </div>
        <div className="mj-cifra alerta">
          <span>Lista de Qué Comprar</span>
          <strong>{queComprar.length} materiales</strong>
          <small>Por stock bajo o tendencia de ventas en alza</small>
        </div>
        <div className="mj-cifra">
          <span>Retazos Útiles Reutilizables</span>
          <strong>{retazos.length} piezas</strong>
          <small>{fmtNum(retazos.reduce((s, r) => s + r.area_m2, 0))} m² listos para cortar</small>
        </div>
      </div>

      {/* Pestañas */}
      <div className="barra-filtros">
        <button
          type="button"
          className={`btn ${pestana === 'todos' ? 'primario' : ''}`}
          onClick={() => setPestana('todos')}
        >
          <Package size={15} /> Planchas e Insumos ({materiales.length})
        </button>
        <button
          type="button"
          className={`btn ${pestana === 'comprar' ? 'oro' : ''}`}
          onClick={() => setPestana('comprar')}
        >
          <AlertTriangle size={15} /> Qué Tengo que Comprar ({queComprar.length})
        </button>
        <button
          type="button"
          className={`btn ${pestana === 'retazos' ? 'primario' : ''}`}
          onClick={() => setPestana('retazos')}
        >
          Retazos Reutilizables ({retazos.length})
        </button>

        {pestana === 'todos' && (
          <>
            <div className="buscador">
              <Search size={16} />
              <input
                type="search"
                placeholder="Buscar piedra, código o cantera..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}>
              <option value="todas">Todas las categorías</option>
              <option value="sinterizado">Piedra Sinterizada</option>
              <option value="marmol">Mármol</option>
              <option value="granito">Granito</option>
              <option value="cuarzo">Cuarzo</option>
              <option value="insumo">Insumos (Cola/Cemento/Pegamento)</option>
            </select>
          </>
        )}
      </div>

      {pestana === 'comprar' && (
        <section className="mj-bloque">
          <header>
            <h2>Recomendación Automática de Compra (Stock Bajo + Tendencia de Ventas)</h2>
            <span className="suave">Cálculo basado en mínimo de seguridad y ritmo de salida reciente</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Sede</th>
                  <th>Proveedor / Cantera</th>
                  <th className="derecha">Stock Actual</th>
                  <th className="derecha">Mínimo</th>
                  <th>Tendencia</th>
                  <th className="derecha">Sugerido Comprar</th>
                  <th className="derecha">Inversión Estimada</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {queComprar.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MuestraPiedra muestra={m.muestra} className="mj-muestra redondo" />
                        <div>
                          <strong>{m.nombre}</strong>
                          <div><small className="mono suave">{m.codigo} · {m.categoria}</small></div>
                        </div>
                      </div>
                    </td>
                    <td>{m.sucursal_codigo}</td>
                    <td><small>{m.proveedor}</small></td>
                    <td className="derecha rojo"><strong>{fmtNum(m.stock)} {m.unidad}</strong></td>
                    <td className="derecha">{fmtNum(m.minimo)} {m.unidad}</td>
                    <td>
                      {m.tendencia === 'en_alza' ? (
                        <span className="etiqueta tono-ambar"><TrendingUp size={12} /> Moda en Alza</span>
                      ) : (
                        <EtiquetaEstado estado={m.estado} texto="Bajo Mínimo" />
                      )}
                    </td>
                    <td className="derecha">
                      <strong>{fmtNum(m.sugerido_comprar_m2)} {m.unidad}</strong>
                      <div><small className="suave">({m.planchas_sugeridas} planchas)</small></div>
                    </td>
                    <td className="derecha"><strong>{fmtBs(m.inversion_estimada_bs)}</strong></td>
                    <td>
                      <button
                        type="button"
                        className="btn pequeno oro"
                        onClick={() => darEntradaRapida(m, m.sugerido_comprar_m2 || 15.3)}
                      >
                        <ArrowDownToLine size={13} /> Recibir Lote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pestana === 'retazos' && (
        <section className="mj-bloque">
          <header>
            <h2>Inventario de Retazos Útiles Reutilizables</h2>
            <span className="suave">Generados desde la Matriz de Corte con sus medidas exactas</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código Retazo</th>
                  <th>Material de Origen</th>
                  <th>Sucursal / Ubicación</th>
                  <th>Medidas (cm)</th>
                  <th className="derecha">Área (m²)</th>
                  <th className="derecha">Valor Estimado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {retazos.map(r => (
                  <tr key={r.id}>
                    <td className="mono"><strong>{r.codigo}</strong></td>
                    <td><strong>{r.material_nombre}</strong></td>
                    <td>{r.sucursal_nombre} · <small className="suave">{r.ubicacion}</small></td>
                    <td className="mono">{r.ancho_cm} × {r.alto_cm} cm</td>
                    <td className="derecha"><strong>{fmtNum(r.area_m2)} m²</strong></td>
                    <td className="derecha">{fmtBs(r.valor_estimado_bs)}</td>
                    <td><EtiquetaEstado estado={r.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {pestana === 'todos' && (
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Material</th>
                <th>Categoría</th>
                <th>Sede</th>
                <th className="derecha">Costo (Bs)</th>
                <th className="derecha">Precio Venta</th>
                <th className="derecha">Stock Actual</th>
                <th className="derecha">Mínimo</th>
                <th>Estado</th>
                <th>Ingreso Rápido</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 28 }}>Cargando inventario...</td></tr>
              ) : (
                matsFiltrados.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MuestraPiedra muestra={m.muestra} className="mj-muestra redondo" />
                        <div>
                          <strong>{m.nombre}</strong>
                          <div><small className="suave">{m.codigo} · {m.origen}</small></div>
                        </div>
                      </div>
                    </td>
                    <td><span className="etiqueta tono-gris">{m.categoria}</span></td>
                    <td>{m.sucursal_codigo}</td>
                    <td className="derecha">{fmtBs(m.costo_bs)}</td>
                    <td className="derecha"><strong>{fmtBs(m.precio_m2_bs)}/{m.unidad}</strong></td>
                    <td className={`derecha ${m.estado === 'bajo' ? 'rojo' : ''}`}>
                      <strong>{fmtNum(m.stock)} {m.unidad}</strong>
                      {m.familia === 'plancha' && <div><small className="suave">{m.planchas_stock} planchas</small></div>}
                    </td>
                    <td className="derecha">{fmtNum(m.minimo)} {m.unidad}</td>
                    <td><EtiquetaEstado estado={m.estado} /></td>
                    <td>
                      <button
                        type="button"
                        className="btn pequeno"
                        onClick={() => darEntradaRapida(m, 15.3)}
                      >
                        + 3 Planchas
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalNuevo && (
        <div className="capa" onClick={() => setModalNuevo(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Registrar Nuevo Material en Inventario</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalNuevo(false)}>Cerrar</button>
            </header>
            <form onSubmit={crearMaterial}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo completo">
                    <span>Nombre del Material *</span>
                    <input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Piedra Sinterizada Calacatta Oro Brasil" />
                  </label>
                  <label className="campo">
                    <span>Categoría</span>
                    <select value={catNueva} onChange={e => setCatNueva(e.target.value)}>
                      <option value="sinterizado">Piedra Sinterizada</option>
                      <option value="marmol">Mármol</option>
                      <option value="granito">Granito</option>
                      <option value="cuarzo">Cuarzo</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Costo Importación (Bs/m²)</span>
                    <input type="number" value={costoBs} onChange={e => setCostoBs(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Precio de Venta (Bs/m²)</span>
                    <input type="number" value={precioM2Bs} onChange={e => setPrecioM2Bs(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Stock Inicial (m²)</span>
                    <input type="number" step="0.1" value={stockM2} onChange={e => setStockM2(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Stock Mínimo de Alerta (m²)</span>
                    <input type="number" step="0.1" value={minimoM2} onChange={e => setMinimoM2(e.target.value)} />
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalNuevo(false)}>Cancelar</button>
                <button type="submit" className="btn primario">Guardar Material</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
