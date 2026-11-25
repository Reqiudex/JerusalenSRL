import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Scissors, Save, RotateCcw, Trash2, Layers } from 'lucide-react';
import { fmtBs, fmtNum } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

const COLORES_TIPO = {
  usada: { fill: 'rgba(47, 125, 91, 0.72)', stroke: '#166534', label: 'Pieza Vendida / Usada' },
  retazo: { fill: 'rgba(201, 168, 106, 0.78)', stroke: '#8a5a00', label: 'Parte Útil (Retazo Reutilizable)' },
  merma: { fill: 'rgba(166, 61, 47, 0.75)', stroke: '#9f1c1c', label: 'Desperdicio / Merma' },
};

export default function MatrizCorteView({ sucursal, usuario, onNotificar }) {
  const [cortes, setCortes] = useState([]);
  const [retazos, setRetazos] = useState([]);
  const [materiales, setMateriales] = useState([]);

  // Dimensiones de plancha editable (por defecto 300 x 170 cuadros = 3.00m x 1.70m, 1 cuadro = 1 cm)
  const [anchoCm, setAnchoCm] = useState(300);
  const [altoCm, setAltoCm] = useState(170);
  const [materialId, setMaterialId] = useState('');
  const [materialNombre, setMaterialNombre] = useState('Mármol Blanco Calacatta Gold Brasil');
  const [costoM2Bs, setCostoM2Bs] = useState(650);
  const [retazoOrigenId, setRetazoOrigenId] = useState(null);
  const [tipoPincel, setTipoPincel] = useState('usada'); // 'usada' | 'retazo' | 'merma'
  const [etiquetaActual, setEtiquetaActual] = useState('');
  const [clienteActual, setClienteActual] = useState('Constructora Urubó Golf');

  const [rectangulos, setRectangulos] = useState([
    { id: 'R-1', x: 0, y: 0, w: 200, h: 90, tipo: 'usada', etiqueta: 'Mesón Isla 200×90cm', cliente: 'Urubó Golf' },
    { id: 'R-2', x: 0, y: 90, w: 200, h: 80, tipo: 'usada', etiqueta: 'Encimera Cocina 200×80cm', cliente: 'Urubó Golf' },
    { id: 'R-3', x: 200, y: 0, w: 100, h: 120, tipo: 'retazo', etiqueta: 'Retazo Útil 100×120cm', cliente: '' },
    { id: 'R-4', x: 200, y: 120, w: 100, h: 50, tipo: 'merma', etiqueta: 'Merma Veta / Despunte 100×50cm', cliente: '' },
  ]);

  // Estado de arrastre con mouse o dedo (Pointer Events para tablet y celular)
  const svgRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(null); // { startX, startY, curX, curY }

  const cargar = async () => {
    try {
      const [cRes, mRes] = await Promise.all([
        apiFetch(`/api/erp/cortes?sucursal_id=${sucursal}`),
        apiFetch(`/api/erp/inventario?sucursal_id=${sucursal}`),
      ]);
      setCortes(cRes.cortes || []);
      setRetazos(cRes.retazos || []);
      setMateriales(mRes.materiales || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const coordDeEvento = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    // Redondear a múltiplos de 5 cm para facilitar el trazo limpio con el dedo en tablet (o exacto al borde)
    const rawX = Math.round(relX * anchoCm);
    const rawY = Math.round(relY * altoCm);
    const snap = (v, max) => (Math.abs(v - max) <= 4 ? max : Math.round(v / 5) * 5);
    return {
      x: snap(rawX, anchoCm),
      y: snap(rawY, altoCm),
    };
  };

  const handlePointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const pt = coordDeEvento(e);
    setArrastrando({ startX: pt.x, startY: pt.y, curX: pt.x, curY: pt.y });
  };

  const handlePointerMove = (e) => {
    if (!arrastrando) return;
    const pt = coordDeEvento(e);
    setArrastrando(prev => (prev ? { ...prev, curX: pt.x, curY: pt.y } : null));
  };

  const handlePointerUp = () => {
    if (!arrastrando) return;
    const x = Math.min(arrastrando.startX, arrastrando.curX);
    const y = Math.min(arrastrando.startY, arrastrando.curY);
    const w = Math.abs(arrastrando.curX - arrastrando.startX);
    const h = Math.abs(arrastrando.curY - arrastrando.startY);
    setArrastrando(null);

    if (w < 5 || h < 5) return; // Ignorar toques accidentales menores a 5x5 cm

    const nuevo = {
      id: `R-${Date.now().toString().slice(-4)}`,
      x,
      y,
      w,
      h,
      tipo: tipoPincel,
      etiqueta:
        etiquetaActual.trim() ||
        (tipoPincel === 'usada'
          ? `Pieza ${w}×${h}cm`
          : tipoPincel === 'retazo'
          ? `Retazo útil ${w}×${h}cm`
          : `Merma ${w}×${h}cm`),
      cliente: tipoPincel === 'usada' ? clienteActual : '',
    };
    setRectangulos(prev => [...prev, nuevo]);
    setEtiquetaActual('');
  };

  const cambiarTipoRect = (id, nuevoTipo) => {
    setRectangulos(prev => prev.map(r => (r.id === id ? { ...r, tipo: nuevoTipo } : r)));
  };

  const eliminarRect = (id) => {
    setRectangulos(prev => prev.filter(r => r.id !== id));
  };

  const cargarRetazoParaCortar = (ret) => {
    setAnchoCm(ret.ancho_cm);
    setAltoCm(ret.alto_cm);
    setMaterialId(ret.material_id || '');
    setMaterialNombre(`${ret.material_nombre} (Desde ${ret.codigo})`);
    setRetazoOrigenId(ret.id);
    setRectangulos([]);
    onNotificar?.(`Retazo ${ret.codigo} (${ret.ancho_cm}×${ret.alto_cm} cm) cargado en la mesa de corte.`);
  };

  const resumen = useMemo(() => {
    const W = Math.max(10, Number(anchoCm || 300));
    const H = Math.max(10, Number(altoCm || 170));
    const totalCm2 = W * H;
    let usadoCm2 = 0;
    let retazoCm2 = 0;
    let mermaCm2 = 0;

    for (const r of rectangulos) {
      const a = r.w * r.h;
      if (r.tipo === 'usada') usadoCm2 += a;
      else if (r.tipo === 'retazo') retazoCm2 += a;
      else mermaCm2 += a;
    }

    const libreCm2 = Math.max(0, totalCm2 - (usadoCm2 + retazoCm2 + mermaCm2));
    return {
      area_total_m2: totalCm2 / 10000,
      usado_m2: usadoCm2 / 10000,
      retazo_m2: retazoCm2 / 10000,
      merma_m2: mermaCm2 / 10000,
      libre_m2: libreCm2 / 10000,
      usado_pct: (usadoCm2 / totalCm2) * 100,
      retazo_pct: (retazoCm2 / totalCm2) * 100,
      merma_pct: (mermaCm2 / totalCm2) * 100,
      libre_pct: (libreCm2 / totalCm2) * 100,
      costo_merma_bs: (mermaCm2 / 10000) * Number(costoM2Bs || 0),
    };
  }, [anchoCm, altoCm, rectangulos, costoM2Bs]);

  const guardarCortePlancha = async () => {
    if (rectangulos.length === 0) {
      onNotificar?.('Dibuja al menos un corte sobre la plancha.', 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/erp/cortes', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          material_id: materialId ? Number(materialId) : null,
          material_nombre: materialNombre,
          ancho_cm: Number(anchoCm),
          alto_cm: Number(altoCm),
          costo_m2_bs: Number(costoM2Bs),
          retazo_origen_id: retazoOrigenId,
          rectangulos,
          notas: `Corte registrado en matriz (${rectangulos.length} secciones).`,
        }),
      });
      const nRet = res.retazosCreados?.length || 0;
      onNotificar?.(
        `Corte ${res.codigo} guardado. ${nRet} retazo(s) útil(es) pasaron a inventario y la merma alimentó reportes.`
      );
      setRetazoOrigenId(null);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Taller de Sierra Puente · 1 Cuadro = 1 cm · Compatible con Dedo en Tablet y Mouse</p>
          <h1>Matriz de Corte de Planchas</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn" onClick={() => setRectangulos([])}>
            <RotateCcw size={15} /> Limpiar Plancha
          </button>
          <button type="button" className="btn primario" onClick={guardarCortePlancha}>
            <Save size={15} /> Guardar Corte y Pasar Retazos a Stock
          </button>
        </div>
      </div>

      {/* KPIs de aprovechamiento de la plancha actual */}
      <div className="mj-cifras">
        <div className="mj-cifra">
          <span>Tamaño de la Plancha</span>
          <strong>{anchoCm} × {altoCm} cm</strong>
          <small>{fmtNum(resumen.area_total_m2)} m² totales (1 cuadro = 1 cm)</small>
        </div>
        <div className="mj-cifra" style={{ borderTopColor: '#2f7d5b' }}>
          <span>Pieza Vendida / Usada</span>
          <strong className="verde">{fmtNum(resumen.usado_m2)} m² ({fmtNum(resumen.usado_pct, 1)}%)</strong>
          <small>Aprovechamiento directo en obra</small>
        </div>
        <div className="mj-cifra oro-top">
          <span>Parte Útil (Retazo Reutilizable)</span>
          <strong className="oro">{fmtNum(resumen.retazo_m2)} m² ({fmtNum(resumen.retazo_pct, 1)}%)</strong>
          <small>Vuelve al inventario con sus medidas</small>
        </div>
        <div className="mj-cifra alerta">
          <span>Desperdicio / Merma</span>
          <strong className="rojo">{fmtNum(resumen.merma_m2)} m² ({fmtNum(resumen.merma_pct, 1)}%)</strong>
          <small>Costo merma: {fmtBs(resumen.costo_merma_bs)}</small>
        </div>
      </div>

      <div className="mj-dos" style={{ marginBottom: 18 }}>
        {/* Lienzo interactivo de la plancha */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>
              <Scissors size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Mesa de Corte Visual ({ (anchoCm / 100).toFixed(2) } m × { (altoCm / 100).toFixed(2) } m)
            </h2>
            <span className="suave">Arrastra con el dedo o mouse para trazar un rectángulo</span>
          </header>

          {/* Barra de configuración de plancha y tipo de corte */}
          <div className="formulario" style={{ marginBottom: 12 }}>
            <label className="campo">
              <span>Material de la Plancha</span>
              <select
                value={materialId}
                onChange={e => {
                  setMaterialId(e.target.value);
                  const m = materiales.find(x => String(x.id) === String(e.target.value));
                  if (m) {
                    setMaterialNombre(m.nombre);
                    setAnchoCm(m.largo_cm || 300);
                    setAltoCm(m.ancho_cm || 170);
                    setCostoM2Bs(m.costo_bs || 650);
                  }
                }}
              >
                <option value="">-- {materialNombre} --</option>
                {materiales.filter(m => m.familia === 'plancha').map(m => (
                  <option key={m.id} value={m.id}>{m.nombre} ({m.largo_cm}×{m.ancho_cm}cm)</option>
                ))}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <label className="campo">
                <span>Largo (cm)</span>
                <input type="number" min="30" max="400" value={anchoCm} onChange={e => setAnchoCm(Number(e.target.value || 300))} />
              </label>
              <label className="campo">
                <span>Alto (cm)</span>
                <input type="number" min="30" max="250" value={altoCm} onChange={e => setAltoCm(Number(e.target.value || 170))} />
              </label>
              <label className="campo">
                <span>Costo Bs/m²</span>
                <input type="number" min="50" value={costoM2Bs} onChange={e => setCostoM2Bs(Number(e.target.value || 650))} />
              </label>
            </div>
          </div>

          {/* Selector de Modo de Marcado (botones grandes para tablet) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {Object.entries(COLORES_TIPO).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                className="btn"
                onClick={() => setTipoPincel(key)}
                style={{
                  flex: 1,
                  minWidth: 170,
                  minHeight: 44,
                  borderWidth: 2,
                  borderColor: tipoPincel === key ? cfg.stroke : 'var(--borde)',
                  background: tipoPincel === key ? cfg.fill : 'var(--superficie)',
                  color: tipoPincel === key ? '#fff' : 'var(--texto)',
                  fontWeight: 700,
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Cuadrícula SVG interactiva con touch-action: none para tablet */}
          <div
            style={{
              background: '#1c1c1e',
              padding: 12,
              borderRadius: 6,
              border: '2px solid var(--caliza)',
              userSelect: 'none',
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${anchoCm} ${altoCm}`}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                background: '#f5f2eb',
                cursor: 'crosshair',
                touchAction: 'none',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              <defs>
                <pattern id="grid1cm" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4" />
                </pattern>
                <pattern id="grid50cm" width="50" height="50" patternUnits="userSpaceOnUse">
                  <rect width="50" height="50" fill="url(#grid1cm)" />
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.9" />
                </pattern>
              </defs>

              {/* Fondo con cuadrícula a escala (cada cuadro menor = 10cm, subdividido en cm) */}
              <rect width={anchoCm} height={altoCm} fill="url(#grid50cm)" />

              {/* Rectángulos trazados */}
              {rectangulos.map(r => {
                const col = COLORES_TIPO[r.tipo] || COLORES_TIPO.usada;
                const areaM2 = ((r.w * r.h) / 10000).toFixed(2);
                return (
                  <g key={r.id}>
                    <rect
                      x={r.x}
                      y={r.y}
                      width={r.w}
                      height={r.h}
                      fill={col.fill}
                      stroke={col.stroke}
                      strokeWidth="1.5"
                    />
                    {r.w >= 35 && r.h >= 20 && (
                      <>
                        <text
                          x={r.x + r.w / 2}
                          y={r.y + r.h / 2 - 3}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="7"
                          fontWeight="bold"
                        >
                          {r.etiqueta}
                        </text>
                        <text
                          x={r.x + r.w / 2}
                          y={r.y + r.h / 2 + 7}
                          textAnchor="middle"
                          fill="#fff"
                          fontSize="6.5"
                        >
                          {r.w}×{r.h} cm ({areaM2} m²)
                        </text>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Previsualización durante el arrastre */}
              {arrastrando && (
                <rect
                  x={Math.min(arrastrando.startX, arrastrando.curX)}
                  y={Math.min(arrastrando.startY, arrastrando.curY)}
                  width={Math.abs(arrastrando.curX - arrastrando.startX)}
                  height={Math.abs(arrastrando.curY - arrastrando.startY)}
                  fill={COLORES_TIPO[tipoPincel].fill}
                  stroke={COLORES_TIPO[tipoPincel].stroke}
                  strokeDasharray="3 2"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>
        </section>

        {/* Lista de piezas de la plancha + retazos disponibles para volver a cortar */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Piezas, Retazos y Mermas en la Plancha Actual</h2>
            <span className="suave">{rectangulos.length} cortes</span>
          </header>

          <div className="tabla-marco" style={{ marginBottom: 16 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Pieza / Etiqueta</th>
                  <th>Medidas</th>
                  <th>m²</th>
                  <th>Clasificación</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rectangulos.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.etiqueta}</strong></td>
                    <td className="mono">{r.w} × {r.h} cm</td>
                    <td className="mono">{fmtNum((r.w * r.h) / 10000)} m²</td>
                    <td>
                      <select
                        value={r.tipo}
                        onChange={e => cambiarTipoRect(r.id, e.target.value)}
                        style={{ minHeight: 30, padding: '2px 6px', fontSize: 12 }}
                      >
                        <option value="usada">Pieza Vendida / Usada</option>
                        <option value="retazo">Parte Útil (Retazo)</option>
                        <option value="merma">Desperdicio / Merma</option>
                      </select>
                    </td>
                    <td>
                      <button type="button" className="btn-icono" onClick={() => eliminarRect(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, margin: 0 }}>
              <Layers size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Retazos Útiles en Inventario (Listos para Re-cortar)
            </h3>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Material</th>
                  <th>Medidas</th>
                  <th>Área</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {retazos.filter(r => r.estado === 'disponible').slice(0, 6).map(ret => (
                  <tr key={ret.id}>
                    <td className="mono"><strong>{ret.codigo}</strong></td>
                    <td><small>{ret.material_nombre}</small></td>
                    <td className="mono">{ret.ancho_cm}×{ret.alto_cm} cm</td>
                    <td className="mono">{fmtNum(ret.area_m2)} m²</td>
                    <td>
                      <button
                        type="button"
                        className="btn pequeno oro"
                        onClick={() => cargarRetazoParaCortar(ret)}
                      >
                        Volver a Cortar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Historial de Planchas Cortadas */}
      <section className="mj-bloque">
        <header>
          <h2>Historial de Cortes por Plancha</h2>
          <span className="suave">{cortes.length} planchas registradas en taller</span>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Material</th>
                <th>Cortador / Sede</th>
                <th>Dimensiones</th>
                <th className="derecha">Usado (m² / %)</th>
                <th className="derecha">Retazo Útil (m² / %)</th>
                <th className="derecha">Merma (m² / %)</th>
                <th className="derecha">Costo Merma</th>
              </tr>
            </thead>
            <tbody>
              {cortes.map(c => (
                <tr key={c.id}>
                  <td className="mono"><strong>{c.codigo}</strong></td>
                  <td>{c.fecha}</td>
                  <td><strong>{c.material_nombre}</strong></td>
                  <td>
                    <div>{c.cortador_nombre}</div>
                    <small className="suave">{c.sucursal_nombre}</small>
                  </td>
                  <td className="mono">{c.ancho_cm}×{c.alto_cm} cm ({fmtNum(c.area_total_m2)} m²)</td>
                  <td className="derecha verde">{fmtNum(c.usado_m2)} m² ({c.usado_pct}%)</td>
                  <td className="derecha oro">{fmtNum(c.retazo_m2)} m² ({c.retazo_pct}%)</td>
                  <td className="derecha rojo">{fmtNum(c.merma_m2)} m² ({c.merma_pct}%)</td>
                  <td className="derecha rojo"><strong>{fmtBs(c.costo_merma_bs)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
