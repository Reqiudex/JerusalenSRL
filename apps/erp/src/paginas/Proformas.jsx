// Proformas: lista con filtros, editor (nueva/editar), detalle con PDF, WhatsApp, estados y conversión en venta.
import { useEffect, useState } from 'react'
import { ESTADOS_PROFORMA, enlaceWhatsApp, textoWhatsApp, transicionPermitida } from '@reportes/proformas.js'
import { formatearBs, formatearFecha, formatearNumero } from '@ui/formatos.js'
import { api, consulta } from '../api.js'
import { EditorItems, itemVacio, itemsParaApi } from '../editorItems.jsx'
import { generarPdfProforma } from '../pdf.js'
import {
  Cabecera, Campo, Cargando, Confirmar, ErrorCarga, Estado, Icono, Modal, SelectorCliente, SelectorSucursal, Tabla, ir, useAccion, useApp, useDatos, usePuede,
} from '../componentes.jsx'

export default function Proformas({ ruta }) {
  const [, id, sub] = ruta.partes
  if (id === 'nueva') return <EditorProforma />
  if (id && sub === 'editar') return <EditorProforma id={id} />
  if (id) return <DetalleProforma id={id} />
  return <ListaProformas params={ruta.params} />
}

function ListaProformas({ params }) {
  const { usuario } = useApp()
  const puede = usePuede()
  const [f, setF] = useState({ estado: params.estado ?? '', vendedor: '', q: '', desde: '', hasta: '' })
  const { datos: vendedores } = useDatos(usuario.rol !== 'vendedor' ? '/personas?rol=vendedor' : null)
  const { datos, error, cargando, recargar } = useDatos(`/proformas${consulta({ ...f, limite: 400 })}`)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const total = (datos ?? []).reduce((s, p) => s + p.total, 0)
  return (
    <>
      <Cabecera titulo="Proformas" subtitulo="Cotizaciones a clientes. Cada una registra el vendedor que la hizo."
        acciones={puede('proformas', 'escribir') ? <a className="boton boton-primario" href="#/proformas/nueva"><Icono nombre="mas" /> Nueva proforma</a> : null} />
      <div className="filtros">
        <Campo etiqueta="Buscar" className="campo-busqueda" placeholder="Código o cliente" value={f.q} onChange={set('q')} type="search" />
        <Campo etiqueta="Estado" como="select" value={f.estado} onChange={set('estado')}>
          <option value="">Todos</option>
          {Object.entries(ESTADOS_PROFORMA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Campo>
        {vendedores ? (
          <Campo etiqueta="Vendedor" como="select" value={f.vendedor} onChange={set('vendedor')}>
            <option value="">Todos</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
          </Campo>
        ) : null}
        <Campo etiqueta="Desde" type="date" value={f.desde} onChange={set('desde')} />
        <Campo etiqueta="Hasta" type="date" value={f.hasta} onChange={set('hasta')} />
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Lista de proformas" filas={datos ?? []} alElegir={(p) => ir(`proformas/${p.id}`)} vacio="No hay proformas con esos filtros."
          columnas={[
            { titulo: 'Código', valor: (p) => <strong className="mono">{p.codigo}</strong> },
            { titulo: 'Fecha', valor: (p) => formatearFecha(p.fecha) },
            { titulo: 'Cliente', valor: (p) => p.cliente },
            { titulo: 'Vendedor', valor: (p) => p.vendedor },
            { titulo: 'Estado', valor: (p) => <Estado valor={p.estado} /> },
            { titulo: 'Vence', valor: (p) => (['enviada', 'aceptada'].includes(p.estado) ? formatearFecha(p.vence) : '—') },
            { titulo: 'Total', num: true, valor: (p) => formatearBs(p.total) },
          ]}
          pie={datos?.length ? <tr><td colSpan={6}>{datos.length} proformas</td><td className="num">{formatearBs(total)}</td></tr> : null} />
      )}
    </>
  )
}

function EditorProforma({ id }) {
  const { usuario, ajustes, notificar } = useApp()
  const { datos: existente, error } = useDatos(id ? `/proformas/${id}` : null)
  const { datos: vendedores } = useDatos(usuario.rol !== 'vendedor' ? '/personas?rol=vendedor' : null)
  const [cliente, setCliente] = useState(null)
  const [items, setItems] = useState([itemVacio()])
  const [descuento, setDescuento] = useState(0)
  const [cab, setCab] = useState({ fecha: '', validez_dias: ajustes?.proformas?.validez_dias ?? 15, notas: '', sucursal_id: usuario.sucursal_id ?? 1, vendedor_id: usuario.id })
  const [ejecutar, ocupado] = useAccion()

  // Viene de «Crear proforma con este precio» en la calculadora de costos
  useEffect(() => {
    if (id) return
    const guardado = sessionStorage.getItem('proforma-desde-calculo')
    if (!guardado) return
    sessionStorage.removeItem('proforma-desde-calculo')
    try {
      const x = JSON.parse(guardado)
      setItems([{ ...itemVacio(), tipo: 'pieza', material_id: x.material_id || '', descripcion: x.nombre || 'Trabajo según cálculo de costos (material, insumos y colocación)', cantidad: x.m2, precio_unit: x.precioM2 }])
    } catch {
      /* dato inválido: se ignora */
    }
  }, [id])

  useEffect(() => {
    if (!existente) return
    setCliente({ id: existente.cliente_id, nombre: existente.cliente, telefono: existente.cliente_telefono })
    setItems(existente.items.map((i) => ({ ...i, material_id: i.material_id ?? '', ancho_cm: i.ancho_cm ?? '', alto_cm: i.alto_cm ?? '', piezas: i.piezas ?? 1 })))
    setDescuento(existente.descuento_pct)
    setCab({ fecha: existente.fecha, validez_dias: existente.validez_dias, notas: existente.notas, sucursal_id: existente.sucursal_id, vendedor_id: existente.vendedor_id })
  }, [existente])

  if (error) return <ErrorCarga error={error} />
  if (id && !existente) return <Cargando />

  const guardar = async (estado) => {
    if (!cliente) return notificar('Elige o escribe el cliente.', 'error')
    const cuerpo = {
      ...(cliente.id ? { cliente_id: cliente.id } : { cliente: { nombre: cliente.nombre, telefono: cliente.telefono } }),
      fecha: cab.fecha || undefined,
      validez_dias: Number(cab.validez_dias),
      notas: cab.notas,
      sucursal_id: cab.sucursal_id,
      vendedor_id: usuario.rol === 'vendedor' ? undefined : Number(cab.vendedor_id),
      descuento_pct: Number(descuento) || 0,
      items: itemsParaApi(items),
      ...(id ? {} : { estado }),
    }
    const r = await ejecutar(() => (id ? api.put(`/proformas/${id}`, cuerpo) : api.post('/proformas', cuerpo)), id ? 'Proforma actualizada.' : 'Proforma creada.')
    if (r) ir(`proformas/${r.id}`)
  }

  return (
    <>
      <Cabecera titulo={id ? `Editar ${existente.codigo}` : 'Nueva proforma'} volver={id ? `proformas/${id}` : 'proformas'} />
      <form className="pila" onSubmit={(e) => { e.preventDefault(); guardar('enviada') }}>
        <section className="tarjeta">
          <div className="formulario">
            <div className="ancho-completo"><SelectorCliente valor={cliente} alCambiar={setCliente} /></div>
            <Campo etiqueta="Fecha" type="date" value={cab.fecha} onChange={(e) => setCab({ ...cab, fecha: e.target.value })} ayuda="Vacío = hoy" />
            <Campo etiqueta="Validez (días)" type="number" min="1" max="365" value={cab.validez_dias} onChange={(e) => setCab({ ...cab, validez_dias: e.target.value })} />
            <SelectorSucursal valor={cab.sucursal_id} alCambiar={(v) => setCab({ ...cab, sucursal_id: v })} todas={false} />
            {vendedores ? (
              <Campo etiqueta="Vendedor" como="select" value={cab.vendedor_id} onChange={(e) => setCab({ ...cab, vendedor_id: e.target.value })}>
                <option value={usuario.id}>{usuario.nombre}</option>
                {vendedores.filter((v) => v.id !== usuario.id).map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </Campo>
            ) : null}
            <Campo etiqueta="Notas para el cliente" como="textarea" className="ancho-completo" value={cab.notas} onChange={(e) => setCab({ ...cab, notas: e.target.value })} placeholder="Ej.: Mesón de cocina en L, incluye perforación para lavaplatos." />
          </div>
        </section>
        <section className="tarjeta">
          <h2>Ítems</h2>
          <EditorItems items={items} setItems={setItems} descuento={descuento} setDescuento={setDescuento} />
        </section>
        <div className="fila" style={{ justifyContent: 'flex-end' }}>
          <a className="boton" href={id ? `#/proformas/${id}` : '#/proformas'}>Cancelar</a>
          {!id ? <button type="button" className="boton" disabled={ocupado} onClick={() => guardar('borrador')}>Guardar borrador</button> : null}
          <button type="submit" className="boton boton-primario" disabled={ocupado}>{id ? 'Guardar cambios' : 'Guardar y marcar enviada'}</button>
        </div>
      </form>
    </>
  )
}

function DetalleProforma({ id }) {
  const { ajustes, notificar } = useApp()
  const puede = usePuede()
  const { datos: p, error, recargar } = useDatos(`/proformas/${id}`)
  const [ejecutar, ocupado] = useAccion()
  const [modal, setModal] = useState(null)
  const [pago, setPago] = useState({ monto: '', metodo: 'efectivo' })
  const [motivo, setMotivo] = useState('')

  if (error) return <ErrorCarga error={error} reintentar={recargar} />
  if (!p) return <Cargando />
  const escribe = puede('proformas', 'escribir')
  const cambiarEstado = async (estado, extra = {}) => {
    const r = await ejecutar(() => api.post(`/proformas/${p.id}/estado`, { estado, ...extra }), `Proforma ${ESTADOS_PROFORMA[estado].toLowerCase()}.`)
    if (r) recargar()
    return Boolean(r)
  }
  const whatsapp = () => {
    if (!p.cliente_telefono) return notificar('El cliente no tiene teléfono registrado.', 'error')
    window.open(enlaceWhatsApp(p.cliente_telefono, textoWhatsApp(p, ajustes?.empresa)), '_blank', 'noopener')
    if (p.estado === 'borrador') cambiarEstado('enviada')
  }

  return (
    <>
      <Cabecera titulo={`Proforma ${p.codigo}`} subtitulo={<><Estado valor={p.estado} /> {p.cliente} · {formatearBs(p.total)}</>} volver="proformas"
        acciones={
          <>
            <button type="button" className="boton" onClick={() => generarPdfProforma(p, ajustes?.empresa, ajustes?.proformas?.condiciones).catch((e) => notificar(`No se pudo crear el PDF: ${e.message}`, 'error'))}><Icono nombre="pdf" /> PDF</button>
            <button type="button" className="boton" onClick={whatsapp}><Icono nombre="whatsapp" /> WhatsApp</button>
            {escribe && !['convertida', 'rechazada'].includes(p.estado) ? <a className="boton" href={`#/proformas/${p.id}/editar`}><Icono nombre="editar" /> Editar</a> : null}
            {escribe ? <button type="button" className="boton" disabled={ocupado} onClick={async () => { const r = await ejecutar(() => api.post(`/proformas/${p.id}/duplicar`), 'Copia creada.'); if (r) ir(`proformas/${r.id}/editar`) }}><Icono nombre="copiar" /> Duplicar</button> : null}
          </>
        } />

      <div className="dos-columnas">
        <section className="tarjeta">
          <h2>Detalle</h2>
          <Tabla etiqueta="Ítems de la proforma" filas={p.items} columnas={[
            { titulo: 'Descripción', valor: (i) => i.descripcion },
            { titulo: 'Medidas', valor: (i) => (i.ancho_cm && i.alto_cm ? `${formatearNumero(i.ancho_cm, 0)} × ${formatearNumero(i.alto_cm, 0)} cm${i.piezas > 1 ? ` × ${i.piezas}` : ''}` : '—') },
            { titulo: 'Cantidad', num: true, valor: (i) => `${formatearNumero(i.cantidad)} ${i.unidad === 'm2' ? 'm²' : i.unidad}` },
            { titulo: 'Precio', num: true, valor: (i) => formatearBs(i.precio_unit) },
            { titulo: 'Total', num: true, valor: (i) => formatearBs(i.total) },
          ]} pie={
            <>
              <tr><td colSpan={4}>Subtotal</td><td className="num">{formatearBs(p.subtotal)}</td></tr>
              {p.descuento_pct > 0 ? <tr><td colSpan={4}>Descuento {formatearNumero(p.descuento_pct, 1)} %</td><td className="num">− {formatearBs(p.subtotal - p.total)}</td></tr> : null}
              <tr><td colSpan={4}><strong>Total</strong></td><td className="num"><strong>{formatearBs(p.total)}</strong></td></tr>
            </>
          } />
          {p.notas ? <p className="suave" style={{ marginTop: 12, whiteSpace: 'pre-line' }}>{p.notas}</p> : null}
        </section>

        <div className="pila">
          <section className="tarjeta">
            <h2>Datos</h2>
            <dl className="resumen-doc">
              <dt>Cliente</dt><dd>{p.cliente}</dd>
              <dt>Teléfono</dt><dd>{p.cliente_telefono || '—'}</dd>
              <dt>Fecha</dt><dd>{formatearFecha(p.fecha)}</dd>
              <dt>Válida hasta</dt><dd>{formatearFecha(p.vence)}</dd>
              <dt>Vendedor</dt><dd>{p.vendedor}</dd>
              <dt>Sucursal</dt><dd>{p.sucursal}</dd>
              {p.motivo ? <><dt>Motivo de rechazo</dt><dd>{p.motivo}</dd></> : null}
              {p.venta_id ? <><dt>Venta</dt><dd><a href={`#/ventas/${p.venta_id}`}>{p.venta_codigo}</a></dd></> : null}
            </dl>
          </section>
          {escribe && p.estado !== 'convertida' ? (
            <section className="tarjeta">
              <h2>Siguiente paso</h2>
              <div className="pila">
                {puede('ventas', 'escribir') && ['enviada', 'aceptada', 'borrador'].includes(p.estado) ? (
                  <button type="button" className="boton boton-primario" onClick={() => { setPago({ monto: String(Math.round(p.total * 0.5 * 100) / 100), metodo: 'efectivo' }); setModal('convertir') }}><Icono nombre="ventas" /> Convertir en venta</button>
                ) : null}
                {transicionPermitida(p.estado, 'enviada') ? <button type="button" className="boton" disabled={ocupado} onClick={() => cambiarEstado('enviada')}>{p.estado === 'vencida' ? 'Reenviar con fecha de hoy' : 'Marcar como enviada'}</button> : null}
                {transicionPermitida(p.estado, 'aceptada') ? <button type="button" className="boton" disabled={ocupado} onClick={() => cambiarEstado('aceptada')}><Icono nombre="check" /> El cliente aceptó</button> : null}
                {transicionPermitida(p.estado, 'rechazada') ? <button type="button" className="boton boton-peligro" onClick={() => setModal('rechazar')}>El cliente no aceptó</button> : null}
                {transicionPermitida(p.estado, 'borrador') && p.estado === 'rechazada' ? <button type="button" className="boton" onClick={() => cambiarEstado('borrador')}>Volver a borrador</button> : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {modal === 'convertir' ? (
        <Modal titulo="Convertir en venta" alCerrar={() => setModal(null)} ancho="480px" pie={
          <>
            <button type="button" className="boton" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="boton boton-primario" disabled={ocupado} onClick={async () => {
              const r = await ejecutar(() => api.post(`/proformas/${p.id}/convertir`, Number(pago.monto) > 0 ? { pago: { monto: Number(pago.monto), metodo: pago.metodo } } : {}), 'Venta registrada.')
              if (r) ir(`ventas/${r.id}`)
            }}>Registrar venta</button>
          </>
        }>
          <p>Se creará la venta por <strong>{formatearBs(p.total)}</strong> con los mismos ítems.</p>
          <div className="formulario">
            <Campo etiqueta="Anticipo / pago ahora (Bs)" type="number" min="0" step="0.01" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} ayuda="Deja 0 si todavía no pagó." />
            <Campo etiqueta="Forma de pago" como="select" value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
              <option value="efectivo">Efectivo</option><option value="qr">QR</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option>
            </Campo>
          </div>
        </Modal>
      ) : null}
      {modal === 'rechazar' ? (
        <Confirmar titulo="Marcar como rechazada" texto="¿Por qué no aceptó el cliente? Ayuda a mejorar las ventas." textoBoton="Marcar rechazada" peligro alCerrar={() => setModal(null)} alConfirmar={() => cambiarEstado('rechazada', { motivo })}>
          <Campo etiqueta="Motivo" como="select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="">Sin especificar</option>
            {['Precio alto', 'Eligió otro proveedor', 'Postergó la obra', 'No respondió', 'Cambió de material'].map((m) => <option key={m}>{m}</option>)}
          </Campo>
        </Confirmar>
      ) : null}
    </>
  )
}
