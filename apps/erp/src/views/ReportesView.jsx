import React, { useState, useEffect } from 'react';
import { TrendingUp, Award, AlertCircle, Users, Scissors } from 'lucide-react';
import { fmtBs, fmtNum } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

export default function ReportesView({ sucursal, onNotificar }) {
  const [datos, setDatos] = useState({
    ventasPorMes: [],
    ventasPorDiaSemana: [],
    productoMasExitoso: null,
    productoMenosExitoso: null,
    masVendidos: [],
    menosVendidos: [],
    modasTendencias: [],
    conversionPorVendedor: [],
    mermasPorMaterial: [],
    mermasPorCortador: [],
  });
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await apiFetch(`/api/erp/reportes?sucursal_id=${sucursal}`);
      setDatos(res);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const maxMesBs = Math.max(1, ...datos.ventasPorMes.map(m => m.total_bs));
  const maxDiaBs = Math.max(1, ...datos.ventasPorDiaSemana.map(d => d.total_bs));

  return (
    <div>
      <div className="mj-titular">
        <p className="mj-ceja">Inteligencia Comercial y de Taller · 12 Meses de Estacionalidad y Nuevas Modas</p>
        <h1>Reportes y Gráficas</h1>
      </div>

      {/* Destacados: Producto Más Exitoso, Menos Exitoso y Moda Creciente */}
      <div className="mj-cifras">
        <div className="mj-cifra oro-top">
          <span><Award size={14} /> Producto Más Exitoso</span>
          <strong>{datos.productoMasExitoso?.nombre || 'Cargando...'}</strong>
          <small>
            Facturado: {fmtBs(datos.productoMasExitoso?.facturado_bs)} ({fmtNum(datos.productoMasExitoso?.m2_vendidos)} m²)
          </small>
        </div>
        <div className="mj-cifra" style={{ borderTopColor: '#2f7d5b' }}>
          <span><TrendingUp size={14} /> Tendencia / Moda Nueva</span>
          <strong className="verde">{datos.modasTendencias[0]?.nombre || 'Piedra Sinterizada'}</strong>
          <small>
            Crecimiento reciente: +{datos.modasTendencias[0]?.crecimiento_pct || 0}% vs promedio anterior
          </small>
        </div>
        <div className="mj-cifra alerta">
          <span><AlertCircle size={14} /> Producto Menos Vendido</span>
          <strong>{datos.productoMenosExitoso?.nombre || 'N/D'}</strong>
          <small>
            Facturado: {fmtBs(datos.productoMenosExitoso?.facturado_bs)} ({fmtNum(datos.productoMenosExitoso?.m2_vendidos)} m²)
          </small>
        </div>
      </div>

      {/* Gráfica 1: Ventas de 12 Meses (Estacionalidad) + Gráfica 2: Ventas por Día de la Semana */}
      <div className="mj-dos" style={{ marginBottom: 18 }}>
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Evolución de Ventas Mensuales (Últimos 12 Meses)</h2>
            <span className="suave">Estacionalidad Santa Cruz (picos Sep/Nov/Dic)</span>
          </header>
          {cargando ? (
            <div style={{ padding: 24 }}>Cargando gráfica...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {datos.ventasPorMes.map(m => {
                const pct = Math.max(4, Math.round((m.total_bs / maxMesBs) * 100));
                return (
                  <div key={m.mes} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 130px', alignItems: 'center', gap: 10 }}>
                    <span className="mono" style={{ fontSize: 12.5 }}>{m.mes}</span>
                    <div style={{ background: 'var(--superficie-suave)', height: 18, borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #1c1c1e, #c9a86a)',
                        }}
                      />
                    </div>
                    <strong className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>{fmtBs(m.total_bs)}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Ventas por Día de la Semana</h2>
            <span className="suave">Actividad en taller y showroom</span>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {datos.ventasPorDiaSemana.map(d => {
              const pct = Math.max(4, Math.round((d.total_bs / maxDiaBs) * 100));
              return (
                <div key={d.dia} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 130px', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{d.dia}</span>
                  <div style={{ background: 'var(--superficie-suave)', height: 18, borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: '#2f7d5b',
                      }}
                    />
                  </div>
                  <span className="mono" style={{ textAlign: 'right', fontSize: 12.5 }}>
                    {fmtBs(d.total_bs)} ({d.operaciones})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Tendencias / Modas Nuevas y Recomendación de Compra */}
      <section className="mj-bloque">
        <header>
          <h2>Tendencias / Modas Nuevas y Recomendación de Cuánto Comprar</h2>
          <span className="suave">Comparativa últimos 60 días vs promedio histórico de los 10 meses previos</span>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Material</th>
                <th>Categoría</th>
                <th className="derecha">Ritmo Reciente (m²/mes)</th>
                <th className="derecha">Crecimiento vs Promedio</th>
                <th className="derecha">Stock Actual</th>
                <th className="derecha">Recomendación Comprar</th>
              </tr>
            </thead>
            <tbody>
              {datos.modasTendencias.map(p => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nombre}</strong>
                    <div><small className="mono suave">{p.codigo}</small></div>
                  </td>
                  <td><span className="etiqueta tono-ambar">{p.categoria}</span></td>
                  <td className="derecha">{fmtNum(p.prom_mensual_reciente_m2)} m²/mes</td>
                  <td className="derecha verde">
                    <strong>+{p.crecimiento_pct}%</strong>
                  </td>
                  <td className="derecha">{fmtNum(p.stock)} m²</td>
                  <td className="derecha oro">
                    <strong>Comprar {fmtNum(p.recomendar_comprar_m2)} m²</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Productos Más y Menos Vendidos */}
      <div className="mj-dos" style={{ marginBottom: 18 }}>
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Productos Más Vendidos (Ranking Top)</h2>
            <span className="suave">Por facturación en Bs y m²</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Material</th>
                  <th className="derecha">m² Vendidos</th>
                  <th className="derecha">Facturado</th>
                  <th className="derecha">Comprar</th>
                </tr>
              </thead>
              <tbody>
                {datos.masVendidos.map((p, i) => (
                  <tr key={p.id}>
                    <td className="mono"><strong>{i + 1}</strong></td>
                    <td><strong>{p.nombre}</strong></td>
                    <td className="derecha">{fmtNum(p.m2_vendidos)} m²</td>
                    <td className="derecha verde"><strong>{fmtBs(p.facturado_bs)}</strong></td>
                    <td className="derecha">{fmtNum(p.recomendar_comprar_m2)} m²</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Productos Menos Vendidos (Baja Rotación)</h2>
            <span className="suave">Evitar sobre-stock</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Material</th>
                  <th className="derecha">Stock Actual</th>
                  <th className="derecha">m² Vendidos</th>
                  <th className="derecha">Facturado</th>
                </tr>
              </thead>
              <tbody>
                {datos.menosVendidos.map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.nombre}</strong></td>
                    <td className="derecha">{fmtNum(p.stock)} m²</td>
                    <td className="derecha">{fmtNum(p.m2_vendidos)} m²</td>
                    <td className="derecha suave">{fmtBs(p.facturado_bs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Proformas por Empleado y Tasa de Conversión a Ventas + Mermas por Material/Cortador */}
      <div className="mj-dos">
        <section className="mj-bloque">
          <header>
            <h2><Users size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Proformas por Empleado y Tasa de Conversión</h2>
            <span className="suave">Desempeño comercial</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Vendedor / Asesor</th>
                  <th className="derecha">Proformas</th>
                  <th className="derecha">Convertidas</th>
                  <th className="derecha">Tasa Conv.</th>
                  <th className="derecha">Vendido (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {datos.conversionPorVendedor.map((v, i) => (
                  <tr key={i}>
                    <td><strong>{v.vendedor}</strong></td>
                    <td className="derecha">{v.total_proformas}</td>
                    <td className="derecha verde"><strong>{v.convertidas}</strong></td>
                    <td className="derecha">
                      <span className="etiqueta tono-verde">{v.tasa_conversion_pct}%</span>
                    </td>
                    <td className="derecha"><strong>{fmtBs(v.monto_convertido_bs)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mj-bloque">
          <header>
            <h2><Scissors size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Mermas por Material y por Cortador</h2>
            <span className="suave">Originado en la Matriz de Corte</span>
          </header>
          <div className="tabla-marco" style={{ marginBottom: 12 }}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cortador</th>
                  <th className="derecha">Planchas</th>
                  <th className="derecha">Retazo Útil</th>
                  <th className="derecha">Merma %</th>
                  <th className="derecha">Costo Merma</th>
                </tr>
              </thead>
              <tbody>
                {datos.mermasPorCortador.map((c, i) => (
                  <tr key={i}>
                    <td><strong>{c.cortador}</strong></td>
                    <td className="derecha">{c.planchas_cortadas}</td>
                    <td className="derecha oro">{fmtNum(c.retazo_m2)} m²</td>
                    <td className="derecha rojo">{c.merma_pct_promedio}%</td>
                    <td className="derecha rojo"><strong>{fmtBs(c.costo_merma_bs)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Material Cortado</th>
                  <th className="derecha">Usado</th>
                  <th className="derecha">Merma (m²)</th>
                  <th className="derecha">Merma %</th>
                </tr>
              </thead>
              <tbody>
                {datos.mermasPorMaterial.map((m, i) => (
                  <tr key={i}>
                    <td><strong>{m.material}</strong></td>
                    <td className="derecha verde">{fmtNum(m.usado_m2)} m²</td>
                    <td className="derecha rojo">{fmtNum(m.merma_m2)} m²</td>
                    <td className="derecha rojo"><strong>{m.merma_pct_promedio}%</strong></td>
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
