// Clientes: búsqueda, alta/edición y ficha con proformas, ventas y saldo.
import { useState } from 'react'
import { formatearBs, formatearFecha } from '@ui/formatos.js'
import { enlaceWhatsApp } from '@reportes/proformas.js'
import { api, consulta } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Icono, Modal, Tabla, useAccion, useDatos, usePuede } from '../componentes.jsx'

const VACIO = { nombre: '', telefono: '', nit: '', direccion: '', ciudad: 'Santa Cruz de la Sierra', notas: '' }

export default function Clientes() {
  const puede = usePuede()
  const [q, setQ] = useState('')
  const [editar, setEditar] = useState(null)
  const [ver, setVer] = useState(null)
  const { datos, error, cargando, recargar } = useDatos(`/clientes${consulta({ q, limite: 300 })}`)
  return (
    <>
      <Cabecera titulo="Clientes" subtitulo="Personas y empresas que compran o cotizan."
        acciones={puede('clientes', 'escribir') ? <button type="button" className="boton boton-primario" onClick={() => setEditar(VACIO)}><Icono nombre="mas" /> Nuevo cliente</button> : null} />
      <div className="filtros"><Campo etiqueta="Buscar" className="campo-busqueda" type="search" placeholder="Nombre, teléfono o NIT" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Lista de clientes" filas={datos ?? []} alElegir={(c) => setVer(c.id)} columnas={[
          { titulo: 'Nombre', valor: (c) => <strong>{c.nombre}</strong> },
          { titulo: 'Teléfono', valor: (c) => c.telefono || '—' },
          { titulo: 'NIT / CI', valor: (c) => c.nit || '—' },
          { titulo: 'Compras', num: true, valor: (c) => c.ventas },
          { titulo: 'Comprado', num: true, valor: (c) => formatearBs(c.comprado, { entero: true }) },
          { titulo: 'Saldo', num: true, valor: (c) => (c.saldo > 0.005 ? <strong>{formatearBs(c.saldo)}</strong> : '0') },
        ]} />
      )}
      {editar ? <EditarCliente cliente={editar} alCerrar={() => setEditar(null)} alGuardar={() => { setEditar(null); recargar() }} /> : null}
      {ver ? <FichaCliente id={ver} alCerrar={() => setVer(null)} alEditar={(c) => { setVer(null); setEditar(c) }} puedeEditar={puede('clientes', 'escribir')} /> : null}
    </>
  )
}

function EditarCliente({ cliente, alCerrar, alGuardar }) {
  const [c, setC] = useState(cliente)
  const [ejecutar, ocupado] = useAccion()
  const set = (k) => (e) => setC({ ...c, [k]: e.target.value })
  const guardar = async (e) => {
    e.preventDefault()
    const cuerpo = { nombre: c.nombre, telefono: c.telefono, nit: c.nit, direccion: c.direccion, ciudad: c.ciudad, notas: c.notas }
    const r = await ejecutar(() => (c.id ? api.put(`/clientes/${c.id}`, cuerpo) : api.post('/clientes', cuerpo)), 'Cliente guardado.')
    if (r) alGuardar(r)
  }
  return (
    <Modal titulo={c.id ? 'Editar cliente' : 'Nuevo cliente'} alCerrar={alCerrar}>
      <form className="formulario" onSubmit={guardar}>
        <Campo etiqueta="Nombre o razón social" className="ancho-completo" value={c.nombre} onChange={set('nombre')} required />
        <Campo etiqueta="Teléfono / WhatsApp" inputMode="tel" value={c.telefono} onChange={set('telefono')} />
        <Campo etiqueta="NIT / CI" value={c.nit} onChange={set('nit')} />
        <Campo etiqueta="Dirección" className="ancho-completo" value={c.direccion} onChange={set('direccion')} />
        <Campo etiqueta="Ciudad" value={c.ciudad} onChange={set('ciudad')} />
        <Campo etiqueta="Notas" como="textarea" className="ancho-completo" value={c.notas} onChange={set('notas')} />
        <div className="modal-pie ancho-completo">
          <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function FichaCliente({ id, alCerrar, alEditar, puedeEditar }) {
  const { datos: c, error } = useDatos(`/clientes/${id}`)
  return (
    <Modal titulo={c?.nombre ?? 'Cliente'} alCerrar={alCerrar} ancho="760px" pie={
      c ? (
        <>
          {c.telefono ? <a className="boton" href={enlaceWhatsApp(c.telefono, `Hola ${c.nombre.split(' ')[0]}, le saluda Jerusalén.`)} target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp" /> WhatsApp</a> : null}
          {puedeEditar ? <button type="button" className="boton" onClick={() => alEditar(c)}><Icono nombre="editar" /> Editar</button> : null}
          <a className="boton boton-primario" href={`#/proformas/nueva`} onClick={alCerrar}>Nueva proforma</a>
        </>
      ) : null
    }>
      {error ? <ErrorCarga error={error} /> : !c ? <Cargando /> : (
        <div className="pila">
          <dl className="resumen-doc">
            <dt>Teléfono</dt><dd>{c.telefono || '—'}</dd>
            <dt>NIT / CI</dt><dd>{c.nit || '—'}</dd>
            <dt>Dirección</dt><dd>{[c.direccion, c.ciudad].filter(Boolean).join(', ') || '—'}</dd>
            {c.notas ? <><dt>Notas</dt><dd>{c.notas}</dd></> : null}
          </dl>
          <h3>Ventas</h3>
          <Tabla etiqueta="Ventas del cliente" filas={c.ventas} vacio="Sin ventas." columnas={[
            { titulo: 'Código', valor: (v) => <a href={`#/ventas/${v.id}`} onClick={alCerrar}>{v.codigo}</a> },
            { titulo: 'Fecha', valor: (v) => formatearFecha(v.fecha) },
            { titulo: 'Estado', valor: (v) => <Estado valor={v.estado === 'anulada' ? 'anulada' : v.estadoPago} /> },
            { titulo: 'Total', num: true, valor: (v) => formatearBs(v.total) },
            { titulo: 'Saldo', num: true, valor: (v) => formatearBs(v.saldo) },
          ]} />
          <h3>Proformas</h3>
          <Tabla etiqueta="Proformas del cliente" filas={c.proformas} vacio="Sin proformas." columnas={[
            { titulo: 'Código', valor: (p) => <a href={`#/proformas/${p.id}`} onClick={alCerrar}>{p.codigo}</a> },
            { titulo: 'Fecha', valor: (p) => formatearFecha(p.fecha) },
            { titulo: 'Estado', valor: (p) => <Estado valor={p.estado} /> },
            { titulo: 'Total', num: true, valor: (p) => formatearBs(p.total) },
          ]} />
        </div>
      )}
    </Modal>
  )
}
