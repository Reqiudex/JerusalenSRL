import React, { useState, useEffect, useMemo } from 'react';
import { Calculator, Save } from 'lucide-react';
import { fmtBs, fmtNum, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

export default function ProduccionView({ sucursal, usuario, onNotificar }) {
  const [proyectos, setProyectos] = useState([]);
  const [porProducto, setPorProducto] = useState([]);
  const [materiales, setMateriales] = useState([]);

  // Calculadora en tiempo real (ejemplo por defecto: 7m x 8m = 56 m2)
  const [nombre, setNombre] = useState('Revestimiento Salón / Lobby (7m × 8m)');
  const [clienteNombre, setClienteNombre] = useState('Constructora Urubó Golf S.A.');
  const [largoM, setLargoM] = useState(7);
  const [anchoM, setAnchoM] = useState(8);
  const [materialId, setMaterialId] = useState('');
  const [materialNombre, setMaterialNombre] = useState('Piedra Sinterizada Taj Mahal Gold Brasil');
  const [costoMaterialM2, setCostoMaterialM2] = useState(720);

  // Insumos con rendimiento en kg/m2
  const [colaKgM2, setColaKgM2] = useState(4.5);
  const [costoColaKg, setCostoColaKg] = useState(12);
  const [cementoKgM2, setCementoKgM2] = useState(6.0);
  const [costoCementoKg, setCostoCementoKg] = useState(2.5);
  const [pegamentoKgM2, setPegamentoKgM2] = useState(1.8);
  const [costoPegamentoKg, setCostoPegamentoKg] = useState(28);

  // Mano de obra, desperdicio y margen
  const [horasMo, setHorasMo] = useState(64);
  const [costoHoraMo, setCostoHoraMo] = useState(35);
  const [desperdicioPct, setDesperdicioPct] = useState(10);
  const [margenPct, setMargenPct] = useState(35);

  const cargar = async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        apiFetch(`/api/erp/produccion?sucursal_id=${sucursal}`),
        apiFetch(`/api/erp/inventario?sucursal_id=${sucursal}`),
      ]);
      setProyectos(pRes.proyectos || []);
      setPorProducto(pRes.porProducto || []);
      setMateriales(mRes.materiales || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const alSeleccionarPiedra = (id) => {
    setMaterialId(id);
    const mat = materiales.find(m => String(m.id) === String(id));
    if (mat) {
      setMaterialNombre(mat.nombre);
      setCostoMaterialM2(mat.costo_bs);
    }
  };

  const calc = useMemo(() => {
    const L = Math.max(0.01, Number(largoM || 0));
    const A = Math.max(0.01, Number(anchoM || 0));
    const area_m2 = Number((L * A).toFixed(2));

    const costo_piedra_bs = area_m2 * Number(costoMaterialM2 || 0);
    const cola_kg = area_m2 * Number(colaKgM2 || 0);
    const costo_cola_bs = cola_kg * Number(costoColaKg || 0);
    const cemento_kg = area_m2 * Number(cementoKgM2 || 0);
    const costo_cemento_bs = cemento_kg * Number(costoCementoKg || 0);
    const pegamento_kg = area_m2 * Number(pegamentoKgM2 || 0);
    const costo_pegamento_bs = pegamento_kg * Number(costoPegamentoKg || 0);

    const costo_insumos_bs = costo_cola_bs + costo_cemento_bs + costo_pegamento_bs;
    const costo_mo_bs = Number(horasMo || 0) * Number(costoHoraMo || 0);
    const costo_desperdicio_bs = (costo_piedra_bs + costo_insumos_bs) * (Number(desperdicioPct || 0) / 100);
    const costo_total_bs = costo_piedra_bs + costo_insumos_bs + costo_mo_bs + costo_desperdicio_bs;
    const precio_servicio_bs = costo_total_bs * (1 + Number(margenPct || 0) / 100);
    const utilidad_bs = precio_servicio_bs - costo_total_bs;

    return {
      area_m2,
      cola_kg,
      cemento_kg,
      pegamento_kg,
      costo_cola_bs,
      costo_cemento_bs,
      costo_pegamento_bs,
      costo_piedra_bs,
      costo_insumos_bs,
      costo_mo_bs,
      costo_desperdicio_bs,
      costo_total_bs,
      precio_servicio_bs,
      utilidad_bs,
      costo_m2_bs: area_m2 > 0 ? costo_total_bs / area_m2 : 0,
      precio_m2_bs: area_m2 > 0 ? precio_servicio_bs / area_m2 : 0,
    };
  }, [
    largoM, anchoM, costoMaterialM2,
    colaKgM2, costoColaKg, cementoKgM2, costoCementoKg, pegamentoKgM2, costoPegamentoKg,
    horasMo, costoHoraMo, desperdicioPct, margenPct,
  ]);

  const guardarProyecto = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/erp/produccion', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          nombre,
          cliente_nombre: clienteNombre,
          largo_m: Number(largoM),
          ancho_m: Number(anchoM),
          material_id: materialId ? Number(materialId) : null,
          material_nombre: materialNombre,
          costo_material_m2_bs: Number(costoMaterialM2),
          cola_kg_m2: Number(colaKgM2),
          costo_cola_kg_bs: Number(costoColaKg),
          cemento_kg_m2: Number(cementoKgM2),
          costo_cemento_kg_bs: Number(costoCementoKg),
          pegamento_kg_m2: Number(pegamentoKgM2),
          costo_pegamento_kg_bs: Number(costoPegamentoKg),
          horas_mo: Number(horasMo),
          costo_hora_mo_bs: Number(costoHoraMo),
          desperdicio_pct: Number(desperdicioPct),
          margen_pct: Number(margenPct),
        }),
      });
      onNotificar?.(`Proyecto ${res.codigo} guardado. Precio del servicio: ${fmtBs(res.calculo.precio_servicio_bs)}.`);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mj-titular">
        <p className="mj-ceja">Cálculo Técnico de Obra · Piedra + Cola/Preciosa + Cemento + Pegamento + Mano de Obra</p>
        <h1>Producción y Costos por Proyecto</h1>
      </div>

      <div className="mj-dos" style={{ marginBottom: 18 }}>
        {/* Formulario de parámetros del proyecto */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2><Calculator size={19} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Calculadora de Costos por Proyecto</h2>
            <span className="suave">Cálculo automático en tiempo real</span>
          </header>

          <form onSubmit={guardarProyecto}>
            <div className="formulario">
              <label className="campo">
                <span>Nombre del Proyecto / Obra</span>
                <input required value={nombre} onChange={e => setNombre(e.target.value)} />
              </label>
              <label className="campo">
                <span>Cliente</span>
                <input required value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} />
              </label>

              <label className="campo">
                <span>Largo del Proyecto (m)</span>
                <input type="number" step="0.1" min="0.1" value={largoM} onChange={e => setLargoM(e.target.value)} />
              </label>
              <label className="campo">
                <span>Ancho del Proyecto (m)</span>
                <input type="number" step="0.1" min="0.1" value={anchoM} onChange={e => setAnchoM(e.target.value)} />
              </label>

              <label className="campo">
                <span>Seleccionar Material (Plancha)</span>
                <select value={materialId} onChange={e => alSeleccionarPiedra(e.target.value)}>
                  <option value="">-- Personalizado ({materialNombre}) --</option>
                  {materiales.filter(m => m.familia === 'plancha').map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} (Costo: Bs {m.costo_bs}/m²)</option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Costo Material por m² (Bs/m²)</span>
                <input type="number" step="1" value={costoMaterialM2} onChange={e => setCostoMaterialM2(e.target.value)} />
              </label>

              <label className="campo">
                <span>Preciosa / Cola (rendimiento kg/m²)</span>
                <input type="number" step="0.1" value={colaKgM2} onChange={e => setColaKgM2(e.target.value)} />
              </label>
              <label className="campo">
                <span>Costo Preciosa / Cola (Bs/kg)</span>
                <input type="number" step="0.5" value={costoColaKg} onChange={e => setCostoColaKg(e.target.value)} />
              </label>

              <label className="campo">
                <span>Cemento Cola (rendimiento kg/m²)</span>
                <input type="number" step="0.1" value={cementoKgM2} onChange={e => setCementoKgM2(e.target.value)} />
              </label>
              <label className="campo">
                <span>Costo Cemento (Bs/kg)</span>
                <input type="number" step="0.5" value={costoCementoKg} onChange={e => setCostoCementoKg(e.target.value)} />
              </label>

              <label className="campo">
                <span>Pegamento Epóxico (rendimiento kg/m²)</span>
                <input type="number" step="0.1" value={pegamentoKgM2} onChange={e => setPegamentoKgM2(e.target.value)} />
              </label>
              <label className="campo">
                <span>Costo Pegamento (Bs/kg)</span>
                <input type="number" step="0.5" value={costoPegamentoKg} onChange={e => setCostoPegamentoKg(e.target.value)} />
              </label>

              <label className="campo">
                <span>Horas de Mano de Obra (Corte + Instalación)</span>
                <input type="number" step="1" value={horasMo} onChange={e => setHorasMo(e.target.value)} />
              </label>
              <label className="campo">
                <span>Costo por Hora Mano de Obra (Bs/h)</span>
                <input type="number" step="1" value={costoHoraMo} onChange={e => setCostoHoraMo(e.target.value)} />
              </label>

              <label className="campo">
                <span>Desperdicio / Merma Estimada (%)</span>
                <input type="number" step="0.5" min="0" max="50" value={desperdicioPct} onChange={e => setDesperdicioPct(e.target.value)} />
              </label>
              <label className="campo">
                <span>Margen de Ganancia (%)</span>
                <input type="number" step="1" min="5" max="150" value={margenPct} onChange={e => setMargenPct(e.target.value)} />
              </label>
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn primario">
                <Save size={16} /> Guardar Proyecto en Producción
              </button>
            </div>
          </form>
        </section>

        {/* Hoja de Desglose de Costo Total y Precio del Servicio */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Hoja de Costo Total y Precio del Servicio</h2>
            <span className="etiqueta tono-ambar">{largoM} m × {anchoM} m = {fmtNum(calc.area_m2)} m²</span>
          </header>

          <div className="mj-cifras" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="mj-cifra">
              <span>Costo Total de Obra</span>
              <strong>{fmtBs(calc.costo_total_bs)}</strong>
              <small>{fmtBs(calc.costo_m2_bs)} por m²</small>
            </div>
            <div className="mj-cifra oro-top">
              <span>Precio del Servicio (Venta)</span>
              <strong className="verde">{fmtBs(calc.precio_servicio_bs)}</strong>
              <small>{fmtBs(calc.precio_m2_bs)} por m² (Margen +{margenPct}%)</small>
            </div>
          </div>

          <table className="tabla">
            <thead>
              <tr>
                <th>Componente del Proyecto</th>
                <th>Consumo / Rendimiento</th>
                <th className="derecha">Importe (Bs)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Piedra / Plancha</strong> ({materialNombre})</td>
                <td className="mono">{fmtNum(calc.area_m2)} m² × Bs {costoMaterialM2}</td>
                <td className="derecha">{fmtBs(calc.costo_piedra_bs)}</td>
              </tr>
              <tr>
                <td><strong>2. Preciosa / Cola</strong> ({colaKgM2} kg/m²)</td>
                <td className="mono">{fmtNum(calc.cola_kg, 1)} kg × Bs {costoColaKg}</td>
                <td className="derecha">{fmtBs(calc.costo_cola_bs)}</td>
              </tr>
              <tr>
                <td><strong>3. Cemento Cola</strong> ({cementoKgM2} kg/m²)</td>
                <td className="mono">{fmtNum(calc.cemento_kg, 1)} kg × Bs {costoCementoKg}</td>
                <td className="derecha">{fmtBs(calc.costo_cemento_bs)}</td>
              </tr>
              <tr>
                <td><strong>4. Pegamento Epóxico</strong> ({pegamentoKgM2} kg/m²)</td>
                <td className="mono">{fmtNum(calc.pegamento_kg, 1)} kg × Bs {costoPegamentoKg}</td>
                <td className="derecha">{fmtBs(calc.costo_pegamento_bs)}</td>
              </tr>
              <tr>
                <td><strong>5. Mano de Obra</strong> (Corte + Colocación)</td>
                <td className="mono">{horasMo} h × Bs {costoHoraMo}/h</td>
                <td className="derecha">{fmtBs(calc.costo_mo_bs)}</td>
              </tr>
              <tr>
                <td><strong>6. Desperdicio / Merma ({desperdicioPct}%)</strong></td>
                <td className="mono">Sobre piedra + insumos</td>
                <td className="derecha">{fmtBs(calc.costo_desperdicio_bs)}</td>
              </tr>
              <tr style={{ background: 'var(--superficie-suave)', fontWeight: 700 }}>
                <td>COSTO TOTAL DE PRODUCCIÓN</td>
                <td className="mono">{fmtBs(calc.costo_m2_bs)} / m²</td>
                <td className="derecha">{fmtBs(calc.costo_total_bs)}</td>
              </tr>
              <tr style={{ fontWeight: 700, color: 'var(--estado)' }}>
                <td>UTILIDAD NETA (+{margenPct}%)</td>
                <td className="mono">Ganancia limpia</td>
                <td className="derecha">+ {fmtBs(calc.utilidad_bs)}</td>
              </tr>
              <tr style={{ fontSize: 16, fontWeight: 700 }}>
                <td>PRECIO FINAL DEL SERVICIO AL CLIENTE</td>
                <td className="mono">{fmtBs(calc.precio_m2_bs)} / m²</td>
                <td className="derecha verde">{fmtBs(calc.precio_servicio_bs)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      {/* Producción por Producto y Proyectos Guardados */}
      <div className="mj-dos">
        <section className="mj-bloque">
          <header>
            <h2>Proyectos de Producción Registrados</h2>
            <span className="suave">{proyectos.length} proyectos</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Proyecto / Cliente</th>
                  <th>Medidas</th>
                  <th className="derecha">Costo Total</th>
                  <th className="derecha">Precio Servicio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {proyectos.map(p => (
                  <tr key={p.id}>
                    <td className="mono"><strong>{p.codigo}</strong></td>
                    <td>
                      <strong>{p.nombre}</strong>
                      <div><small className="suave">{p.cliente_nombre} · {p.material_nombre}</small></div>
                    </td>
                    <td className="mono">{p.largo_m}×{p.ancho_m}m ({p.area_m2} m²)</td>
                    <td className="derecha">{fmtBs(p.costo_total_bs)}</td>
                    <td className="derecha verde"><strong>{fmtBs(p.precio_servicio_bs)}</strong></td>
                    <td><EtiquetaEstado estado={p.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mj-bloque">
          <header>
            <h2>Producción por Producto (m² Cortados y Colocados)</h2>
            <span className="suave">Acumulado por material</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Material / Piedra</th>
                  <th className="derecha">m² Cortados</th>
                  <th className="derecha">Facturado (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {porProducto.map((pr, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{pr.producto}</strong>
                      <div><small className="suave">{pr.operaciones} obras/ventas</small></div>
                    </td>
                    <td className="derecha"><strong>{fmtNum(pr.m2_totales)} m²</strong></td>
                    <td className="derecha">{fmtBs(pr.facturado_bs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
