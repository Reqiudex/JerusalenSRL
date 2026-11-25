// Usuarios, roles y ajustes de la empresa (datos del PDF, planilla, proformas) y cambio de contraseña.
import { useState } from 'react'
import { formatearFecha } from '@ui/formatos.js'
import { api } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Icono, Modal, Pestanas, SelectorSucursal, Tabla, useAccion, useApp, useDatos, usePuede } from '../componentes.jsx'

const ROLES = { dueno: 'Dueño (solo panel)', administrador: 'Administrador', vendedor: 'Vendedor', cortador: 'Cortador / Arquitecto', contador: 'Contador', rrhh: 'Recursos humanos' }

export default function Ajustes() {
  const puede = usePuede()
  const admin = puede('usuarios', 'escribir')
  const [pestana, setPestana] = useState(admin ? 'usuarios' : 'cuenta')
  const opciones = [...(admin ? [['usuarios', 'Usuarios'], ['empresa', 'Empresa y PDF'], ['planilla', 'Planilla'], ['bitacora', 'Bitácora']] : []), ['cuenta', 'Mi cuenta']]
  return (
    <>
      <Cabecera titulo="Usuarios y ajustes" />
      <Pestanas valor={pestana} alCambiar={setPestana} opciones={opciones} />
      {pestana === 'usuarios' ? <Usuarios /> : null}
      {pestana === 'empresa' ? <Empresa /> : null}
      {pestana === 'planilla' ? <AjustePlanilla /> : null}
      {pestana === 'bitacora' ? <Bitacora /> : null}
      {pestana === 'cuenta' ? <MiCuenta /> : null}
    </>
  )
}

function Usuarios() {
  const { datos, error, cargando, recargar } = useDatos('/usuarios')
  const [editar, setEditar] = useState(null)
  const [ejecutar, ocupado] = useAccion()
  const set = (k) => (e) => setEditar({ ...editar, [k]: e.target.value })
  const guardar = async (e) => {
    e.preventDefault()
    const cuerpo = { nombre: editar.nombre, email: editar.email, rol: editar.rol, sucursal_id: editar.sucursal_id || undefined, telefono: editar.telefono, activo: editar.activo ? 1 : 0 }
    if (editar.clave) cuerpo.clave = editar.clave
    if (editar.pin) cuerpo.pin = editar.pin
    const r = await ejecutar(() => (editar.id ? api.put(`/usuarios/${editar.id}`, cuerpo) : api.post('/usuarios', cuerpo)), 'Usuario guardado.')
    if (r) { setEditar(null); recargar() }
  }
  return (
    <>
      <div className="filtros"><button type="button" className="boton boton-primario" onClick={() => setEditar({ nombre: '', email: '', rol: 'vendedor', sucursal_id: 1, telefono: '', activo: 1, clave: '', pin: '' })}><Icono nombre="mas" /> Nuevo usuario</button></div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !datos ? <Cargando /> : (
        <Tabla etiqueta="Usuarios" filas={datos ?? []} alElegir={(u) => setEditar({ ...u, clave: '', pin: '' })} columnas={[
          { titulo: 'Nombre', valor: (u) => <><strong>{u.nombre}</strong>{u.activo ? null : <> <Estado valor="inactivo" /></>}</> },
          { titulo: 'Correo', valor: (u) => u.email },
          { titulo: 'Rol', valor: (u) => ROLES[u.rol] },
          { titulo: 'Sucursal', valor: (u) => u.sucursal?.split(' — ')[0] ?? '—' },
          { titulo: 'PIN', valor: (u) => (u.tiene_pin ? 'Sí' : '—') },
        ]} />
      )}
      {editar ? (
        <Modal titulo={editar.id ? `Editar ${editar.nombre}` : 'Nuevo usuario'} alCerrar={() => setEditar(null)}>
          <form className="formulario" onSubmit={guardar}>
            <Campo etiqueta="Nombre" className="ancho-completo" value={editar.nombre} onChange={set('nombre')} required />
            <Campo etiqueta="Correo" type="email" value={editar.email} onChange={set('email')} required />
            <Campo etiqueta="Teléfono" value={editar.telefono} onChange={set('telefono')} />
            <Campo etiqueta="Rol" como="select" value={editar.rol} onChange={set('rol')}>
              {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Campo>
            <SelectorSucursal valor={editar.sucursal_id} alCambiar={(v) => setEditar({ ...editar, sucursal_id: v })} todas={false} />
            {editar.rol !== 'dueno' ? <Campo etiqueta={editar.id ? 'Nueva contraseña' : 'Contraseña'} type="password" autoComplete="new-password" minLength={8} value={editar.clave} onChange={set('clave')} required={!editar.id} ayuda={editar.id ? 'Vacío = no cambiar' : 'Mínimo 8 caracteres'} /> : null}
            {['dueno', 'administrador'].includes(editar.rol) ? <Campo etiqueta={editar.id ? 'Nuevo PIN del panel del dueño' : 'PIN del panel del dueño'} inputMode="numeric" pattern="\d{4,6}" maxLength={6} value={editar.pin} onChange={set('pin')} required={!editar.id && editar.rol === 'dueno'} ayuda="4 a 6 números" /> : null}
            {editar.id ? <label className="fila ancho-completo"><input type="checkbox" checked={Boolean(editar.activo)} onChange={(e) => setEditar({ ...editar, activo: e.target.checked })} /> Activo</label> : null}
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

function FormAjuste({ clave, campos, titulo, nota }) {
  const { ajustes, recargarAjustes } = useApp()
  const [v, setV] = useState(() => ({ ...ajustes?.[clave] }))
  const [ejecutar, ocupado] = useAccion()
  if (!ajustes) return <Cargando />
  return (
    <form className="tarjeta formulario" onSubmit={async (e) => {
      e.preventDefault()
      if (await ejecutar(() => api.put(`/ajustes/${clave}`, v), 'Ajustes guardados.')) recargarAjustes()
    }}>
      <h2 className="ancho-completo">{titulo}</h2>
      {nota ? <p className="suave ancho-completo">{nota}</p> : null}
      {campos.map(([k, etiqueta, extra = {}]) => (
        <Campo key={k} etiqueta={etiqueta} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: extra.type === 'number' ? e.target.value : e.target.value })} {...extra} />
      ))}
      <div className="ancho-completo"><button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button></div>
    </form>
  )
}

function Empresa() {
  return (
    <div className="pila">
      <FormAjuste clave="empresa" titulo="Datos de la empresa" nota="Aparecen en el encabezado del PDF de las proformas." campos={[
        ['nombre', 'Nombre'], ['lema', 'Lema'], ['nit', 'NIT'], ['telefono', 'Teléfono'], ['whatsapp', 'WhatsApp'], ['email', 'Correo'], ['direccion', 'Dirección', { className: 'ancho-completo' }],
      ]} />
      <FormAjuste clave="proformas" titulo="Proformas" campos={[
        ['validez_dias', 'Validez por defecto (días)', { type: 'number', min: 1 }], ['condiciones', 'Condiciones (al pie del PDF)', { como: 'textarea', className: 'ancho-completo' }],
      ]} />
    </div>
  )
}

function AjustePlanilla() {
  return (
    <FormAjuste clave="planilla" titulo="Parámetros de la planilla"
      nota="Cambian por decreto: revísalos con el contador cada año. El bono de antigüedad se calcula sobre 3 salarios mínimos según la escala de años trabajados."
      campos={[['salario_minimo', 'Salario mínimo nacional (Bs)', { type: 'number', min: 1, step: 1 }], ['aporte_laboral_pct', 'Aporte laboral a la Gestora / AFP (%)', { type: 'number', min: 0, step: 0.01 }]]} />
  )
}

function Bitacora() {
  const { datos, error, cargando } = useDatos('/bitacora')
  if (error) return <ErrorCarga error={error} />
  if (cargando && !datos) return <Cargando />
  return (
    <Tabla etiqueta="Bitácora" filas={datos} columnas={[
      { titulo: 'Fecha', valor: (b) => `${formatearFecha(b.fecha.slice(0, 10))} ${b.fecha.slice(11, 16)} UTC` },
      { titulo: 'Usuario', valor: (b) => b.nombre ?? '—' },
      { titulo: 'Acción', valor: (b) => b.accion },
      { titulo: 'Detalle', valor: (b) => <small>{b.detalle}</small> },
    ]} />
  )
}

function MiCuenta() {
  const { usuario } = useApp()
  const [c, setC] = useState({ actual: '', nueva: '', repetir: '' })
  const [ejecutar, ocupado] = useAccion()
  const { notificar } = useApp()
  return (
    <form className="tarjeta formulario" style={{ maxWidth: 560 }} onSubmit={async (e) => {
      e.preventDefault()
      if (c.nueva !== c.repetir) return notificar('Las contraseñas nuevas no coinciden.', 'error')
      if (await ejecutar(() => api.post('/auth/clave', { actual: c.actual, nueva: c.nueva }), 'Contraseña cambiada. Se cerraron tus otras sesiones.')) setC({ actual: '', nueva: '', repetir: '' })
    }}>
      <h2 className="ancho-completo">Cambiar mi contraseña</h2>
      <p className="suave ancho-completo">{usuario.nombre} · {usuario.email}</p>
      <Campo etiqueta="Contraseña actual" type="password" autoComplete="current-password" className="ancho-completo" value={c.actual} onChange={(e) => setC({ ...c, actual: e.target.value })} required />
      <Campo etiqueta="Nueva contraseña" type="password" autoComplete="new-password" minLength={8} value={c.nueva} onChange={(e) => setC({ ...c, nueva: e.target.value })} required />
      <Campo etiqueta="Repetir" type="password" autoComplete="new-password" minLength={8} value={c.repetir} onChange={(e) => setC({ ...c, repetir: e.target.value })} required />
      <div className="ancho-completo"><button type="submit" className="boton boton-primario" disabled={ocupado}>Cambiar contraseña</button></div>
    </form>
  )
}
