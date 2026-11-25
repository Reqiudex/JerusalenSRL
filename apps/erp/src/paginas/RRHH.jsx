// Recursos humanos: personal por sucursal (antigüedad automática), sucursales y planilla mensual.
import { useState } from 'react'
import { formatearBs, formatearFecha, formatearMes } from '@ui/formatos.js'
import { api, consulta, descargar } from '../api.js'
import { Cabecera, Campo, Cargando, Confirmar, ErrorCarga, Estado, Icono, Kpi, Modal, Pestanas, SelectorSucursal, Tabla, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

export default function RRHH({ ruta }) {
  const puede = usePuede()
  const [pestana, setPestana] = useState(ruta.params.pestana ?? 'personal')
  return (
    <>
      <Cabecera titulo="Personal y planilla" subtitulo="Trabajadores por fábrica y sucursal, antigüedad y planilla de sueldos." />
      <Pestanas valor={pestana} alCambiar={setPestana} opciones={[['personal', 'Personal'], ['planilla', 'Planilla mensual'], ...(puede('sucursales') ? [['sucursales', 'Sucursales']] : [])]} />
      {pestana === 'personal' ? <Personal /> : null}
      {pestana === 'planilla' ? <Planilla /> : null}
      {pestana === 'sucursales' ? <Sucursales /> : null}
    </>
  )
}

const T_VACIO = { nombre: '', cargo: '', sucursal_id: 2, fecha_ingreso: '', fecha_salida: '', sueldo: 2750, telefono: '', activo: 1 }

function Personal() {
  const puede = usePuede()
  const [f, setF] = useState({ sucursal: '', activos: '1' })
  const [editar, setEditar] = useState(null)
  const { datos, error, cargando, recargar } = useDatos(`/trabajadores${consulta(f)}`)
  const [ejecutar, ocupado] = useAccion()
  const escribe = puede('rrhh', 'escribir')
  const set = (k) => (e) => setEditar({ ...editar, [k]: e.target.value })
  const guardar = async (e) => {
    e.preventDefault()
    const { id, sucursal: _s, antiguedad: _a, creado_en: _c, usuario_id: _u, ...cuerpo } = editar
    if (!cuerpo.fecha_salida) delete cuerpo.fecha_salida
    const r = await ejecutar(() => (id ? api.put(`/trabajadores/${id}`, { ...cuerpo, sueldo: Number(cuerpo.sueldo) }) : api.post('/trabajadores', { ...cuerpo, sueldo: Number(cuerpo.sueldo) })), 'Trabajador guardado.')
    if (r) { setEditar(null); recargar() }
  }
  const total = (datos ?? []).filter((t) => t.activo).reduce((s, t) => s + t.sueldo, 0)
  return (
    <>
      <div className="filtros">
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Mostrar" como="select" value={f.activos} onChange={(e) => setF({ ...f, activos: e.target.value })}>
          <option value="1">Solo activos</option><option value="">Todos (incluye ex trabajadores)</option>
        </Campo>
        {escribe ? <button type="button" className="boton boton-primario" onClick={() => setEditar(T_VACIO)}><Icono nombre="mas" /> Nuevo trabajador</button> : null}
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Personal" filas={datos ?? []} alElegir={escribe ? (t) => setEditar({ ...t, fecha_salida: t.fecha_salida ?? '' }) : undefined} columnas={[
          { titulo: 'Nombre', valor: (t) => <><strong>{t.nombre}</strong>{t.activo ? null : <> <Estado valor="inactivo" /></>}</> },
          { titulo: 'Cargo', valor: (t) => t.cargo },
          { titulo: 'Sucursal', valor: (t) => t.sucursal.split(' — ')[0] },
          { titulo: 'Ingreso', valor: (t) => formatearFecha(t.fecha_ingreso) },
          { titulo: 'Antigüedad', valor: (t) => t.antiguedad.texto },
          { titulo: 'Sueldo', num: true, valor: (t) => formatearBs(t.sueldo, { entero: true }) },
        ]} pie={datos?.length ? <tr><td colSpan={5}>{datos.filter((t) => t.activo).length} activos · sueldos base</td><td className="num">{formatearBs(total, { entero: true })}</td></tr> : null} />
      )}
      {editar ? (
        <Modal titulo={editar.id ? `Editar ${editar.nombre}` : 'Nuevo trabajador'} alCerrar={() => setEditar(null)}>
          <form className="formulario" onSubmit={guardar}>
            <Campo etiqueta="Nombre completo" className="ancho-completo" value={editar.nombre} onChange={set('nombre')} required />
            <Campo etiqueta="Cargo" value={editar.cargo} onChange={set('cargo')} />
            <SelectorSucursal valor={editar.sucursal_id} alCambiar={(v) => setEditar({ ...editar, sucursal_id: v })} todas={false} etiqueta="Fábrica / sucursal" />
            <Campo etiqueta="Fecha de ingreso" type="date" value={editar.fecha_ingreso} onChange={set('fecha_ingreso')} required />
            <Campo etiqueta="Sueldo base (Bs)" type="number" min="0" step="10" value={editar.sueldo} onChange={set('sueldo')} required />
            <Campo etiqueta="Teléfono" value={editar.telefono} onChange={set('telefono')} />
            {editar.id ? <Campo etiqueta="Fecha de salida" type="date" value={editar.fecha_salida} onChange={set('fecha_salida')} ayuda="Solo si dejó de trabajar" /> : null}
            <div className="modal-pie ancho-completo">
              <button type="button" className="boton" onClick={() => setEditar(null)}>Cancelar</button>
              <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  )
}

function Planilla() {
  const puede = usePuede()
  const hoyMes = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 7)
  const [periodo, setPeriodo] = useState(hoyMes)
  const [sucursal, setSucursal] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const { datos: p, error, cargando, recargar } = useDatos(`/planillas/${periodo}`)
  const [ejecutar] = useAccion()
  if (error) return <ErrorCarga error={error} reintentar={recargar} />
  if (cargando && !p) return <Cargando />
  const lineas = p.lineas.filter((l) => !sucursal || l.sucursal_id === sucursal)
  const tot = (k) => lineas.reduce((s, l) => s + l[k], 0)
  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Mes" type="month" value={periodo} onChange={(e) => e.target.value && setPeriodo(e.target.value)} />
        <SelectorSucursal valor={sucursal} alCambiar={(v) => setSucursal(v ?? '')} />
        <button type="button" className="boton" onClick={() => descargar(`/planillas/${periodo}/csv`)}><Icono nombre="descargar" /> CSV</button>
        <button type="button" className="boton" onClick={() => window.print()}>Imprimir</button>
        {puede('rrhh', 'escribir') && !p.cerrada ? <button type="button" className="boton boton-primario" onClick={() => setConfirmar(true)}>Cerrar planilla</button> : null}
      </div>
      <p className={`aviso ${p.cerrada ? 'aviso-ok' : 'aviso-info'}`}>
        {p.cerrada ? `Planilla de ${formatearMes(periodo)} cerrada: los sueldos ya están en los egresos.` : `Planilla de ${formatearMes(periodo)} calculada al día (no cerrada). Bono de antigüedad sobre 3 salarios mínimos de ${formatearBs(p.config.salario_minimo, { entero: true })}; aporte laboral ${String(p.config.aporte_laboral_pct).replace('.', ',')} %. Valores configurables en Ajustes.`}
      </p>
      <div className="rejilla seccion" style={{ '--min': '200px' }}>
        <Kpi etiqueta="Trabajadores" valor={lineas.length} />
        <Kpi etiqueta="Total ganado" valor={formatearBs(tot('total_ganado'), { entero: true })} detalle={`Bono antigüedad: ${formatearBs(tot('bono_antiguedad'), { entero: true })}`} />
        <Kpi etiqueta="Aportes" valor={formatearBs(tot('aportes'), { entero: true })} />
        <Kpi etiqueta="Líquido pagable" valor={formatearBs(tot('liquido'), { entero: true })} />
      </div>
      {!sucursal ? (
        <section className="seccion">
          <h2>Por sucursal</h2>
          <Tabla etiqueta="Planilla por sucursal" filas={Object.entries(p.porSucursal).map(([id, t]) => ({ id, ...t }))} columnas={[
            { titulo: 'Sucursal', valor: (t) => p.sucursales[t.id] },
            { titulo: 'Trabajadores', num: true, valor: (t) => t.trabajadores },
            { titulo: 'Total ganado', num: true, valor: (t) => formatearBs(t.total_ganado, { entero: true }) },
            { titulo: 'Líquido', num: true, valor: (t) => formatearBs(t.liquido, { entero: true }) },
          ]} />
        </section>
      ) : null}
      <section className="seccion">
        <h2>Detalle</h2>
        <Tabla etiqueta="Planilla detallada" filas={lineas} clave="trabajador_id" columnas={[
          { titulo: 'Nombre', valor: (l) => <><strong>{l.nombre}</strong><br /><small className="suave">{l.cargo}</small></> },
          { titulo: 'Antigüedad', valor: (l) => `${l.antiguedad}${l.bono_antiguedad_pct ? ` (${l.bono_antiguedad_pct} %)` : ''}` },
          { titulo: 'Días', num: true, valor: (l) => l.dias_trabajados },
          { titulo: 'Haber básico', num: true, valor: (l) => formatearBs(l.haber_basico) },
          { titulo: 'Bono antig.', num: true, valor: (l) => formatearBs(l.bono_antiguedad) },
          { titulo: 'Total ganado', num: true, valor: (l) => formatearBs(l.total_ganado) },
          { titulo: 'Aportes', num: true, valor: (l) => formatearBs(l.aportes) },
          { titulo: 'Líquido', num: true, valor: (l) => <strong>{formatearBs(l.liquido)}</strong> },
        ]} />
      </section>
      {confirmar ? <Confirmar titulo="Cerrar planilla" textoBoton="Cerrar y registrar sueldos" alCerrar={() => setConfirmar(false)}
        texto={`Se guardará la planilla de ${formatearMes(periodo)} tal como está y se registrarán ${formatearBs(p.totales.total_ganado, { entero: true })} en egresos (por sucursal). No se puede deshacer.`}
        alConfirmar={async () => { const r = await ejecutar(() => api.post(`/planillas/${periodo}/cerrar`), 'Planilla cerrada.'); if (r) recargar(); return Boolean(r) }} /> : null}
    </>
  )
}

function Sucursales() {
  const { recargarSucursales } = useApp()
  const puede = usePuede()
  const { datos, error, cargando, recargar } = useDatos('/sucursales')
  const [editar, setEditar] = useState(null)
  const [ejecutar, ocupado] = useAccion()
  const escribe = puede('sucursales', 'escribir')
  const set = (k) => (e) => setEditar({ ...editar, [k]: e.target.value })
  return (
    <>
      {escribe ? <div className="filtros"><button type="button" className="boton boton-primario" onClick={() => setEditar({ nombre: '', tipo: 'showroom', direccion: '', telefono: '', activo: 1 })}><Icono nombre="mas" /> Nueva sucursal</button></div> : null}
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Sucursales" filas={datos ?? []} alElegir={escribe ? setEditar : undefined} columnas={[
          { titulo: 'Nombre', valor: (s) => <><strong>{s.nombre}</strong>{s.activo ? null : <> <Estado valor="inactivo" /></>}</> },
          { titulo: 'Tipo', valor: (s) => ({ showroom: 'Showroom', fabrica: 'Fábrica', mixta: 'Showroom y taller' })[s.tipo] },
          { titulo: 'Dirección', valor: (s) => s.direccion },
          { titulo: 'Teléfono', valor: (s) => s.telefono },
          { titulo: 'Trabajadores', num: true, valor: (s) => s.trabajadores },
        ]} />
      )}
      {editar ? (
        <Modal titulo={editar.id ? `Editar ${editar.nombre}` : 'Nueva sucursal'} alCerrar={() => setEditar(null)} ancho="560px">
          <form className="formulario" onSubmit={async (e) => {
            e.preventDefault()
            const { id, trabajadores: _t, creado_en: _c, ...cuerpo } = editar
            const r = await ejecutar(() => (id ? api.put(`/sucursales/${id}`, cuerpo) : api.post('/sucursales', cuerpo)), 'Sucursal guardada.')
            if (r) { setEditar(null); recargar(); recargarSucursales() }
          }}>
            <Campo etiqueta="Nombre" className="ancho-completo" value={editar.nombre} onChange={set('nombre')} required />
            <Campo etiqueta="Tipo" como="select" value={editar.tipo} onChange={set('tipo')}>
              <option value="showroom">Showroom</option><option value="fabrica">Fábrica</option><option value="mixta">Showroom y taller</option>
            </Campo>
            <Campo etiqueta="Teléfono" value={editar.telefono} onChange={set('telefono')} />
            <Campo etiqueta="Dirección" className="ancho-completo" value={editar.direccion} onChange={set('direccion')} />
            {editar.id ? <label className="fila ancho-completo"><input type="checkbox" checked={Boolean(editar.activo)} onChange={(e) => setEditar({ ...editar, activo: e.target.checked ? 1 : 0 })} /> Activa</label> : null}
            <div className="modal-pie ancho-completo">
              <button type="button" className="boton" onClick={() => setEditar(null)}>Cancelar</button>
              <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  )
}
