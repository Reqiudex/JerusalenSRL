// Costos por proyecto (calculadora en vivo con la misma función de la API) y producción por producto.
import { useEffect, useMemo, useState } from 'react'
import { calcularCostoProyecto, INSUMOS_TIPICOS } from '@reportes/costos.js'
import { BarrasH } from '@ui/graficos.jsx'
import { formatearBs, formatearFecha, formatearNumero, formatearUnidad } from '@ui/formatos.js'
import { api, consulta } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Icono, Pestanas, SelectorCliente, SelectorSucursal, Tabla, ir, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

export default function Proyectos({ ruta }) {
  const [, id] = ruta.partes
  if (id === 'nuevo') return <Calculadora />
  if (id) return <Calculadora id={id} />
  return <Lista params={ruta.params} />
}

const ESTADOS = { cotizado: 'Cotizado', en_produccion: 'En producción', colocado: 'Colocado', cancelado: 'Cancelado' }

function Lista({ params }) {
  const puede = usePuede()
  const [pestana, setPestana] = useState(params.pestana ?? 'proyectos')
  const [estado, setEstado] = useState('')
  const { datos, error, cargando, recargar } = useDatos(pestana === 'proyectos' ? `/proyectos${consulta({ estado })}` : null)
  return (
    <>
      <Cabecera titulo="Costos y producción" subtitulo="Calcula el costo y el precio de cada trabajo; mira cuántos m² se producen por producto."
        acciones={puede('proyectos', 'escribir') ? <a className="boton boton-primario" href="#/proyectos/nuevo"><Icono nombre="calculadora" /> Calcular un trabajo</a> : null} />
      <Pestanas valor={pestana} alCambiar={setPestana} opciones={[['proyectos', 'Proyectos'], ['produccion', 'Producción por producto']]} />
      {pestana === 'produccion' ? <Produccion /> : (
        <>
          <div className="filtros">
            <Campo etiqueta="Estado" como="select" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Campo>
          </div>
          <ErrorCarga error={error} reintentar={recargar} />
          {cargando && !datos ? <Cargando /> : (
            <Tabla etiqueta="Proyectos" filas={datos ?? []} alElegir={(p) => ir(`proyectos/${p.id}`)} columnas={[
              { titulo: 'Código', valor: (p) => <strong className="mono">{p.codigo}</strong> },
              { titulo: 'Trabajo', valor: (p) => p.nombre },
              { titulo: 'Material', valor: (p) => p.material ?? '—' },
              { titulo: 'Fecha', valor: (p) => formatearFecha(p.fecha) },
              { titulo: 'Estado', valor: (p) => <Estado valor={p.estado} /> },
              { titulo: 'm²', num: true, valor: (p) => formatearNumero(p.m2) },
              { titulo: 'Costo', num: true, valor: (p) => formatearBs(p.costo_total, { entero: true }) },
              { titulo: 'Precio', num: true, valor: (p) => formatearBs(p.precio, { entero: true }) },
            ]} />
          )}
        </>
      )}
    </>
  )
}

function Produccion() {
  const hoy = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 10)
  const [f, setF] = useState({ desde: `${hoy.slice(0, 7)}-01`, hasta: hoy, sucursal: '' })
  const { datos, error, cargando } = useDatos(`/produccion${consulta(f)}`)
  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Desde" type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} />
        <Campo etiqueta="Hasta" type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
      </div>
      <ErrorCarga error={error} />
      {cargando && !datos ? <Cargando /> : datos ? (
        <div className="rejilla" style={{ '--min': '380px' }}>
          <section className="tarjeta"><h2>m² vendidos por producto</h2>
            <BarrasH titulo="m² vendidos por producto" datos={datos.vendidos.map((p) => ({ etiqueta: p.nombre, valor: p.cantidad, detalle: formatearBs(p.total, { entero: true }) }))} formato={(v) => `${formatearNumero(v, 1)} m²`} />
          </section>
          <section className="tarjeta"><h2>m² colocados (proyectos terminados)</h2>
            <BarrasH titulo="m² colocados" datos={datos.colocados.map((p) => ({ etiqueta: p.nombre, valor: p.m2, detalle: `${p.proyectos} proy.` }))} formato={(v) => `${formatearNumero(v, 1)} m²`} />
          </section>
          <section className="tarjeta"><h2>Servicios realizados</h2>
            <ul className="lista-simple">{datos.servicios.length ? datos.servicios.map((s) => <li key={`${s.nombre}-${s.unidad}`}><span>{s.nombre}</span><span className="num">{formatearNumero(s.cantidad, 1)} {formatearUnidad(s.unidad)}</span></li>) : <li className="suave">Sin servicios en el periodo.</li>}</ul>
          </section>
        </div>
      ) : null}
    </>
  )
}

const ENTRADA_INICIAL = { largo_m: 7, ancho_m: 8, m2: '', costo_m2: '', desperdicio_pct: 10, area_plancha_m2: 5.1, insumos: INSUMOS_TIPICOS, horas: 60, costo_hora: 28, otros: 350, margen_pct: 30 }

function Calculadora({ id }) {
  const { usuario } = useApp()
  const puede = usePuede()
  const { datos: existente, error } = useDatos(id ? `/proyectos/${id}` : null)
  const { datos: materiales } = useDatos('/materiales?categoria=plancha')
  const [e, setE] = useState(ENTRADA_INICIAL)
  const [cab, setCab] = useState({ nombre: '', material_id: '', estado: 'cotizado', sucursal_id: usuario.sucursal_id ?? 2 })
  const [cliente, setCliente] = useState(null)
  const [ejecutar, ocupado] = useAccion()

  useEffect(() => {
    if (!existente) return
    setE({ ...ENTRADA_INICIAL, ...existente.entrada })
    setCab({ nombre: existente.nombre, material_id: existente.material_id ?? '', estado: existente.estado, sucursal_id: existente.sucursal_id })
    if (existente.cliente_id) setCliente({ id: existente.cliente_id, nombre: existente.cliente })
  }, [existente])
  useEffect(() => {
    if (!id && materiales?.length && !cab.material_id) {
      const m = materiales.find((x) => x.codigo === 'GRA-NSG') ?? materiales[0]
      setCab((c) => ({ ...c, material_id: m.id }))
      setE((x) => ({ ...x, costo_m2: m.costo, area_plancha_m2: m.ancho_cm ? Math.round((m.ancho_cm * m.alto_cm) / 100) / 100 : 5.1 }))
    }
  }, [materiales, id, cab.material_id])

  const c = useMemo(() => calcularCostoProyecto(e), [e])
  if (error) return <ErrorCarga error={error} />
  if (id && !existente) return <Cargando />
  const escribe = puede('proyectos', 'escribir')
  const set = (k) => (ev) => setE({ ...e, [k]: ev.target.value })
  const setInsumo = (i, k, v) => setE({ ...e, insumos: e.insumos.map((x, j) => (j === i ? { ...x, [k]: k === 'nombre' ? v : v === '' ? '' : Number(v) } : x)) })
  const elegirMaterial = (mid) => {
    const m = materiales?.find((x) => x.id === Number(mid))
    setCab({ ...cab, material_id: mid })
    if (m) setE({ ...e, costo_m2: m.costo, area_plancha_m2: m.ancho_cm ? Math.round((m.ancho_cm * m.alto_cm) / 100) / 100 : 5.1 })
  }
  const guardar = async () => {
    const cuerpo = { nombre: cab.nombre || `Trabajo de ${formatearNumero(c.m2)} m²`, material_id: cab.material_id || undefined, estado: cab.estado, sucursal_id: cab.sucursal_id, cliente_id: cliente?.id, entrada: e }
    const r = await ejecutar(() => (id ? api.put(`/proyectos/${id}`, cuerpo) : api.post('/proyectos', cuerpo)), 'Proyecto guardado.')
    if (r && !id) ir(`proyectos/${r.id}`)
  }
  const D = c.desglose

  return (
    <>
      <Cabecera titulo={id ? existente.nombre : 'Calcular un trabajo'} subtitulo={id ? `${existente.codigo}${existente.venta_codigo ? ` · venta ${existente.venta_codigo}` : ''}` : 'Ejemplo: piso de 7 m × 8 m. Cambia los datos y el precio se recalcula al instante.'} volver="proyectos" />
      <div className="dos-columnas">
        <div className="pila">
          <section className="tarjeta formulario">
            <Campo etiqueta="Nombre del trabajo" className="ancho-completo" value={cab.nombre} onChange={(ev) => setCab({ ...cab, nombre: ev.target.value })} placeholder="Ej.: Piso sala y comedor — Familia Rojas" />
            <div className="ancho-completo"><SelectorCliente requerido={false} valor={cliente} alCambiar={(v) => setCliente(v?.id ? v : null)} /></div>
            <Campo etiqueta="Material" como="select" value={cab.material_id} onChange={(ev) => elegirMaterial(ev.target.value)}>
              <option value="">— Otro —</option>
              {(materiales ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </Campo>
            <Campo etiqueta="Estado" como="select" value={cab.estado} onChange={(ev) => setCab({ ...cab, estado: ev.target.value })}>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Campo>
          </section>
          <section className="tarjeta">
            <h2>Medidas y material</h2>
            <div className="formulario">
              <Campo etiqueta="Largo (m)" type="number" min="0" step="0.01" value={e.largo_m} onChange={set('largo_m')} />
              <Campo etiqueta="Ancho (m)" type="number" min="0" step="0.01" value={e.ancho_m} onChange={set('ancho_m')} />
              <Campo etiqueta="o m² directos" type="number" min="0" step="0.01" value={e.m2} onChange={set('m2')} ayuda="Para piezas sueltas" />
              <Campo etiqueta="Costo del material (Bs/m²)" type="number" min="0" step="0.01" value={e.costo_m2} onChange={set('costo_m2')} />
              <Campo etiqueta="Desperdicio de corte (%)" type="number" min="0" max="100" value={e.desperdicio_pct} onChange={set('desperdicio_pct')} />
              <Campo etiqueta="Área de una plancha (m²)" type="number" min="0.1" step="0.01" value={e.area_plancha_m2} onChange={set('area_plancha_m2')} />
            </div>
          </section>
          <section className="tarjeta">
            <h2>Insumos</h2>
            <p className="suave">Rendimiento: cuántos kg se usan por m². Se compran bolsas enteras.</p>
            <div className="pila">
              {e.insumos.map((x, i) => (
                <fieldset key={i} className="formulario">
                  <legend className="oculto">Insumo {i + 1}</legend>
                  <Campo etiqueta="Insumo" value={x.nombre} onChange={(ev) => setInsumo(i, 'nombre', ev.target.value)} />
                  <Campo etiqueta="Rendimiento (kg/m²)" type="number" min="0" step="0.1" value={x.consumo_m2} onChange={(ev) => setInsumo(i, 'consumo_m2', ev.target.value)} />
                  <Campo etiqueta="kg por bolsa" type="number" min="0.1" step="0.1" value={x.presentacion} onChange={(ev) => setInsumo(i, 'presentacion', ev.target.value)} />
                  <Campo etiqueta="Precio por bolsa (Bs)" type="number" min="0" step="0.5" value={x.costo_presentacion} onChange={(ev) => setInsumo(i, 'costo_presentacion', ev.target.value)} />
                  <button type="button" className="boton boton-peligro boton-chico" style={{ alignSelf: 'end' }} onClick={() => setE({ ...e, insumos: e.insumos.filter((_, j) => j !== i) })}>Quitar</button>
                </fieldset>
              ))}
              <button type="button" className="boton" onClick={() => setE({ ...e, insumos: [...e.insumos, { nombre: 'Otro insumo', consumo_m2: 0, presentacion: 1, costo_presentacion: 0 }] })}><Icono nombre="mas" /> Agregar insumo</button>
            </div>
          </section>
          <section className="tarjeta">
            <h2>Mano de obra, otros y margen</h2>
            <div className="formulario">
              <Campo etiqueta="Horas de trabajo" type="number" min="0" value={e.horas} onChange={set('horas')} />
              <Campo etiqueta="Costo por hora (Bs)" type="number" min="0" step="0.5" value={e.costo_hora} onChange={set('costo_hora')} />
              <Campo etiqueta="Otros (transporte, viáticos)" type="number" min="0" value={e.otros} onChange={set('otros')} />
              <Campo etiqueta="Margen sobre el precio (%)" type="number" min="0" max="90" value={e.margen_pct} onChange={set('margen_pct')} ayuda="30 % = de cada 100 Bs, 30 son ganancia" />
            </div>
          </section>
        </div>

        <aside className="tarjeta calc-resultado" aria-live="polite">
          <p className="kpi-etiqueta">Precio del trabajo</p>
          <p className="calc-precio">{formatearBs(c.precio)}</p>
          <p className="suave">{formatearBs(c.precioM2)} por m² · ganancia {formatearBs(c.ganancia)}</p>
          {!c.ok ? <p className="aviso aviso-error">{c.errores[0]}</p> : null}
          <ul className="lista-simple seccion">
            <li><span>Superficie</span><span className="num">{formatearNumero(c.m2)} m²</span></li>
            <li><span>Con desperdicio ({formatearNumero(e.desperdicio_pct, 0)} %)</span><span className="num">{formatearNumero(c.m2ConDesperdicio)} m²</span></li>
            <li><span>Planchas a usar</span><span className="num">{c.planchas}</span></li>
            <li><span>Material</span><span className="num">{formatearBs(D.material)}</span></li>
            <li><span className="suave">· de eso, desperdicio</span><span className="num suave">{formatearBs(D.desperdicio)}</span></li>
            {c.insumos.map((i) => <li key={i.nombre}><span>{i.nombre} ({i.envases} bolsas)</span><span className="num">{formatearBs(i.costo)}</span></li>)}
            <li><span>Mano de obra</span><span className="num">{formatearBs(D.manoObra)}</span></li>
            <li><span>Otros</span><span className="num">{formatearBs(D.otros)}</span></li>
            <li><strong>Costo total</strong><strong className="num">{formatearBs(c.costoTotal)}</strong></li>
            <li><span>Costo por m²</span><span className="num">{formatearBs(c.costoM2)}</span></li>
          </ul>
          {escribe ? (
            <div className="pila seccion">
              <SelectorSucursal valor={cab.sucursal_id} alCambiar={(v) => setCab({ ...cab, sucursal_id: v })} todas={false} />
              <button type="button" className="boton boton-primario" disabled={ocupado || !c.ok} onClick={guardar}>{id ? 'Guardar cambios' : 'Guardar proyecto'}</button>
              {puede('proformas', 'escribir') ? (
                <a className="boton" href="#/proformas/nueva" onClick={() => sessionStorage.setItem('proforma-desde-calculo', JSON.stringify({ nombre: cab.nombre, material_id: cab.material_id, m2: c.m2, precioM2: c.precioM2 }))}>Crear proforma con este precio</a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </>
  )
}
