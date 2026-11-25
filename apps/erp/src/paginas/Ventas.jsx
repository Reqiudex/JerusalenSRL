// Ventas: lista con saldo, venta directa, detalle con pagos y anulación.
import { useState } from 'react'
import { formatearBs, formatearFecha, formatearNumero } from '@ui/formatos.js'
import { api, consulta } from '../api.js'
import { EditorItems, itemVacio, itemsParaApi } from '../editorItems.jsx'
import { Cabecera, Campo, Cargando, Confirmar, ErrorCarga, Estado, Icono, Modal, SelectorCliente, SelectorSucursal, Tabla, ir, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

const METODOS = { efectivo: 'Efectivo', qr: 'QR', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }

export default function Ventas({ ruta }) {
  const [, id] = ruta.partes
  if (id === 'nueva') return <NuevaVenta />
  if (id) return <DetalleVenta id={id} />
  return <ListaVentas params={ruta.params} />
}

function ListaVentas({ params }) {
  const { usuario } = useApp()
  const puede = usePuede()
  const [f, setF] = useState({ q: '', desde: params.desde ?? '', hasta: '', sucursal: '', conSaldo: params.conSaldo ?? '', vendedor: '' })
  const { datos: vendedores } = useDatos(usuario.rol !== 'vendedor' ? '/personas?rol=vendedor' : null)
  const { datos, error, cargando, recargar } = useDatos(`/ventas${consulta({ ...f, limite: 500 })}`)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const vigentes = (datos ?? []).filter((v) => v.estado === 'vigente')
  return (
    <>
      <Cabecera titulo="Ventas y cobros" subtitulo="Ventas desde proformas o directas, con pagos y saldo pendiente."
        acciones={puede('ventas', 'escribir') ? <a className="boton boton-primario" href="#/ventas/nueva"><Icono nombre="mas" /> Venta directa</a> : null} />
      <div className="filtros">
        <Campo etiqueta="Buscar" className="campo-busqueda" type="search" placeholder="Código o cliente" value={f.q} onChange={set('q')} />
        <Campo etiqueta="Desde" type="date" value={f.desde} onChange={set('desde')} />
        <Campo etiqueta="Hasta" type="date" value={f.hasta} onChange={set('hasta')} />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        {vendedores ? (
          <Campo etiqueta="Vendedor" como="select" value={f.vendedor} onChange={set('vendedor')}>
            <option value="">Todos</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Campo>
        ) : null}
        <Campo etiqueta="Mostrar" como="select" value={f.conSaldo} onChange={set('conSaldo')}>
          <option value="">Todas</option>
          <option value="1">Solo con saldo pendiente</option>
        </Campo>
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Lista de ventas" filas={datos ?? []} alElegir={(v) => ir(`ventas/${v.id}`)} vacio="No hay ventas con esos filtros."
          columnas={[
            { titulo: 'Código', valor: (v) => <strong className="mono">{v.codigo}</strong> },
            { titulo: 'Fecha', valor: (v) => formatearFecha(v.fecha) },
            { titulo: 'Cliente', valor: (v) => v.cliente },
            { titulo: 'Vendedor', valor: (v) => v.vendedor },
            { titulo: 'Estado', valor: (v) => (v.estado === 'anulada' ? <Estado valor="anulada" /> : <Estado valor={v.estadoPago} />) },
            { titulo: 'Total', num: true, valor: (v) => formatearBs(v.total) },
            { titulo: 'Saldo', num: true, valor: (v) => (v.estado === 'anulada' ? '—' : v.saldo > 0 ? <strong>{formatearBs(v.saldo)}</strong> : '0') },
          ]}
          pie={vigentes.length ? <tr><td colSpan={5}>{vigentes.length} ventas vigentes</td><td className="num">{formatearBs(vigentes.reduce((s, v) => s + v.total, 0))}</td><td className="num">{formatearBs(vigentes.reduce((s, v) => s + v.saldo, 0))}</td></tr> : null} />
      )}
    </>
  )
}

function NuevaVenta() {
  const { usuario, notificar } = useApp()
  const [cliente, setCliente] = useState(null)
  const [items, setItems] = useState([itemVacio()])
  const [descuento, setDescuento] = useState(0)
  const [sucursal, setSucursal] = useState(usuario.sucursal_id ?? 1)
  const [pago, setPago] = useState({ monto: '', metodo: 'efectivo' })
  const [notas, setNotas] = useState('')
  const [ejecutar, ocupado] = useAccion()
  const guardar = async (e) => {
    e.preventDefault()
    if (!cliente) return notificar('Elige o escribe el cliente.', 'error')
    const r = await ejecutar(() => api.post('/ventas', {
      ...(cliente.id ? { cliente_id: cliente.id } : { cliente: { nombre: cliente.nombre, telefono: cliente.telefono } }),
      sucursal_id: sucursal, descuento_pct: Number(descuento) || 0, notas, items: itemsParaApi(items),
      ...(Number(pago.monto) > 0 ? { pago: { monto: Number(pago.monto), metodo: pago.metodo } } : {}),
    }), 'Venta registrada.')
    if (r) ir(`ventas/${r.id}`)
  }
  return (
    <>
      <Cabecera titulo="Venta directa" subtitulo="Para ventas de mostrador sin proforma previa." volver="ventas" />
      <form className="pila" onSubmit={guardar}>
        <section className="tarjeta formulario">
          <div className="ancho-completo"><SelectorCliente valor={cliente} alCambiar={setCliente} /></div>
          <SelectorSucursal valor={sucursal} alCambiar={setSucursal} todas={false} />
          <Campo etiqueta="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </section>
        <section className="tarjeta"><h2>Ítems</h2><EditorItems items={items} setItems={setItems} descuento={descuento} setDescuento={setDescuento} /></section>
        <section className="tarjeta formulario">
          <Campo etiqueta="Pago ahora (Bs)" type="number" min="0" step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} ayuda="Vacío si queda a crédito." />
          <Campo etiqueta="Forma de pago" como="select" value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
            {Object.entries(METODOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Campo>
        </section>
        <div className="fila" style={{ justifyContent: 'flex-end' }}>
          <a className="boton" href="#/ventas">Cancelar</a>
          <button type="submit" className="boton boton-primario" disabled={ocupado}>Registrar venta</button>
        </div>
      </form>
    </>
  )
}

function DetalleVenta({ id }) {
  const { usuario } = useApp()
  const puede = usePuede()
  const { datos: v, error, recargar } = useDatos(`/ventas/${id}`)
  const [modal, setModal] = useState(null)
  const [pago, setPago] = useState({ monto: '', metodo: 'efectivo', referencia: '' })
  const [motivo, setMotivo] = useState('')
  const [ejecutar, ocupado] = useAccion()
  if (error) return <ErrorCarga error={error} reintentar={recargar} />
  if (!v) return <Cargando />
  const escribe = puede('ventas', 'escribir') && v.estado === 'vigente'
  return (
    <>
      <Cabecera titulo={`Venta ${v.codigo}`} volver="ventas"
        subtitulo={<>{v.estado === 'anulada' ? <Estado valor="anulada" /> : <Estado valor={v.estadoPago} />} {v.cliente} · {formatearFecha(v.fecha)}</>}
        acciones={
          <>
            {escribe && v.saldo > 0 ? <button type="button" className="boton boton-primario" onClick={() => { setPago({ monto: String(v.saldo), metodo: 'efectivo', referencia: '' }); setModal('pago') }}><Icono nombre="dinero" /> Registrar pago</button> : null}
            {escribe && usuario.rol === 'administrador' ? <button type="button" className="boton boton-peligro" onClick={() => setModal('anular')}>Anular</button> : null}
            <button type="button" className="boton" onClick={() => window.print()}>Imprimir</button>
          </>
        } />
      <div className="rejilla" style={{ '--min': '180px' }}>
        <div className="tarjeta kpi"><div className="kpi-etiqueta">Total</div><div className="kpi-valor">{formatearBs(v.total)}</div></div>
        <div className="tarjeta kpi"><div className="kpi-etiqueta">Pagado</div><div className="kpi-valor">{formatearBs(v.pagado)}</div></div>
        <div className="tarjeta kpi"><div className="kpi-etiqueta">Saldo</div><div className="kpi-valor">{formatearBs(v.saldo)}</div></div>
        <div className="tarjeta kpi"><div className="kpi-etiqueta">Margen bruto</div><div className="kpi-valor">{formatearBs(v.total - v.costo)}</div><div className="kpi-detalle">Costo de material {formatearBs(v.costo)}</div></div>
      </div>
      <div className="dos-columnas seccion">
        <section className="tarjeta">
          <h2>Ítems</h2>
          <Tabla etiqueta="Ítems de la venta" filas={v.items} columnas={[
            { titulo: 'Descripción', valor: (i) => i.descripcion },
            { titulo: 'Cantidad', num: true, valor: (i) => `${formatearNumero(i.cantidad)} ${i.unidad === 'm2' ? 'm²' : i.unidad}` },
            { titulo: 'Precio', num: true, valor: (i) => formatearBs(i.precio_unit) },
            { titulo: 'Total', num: true, valor: (i) => formatearBs(i.total) },
          ]} />
          {v.notas ? <p className="suave" style={{ whiteSpace: 'pre-line', marginTop: 12 }}>{v.notas}</p> : null}
        </section>
        <div className="pila">
          <section className="tarjeta">
            <h2>Datos</h2>
            <dl className="resumen-doc">
              <dt>Cliente</dt><dd>{v.cliente} {v.cliente_telefono ? `· ${v.cliente_telefono}` : ''}</dd>
              <dt>Vendedor</dt><dd>{v.vendedor}</dd>
              <dt>Sucursal</dt><dd>{v.sucursal}</dd>
              {v.proforma_id ? <><dt>Proforma</dt><dd><a href={`#/proformas/${v.proforma_id}`}>{v.proforma_codigo}</a></dd></> : null}
            </dl>
          </section>
          <section className="tarjeta">
            <h2>Pagos</h2>
            <ul className="lista-simple">
              {v.pagos.length === 0 ? <li className="suave">Sin pagos todavía.</li> : v.pagos.map((p) => (
                <li key={p.id}><span>{formatearFecha(p.fecha)} · {METODOS[p.metodo]}{p.referencia ? <small className="suave"> · {p.referencia}</small> : null}</span><span className="num">{formatearBs(p.monto)}</span></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {modal === 'pago' ? (
        <Modal titulo="Registrar pago" alCerrar={() => setModal(null)} ancho="460px" pie={
          <>
            <button type="button" className="boton" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="boton boton-primario" disabled={ocupado} onClick={async () => {
              const r = await ejecutar(() => api.post(`/ventas/${v.id}/pagos`, { monto: Number(pago.monto), metodo: pago.metodo, referencia: pago.referencia }), 'Pago registrado.')
              if (r) { setModal(null); recargar() }
            }}>Guardar pago</button>
          </>
        }>
          <p>Saldo pendiente: <strong>{formatearBs(v.saldo)}</strong></p>
          <div className="formulario">
            <Campo etiqueta="Monto (Bs)" type="number" min="0.01" max={v.saldo} step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} required />
            <Campo etiqueta="Forma de pago" como="select" value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
              {Object.entries(METODOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </Campo>
            <Campo etiqueta="Referencia" className="ancho-completo" placeholder="Nº de transferencia, recibo…" value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} />
          </div>
        </Modal>
      ) : null}
      {modal === 'anular' ? (
        <Confirmar titulo="Anular venta" peligro textoBoton="Anular venta" alCerrar={() => setModal(null)}
          texto="La venta dejará de contar en ingresos y reportes. Los insumos vuelven al stock y la proforma queda como aceptada."
          alConfirmar={async () => Boolean(await ejecutar(() => api.post(`/ventas/${v.id}/anular`, { motivo }), 'Venta anulada.').then((r) => (r && recargar(), r)))}>
          <Campo etiqueta="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Confirmar>
      ) : null}
    </>
  )
}
