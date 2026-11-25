// Inventario: existencias por sucursal, lista de compras, retazos, movimientos y catálogo de materiales.
import { useState } from 'react'
import { formatearBs, formatearFecha, formatearNumero, formatearUnidad } from '@ui/formatos.js'
import { api, consulta } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Icono, Modal, Pestanas, SelectorSucursal, Tabla, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

export default function Inventario({ ruta }) {
  const [pestana, setPestana] = useState(ruta.params.pestana ?? 'existencias')
  return (
    <>
      <Cabecera titulo="Inventario y compras" subtitulo="Stock por sucursal, retazos reutilizables y qué conviene comprar." />
      <Pestanas valor={pestana} alCambiar={setPestana} opciones={[['existencias', 'Existencias'], ['compras', 'Qué comprar'], ['retazos', 'Retazos'], ['movimientos', 'Entradas y ajustes'], ['materiales', 'Materiales y precios']]} />
      {pestana === 'existencias' ? <Existencias /> : null}
      {pestana === 'compras' ? <Compras /> : null}
      {pestana === 'retazos' ? <Retazos /> : null}
      {pestana === 'movimientos' ? <Movimientos /> : null}
      {pestana === 'materiales' ? <Materiales /> : null}
    </>
  )
}

function Existencias() {
  const puede = usePuede()
  const [f, setF] = useState({ sucursal: '', categoria: '', estado: '', q: '' })
  const [minimo, setMinimo] = useState(null)
  const { datos, error, cargando, recargar } = useDatos(`/existencias${consulta({ sucursal: f.sucursal })}`)
  const filas = (datos ?? []).filter((e) => (!f.categoria || e.categoria === f.categoria) && (!f.estado || e.estado === f.estado) && (!f.q || e.nombre.toLowerCase().includes(f.q.toLowerCase())))
  const [ejecutar, ocupado] = useAccion()
  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Buscar" className="campo-busqueda" type="search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Tipo" como="select" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
          <option value="">Todo</option><option value="plancha">Planchas</option><option value="insumo">Insumos</option>
        </Campo>
        <Campo etiqueta="Estado" como="select" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
          <option value="">Todos</option><option value="bajo">Stock bajo</option><option value="justo">Justo</option><option value="ok">Bien</option>
        </Campo>
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Existencias" filas={filas} clave="_k" columnas={[
          { titulo: 'Material', valor: (e) => <><strong>{e.nombre}</strong><br /><small className="suave mono">{e.codigo}</small></> },
          { titulo: 'Sucursal', valor: (e) => e.sucursal.split(' — ')[0] },
          { titulo: 'Stock', num: true, valor: (e) => `${formatearNumero(e.cantidad, e.categoria === 'plancha' ? 0 : 1)} ${e.categoria === 'plancha' ? 'planchas' : formatearUnidad(e.unidad)}` },
          { titulo: 'Mínimo', num: true, valor: (e) => (puede('inventario', 'escribir') ? <button type="button" className="boton boton-chico" onClick={(ev) => { ev.stopPropagation(); setMinimo({ ...e, nuevo: e.minimo }) }}>{formatearNumero(e.minimo, 0)}</button> : formatearNumero(e.minimo, 0)) },
          { titulo: 'Estado', valor: (e) => <Estado valor={e.estado} /> },
          { titulo: 'Extra', valor: (e) => (e.categoria === 'plancha' ? <small className="suave">{e.planchas_en_corte} en corte · {e.retazos} retazos ({formatearNumero(e.retazos_m2)} m²)</small> : '') },
          { titulo: 'Valor', num: true, valor: (e) => formatearBs(e.valor, { entero: true }) },
        ]} pie={<tr><td colSpan={6}>{filas.length} filas</td><td className="num">{formatearBs(filas.reduce((s, e) => s + e.valor, 0), { entero: true })}</td></tr>} />
      )}
      {minimo ? (
        <Modal titulo={`Mínimo de ${minimo.nombre}`} alCerrar={() => setMinimo(null)} ancho="420px" pie={
          <>
            <button type="button" className="boton" onClick={() => setMinimo(null)}>Cancelar</button>
            <button type="button" className="boton boton-primario" disabled={ocupado} onClick={async () => {
              const r = await ejecutar(() => api.put('/existencias', { material_id: minimo.material_id, sucursal_id: minimo.sucursal_id, minimo: Number(minimo.nuevo) }), 'Mínimo actualizado.')
              if (r) { setMinimo(null); recargar() }
            }}>Guardar</button>
          </>
        }>
          <p className="suave">{minimo.sucursal}. Cuando el stock baje de este número aparecerá en «Qué comprar».</p>
          <Campo etiqueta="Mínimo" type="number" min="0" value={minimo.nuevo} onChange={(e) => setMinimo({ ...minimo, nuevo: e.target.value })} />
        </Modal>
      ) : null}
    </>
  )
}

function Compras() {
  const [sucursal, setSucursal] = useState('')
  const { datos, error, cargando, recargar } = useDatos(`/compras${consulta({ sucursal })}`)
  const descargarCsv = () => {
    const filas = [['Material', 'Dónde falta', 'Stock', 'Mínimo', 'Demanda diaria', 'Comprar', 'Unidad', 'Urgencia', 'Costo estimado (Bs)']]
      .concat((datos ?? []).map((c) => [c.nombre, c.sucursal, c.stock, c.minimo, c.demandaDiaria, c.sugerido, c.unidad, c.urgencia, c.costoEstimado]))
    const csv = `﻿${filas.map((f) => f.map((v) => (typeof v === 'number' ? String(v).replace('.', ',') : `"${String(v).replace(/"/g, '""')}"`)).join(';')).join('\r\n')}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'lista-de-compras.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  return (
    <>
      <p className="aviso aviso-info">La sugerencia combina el stock actual, el mínimo y lo que se vendió en los últimos 90 días (ajustado por la tendencia), para cubrir los próximos 30 días. Las planchas se cuentan enteras.</p>
      <div className="filtros seccion">
        <SelectorSucursal valor={sucursal} alCambiar={(v) => setSucursal(v ?? '')} />
        <button type="button" className="boton" onClick={descargarCsv} disabled={!datos?.length}><Icono nombre="descargar" /> Descargar lista</button>
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Lista de compras" filas={datos ?? []} clave="material_id" vacio="No hace falta comprar nada por ahora." columnas={[
          { titulo: 'Urgencia', valor: (c) => <Estado valor={c.urgencia} /> },
          { titulo: 'Material', valor: (c) => <><strong>{c.nombre}</strong><br /><small className="suave">{c.sucursal}</small></> },
          { titulo: 'Stock', num: true, valor: (c) => formatearNumero(c.stock, 0) },
          { titulo: 'Mínimo', num: true, valor: (c) => formatearNumero(c.minimo, 0) },
          { titulo: 'Se usa por día', num: true, valor: (c) => formatearNumero(c.demandaDiaria, 2) },
          { titulo: 'Alcanza para', num: true, valor: (c) => (c.diasRestantes == null ? '—' : `${c.diasRestantes} días`) },
          { titulo: 'Comprar', num: true, valor: (c) => <strong>{c.sugerido} {formatearUnidad(c.unidad)}</strong> },
          { titulo: 'Costo estimado', num: true, valor: (c) => formatearBs(c.costoEstimado, { entero: true }) },
        ]} pie={datos?.length ? <tr><td colSpan={7}>Total estimado</td><td className="num">{formatearBs(datos.reduce((s, c) => s + c.costoEstimado, 0), { entero: true })}</td></tr> : null} />
      )}
    </>
  )
}

function Retazos() {
  const puede = usePuede()
  const [f, setF] = useState({ sucursal: '', material: '', minAncho: '', minAlto: '' })
  const { datos: materiales } = useDatos('/materiales?categoria=plancha')
  const { datos, error, cargando, recargar } = useDatos(`/retazos${consulta(f)}`)
  const [ejecutar] = useAccion()
  return (
    <>
      <p className="aviso aviso-info">Los retazos útiles vienen de la matriz de corte. Busca uno que sirva para una pieza nueva antes de cortar una plancha entera.</p>
      <div className="filtros seccion">
        <Campo etiqueta="Material" como="select" value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })}>
          <option value="">Todos</option>{(materiales ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </Campo>
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Ancho mínimo (cm)" type="number" min="0" value={f.minAncho} onChange={(e) => setF({ ...f, minAncho: e.target.value })} />
        <Campo etiqueta="Alto mínimo (cm)" type="number" min="0" value={f.minAlto} onChange={(e) => setF({ ...f, minAlto: e.target.value })} />
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Retazos" filas={datos ?? []} vacio="No hay retazos con esas medidas." columnas={[
          { titulo: 'Material', valor: (x) => x.material },
          { titulo: 'Medida', valor: (x) => <span className="mono">{x.ancho} × {x.alto} cm</span> },
          { titulo: 'm²', num: true, valor: (x) => formatearNumero(x.m2) },
          { titulo: 'Libre', num: true, valor: (x) => `${formatearNumero(x.libre_m2)} m²` },
          { titulo: 'Estado', valor: (x) => <Estado valor={x.estado} /> },
          { titulo: 'Plancha', valor: (x) => <a href={`#/planchas/${x.plancha_id}`}>{x.plancha}</a> },
          { titulo: 'Sucursal', valor: (x) => x.sucursal.split(' — ')[0] },
          { titulo: '', valor: (x) => (puede('inventario', 'escribir') ? <button type="button" className="boton boton-chico" onClick={async () => { if (await ejecutar(() => api.put(`/retazos/${x.id}`, { estado: 'usado' }), 'Retazo marcado como usado.')) recargar() }}>Marcar usado</button> : null) },
        ]} />
      )}
    </>
  )
}

function Movimientos() {
  const { usuario } = useApp()
  const puede = usePuede()
  const { datos: materiales } = useDatos('/materiales')
  const { datos, error, cargando, recargar } = useDatos('/movimientos')
  const [m, setM] = useState({ material_id: '', sucursal_id: usuario.sucursal_id ?? 2, tipo: 'entrada', cantidad: '', costo_unit: '', referencia: '', registrar_egreso: true })
  const [ejecutar, ocupado] = useAccion()
  const material = materiales?.find((x) => x.id === Number(m.material_id))
  const esPlancha = material?.categoria === 'plancha'
  const guardar = async (e) => {
    e.preventDefault()
    const r = await ejecutar(() => api.post('/movimientos', { ...m, material_id: Number(m.material_id), cantidad: Number(m.cantidad), costo_unit: Number(m.costo_unit) || 0 }), 'Movimiento registrado.')
    if (r) { setM({ ...m, cantidad: '', referencia: '' }); recargar() }
  }
  return (
    <div className="dos-columnas">
      <section>
        <ErrorCarga error={error} reintentar={recargar} />
        {cargando && !datos ? <Cargando /> : (
          <Tabla etiqueta="Movimientos" filas={datos ?? []} columnas={[
            { titulo: 'Fecha', valor: (x) => formatearFecha(x.fecha) },
            { titulo: 'Tipo', valor: (x) => <Estado valor={x.tipo} /> },
            { titulo: 'Material', valor: (x) => x.material },
            { titulo: 'Sucursal', valor: (x) => x.sucursal.split(' — ')[0] },
            { titulo: 'Cantidad', num: true, valor: (x) => `${x.cantidad > 0 ? '+' : ''}${formatearNumero(x.cantidad, 1)}` },
            { titulo: 'Referencia', valor: (x) => <small>{x.referencia}{x.usuario ? ` · ${x.usuario}` : ''}</small> },
          ]} />
        )}
      </section>
      {puede('inventario', 'escribir') ? (
        <form className="tarjeta pila" onSubmit={guardar}>
          <h2>Registrar movimiento</h2>
          <Campo etiqueta="Tipo" como="select" value={m.tipo} onChange={(e) => setM({ ...m, tipo: e.target.value })}>
            <option value="entrada">Entrada (compra o llegada)</option>
            <option value="salida" disabled={esPlancha}>Salida (uso interno, daño)</option>
            <option value="ajuste" disabled={esPlancha}>Ajuste por conteo físico</option>
          </Campo>
          <Campo etiqueta="Material" como="select" value={m.material_id} onChange={(e) => {
            const x = materiales?.find((y) => y.id === Number(e.target.value))
            setM({ ...m, material_id: e.target.value, costo_unit: x?.costo ?? '', tipo: x?.categoria === 'plancha' ? 'entrada' : m.tipo })
          }} required>
            <option value="">Elegir…</option>
            {(materiales ?? []).filter((x) => x.categoria !== 'servicio').map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </Campo>
          <SelectorSucursal valor={m.sucursal_id} alCambiar={(v) => setM({ ...m, sucursal_id: v })} todas={false} />
          <Campo etiqueta={esPlancha ? 'Planchas enteras' : m.tipo === 'ajuste' ? 'Cantidad contada (real)' : 'Cantidad'} type="number" min="0" step={esPlancha ? 1 : 0.5} value={m.cantidad} onChange={(e) => setM({ ...m, cantidad: e.target.value })} required
            ayuda={esPlancha ? 'Se crea cada plancha con su código para la matriz de corte.' : material ? formatearUnidad(material.unidad) : ''} />
          {m.tipo === 'entrada' ? (
            <>
              <Campo etiqueta={esPlancha ? 'Costo por m² (Bs)' : 'Costo unitario (Bs)'} type="number" min="0" step="0.01" value={m.costo_unit} onChange={(e) => setM({ ...m, costo_unit: e.target.value })} />
              <label className="fila"><input type="checkbox" checked={m.registrar_egreso} onChange={(e) => setM({ ...m, registrar_egreso: e.target.checked })} /> Registrar el gasto en contabilidad</label>
            </>
          ) : null}
          <Campo etiqueta="Proveedor / referencia" value={m.referencia} onChange={(e) => setM({ ...m, referencia: e.target.value })} />
          <button type="submit" className="boton boton-primario" disabled={ocupado}>Registrar</button>
        </form>
      ) : null}
    </div>
  )
}

const MATERIAL_VACIO = { codigo: '', nombre: '', categoria: 'plancha', tipo: 'granito', unidad: 'm2', espesor_cm: 2, ancho_cm: 300, alto_cm: 170, origen: 'Brasil', costo: '', precio: '', rendimiento: '', presentacion: '' }

function Materiales() {
  const puede = usePuede()
  const [categoria, setCategoria] = useState('')
  const [editar, setEditar] = useState(null)
  const { datos, error, cargando, recargar } = useDatos(`/materiales${consulta({ categoria, activos: '0' })}`)
  const [ejecutar, ocupado] = useAccion()
  const guardar = async (e) => {
    e.preventDefault()
    const { id, stock_total: _s, creado_en: _c, ...cuerpo } = editar
    for (const k of ['espesor_cm', 'ancho_cm', 'alto_cm', 'rendimiento', 'presentacion']) if (cuerpo[k] === '' || cuerpo[k] == null) delete cuerpo[k]
    const r = await ejecutar(() => (id ? api.put(`/materiales/${id}`, cuerpo) : api.post('/materiales', cuerpo)), 'Material guardado.')
    if (r) { setEditar(null); recargar() }
  }
  const set = (k) => (e) => setEditar({ ...editar, [k]: e.target.value })
  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Categoría" como="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas</option><option value="plancha">Planchas</option><option value="insumo">Insumos</option><option value="servicio">Servicios</option>
        </Campo>
        {puede('inventario', 'escribir') ? <button type="button" className="boton boton-primario" onClick={() => setEditar(MATERIAL_VACIO)}><Icono nombre="mas" /> Nuevo material</button> : null}
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Materiales" filas={datos ?? []} alElegir={puede('inventario', 'escribir') ? (x) => setEditar(x) : undefined} columnas={[
          { titulo: 'Código', valor: (x) => <span className="mono">{x.codigo}</span> },
          { titulo: 'Nombre', valor: (x) => <>{x.nombre}{x.activo ? null : <> <Estado valor="inactivo" /></>}</> },
          { titulo: 'Categoría', valor: (x) => x.categoria },
          { titulo: 'Unidad', valor: (x) => formatearUnidad(x.unidad) },
          { titulo: 'Costo', num: true, valor: (x) => formatearBs(x.costo) },
          { titulo: 'Precio', num: true, valor: (x) => formatearBs(x.precio) },
          { titulo: 'Margen', num: true, valor: (x) => (x.precio > 0 && x.costo > 0 ? `${formatearNumero(((x.precio - x.costo) / x.precio) * 100, 0)} %` : '—') },
        ]} />
      )}
      {editar ? (
        <Modal titulo={editar.id ? `Editar ${editar.nombre}` : 'Nuevo material'} alCerrar={() => setEditar(null)}>
          <form className="formulario" onSubmit={guardar}>
            <Campo etiqueta="Código" value={editar.codigo} onChange={set('codigo')} required />
            <Campo etiqueta="Categoría" como="select" value={editar.categoria} onChange={set('categoria')}>
              <option value="plancha">Plancha</option><option value="insumo">Insumo</option><option value="servicio">Servicio</option>
            </Campo>
            <Campo etiqueta="Nombre" className="ancho-completo" value={editar.nombre} onChange={set('nombre')} required />
            <Campo etiqueta="Tipo" value={editar.tipo} onChange={set('tipo')} ayuda="granito, mármol, cuarzo, sinterizada, pegamento…" />
            <Campo etiqueta="Unidad" como="select" value={editar.unidad} onChange={set('unidad')}>
              {['m2', 'ml', 'unidad', 'bolsa', 'kg', 'servicio'].map((u) => <option key={u} value={u}>{formatearUnidad(u)}</option>)}
            </Campo>
            <Campo etiqueta="Costo (Bs)" type="number" min="0" step="0.01" value={editar.costo} onChange={set('costo')} />
            <Campo etiqueta="Precio de venta (Bs)" type="number" min="0" step="0.01" value={editar.precio} onChange={set('precio')} />
            {editar.categoria === 'plancha' ? (
              <>
                <Campo etiqueta="Ancho de plancha (cm)" type="number" value={editar.ancho_cm ?? ''} onChange={set('ancho_cm')} />
                <Campo etiqueta="Alto de plancha (cm)" type="number" value={editar.alto_cm ?? ''} onChange={set('alto_cm')} />
                <Campo etiqueta="Espesor (cm)" type="number" step="0.1" value={editar.espesor_cm ?? ''} onChange={set('espesor_cm')} />
                <Campo etiqueta="Origen" value={editar.origen ?? ''} onChange={set('origen')} />
              </>
            ) : null}
            {editar.categoria === 'insumo' ? (
              <>
                <Campo etiqueta="Rendimiento (kg/m²)" type="number" step="0.1" value={editar.rendimiento ?? ''} onChange={set('rendimiento')} />
                <Campo etiqueta="kg por envase" type="number" step="0.1" value={editar.presentacion ?? ''} onChange={set('presentacion')} />
              </>
            ) : null}
            {editar.id ? <label className="fila ancho-completo"><input type="checkbox" checked={Boolean(editar.activo)} onChange={(e) => setEditar({ ...editar, activo: e.target.checked ? 1 : 0 })} /> Activo (se puede vender)</label> : null}
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
