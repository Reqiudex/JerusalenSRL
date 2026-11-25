// Armazón del ERP: sesión, menú lateral según permisos, tema claro/noche, avisos y rutas.
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import MarmolFondo from '@ui/MarmolFondo.jsx'
import { api, configurarApi } from './api.js'
import { Cargando, Contexto, Icono, useRuta } from './componentes.jsx'
import Ingresar from './paginas/Ingresar.jsx'

// Cada módulo se carga solo cuando se abre (el primer ingreso es más liviano)
const Inicio = lazy(() => import('./paginas/Inicio.jsx'))
const Proformas = lazy(() => import('./paginas/Proformas.jsx'))
const Ventas = lazy(() => import('./paginas/Ventas.jsx'))
const Clientes = lazy(() => import('./paginas/Clientes.jsx'))
const Proyectos = lazy(() => import('./paginas/Proyectos.jsx'))
const Planchas = lazy(() => import('./paginas/Planchas.jsx'))
const Inventario = lazy(() => import('./paginas/Inventario.jsx'))
const Contabilidad = lazy(() => import('./paginas/Contabilidad.jsx'))
const RRHH = lazy(() => import('./paginas/RRHH.jsx'))
const Reportes = lazy(() => import('./paginas/Reportes.jsx'))
const Ajustes = lazy(() => import('./paginas/Ajustes.jsx'))

const MODULOS = [
  { ruta: 'inicio', nombre: 'Inicio', icono: 'inicio', permiso: 'panel', Pagina: Inicio, seccion: '' },
  { ruta: 'proformas', nombre: 'Proformas', icono: 'proformas', permiso: 'proformas', Pagina: Proformas, seccion: 'Comercial' },
  { ruta: 'ventas', nombre: 'Ventas y cobros', icono: 'ventas', permiso: 'ventas', Pagina: Ventas, seccion: 'Comercial' },
  { ruta: 'clientes', nombre: 'Clientes', icono: 'clientes', permiso: 'clientes', Pagina: Clientes, seccion: 'Comercial' },
  { ruta: 'proyectos', nombre: 'Costos y producción', icono: 'proyectos', permiso: 'proyectos', Pagina: Proyectos, seccion: 'Taller' },
  { ruta: 'planchas', nombre: 'Planchas y cortes', icono: 'planchas', permiso: 'planchas', Pagina: Planchas, seccion: 'Taller' },
  { ruta: 'inventario', nombre: 'Inventario y compras', icono: 'inventario', permiso: 'inventario', Pagina: Inventario, seccion: 'Taller' },
  { ruta: 'contabilidad', nombre: 'Contabilidad', icono: 'contabilidad', permiso: 'contabilidad', Pagina: Contabilidad, seccion: 'Administración' },
  { ruta: 'rrhh', nombre: 'Personal y planilla', icono: 'rrhh', permiso: 'rrhh', Pagina: RRHH, seccion: 'Administración' },
  { ruta: 'reportes', nombre: 'Reportes', icono: 'reportes', permiso: 'reportes', Pagina: Reportes, seccion: 'Administración' },
  { ruta: 'ajustes', nombre: 'Usuarios y ajustes', icono: 'ajustes', permiso: 'ajustes', Pagina: Ajustes, seccion: 'Administración' },
]

export default function App() {
  const [usuario, setUsuario] = useState(undefined) // undefined = verificando
  const [sucursales, setSucursales] = useState([])
  const [ajustes, setAjustes] = useState(null)
  const [avisos, setAvisos] = useState([])
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || 'claro')
  const ruta = useRuta()

  const notificar = useCallback((texto, nivel = 'info') => {
    const id = Math.random()
    setAvisos((a) => [...a.slice(-3), { id, texto, nivel }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), nivel === 'error' ? 7000 : 4000)
  }, [])

  useEffect(() => {
    configurarApi({ noAutorizado: () => setUsuario(null) })
    api.get('/auth/yo').then((r) => setUsuario(r.tipoSesion === 'pin' ? null : r.usuario)).catch(() => setUsuario(null))
  }, [])

  useEffect(() => {
    if (!usuario) return
    api.get('/sucursales').then(setSucursales).catch(() => {})
    api.get('/ajustes').then(setAjustes).catch(() => {})
  }, [usuario])

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem('jerusalen-tema', tema)
    } catch {
      /* sin almacenamiento */
    }
  }, [tema])

  useEffect(() => setMenuAbierto(false), [ruta])

  const visibles = useMemo(() => MODULOS.filter((m) => usuario?.permisos?.[m.permiso]), [usuario])
  const salir = async () => {
    await api.post('/auth/salir').catch(() => {})
    setUsuario(null)
    location.hash = ''
  }

  const contexto = useMemo(
    () => ({ usuario, sucursales, ajustes, notificar, tema, setTema, recargarSucursales: () => api.get('/sucursales').then(setSucursales), recargarAjustes: () => api.get('/ajustes').then(setAjustes) }),
    [usuario, sucursales, ajustes, notificar, tema],
  )

  if (usuario === undefined) return <div className="pantalla-centro"><Cargando /></div>

  const avisosNodo = (
    <div className="notificaciones" aria-live="polite">
      {avisos.map((a) => <div key={a.id} className={`aviso aviso-${a.nivel}`} role={a.nivel === 'error' ? 'alert' : 'status'}>{a.texto}</div>)}
    </div>
  )

  if (!usuario) {
    return (
      <Contexto.Provider value={contexto}>
        <MarmolFondo />
        <Ingresar alIngresar={(u) => setUsuario(u)} />
        {avisosNodo}
      </Contexto.Provider>
    )
  }

  const actual = visibles.find((m) => m.ruta === ruta.partes[0]) ?? visibles[0]
  const Pagina = actual?.Pagina
  let seccionPrevia = null

  return (
    <Contexto.Provider value={contexto}>
      <MarmolFondo />
      <a className="saltar" href="#contenido">Saltar al contenido</a>
      <div className="armazon">
        <aside className={`lateral ${menuAbierto ? 'abierto' : ''}`} aria-label="Menú principal">
          <div className="lateral-marca">
            <span className="marca-logo" aria-hidden="true">J</span>
            <div>
              <p className="marca marca-nombre">JERUSALÉN</p>
              <p className="marca-sub">Gestión del taller</p>
            </div>
          </div>
          <nav>
            {visibles.map((m) => {
              const titulo = m.seccion && m.seccion !== seccionPrevia ? <p className="nav-seccion">{m.seccion}</p> : null
              seccionPrevia = m.seccion
              return (
                <div key={m.ruta}>
                  {titulo}
                  <a href={`#/${m.ruta}`} className={actual?.ruta === m.ruta ? 'activo' : ''} aria-current={actual?.ruta === m.ruta ? 'page' : undefined}>
                    <Icono nombre={m.icono} /> {m.nombre}
                  </a>
                </div>
              )
            })}
          </nav>
          <div className="lateral-pie">
            <p className="usuario-nombre">{usuario.nombre}</p>
            <p className="usuario-rol">{usuario.rolNombre}{usuario.sucursal ? ` · ${usuario.sucursal.split(' — ')[0]}` : ''}</p>
            <div className="fila">
              <button type="button" className="boton boton-chico boton-lateral" onClick={() => setTema(tema === 'noche' ? 'claro' : 'noche')} aria-label={tema === 'noche' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'}>
                <Icono nombre={tema === 'noche' ? 'sol' : 'luna'} /> {tema === 'noche' ? 'Claro' : 'Noche'}
              </button>
              <button type="button" className="boton boton-chico boton-lateral" onClick={salir}>
                <Icono nombre="salir" /> Salir
              </button>
            </div>
          </div>
        </aside>
        {menuAbierto ? <div className="velo" onClick={() => setMenuAbierto(false)} aria-hidden="true" /> : null}
        <div className="principal">
          <header className="barra-superior">
            <button type="button" className="boton boton-icono" onClick={() => setMenuAbierto(true)} aria-label="Abrir menú" aria-expanded={menuAbierto}>
              <Icono nombre="menu" />
            </button>
            <span className="marca marca-nombre">JERUSALÉN</span>
            <button type="button" className="boton boton-icono" onClick={() => setTema(tema === 'noche' ? 'claro' : 'noche')} aria-label="Cambiar tema">
              <Icono nombre={tema === 'noche' ? 'sol' : 'luna'} />
            </button>
          </header>
          <main id="contenido" className="contenido" tabIndex={-1}>
            <Suspense fallback={<Cargando />}>{Pagina ? <Pagina ruta={ruta} /> : <p>No tienes módulos asignados. Habla con el administrador.</p>}</Suspense>
          </main>
        </div>
      </div>
      {avisosNodo}
    </Contexto.Provider>
  )
}
