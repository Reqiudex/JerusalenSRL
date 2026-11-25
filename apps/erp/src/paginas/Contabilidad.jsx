// Contabilidad simple: resultado mensual (general y por sucursal), egresos, cuentas por cobrar y libro CSV.
import { useState } from 'react'
import { Columnas } from '@ui/graficos.jsx'
import { formatearBs, formatearBsCorto, formatearFecha, formatearMes } from '@ui/formatos.js'
import { enlaceWhatsApp } from '@reportes/proformas.js'
import { api, consulta, descargar } from '../api.js'
import { Cabecera, Campo, Cargando, Confirmar, ErrorCarga, Icono, Kpi, Modal, Pestanas, SelectorSucursal, Tabla, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

const CATEGORIAS = { compras: 'Compras de material', planilla: 'Sueldos', alquiler: 'Alquiler', servicios: 'Luz, agua e internet', transporte: 'Transporte', mantenimiento: 'Mantenimiento', impuestos: 'Impuestos', otros: 'Otros gastos' }

export default function Contabilidad({ ruta }) {
  const [pestana, setPestana] = useState(ruta.params.pestana ?? 'resultado')
  const hoyMes = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 7)
  const [periodo, setPeriodo] = useState(hoyMes)
  return (
    <>
      <Cabecera titulo="Contabilidad" subtitulo="Ingresos (ventas) y egresos por categoría. Resultado por mes y por sucursal."
        acciones={
          <>
            <Campo etiqueta="Libro del mes" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
            <button type="button" className="boton" style={{ alignSelf: 'end' }} onClick={() => descargar(`/contabilidad/libro.csv?periodo=${periodo}`)}><Icono nombre="descargar" /> CSV para el contador</button>
          </>
        } />
      <Pestanas valor={pestana} alCambiar={setPestana} opciones={[['resultado', 'Resultado'], ['egresos', 'Egresos'], ['cobrar', 'Cuentas por cobrar']]} />
      {pestana === 'resultado' ? <Resultado /> : null}
      {pestana === 'egresos' ? <Egresos /> : null}
      {pestana === 'cobrar' ? <PorCobrar /> : null}
    </>
  )
}

function Resultado() {
  const [sucursal, setSucursal] = useState('')
  const { datos: d, error, cargando } = useDatos(`/contabilidad/resultado${consulta({ sucursal })}`)
  if (error) return <ErrorCarga error={error} />
  if (cargando && !d) return <Cargando />
  const ultimo = d.meses[d.meses.length - 1]
  return (
    <>
      <div className="filtros"><SelectorSucursal valor={sucursal} alCambiar={(v) => setSucursal(v ?? '')} /></div>
      <div className="rejilla" style={{ '--min': '200px' }}>
        <Kpi etiqueta="Ingresos 12 meses" valor={formatearBs(d.totales.ingresos, { entero: true })} detalle={`Cobrado: ${formatearBs(d.totales.cobrado, { entero: true })}`} />
        <Kpi etiqueta="Egresos 12 meses" valor={formatearBs(d.totales.egresos, { entero: true })} />
        <Kpi etiqueta="Resultado 12 meses" valor={formatearBs(d.totales.resultado, { entero: true })} detalle={d.totales.ingresos ? `${Math.round((d.totales.resultado / d.totales.ingresos) * 100)} % de los ingresos` : ''} />
        <Kpi etiqueta={`Resultado de ${formatearMes(ultimo.mes).split(' de ')[0]}`} valor={formatearBs(ultimo.resultado, { entero: true })} detalle="Mes en curso: la planilla se registra al cerrarla" />
      </div>
      <section className="tarjeta seccion">
        <h2>Ingresos y egresos por mes</h2>
        <Columnas titulo="Ingresos y egresos por mes" series={[{ clave: 'ingresos', nombre: 'Ingresos' }, { clave: 'egresos', nombre: 'Egresos' }]}
          datos={d.meses.map((m) => ({ etiqueta: formatearMes(m.mes, { corto: true }), detalle: formatearMes(m.mes), ingresos: m.ingresos, egresos: m.egresos }))}
          formato={(v) => formatearBs(v, { entero: true })} formatoEje={formatearBsCorto} alto={260} />
      </section>
      <section className="seccion">
        <Tabla etiqueta="Resultado mensual" filas={[...d.meses].reverse()} clave="mes" columnas={[
          { titulo: 'Mes', valor: (m) => <strong>{formatearMes(m.mes)}</strong> },
          { titulo: 'Ventas', num: true, valor: (m) => m.ventas },
          { titulo: 'Ingresos', num: true, valor: (m) => formatearBs(m.ingresos, { entero: true }) },
          { titulo: 'Cobrado', num: true, valor: (m) => formatearBs(m.cobrado, { entero: true }) },
          { titulo: 'Egresos', num: true, valor: (m) => formatearBs(m.egresos, { entero: true }) },
          { titulo: 'Resultado', num: true, valor: (m) => <strong style={{ color: m.resultado < 0 ? 'var(--peligro)' : undefined }}>{formatearBs(m.resultado, { entero: true })}</strong> },
        ]} />
      </section>
      {!sucursal ? (
        <section className="seccion">
          <h2>Por sucursal — {formatearMes(ultimo.mes)}</h2>
          <Tabla etiqueta="Resultado por sucursal" filas={d.porSucursal} columnas={[
            { titulo: 'Sucursal', valor: (s) => s.nombre },
            { titulo: 'Ingresos', num: true, valor: (s) => formatearBs(s.ingresos, { entero: true }) },
            { titulo: 'Egresos', num: true, valor: (s) => formatearBs(s.egresos, { entero: true }) },
            { titulo: 'Principal gasto', valor: (s) => (s.porCategoria[0] ? `${s.porCategoria[0].nombre} (${formatearBs(s.porCategoria[0].monto, { entero: true })})` : '—') },
            { titulo: 'Resultado', num: true, valor: (s) => formatearBs(s.resultado, { entero: true }) },
          ]} />
        </section>
      ) : null}
    </>
  )
}

function Egresos() {
  const { usuario } = useApp()
  const puede = usePuede()
  const hoy = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10)
  const [f, setF] = useState({ desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, sucursal: '', categoria: '' })
  const [nuevo, setNuevo] = useState(null)
  const [borrar, setBorrar] = useState(null)
  const { datos, error, cargando, recargar } = useDatos(`/egresos${consulta(f)}`)
  const [ejecutar, ocupado] = useAccion()
  const escribe = puede('contabilidad', 'escribir')
  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Desde" type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} />
        <Campo etiqueta="Hasta" type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Categoría" como="select" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
          <option value="">Todas</option>{Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Campo>
        {escribe ? <button type="button" className="boton boton-primario" onClick={() => setNuevo({ fecha: hoy, sucursal_id: usuario.sucursal_id ?? 1, categoria: 'otros', descripcion: '', monto: '', proveedor: '' })}><Icono nombre="mas" /> Registrar gasto</button> : null}
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Egresos" filas={datos ?? []} columnas={[
          { titulo: 'Fecha', valor: (e) => formatearFecha(e.fecha) },
          { titulo: 'Categoría', valor: (e) => CATEGORIAS[e.categoria] },
          { titulo: 'Descripción', valor: (e) => <>{e.descripcion}{e.proveedor ? <small className="suave"> · {e.proveedor}</small> : null}</> },
          { titulo: 'Sucursal', valor: (e) => e.sucursal.split(' — ')[0] },
          { titulo: 'Monto', num: true, valor: (e) => formatearBs(e.monto) },
          { titulo: '', valor: (e) => (escribe && !e.planilla_id ? <button type="button" className="boton boton-chico boton-texto" onClick={() => setBorrar(e)} aria-label={`Borrar ${e.descripcion}`}><Icono nombre="basura" /></button> : null) },
        ]} pie={datos?.length ? <tr><td colSpan={4}>{datos.length} egresos</td><td className="num">{formatearBs(datos.reduce((s, e) => s + e.monto, 0))}</td><td /></tr> : null} />
      )}
      {nuevo ? (
        <Modal titulo="Registrar gasto" alCerrar={() => setNuevo(null)} ancho="560px">
          <form className="formulario" onSubmit={async (e) => {
            e.preventDefault()
            const r = await ejecutar(() => api.post('/egresos', { ...nuevo, monto: Number(nuevo.monto) }), 'Gasto registrado.')
            if (r) { setNuevo(null); recargar() }
          }}>
            <Campo etiqueta="Fecha" type="date" value={nuevo.fecha} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} required />
            <SelectorSucursal valor={nuevo.sucursal_id} alCambiar={(v) => setNuevo({ ...nuevo, sucursal_id: v })} todas={false} />
            <Campo etiqueta="Categoría" como="select" value={nuevo.categoria} onChange={(e) => setNuevo({ ...nuevo, categoria: e.target.value })}>
              {Object.entries(CATEGORIAS).filter(([k]) => k !== 'planilla').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Campo>
            <Campo etiqueta="Monto (Bs)" type="number" min="0.01" step="0.01" value={nuevo.monto} onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })} required />
            <Campo etiqueta="Descripción" className="ancho-completo" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} required />
            <Campo etiqueta="Proveedor" className="ancho-completo" value={nuevo.proveedor} onChange={(e) => setNuevo({ ...nuevo, proveedor: e.target.value })} />
            <p className="suave ancho-completo" style={{ fontSize: 13 }}>Los sueldos se registran solos al cerrar la planilla en «Personal y planilla».</p>
            <div className="modal-pie ancho-completo">
              <button type="button" className="boton" onClick={() => setNuevo(null)}>Cancelar</button>
              <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
            </div>
          </form>
        </Modal>
      ) : null}
      {borrar ? <Confirmar titulo="Borrar gasto" peligro textoBoton="Borrar" texto={`¿Borrar «${borrar.descripcion}» por ${formatearBs(borrar.monto)}?`} alCerrar={() => setBorrar(null)}
        alConfirmar={async () => { const r = await ejecutar(() => api.del(`/egresos/${borrar.id}`), 'Gasto borrado.'); if (r) recargar(); return Boolean(r) }} /> : null}
    </>
  )
}

function PorCobrar() {
  const [sucursal, setSucursal] = useState('')
  const { datos, error, cargando } = useDatos(`/contabilidad/cobrar${consulta({ sucursal })}`)
  const hoy = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10)
  const dias = (f) => Math.round((Date.parse(hoy) - Date.parse(f)) / 86400000)
  return (
    <>
      <div className="filtros"><SelectorSucursal valor={sucursal} alCambiar={(v) => setSucursal(v ?? '')} /></div>
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : datos ? (
        <>
          <div className="rejilla" style={{ '--min': '220px' }}>
            <Kpi etiqueta="Total por cobrar" valor={formatearBs(datos.total, { entero: true })} detalle={`${datos.filas.length} ventas`} />
            <Kpi etiqueta="Con más de 30 días" valor={formatearBs(datos.filas.filter((f) => dias(f.fecha) > 30).reduce((s, f) => s + f.saldo, 0), { entero: true })} />
          </div>
          <section className="seccion">
            <Tabla etiqueta="Cuentas por cobrar" filas={datos.filas} columnas={[
              { titulo: 'Venta', valor: (f) => <a href={`#/ventas/${f.id}`}>{f.codigo}</a> },
              { titulo: 'Fecha', valor: (f) => formatearFecha(f.fecha) },
              { titulo: 'Días', num: true, valor: (f) => dias(f.fecha) },
              { titulo: 'Cliente', valor: (f) => f.cliente },
              { titulo: 'Vendedor', valor: (f) => f.vendedor },
              { titulo: 'Total', num: true, valor: (f) => formatearBs(f.total) },
              { titulo: 'Saldo', num: true, valor: (f) => <strong>{formatearBs(f.saldo)}</strong> },
              { titulo: '', valor: (f) => (f.telefono ? <a className="boton boton-chico" target="_blank" rel="noopener noreferrer" href={enlaceWhatsApp(f.telefono, `Hola ${f.cliente.split(' ')[0]}, le saluda Jerusalén. Le recordamos el saldo de ${formatearBs(f.saldo)} de la venta ${f.codigo}. ¡Gracias!`)}><Icono nombre="whatsapp" /> Recordar</a> : null) },
            ]} />
          </section>
        </>
      ) : null}
    </>
  )
}
