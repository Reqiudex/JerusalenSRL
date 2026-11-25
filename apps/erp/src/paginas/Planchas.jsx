// Planchas: inventario de planchas individuales y su matriz de corte (con historial de versiones).
import { useState } from 'react'
import MatrizCorte from '@matriz/MatrizCorte.jsx'
import { formatearFecha, formatearNumero } from '@ui/formatos.js'
import { api, consulta } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Icono, Modal, SelectorSucursal, Tabla, ir, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

export default function Planchas({ ruta }) {
  const [, id] = ruta.partes
  return id ? <DetallePlancha id={id} /> : <ListaPlanchas params={ruta.params} />
}

function MiniBarra({ r }) {
  return (
    <span className="mini-barra" role="img" aria-label={`Vendido ${r.vendido} %, retazo ${r.retazo} %, merma ${r.merma} %, libre ${r.libre} %`}>
      <span className="v" style={{ width: `${r.vendido}%` }} />
      <span className="r" style={{ width: `${r.retazo}%` }} />
      <span className="m" style={{ width: `${r.merma}%` }} />
    </span>
  )
}

function ListaPlanchas({ params }) {
  const puede = usePuede()
  const [f, setF] = useState({ q: '', sucursal: params.sucursal ?? '', material: params.material ?? '', estado: params.estado ?? '' })
  const [nueva, setNueva] = useState(false)
  const { datos: materiales } = useDatos('/materiales?categoria=plancha')
  const { datos, error, cargando, recargar } = useDatos(`/planchas${consulta(f)}`)
  return (
    <>
      <Cabecera titulo="Planchas y cortes" subtitulo="Cada plancha tiene su matriz de corte: lo vendido, los retazos útiles y la merma."
        acciones={puede('planchas', 'escribir') ? <button type="button" className="boton boton-primario" onClick={() => setNueva(true)}><Icono nombre="mas" /> Registrar plancha</button> : null} />
      <div className="filtros">
        <Campo etiqueta="Buscar" className="campo-busqueda" type="search" placeholder="Código o material" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Material" como="select" value={f.material} onChange={(e) => setF({ ...f, material: e.target.value })}>
          <option value="">Todos</option>
          {(materiales ?? []).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </Campo>
        <Campo etiqueta="Estado" como="select" value={f.estado} onChange={(e) => setF({ ...f, estado: e.target.value })}>
          <option value="">Todos</option><option value="disponible">Disponible (entera)</option><option value="en_corte">En corte</option><option value="agotada">Agotada</option>
        </Campo>
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Planchas" filas={datos ?? []} alElegir={(p) => ir(`planchas/${p.id}`)} vacio="No hay planchas con esos filtros." columnas={[
          { titulo: 'Código', valor: (p) => <strong className="mono">{p.codigo}</strong> },
          { titulo: 'Material', valor: (p) => p.material },
          { titulo: 'Medida', valor: (p) => <span className="mono">{p.ancho} × {p.alto} cm</span> },
          { titulo: 'Sucursal', valor: (p) => p.sucursal.split(' — ')[0] },
          { titulo: 'Estado', valor: (p) => <Estado valor={p.estado} /> },
          { titulo: 'Uso', valor: (p) => <MiniBarra r={p.resumen} /> },
          { titulo: 'Libre', num: true, valor: (p) => `${formatearNumero(p.resumen.libreM2)} m²` },
          { titulo: 'Ingreso', valor: (p) => formatearFecha(p.fecha_ingreso) },
        ]} />
      )}
      {nueva ? <NuevaPlancha materiales={materiales ?? []} alCerrar={() => setNueva(false)} alCrear={(p) => ir(`planchas/${p.id}`)} /> : null}
    </>
  )
}

function NuevaPlancha({ materiales, alCerrar, alCrear }) {
  const { usuario } = useApp()
  const [d, setD] = useState({ material_id: materiales[0]?.id ?? '', sucursal_id: usuario.sucursal_id ?? 2, ancho: '', alto: '', codigo: '' })
  const [ejecutar, ocupado] = useAccion()
  const m = materiales.find((x) => x.id === Number(d.material_id))
  return (
    <Modal titulo="Registrar plancha" alCerrar={alCerrar} ancho="520px" pie={
      <>
        <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
        <button type="button" className="boton boton-primario" disabled={ocupado || !d.material_id} onClick={async () => {
          const r = await ejecutar(() => api.post('/planchas', { material_id: Number(d.material_id), sucursal_id: d.sucursal_id, ancho: Number(d.ancho) || undefined, alto: Number(d.alto) || undefined, codigo: d.codigo || undefined }), 'Plancha registrada.')
          if (r) alCrear(r)
        }}>Registrar</button>
      </>
    }>
      <p className="suave">Para varias planchas que llegan juntas usa <a href="#/inventario?pestana=movimientos">Inventario → Entrada</a>.</p>
      <div className="formulario">
        <Campo etiqueta="Material" como="select" className="ancho-completo" value={d.material_id} onChange={(e) => setD({ ...d, material_id: e.target.value })}>
          {materiales.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </Campo>
        <SelectorSucursal valor={d.sucursal_id} alCambiar={(v) => setD({ ...d, sucursal_id: v })} todas={false} />
        <Campo etiqueta="Código" value={d.codigo} onChange={(e) => setD({ ...d, codigo: e.target.value })} ayuda="Vacío = automático" />
        <Campo etiqueta="Ancho (cm)" type="number" min="1" value={d.ancho} onChange={(e) => setD({ ...d, ancho: e.target.value })} placeholder={String(m?.ancho_cm ?? 300)} />
        <Campo etiqueta="Alto (cm)" type="number" min="1" value={d.alto} onChange={(e) => setD({ ...d, alto: e.target.value })} placeholder={String(m?.alto_cm ?? 170)} />
      </div>
    </Modal>
  )
}

function DetallePlancha({ id }) {
  const { tema, setTema } = useApp()
  const puede = usePuede()
  const { datos: plancha, error: e1, recargar: recargarPlancha } = useDatos(`/planchas/${id}`)
  const { datos, error: e2 } = useDatos(`/planchas/${id}/cortes`)
  const { datos: historial, recargar: recargarHistorial } = useDatos(`/planchas/${id}/historial`)
  const [version, setVersion] = useState(null)
  const error = e1 || e2
  if (error) return <ErrorCarga error={error} />
  if (!plancha || !datos) return <Cargando />
  return (
    <>
      <Cabecera titulo={`Plancha ${plancha.codigo}`} subtitulo={<><Estado valor={plancha.estado} /> {plancha.material} · {plancha.sucursal}</>} volver="planchas" />
      <MatrizCorte
        valorInicial={datos}
        tema={tema}
        onCambioTema={setTema}
        soloLectura={!puede('planchas', 'escribir')}
        onGuardar={async (d) => {
          await api.post(`/planchas/${id}/cortes`, d)
          recargarHistorial()
          recargarPlancha()
        }}
      />
      <section className="tarjeta seccion">
        <h2>Historial de esta plancha</h2>
        <ul className="lista-simple">
          {(historial ?? []).length === 0 ? <li className="suave">Todavía no se guardaron cortes.</li> : historial.map((h) => (
            <li key={h.id}>
              <span><strong>{formatearFecha(h.fecha.slice(0, 10))}</strong> {h.fecha.slice(11, 16)} · {h.usuario ?? '—'}<br /><small className="suave">{h.resumen}</small></span>
              <button type="button" className="boton boton-chico" onClick={() => setVersion(h.id)}>Ver</button>
            </li>
          ))}
        </ul>
      </section>
      {version ? <VersionPlancha planchaId={id} versionId={version} alCerrar={() => setVersion(null)} tema={tema} /> : null}
    </>
  )
}

function VersionPlancha({ planchaId, versionId, alCerrar, tema }) {
  const { datos, error } = useDatos(`/planchas/${planchaId}/historial/${versionId}`)
  return (
    <Modal titulo="Versión guardada" alCerrar={alCerrar} ancho="1200px">
      {error ? <ErrorCarga error={error} /> : !datos ? <Cargando /> : <MatrizCorte valorInicial={datos.datos} soloLectura tema={tema} />}
    </Modal>
  )
}
