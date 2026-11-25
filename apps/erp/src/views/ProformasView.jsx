import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, MessageCircle, ArrowRightCircle, Search, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { fmtBs, fmtNum, EtiquetaEstado } from '@jerusalen/ui';
import { apiFetch } from '../../../../src/api';
import { generarProformaPDF, enlaceWhatsAppProforma } from '../../../../src/utils/pdfProforma';

export default function ProformasView({ sucursal, usuario, onNotificar, onConvertida }) {
  const [proformas, setProformas] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalConvertir, setModalConvertir] = useState(null);

  // Formulario nueva proforma
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteNit, setClienteNit] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('+591 70314442');
  const [validezDias, setValidezDias] = useState(15);
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [notas, setNotas] = useState('Entrega e instalación en obra. Incluye pulido y sellado.');
  const [items, setItems] = useState([
    {
      material_id: '',
      tipo_item: 'm2',
      descripcion: 'Piedra Sinterizada Taj Mahal Gold Brasil',
      largo_m: 3.0,
      ancho_m: 1.7,
      cantidad: 5.1,
      precio_unit_bs: 1250,
    },
    {
      material_id: '',
      tipo_item: 'corte_colocacion',
      descripcion: 'Servicio de corte en sierra puente, biselado 45° y colocación',
      largo_m: 1,
      ancho_m: 1,
      cantidad: 5.1,
      precio_unit_bs: 180,
    },
  ]);

  // Modal convertir a venta
  const [metodoPagoConv, setMetodoPagoConv] = useState('Transferencia');
  const [pagadoConv, setPagadoConv] = useState(0);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [pRes, mRes, cRes] = await Promise.all([
        apiFetch(`/api/erp/proformas?sucursal_id=${sucursal}`),
        apiFetch(`/api/erp/inventario?sucursal_id=${sucursal}`),
        apiFetch('/api/erp/clientes'),
      ]);
      setProformas(pRes.proformas || []);
      setMateriales(mRes.materiales || []);
      setClientes(cRes.clientes || []);
    } catch (e) {
      onNotificar?.(e.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [sucursal]);

  const seleccionarClienteExistente = (idStr) => {
    const cli = clientes.find(c => String(c.id) === String(idStr));
    if (cli) {
      setClienteNombre(cli.nombre);
      setClienteNit(cli.nit_ci || '');
      setClienteTelefono(cli.telefono || '');
    }
  };

  const agregarItem = (tipo = 'm2') => {
    const matDefault = materiales.find(m => m.familia === 'plancha') || materiales[0];
    if (tipo === 'corte_colocacion') {
      setItems(prev => [
        ...prev,
        {
          material_id: '',
          tipo_item: 'corte_colocacion',
          descripcion: 'Servicio de corte a medida, pulido de canto y colocación en obra',
          largo_m: 1,
          ancho_m: 1,
          cantidad: 4.0,
          precio_unit_bs: 180,
        },
      ]);
      return;
    }
    const area = matDefault ? Number(((matDefault.largo_cm * matDefault.ancho_cm) / 10000).toFixed(2)) : 5.1;
    setItems(prev => [
      ...prev,
      {
        material_id: matDefault?.id || '',
        tipo_item: tipo,
        descripcion: matDefault?.nombre || 'Mármol / Granito Brasil',
        largo_m: matDefault ? matDefault.largo_cm / 100 : 3.0,
        ancho_m: matDefault ? matDefault.ancho_cm / 100 : 1.7,
        cantidad: tipo === 'plancha' ? 1 : area,
        precio_unit_bs: tipo === 'plancha' ? (matDefault?.precio_plancha_bs || 5800) : (matDefault?.precio_m2_bs || 1150),
      },
    ]);
  };

  const actualizarItem = (idx, campo, valor) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const copia = { ...it, [campo]: valor };
      if (campo === 'material_id') {
        const mat = materiales.find(m => String(m.id) === String(valor));
        if (mat) {
          copia.descripcion = `${mat.nombre} (${mat.acabado})`;
          if (copia.tipo_item === 'plancha') {
            copia.precio_unit_bs = mat.precio_plancha_bs || Math.round(mat.precio_m2_bs * 5.1);
            copia.cantidad = 1;
          } else {
            copia.precio_unit_bs = mat.precio_m2_bs;
          }
        }
      }
      if (campo === 'largo_m' || campo === 'ancho_m') {
        if (copia.tipo_item === 'm2') {
          copia.cantidad = Number((Number(copia.largo_m || 1) * Number(copia.ancho_m || 1)).toFixed(2));
        }
      }
      return copia;
    }));
  };

  const eliminarItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotalForm = useMemo(
    () => items.reduce((s, it) => s + Number(it.cantidad || 0) * Number(it.precio_unit_bs || 0), 0),
    [items]
  );
  const descuentoBsForm = subtotalForm * (Number(descuentoPct || 0) / 100);
  const totalForm = subtotalForm - descuentoBsForm;

  const guardarProforma = async (e) => {
    e.preventDefault();
    if (!clienteNombre.trim()) {
      onNotificar?.('Ingresa el nombre del cliente.', 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/erp/proformas', {
        method: 'POST',
        body: JSON.stringify({
          sucursal_id: sucursal === 'todas' ? (usuario?.sucursal_id || 1) : Number(sucursal),
          cliente_nombre: clienteNombre,
          cliente_nit: clienteNit,
          cliente_telefono: clienteTelefono,
          validez_dias: Number(validezDias),
          descuento_pct: Number(descuentoPct),
          notas,
          items,
        }),
      });
      onNotificar?.(`Proforma ${res.codigo} creada por ${fmtBs(res.total_bs)}.`);
      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await apiFetch(`/api/erp/proformas/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado }),
      });
      onNotificar?.(`Estado actualizado a ${estado}.`);
      cargarDatos();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const confirmarConversion = async (e) => {
    e.preventDefault();
    if (!modalConvertir) return;
    try {
      const res = await apiFetch(`/api/erp/proformas/${modalConvertir.id}/convertir`, {
        method: 'POST',
        body: JSON.stringify({
          metodo_pago: metodoPagoConv,
          pagado_bs: Number(pagadoConv),
        }),
      });
      onNotificar?.(`Proforma convertida en Venta ${res.codigo}.`);
      setModalConvertir(null);
      cargarDatos();
      onConvertida?.();
    } catch (err) {
      onNotificar?.(err.message, 'error');
    }
  };

  const proformasFiltradas = proformas.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    return (
      p.codigo?.toLowerCase().includes(q) ||
      p.cliente_nombre?.toLowerCase().includes(q) ||
      p.vendedor_nombre?.toLowerCase().includes(q)
    );
  });

  const totalCotizado = proformasFiltradas.reduce((s, p) => s + p.total_bs, 0);
  const convertidasCount = proformasFiltradas.filter(p => p.estado === 'convertida' || p.estado === 'aceptada').length;

  return (
    <div>
      <div className="mj-titular con-accion">
        <div>
          <p className="mj-ceja">Módulo Comercial · Cotizaciones de Taller y Showroom</p>
          <h1>Proformas de Venta</h1>
        </div>
        <button type="button" className="btn primario" onClick={() => setModalAbierto(true)}>
          <Plus size={16} /> Nueva Proforma
        </button>
      </div>

      <div className="mj-cifras">
        <div className="mj-cifra oro-top">
          <span>Proformas Listadas</span>
          <strong>{proformasFiltradas.length}</strong>
          <small>Total cotizado: {fmtBs(totalCotizado)}</small>
        </div>
        <div className="mj-cifra">
          <span>Aceptadas / Convertidas</span>
          <strong>{convertidasCount}</strong>
          <small>
            Conversión: {proformasFiltradas.length ? fmtNum((convertidasCount / proformasFiltradas.length) * 100, 1) : '0'}%
          </small>
        </div>
        <div className="mj-cifra">
          <span>En Seguimiento (Enviadas)</span>
          <strong>{proformasFiltradas.filter(p => p.estado === 'enviada').length}</strong>
          <small>Listas para enviar por WhatsApp o convertir</small>
        </div>
      </div>

      <div className="barra-filtros">
        <div className="buscador">
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar por código (PRF-26-...), cliente o vendedor..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="todos">Todos los estados</option>
          <option value="enviada">Enviadas</option>
          <option value="aceptada">Aceptadas</option>
          <option value="convertida">Convertidas en venta</option>
          <option value="vencida">Vencidas</option>
          <option value="rechazada">Rechazadas</option>
        </select>
      </div>

      <div className="tabla-marco">
        <table className="tabla">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha / Validez</th>
              <th>Cliente</th>
              <th>Vendedor / Sede</th>
              <th>Detalle</th>
              <th>Estado</th>
              <th className="derecha">Total (Bs)</th>
              <th>Acciones (PDF / WhatsApp / Venta)</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28 }}>Cargando proformas...</td></tr>
            ) : proformasFiltradas.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 28 }}>No hay proformas con ese filtro.</td></tr>
            ) : (
              proformasFiltradas.map(p => (
                <tr key={p.id}>
                  <td className="mono"><strong>{p.codigo}</strong></td>
                  <td>
                    <div>{p.fecha}</div>
                    <small className="suave">Vence: {p.fecha_vencimiento || `${p.validez_dias}d`}</small>
                  </td>
                  <td>
                    <strong>{p.cliente_nombre}</strong>
                    {p.cliente_nit && <div><small className="suave">NIT/CI: {p.cliente_nit}</small></div>}
                  </td>
                  <td>
                    <div>{p.vendedor_nombre}</div>
                    <small className="suave">{p.sucursal_codigo || 'SCZ'}</small>
                  </td>
                  <td>
                    <small>
                      {(p.items || []).map(i => `${i.descripcion} (${i.cantidad})`).join(' · ').slice(0, 68)}
                    </small>
                  </td>
                  <td><EtiquetaEstado estado={p.estado} /></td>
                  <td className="derecha">
                    <strong>{fmtBs(p.total_bs)}</strong>
                    {p.descuento_pct > 0 && <div><small className="suave">-{p.descuento_pct}% desc.</small></div>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn pequeno"
                        title="Descargar PDF con marca Jerusalén S.R.L."
                        onClick={() => generarProformaPDF(p, 'PROFORMA DE VENTA')}
                      >
                        <FileText size={13} /> PDF
                      </button>
                      <a
                        href={enlaceWhatsAppProforma(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn pequeno"
                        style={{ color: 'var(--estado)' }}
                        title="Enviar proforma por WhatsApp"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                      {p.estado !== 'convertida' && (
                        <>
                          {p.estado === 'enviada' && (
                            <button
                              type="button"
                              className="btn pequeno"
                              title="Marcar como aceptada"
                              onClick={() => cambiarEstado(p.id, 'aceptada')}
                            >
                              <CheckCircle2 size={13} /> Aceptar
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn pequeno oro"
                            title="Convertir en Venta"
                            onClick={() => {
                              setModalConvertir(p);
                              setPagadoConv(p.total_bs);
                              setMetodoPagoConv('Transferencia');
                            }}
                          >
                            <ArrowRightCircle size={13} /> Convertir a Venta
                          </button>
                          {p.estado === 'enviada' && (
                            <button
                              type="button"
                              className="btn pequeno peligro"
                              title="Marcar rechazada"
                              onClick={() => cambiarEstado(p.id, 'rechazada')}
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nueva Proforma */}
      {modalAbierto && (
        <div className="capa" onClick={() => setModalAbierto(false)}>
          <div className="dialogo ancho" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Generador de Proforma de Venta</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalAbierto(false)}>Cerrar</button>
            </header>
            <form onSubmit={guardarProforma}>
              <div className="dialogo-cuerpo">
                <div className="formulario" style={{ marginBottom: 16 }}>
                  <label className="campo">
                    <span>Cargar cliente frecuente (opcional)</span>
                    <select onChange={e => seleccionarClienteExistente(e.target.value)} defaultValue="">
                      <option value="">-- Seleccionar o escribir abajo --</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.zona})</option>
                      ))}
                    </select>
                  </label>
                  <label className="campo">
                    <span>Nombre / Razón Social del Cliente *</span>
                    <input required value={clienteNombre} onChange={e => setClienteNombre(e.target.value)} placeholder="Ej. Sra. Hortensia Cronenbold" />
                  </label>
                  <label className="campo">
                    <span>NIT / C.I.</span>
                    <input value={clienteNit} onChange={e => setClienteNit(e.target.value)} placeholder="Ej. 389421029" />
                  </label>
                  <label className="campo">
                    <span>Teléfono WhatsApp</span>
                    <input value={clienteTelefono} onChange={e => setClienteTelefono(e.target.value)} placeholder="+591 70314442" />
                  </label>
                  <label className="campo">
                    <span>Validez de la oferta (días)</span>
                    <input type="number" min="1" max="90" value={validezDias} onChange={e => setValidezDias(e.target.value)} />
                  </label>
                  <label className="campo">
                    <span>Descuento Comercial (%)</span>
                    <input type="number" min="0" max="40" step="0.5" value={descuentoPct} onChange={e => setDescuentoPct(e.target.value)} />
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Ítems de la Proforma (Plancha entera, Pieza por m² o Servicio de Corte/Colocación)</strong>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn pequeno" onClick={() => agregarItem('m2')}>+ Pieza por m²</button>
                    <button type="button" className="btn pequeno" onClick={() => agregarItem('plancha')}>+ Plancha Entera</button>
                    <button type="button" className="btn pequeno" onClick={() => agregarItem('corte_colocacion')}>+ Corte/Colocación</button>
                  </div>
                </div>

                <div className="tabla-marco" style={{ marginBottom: 14 }}>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th>Material / Descripción</th>
                        <th>Largo(m)</th>
                        <th>Ancho(m)</th>
                        <th>Cant./m²</th>
                        <th>P. Unit (Bs)</th>
                        <th className="derecha">Subtotal</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx}>
                          <td>
                            <select value={it.tipo_item} onChange={e => actualizarItem(idx, 'tipo_item', e.target.value)}>
                              <option value="m2">Pieza m²</option>
                              <option value="plancha">Plancha</option>
                              <option value="corte_colocacion">Corte/Coloc.</option>
                            </select>
                          </td>
                          <td>
                            {it.tipo_item !== 'corte_colocacion' && (
                              <select
                                value={it.material_id}
                                onChange={e => actualizarItem(idx, 'material_id', e.target.value)}
                                style={{ marginBottom: 4 }}
                              >
                                <option value="">-- Elegir piedra de stock --</option>
                                {materiales.filter(m => m.familia === 'plancha').map(m => (
                                  <option key={m.id} value={m.id}>{m.nombre} (Bs {m.precio_m2_bs}/m²)</option>
                                ))}
                              </select>
                            )}
                            <input
                              value={it.descripcion}
                              onChange={e => actualizarItem(idx, 'descripcion', e.target.value)}
                            />
                          </td>
                          <td style={{ width: 80 }}>
                            <input
                              type="number"
                              step="0.01"
                              value={it.largo_m}
                              onChange={e => actualizarItem(idx, 'largo_m', e.target.value)}
                              disabled={it.tipo_item !== 'm2'}
                            />
                          </td>
                          <td style={{ width: 80 }}>
                            <input
                              type="number"
                              step="0.01"
                              value={it.ancho_m}
                              onChange={e => actualizarItem(idx, 'ancho_m', e.target.value)}
                              disabled={it.tipo_item !== 'm2'}
                            />
                          </td>
                          <td style={{ width: 90 }}>
                            <input
                              type="number"
                              step="0.01"
                              value={it.cantidad}
                              onChange={e => actualizarItem(idx, 'cantidad', e.target.value)}
                            />
                          </td>
                          <td style={{ width: 110 }}>
                            <input
                              type="number"
                              step="1"
                              value={it.precio_unit_bs}
                              onChange={e => actualizarItem(idx, 'precio_unit_bs', e.target.value)}
                            />
                          </td>
                          <td className="derecha">
                            {fmtBs(Number(it.cantidad || 0) * Number(it.precio_unit_bs || 0))}
                          </td>
                          <td>
                            {items.length > 1 && (
                              <button type="button" className="btn-icono" onClick={() => eliminarItem(idx)}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mj-dos-igual" style={{ alignItems: 'end' }}>
                  <label className="campo">
                    <span>Observaciones / Condiciones de Instalación</span>
                    <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
                  </label>
                  <div className="mj-bloque" style={{ margin: 0, textAlign: 'right' }}>
                    <div>Subtotal: <strong className="mono">{fmtBs(subtotalForm)}</strong></div>
                    {Number(descuentoPct) > 0 && (
                      <div className="suave">Descuento ({descuentoPct}%): - {fmtBs(descuentoBsForm)}</div>
                    )}
                    <div style={{ fontSize: 22, marginTop: 4 }}>
                      Total Proforma: <strong className="serif verde">{fmtBs(totalForm)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn primario">Guardar Proforma</button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* Modal Convertir Proforma en Venta */}
      {modalConvertir && (
        <div className="capa" onClick={() => setModalConvertir(null)}>
          <div className="dialogo" onClick={e => e.stopPropagation()}>
            <header>
              <h2>Convertir Proforma {modalConvertir.codigo} en Venta</h2>
              <button type="button" className="btn pequeno" onClick={() => setModalConvertir(null)}>Cerrar</button>
            </header>
            <form onSubmit={confirmarConversion}>
              <div className="dialogo-cuerpo">
                <p>
                  Cliente: <strong>{modalConvertir.cliente_nombre}</strong> · Total: <strong className="mono">{fmtBs(modalConvertir.total_bs)}</strong>
                </p>
                <div className="formulario">
                  <label className="campo">
                    <span>Método de Pago</span>
                    <select value={metodoPagoConv} onChange={e => setMetodoPagoConv(e.target.value)}>
                      <option value="Efectivo">Efectivo (Bs)</option>
                      <option value="QR">QR Simple / Bancario</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Tarjeta">Tarjeta Débito / Crédito</option>
                    </select>
                  </label>
                  <label className="campo">
                    <span>Monto Pagado Hoy (Bs) — El resto queda como saldo/crédito</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={modalConvertir.total_bs}
                      value={pagadoConv}
                      onChange={e => setPagadoConv(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mj-bloque" style={{ marginTop: 12, marginBottom: 0 }}>
                  <div>Cobro inmediato: <strong className="verde mono">{fmtBs(pagadoConv)}</strong></div>
                  <div>Saldo pendiente (Crédito): <strong className="rojo mono">{fmtBs(Math.max(0, modalConvertir.total_bs - Number(pagadoConv || 0)))}</strong></div>
                </div>
              </div>
              <footer>
                <button type="button" className="btn" onClick={() => setModalConvertir(null)}>Cancelar</button>
                <button type="submit" className="btn oro">Confirmar Venta y Descontar Stock</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
