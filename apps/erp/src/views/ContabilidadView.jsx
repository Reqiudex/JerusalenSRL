import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { fmtBs, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';

export default function ContabilidadView({ sucursal, usuario, onNotificar }) {
  const [mes, setMes] = useState('2026-11');
  const [datos, setDatos] = useState({
    resumen: { ingresos_bs: 0, egresos_bs: 0, resultado_bs: 0, total_por_cobrar_bs: 0 },
    porCategoria: [],
    porSucursal: [],
    cuentasPorCobrar: [],
    movimientos: [],
  });
  const [modalAbierto, setModalAbierto] = useState(false);

  // Nuevo movimiento contable
  const [tipo, setTipo] = useState('egreso');
  const [categoria, setCategoria] = useState('Insumos y Discos');
  const [concepto, setConcepto] = useState('');
  const [montoBs, setMontoBs] = useState(850);
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  const cargar = async () => {
    try {
      const res = await apiFetch(`/api/erp/contabilidad?sucursal_id=${sucursal}&mes=${mes}`);
      setDatos(res);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal, mes]);

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/erp/contabilidad', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          tipo,
          categoria,
          concepto,
          monto_bs: Number(montoBs),
          metodo_pago: metodoPago,
        }),
      });
      onNotificar?.(`Movimiento registrado (${tipo}: ${fmtBs(montoBs)}).`);
      setModalAbierto(false);
      setConcepto('');
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const { resumen, porCategoria, porSucursal, cuentasPorCobrar, movimientos } = datos;

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Flujo de Caja, Resultados por Sucursal y Cuentas por Cobrar</p>
          <h1>Contabilidad Simple</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            style={{ width: 170 }}
          />
          <button type="button" className="btn primario" onClick={() => setModalAbierto(true)}>
            <Plus size={16} /> Registrar Ingreso / Gasto
          </button>
        </div>
      </div>

      <div className="mj-cifras">
        <div className="mj-cifra" style={{ borderTopColor: '#2f7d5b' }}>
          <span>Ingresos del Mes ({mes})</span>
          <strong className="verde">{fmtBs(resumen.ingresos_bs)}</strong>
          <small>Ventas cobradas y abonos</small>
        </div>
        <div className="mj-cifra alerta">
          <span>Egresos del Mes ({mes})</span>
          <strong className="rojo">{fmtBs(resumen.egresos_bs)}</strong>
          <small>Compras Brasil, planilla y gastos</small>
        </div>
        <div className="mj-cifra oro-top">
          <span>Resultado Neto Mensual</span>
          <strong className={resumen.resultado_bs >= 0 ? 'verde' : 'rojo'}>
            {fmtBs(resumen.resultado_bs)}
          </strong>
          <small>Utilidad operativa del período</small>
        </div>
        <div className="mj-cifra">
          <span>Cuentas por Cobrar</span>
          <strong className="oro">{fmtBs(resumen.total_por_cobrar_bs)}</strong>
          <small>{cuentasPorCobrar.length} clientes con saldo a crédito</small>
        </div>
      </div>

      <div className="mj-dos" style={{ marginBottom: 18 }}>
        {/* Resultado Mensual por Sucursal */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Resultado Mensual por Sucursal ({mes})</h2>
            <span className="suave">Comparativa de las 3 sedes</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Sucursal / Fábrica</th>
                  <th className="derecha">Ingresos</th>
                  <th className="derecha">Egresos</th>
                  <th className="derecha">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {porSucursal.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.nombre}</strong>
                      <div><small className="mono suave">{s.codigo}</small></div>
                    </td>
                    <td className="derecha verde">{fmtBs(s.ingresos_bs)}</td>
                    <td className="derecha rojo">{fmtBs(s.egresos_bs)}</td>
                    <td className={`derecha ${s.resultado_bs >= 0 ? 'verde' : 'rojo'}`}>
                      <strong>{fmtBs(s.resultado_bs)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Desglose por Categoría */}
        <section className="mj-bloque" style={{ marginBottom: 0 }}>
          <header>
            <h2>Ingresos y Egresos por Categoría</h2>
            <span className="suave">{porCategoria.length} rubros</span>
          </header>
          <div className="tabla-marco">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th className="derecha">Movimientos</th>
                  <th className="derecha">Total (Bs)</th>
                </tr>
              </thead>
              <tbody>
                {porCategoria.map((c, idx) => (
                  <tr key={idx}>
                    <td>
                      {c.tipo === 'ingreso' ? (
                        <span className="etiqueta tono-verde"><ArrowUpRight size={12} /> Ingreso</span>
                      ) : (
                        <span className="etiqueta tono-rojo"><ArrowDownRight size={12} /> Egreso</span>
                      )}
                    </td>
                    <td><strong>{c.categoria}</strong></td>
                    <td className="derecha">{c.cantidad}</td>
                    <td className={`derecha ${c.tipo === 'ingreso' ? 'verde' : 'rojo'}`}>
                      <strong>{fmtBs(c.total_bs)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Cuentas por Cobrar */}
      <section className="mj-bloque">
        <header>
          <h2>Cuentas por Cobrar (Saldos Pendientes de Clientes)</h2>
          <span className="suave">Total por cobrar: {fmtBs(resumen.total_por_cobrar_bs)}</span>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Venta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor / Sede</th>
                <th className="derecha">Total Venta</th>
                <th className="derecha">Pagado</th>
                <th className="derecha">Saldo por Cobrar</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuentasPorCobrar.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 20 }}>No hay saldos pendientes de cobro.</td></tr>
              ) : (
                cuentasPorCobrar.map(c => (
                  <tr key={c.id}>
                    <td className="mono"><strong>{c.codigo}</strong></td>
                    <td>{c.fecha}</td>
                    <td><strong>{c.cliente_nombre}</strong></td>
                    <td>{c.vendedor_nombre} · <small className="suave">{c.sucursal_nombre}</small></td>
                    <td className="derecha">{fmtBs(c.total_bs)}</td>
                    <td className="derecha verde">{fmtBs(c.pagado_bs)}</td>
                    <td className="derecha rojo"><strong>{fmtBs(c.saldo_bs)}</strong></td>
                    <td><EtiquetaEstado estado={c.estado_pago} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Libro Diario de Movimientos */}
      <section className="mj-bloque">
        <header>
          <h2>Libro de Movimientos del Mes ({movimientos.length})</h2>
        </header>
        <div className="tabla-marco">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Sede</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Concepto</th>
                <th>Método</th>
                <th className="derecha">Monto (Bs)</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map(m => (
                <tr key={m.id}>
                  <td>{m.fecha}</td>
                  <td>{m.sucursal_codigo}</td>
                  <td>
                    <span className={`etiqueta ${m.tipo === 'ingreso' ? 'tono-verde' : 'tono-rojo'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td><strong>{m.categoria}</strong></td>
                  <td>{m.concepto}</td>
                  <td>{m.metodo_pago}</td>
                  <td className={`derecha ${m.tipo === 'ingreso' ? 'verde' : 'rojo'}`}>
                    <strong>{m.tipo === 'ingreso' ? '+' : '-'} {fmtBs(m.monto_bs)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalAbierto && (
        <div className="capa" onClick={() => setModalAbierto(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Registrar Movimiento Contable</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalAbierto(false)}>Cerrar</button>
            </header>
            <form onSubmit={guardarMovimiento}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo">
                    <span>Tipo de Movimiento</span>
                    <select value={tipo} onChange={e => setTipo(e.target.value)}>
                      <option value="egreso">Egreso / Gasto / Compra</option>
                      <option value="ingreso">Ingreso Extraordinario</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Categoría</span>
                    <select value={categoria} onChange={e => setCategoria(e.target.value)}>
                      <option value="Compra Planchas Brasil">Compra Planchas Brasil</option>
                      <option value="Planilla Sueldos">Planilla Sueldos</option>
                      <option value="Insumos y Discos">Insumos y Discos (Preciosa/Cemento)</option>
                      <option value="Transporte y Grúa">Transporte y Grúa</option>
                      <option value="Servicios y Alquiler">Servicios (CRE, Saguapac, Alquiler)</option>
                      <option value="Ventas">Ventas / Cobros</option>
                    </select>
                  </label>
                  <label className="campo completo">
                    <span>Concepto / Detalle *</span>
                    <input required value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej. Compra de 10 discos diamantados 350mm" />
                  </label>
                  <label className="campo">
                    <span>Monto (Bs) *</span>
                    <input type="number" step="0.01" min="1" required value={montoBs} onChange={e => setMontoBs(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Método de Pago</span>
                    <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="QR">QR</option>
                    </select>
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn primario"><Wallet size={15} /> Guardar Movimiento</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
