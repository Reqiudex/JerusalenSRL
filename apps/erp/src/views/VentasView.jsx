import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, DollarSign, FileText, Search, CreditCard } from 'lucide-react';
import { fmtBs, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';
import { generarProformaPDF } from '../../../../src/utils/pdfProforma';

export default function VentasView({ sucursal, usuario, onNotificar }) {
  const [ventas, setVentas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroPago, setFiltroPago] = useState('todos');
  const [modalVenta, setModalVenta] = useState(false);
  const [modalAbono, setModalAbono] = useState(null);

  // Venta directa form
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNit, setClienteNit] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [materialId, setMaterialId] = useState('');
  const [descripcion, setDescripcion] = useState('Mármol Blanco Calacatta Gold Brasil');
  const [cantidadM2, setCantidadM2] = useState(5.1);
  const [precioUnit, setPrecioUnit] = useState(1150);
  const [pagadoBs, setPagadoBs] = useState(5865);

  // Abono form
  const [montoAbono, setMontoAbono] = useState(0);
  const [metodoAbono, setMetodoAbono] = useState('QR');

  const cargar = async () => {
    setCargando(true);
    try {
      const [vRes, mRes] = await Promise.all([
        apiFetch(`/api/erp/ventas?sucursal_id=${sucursal}`),
        apiFetch(`/api/erp/inventario?sucursal_id=${sucursal}`),
      ]);
      setVentas(vRes.ventas || []);
      setMateriales(mRes.materiales || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [sucursal]);

  const alCambiarMaterial = (id) => {
    setMaterialId(id);
    const mat = materiales.find(m => String(m.id) === String(id));
    if (mat) {
      setDescripcion(`${mat.nombre} (${mat.acabado})`);
      setPrecioUnit(mat.precio_m2_bs);
      const tot = Number((Number(cantidadM2 || 1) * mat.precio_m2_bs).toFixed(2));
      setPagadoBs(tot);
    }
  };

  const totalDirecta = Number((Number(cantidadM2 || 0) * Number(precioUnit || 0)).toFixed(2));

  const registrarVentaDirecta = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/erp/ventas', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          cliente_nombre: clienteNombre || 'Cliente Taller / Showroom',
          cliente_nit: clienteNit,
          metodo_pago: metodoPago,
          pagado_bs: Number(pagadoBs),
          items: [
            {
              material_id: materialId ? Number(materialId) : null,
              tipo_item: 'm2',
              descripcion,
              cantidad: Number(cantidadM2),
              precio_unit_bs: Number(precioUnit),
            },
          ],
        }),
      });
      onNotificar?.(`Venta ${res.codigo} registrada por ${fmtBs(res.total_bs)}.`);
      setModalVenta(false);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    if (!modalAbono) return;
    try {
      await apiFetch(`/api/erp/ventas/${modalAbono.id}/pagos`, {
        method: 'POST',
        body: JSON.stringify({
          monto_bs: Number(montoAbono),
          metodo_pago: metodoAbono,
        }),
      });
      onNotificar?.(`Pago de ${fmtBs(montoAbono)} registrado en ${modalAbono.codigo}.`);
      setModalAbono(null);
      cargar();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const filtradas = ventas.filter(v => {
    if (filtroPago === 'con_saldo' && v.saldo_bs <= 0) return false;
    if (filtroPago === 'pagado' && v.saldo_bs > 0) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      v.codigo?.toLowerCase().includes(q) ||
      v.cliente_nombre?.toLowerCase().includes(q) ||
      v.vendedor_nombre?.toLowerCase().includes(q)
    );
  });

  const sumaTotal = filtradas.reduce((s, v) => s + v.total_bs, 0);
  const sumaPagado = filtradas.reduce((s, v) => s + v.pagado_bs, 0);
  const sumaSaldo = filtradas.reduce((s, v) => s + v.saldo_bs, 0);

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Facturación Directa o desde Proforma · Efectivo, QR, Transferencia y Tarjeta</p>
          <h1>Ventas y Cobros</h1>
        </div>
        <button type="button" className="btn primario" onClick={() => setModalVenta(true)}>
          <Plus size={16} /> Registrar Venta Directa
        </button>
      </div>

      <div className="mj-cifras">
        <div className="mj-cifra oro-top">
          <span>Total Facturado</span>
          <strong>{fmtBs(sumaTotal)}</strong>
          <small>{filtradas.length} operaciones</small>
        </div>
        <div className="mj-cifra">
          <span>Total Cobrado</span>
          <strong className="verde">{fmtBs(sumaPagado)}</strong>
          <small>Ingresado en caja y bancos</small>
        </div>
        <div className={`mj-cifra ${sumaSaldo > 0 ? 'alerta' : ''}`}>
          <span>Saldos / Cuentas por Cobrar</span>
          <strong className={sumaSaldo > 0 ? 'rojo' : ''}>{fmtBs(sumaSaldo)}</strong>
          <small>{filtradas.filter(v => v.saldo_bs > 0).length} ventas con saldo pendiente</small>
        </div>
      </div>

      <div className="barra-filtros">
        <div className="buscador">
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar venta por código (VTA-26-...), cliente o vendedor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)}>
          <option value="todos"> Todas las ventas</option>
          <option value="pagado">Pagadas al 100%</option>
          <option value="con_saldo">Con saldo / Crédito pendiente</option>
        </select>
      </div>

      <div className="tabla-marco">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Origen / Vendedor</th>
              <th>Método</th>
              <th className="derecha">Total</th>
              <th className="derecha">Pagado</th>
              <th className="derecha">Saldo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 28 }}>Cargando ventas...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 28 }}>Sin ventas registradas.</td></tr>
            ) : (
              filtradas.map(v => (
                <tr key={v.id}>
                  <td className="mono"><strong>{v.codigo}</strong></td>
                  <td>{v.fecha}</td>
                  <td>
                    <strong>{v.cliente_nombre}</strong>
                    {v.cliente_nit && <div><small className="suave">NIT: {v.cliente_nit}</small></div>}
                  </td>
                  <td>
                    <div>{v.vendedor_nombre}</div>
                    <small className="suave">{v.proforma_codigo ? `De ${v.proforma_codigo}` : 'Venta Directa'} · {v.sucursal_codigo}</small>
                  </td>
                  <td><span className="etiqueta tono-azul">{v.metodo_pago}</span></td>
                  <td className="derecha"><strong>{fmtBs(v.total_bs)}</strong></td>
                  <td className="derecha verde">{fmtBs(v.pagado_bs)}</td>
                  <td className={`derecha ${v.saldo_bs > 0 ? 'rojo' : 'suave'}`}>
                    <strong>{fmtBs(v.saldo_bs)}</strong>
                  </td>
                  <td><EtiquetaEstado estado={v.estado_pago} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn pequeno"
                        onClick={() => generarProformaPDF(v, 'NOTA DE VENTA')}
                        title="Descargar Comprobante PDF"
                      >
                        <FileText size={13} /> PDF
                      </button>
                      {v.saldo_bs > 0 && (
                        <button
                          type="button"
                          className="btn pequeno oro"
                          onClick={() => {
                            setModalAbono(v);
                            setMontoAbono(v.saldo_bs);
                          }}
                        >
                          <DollarSign size={13} /> Cobrar Saldo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Venta Directa */}
      {modalVenta && (
        <div className="capa" onClick={() => setModalVenta(false)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Registrar Venta Directa en Taller / Showroom</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalVenta(false)}>Cerrar</button>
            </header>
            <form onSubmit={registrarVentaDirecta}>
              <div className="dialogo-cuerpo">
                <div className="formulario">
                  <label className="campo">
                    <span>Cliente / Razón Social *</span>
                    <input required value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Ej. Don Ruperto Aguilera" />
                  </label>
                  <label className="campo">
                    <span>NIT / C.I.</span>
                    <input value={clienteNit} onChange={e => setClienteNit(e.target.value)} placeholder="1582910" />
                  </label>
                  <label className="campo completo">
                    <span>Material de Inventario</span>
                    <select value={materialId} onChange={e => alCambiarMaterial(e.target.value)}>
                      <option value="">-- Seleccionar plancha / piedra --</option>
                      {materiales.filter(m => m.familia === 'plancha').map(m => (
                        <option key={m.id} value={m.id}>{m.nombre} — Stock: {m.stock} m² (Bs {m.precio_m2_bs}/m²)</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo completo">
                    <span>Descripción del ítem</span>
                    <input required value={descripcion} onChange={e => setDescripcion(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Cantidad (m²)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cantidadM2}
                      onChange={e => {
                        setCantidadM2(e.target.value);
                        setPagadoBs(Number((Number(e.target.value || 0) * Number(precioUnit || 0)).toFixed(2)));
                      }}
                    />
                  </label>
                  <label className="campo">
                    <span>Precio Unitario (Bs/m²)</span>
                    <input
                      type="number"
                      step="1"
                      value={precioUnit}
                      onChange={e => {
                        setPrecioUnit(e.target.value);
                        setPagadoBs(Number((Number(cantidadM2 || 0) * Number(e.target.value || 0)).toFixed(2)));
                      }}
                    />
                  </label>
                  <label className="campo">
                    <span>Método de Pago</span>
                    <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                      <option value="Efectivo">Efectivo</option>
                      <option value="QR">QR Bancario</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Monto Pagado Ahora (Bs)</span>
                    <input type="number" step="0.01" value={pagadoBs} onChange={e => setPagadoBs(e.target.value)} />
                  </label>
                </div>
                <div className="mj-bloque" style={{ marginTop: 12, marginBottom: 0 }}>
                  <div>Total Venta: <strong className="mono">{fmtBs(totalDirecta)}</strong></div>
                  <div>Saldo a Crédito: <strong className="mono rojo">{fmtBs(Math.max(0, totalDirecta - Number(pagadoBs || 0)))}</strong></div>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalVenta(false)}>Cancelar</button>
                <button type="submit" className="btn primario"><ShoppingBag size={15} /> Registrar Venta</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cobrar Saldo */}
      {modalAbono && (
        <div className="capa" onClick={() => setModalAbono(null)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Registrar Cobro de Saldo · {modalAbono.codigo}</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalAbono(null)}>Cerrar</button>
            </header>
            <form onSubmit={registrarAbono}>
              <div className="dialogo-cuerpo">
                <p>
                  Cliente: <strong>{modalAbono.cliente_nombre}</strong> · Saldo pendiente: <strong className="rojo mono">{fmtBs(modalAbono.saldo_bs)}</strong>
                </p>
                <div className="formulario">
                  <label className="campo">
                    <span>Método de Pago</span>
                    <select value={metodoAbono} onChange={e => setMetodoAbono(e.target.value)}>
                      <option value="QR">QR Simple / Bancario</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Transferencia">Transferencia</option>
                      <option value="Tarjeta">Tarjeta</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Monto a Cobrar (Bs)</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={modalAbono.saldo_bs}
                      value={montoAbono}
                      onChange={e => setMontoAbono(e.target.value)}
                    />
                  </label>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalAbono(null)}>Cancelar</button>
                <button type="submit" className="btn oro"><CreditCard size={15} /> Confirmar Cobro</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
