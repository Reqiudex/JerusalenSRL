// Componentes compartidos del ERP: íconos, contexto, ruta, carga de datos, modal, campos, tablas.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { api } from './api.js'

// ───────────────────────── Contexto de la app ─────────────────────────

export const Contexto = createContext(null)
export const useApp = () => useContext(Contexto)

/** ¿El usuario puede leer/escribir el módulo? */
export function usePuede() {
  const { usuario } = useApp()
  return (modulo, accion = 'leer') => {
    const p = usuario?.permisos?.[modulo]
    return accion === 'leer' ? Boolean(p) : p === 'escribir'
  }
}

// ───────────────────────── Ruta (hash) ─────────────────────────

function leerRuta() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
  const [camino, q = ''] = h.split('?')
  return { partes: camino.split('/').filter(Boolean), params: Object.fromEntries(new URLSearchParams(q)) }
}
export function useRuta() {
  const [ruta, setRuta] = useState(leerRuta)
  useEffect(() => {
    const cambio = () => {
      setRuta(leerRuta())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', cambio)
    return () => window.removeEventListener('hashchange', cambio)
  }, [])
  return ruta
}
export const ir = (camino) => {
  location.hash = `#/${camino.replace(/^\//, '')}`
}

// ───────────────────────── Datos ─────────────────────────

/** Carga una ruta de la API; vuelve a cargar si cambia la ruta o al llamar `recargar`. */
export function useDatos(ruta, { activo = true } = {}) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: Boolean(ruta && activo) })
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!ruta || !activo) return
    let vivo = true
    setEstado((e) => ({ ...e, cargando: true, error: null }))
    api.get(ruta)
      .then((datos) => vivo && setEstado({ datos, error: null, cargando: false }))
      .catch((error) => vivo && setEstado({ datos: null, error, cargando: false }))
    return () => {
      vivo = false
    }
  }, [ruta, version, activo])
  const recargar = useCallback(() => setVersion((v) => v + 1), [])
  return { ...estado, recargar }
}

/** Ejecuta una acción con aviso de error/éxito y estado «ocupado». */
export function useAccion() {
  const { notificar } = useApp()
  const [ocupado, setOcupado] = useState(false)
  const ejecutar = async (fn, mensajeOk) => {
    setOcupado(true)
    try {
      const r = await fn()
      if (mensajeOk) notificar(mensajeOk, 'ok')
      return r
    } catch (e) {
      notificar(e.message, 'error')
      return undefined
    } finally {
      setOcupado(false)
    }
  }
  return [ejecutar, ocupado]
}

// ───────────────────────── Íconos (SVG propio) ─────────────────────────

export const ICONOS = {
  inicio: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  proformas: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  ventas: 'M3 6h18l-2 10H5zM8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM3 6 2 3',
  clientes: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  proyectos: 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6',
  planchas: 'M3 5h18v14H3zM3 12h9M12 5v14M16 12h5',
  inventario: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  contabilidad: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',
  rrhh: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a7 7 0 0 1 14 0v1',
  reportes: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  mas: 'M12 5v14M5 12h14',
  cerrar: 'M6 6l12 12M18 6 6 18',
  buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  pdf: 'M7 3h7l5 5v13H7zM14 3v5h5M9 14h1.5a1.5 1.5 0 0 1 0 3H9v-5M14 12v5h1a2 2 0 0 0 0-5zM19 12h-2v5M17 14.5h1.5',
  whatsapp: 'M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.6zM9 8.5c0 3.5 3 6.5 6.5 6.5l1.5-1.5-2-1-1 1a5 5 0 0 1-2.5-2.5l1-1-1-2z',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  copiar: 'M9 9h11v11H9zM5 15H4V4h11v1',
  check: 'M5 12l5 5 9-10',
  dinero: 'M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4',
  descargar: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  sol: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  luna: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  atras: 'M15 5l-7 7 7 7',
  basura: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  alerta: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  calculadora: 'M6 3h12v18H6zM9 7h6M9 11h.01M12 11h.01M15 11h.01M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01M15 17h.01',
  corte: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v7h-7',
}
export function Icono({ nombre, titulo }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" aria-hidden={titulo ? undefined : 'true'} role={titulo ? 'img' : undefined}>
      {titulo ? <title>{titulo}</title> : null}
      <path d={ICONOS[nombre] ?? nombre} />
    </svg>
  )
}

// ───────────────────────── Piezas de interfaz ─────────────────────────

export function Cabecera({ titulo, subtitulo, acciones, volver }) {
  return (
    <header className="pagina-cabecera">
      <div>
        {volver ? (
          <a className="volver" href={`#/${volver}`}>
            <Icono nombre="atras" /> Volver
          </a>
        ) : null}
        <h1>{titulo}</h1>
        {subtitulo ? <p className="suave">{subtitulo}</p> : null}
      </div>
      {acciones ? <div className="fila no-imprimir">{acciones}</div> : null}
    </header>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <p className="cargando" role="status" aria-live="polite">
      <span className="girador" aria-hidden="true" /> {texto}
    </p>
  )
}

export function ErrorCarga({ error, reintentar }) {
  if (!error) return null
  return (
    <div className="aviso aviso-error" role="alert">
      {error.message}{' '}
      {reintentar ? (
        <button type="button" className="boton boton-chico" onClick={reintentar}>
          Reintentar
        </button>
      ) : null}
    </div>
  )
}

export function Modal({ titulo, alCerrar, children, pie, ancho }) {
  const ref = useRef(null)
  const id = useId()
  useEffect(() => {
    const previo = document.activeElement
    const primero = ref.current?.querySelector('input, select, textarea, button:not(.modal-x)')
    primero?.focus()
    const tecla = (e) => {
      if (e.key === 'Escape') alCerrar()
      if (e.key === 'Tab' && ref.current) {
        const f = [...ref.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled)
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', tecla)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = ''
      previo?.focus?.()
    }
  }, [alCerrar])
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} style={ancho ? { '--ancho-modal': ancho } : undefined}>
        <div className="modal-cabecera">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="boton boton-icono boton-texto modal-x" onClick={alCerrar} aria-label="Cerrar">
            <Icono nombre="cerrar" />
          </button>
        </div>
        {children}
        {pie ? <div className="modal-pie">{pie}</div> : null}
      </div>
    </div>
  )
}

/** Campo con etiqueta. `como` = 'input' | 'select' | 'textarea'. */
export function Campo({ etiqueta, como = 'input', ayuda, error, className = '', children, ...props }) {
  const id = useId()
  const Elemento = como
  return (
    <label className={`campo ${className}`} htmlFor={id}>
      <span>
        {etiqueta}
        {props.required ? <span aria-hidden="true" className="suave"> *</span> : null}
      </span>
      <Elemento id={id} aria-describedby={ayuda || error ? `${id}-a` : undefined} aria-invalid={error ? true : undefined} {...props}>
        {children}
      </Elemento>
      {ayuda || error ? (
        <small id={`${id}-a`} className={error ? 'campo-error' : 'suave'}>
          {error || ayuda}
        </small>
      ) : null}
    </label>
  )
}

const CLASE_ESTADO = {
  borrador: '', enviada: 'insignia-oro', aceptada: 'insignia-alerta', convertida: 'insignia-ok', vencida: '', rechazada: 'insignia-peligro',
  vigente: 'insignia-ok', anulada: 'insignia-peligro', pagada: 'insignia-ok', parcial: 'insignia-alerta', pendiente: 'insignia-peligro',
  disponible: 'insignia-ok', en_corte: 'insignia-oro', agotada: '', recortado: 'insignia-oro', usado: '',
  cotizado: '', en_produccion: 'insignia-oro', colocado: 'insignia-ok', cancelado: 'insignia-peligro',
  urgente: 'insignia-peligro', pronto: 'insignia-alerta', ok: 'insignia-ok', bajo: 'insignia-peligro', justo: 'insignia-alerta',
  moda: 'insignia-ok', en_caida: 'insignia-peligro', estable: '',
}
const TEXTO_ESTADO = {
  en_corte: 'En corte', en_produccion: 'En producción', en_caida: 'En caída', convertida: 'Convertida', vigente: 'Vigente',
  pendiente: 'Sin pagar', parcial: 'Pago parcial', bajo: 'Stock bajo', justo: 'Justo', ok: 'Bien',
}
export function Estado({ valor }) {
  const texto = TEXTO_ESTADO[valor] ?? (valor ? valor.charAt(0).toUpperCase() + valor.slice(1).replace(/_/g, ' ') : '—')
  return <span className={`insignia ${CLASE_ESTADO[valor] ?? ''}`}>{texto}</span>
}

export function Kpi({ etiqueta, valor, detalle, href }) {
  const contenido = (
    <>
      <div className="kpi-etiqueta">{etiqueta}</div>
      <div className="kpi-valor">{valor}</div>
      {detalle ? <div className="kpi-detalle">{detalle}</div> : null}
    </>
  )
  return href ? <a className="tarjeta kpi kpi-enlace" href={href}>{contenido}</a> : <div className="tarjeta kpi">{contenido}</div>
}

/** Pestañas accesibles. */
export function Pestanas({ opciones, valor, alCambiar }) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map(([clave, texto]) => (
        <button key={clave} type="button" role="tab" aria-selected={valor === clave} className="pestana" onClick={() => alCambiar(clave)}>
          {texto}
        </button>
      ))}
    </div>
  )
}

/** Selector de sucursal (con «Todas»). */
export function SelectorSucursal({ valor, alCambiar, todas = true, etiqueta = 'Sucursal', ...props }) {
  const { sucursales } = useApp()
  return (
    <Campo etiqueta={etiqueta} como="select" value={valor ?? ''} onChange={(e) => alCambiar(e.target.value ? Number(e.target.value) : null)} {...props}>
      {todas ? <option value="">Todas</option> : null}
      {sucursales.map((s) => (
        <option key={s.id} value={s.id}>{s.nombre}</option>
      ))}
    </Campo>
  )
}

/** Búsqueda de cliente con opción de crear uno nuevo al vuelo. */
export function SelectorCliente({ valor, alCambiar, requerido = true }) {
  const [texto, setTexto] = useState(valor?.nombre ?? '')
  const [lista, setLista] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [telefono, setTelefono] = useState(valor?.telefono ?? '')
  const id = useId()
  useEffect(() => {
    if (!abierto || texto.trim().length < 2) {
      setLista([])
      return
    }
    const t = setTimeout(() => api.get(`/clientes?q=${encodeURIComponent(texto.trim())}&limite=8`).then(setLista).catch(() => setLista([])), 200)
    return () => clearTimeout(t)
  }, [texto, abierto])
  const elegir = (c) => {
    setTexto(c.nombre)
    setTelefono(c.telefono)
    setAbierto(false)
    alCambiar({ id: c.id, nombre: c.nombre, telefono: c.telefono })
  }
  return (
    <div className="selector-cliente">
      <label className="campo" htmlFor={id}>
        <span>Cliente {requerido ? <span className="suave" aria-hidden="true">*</span> : <span className="suave">(opcional)</span>}</span>
        <input
          id={id}
          value={texto}
          role="combobox"
          aria-expanded={abierto && lista.length > 0}
          aria-controls={`${id}-lista`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Escribe el nombre para buscar o crear"
          onChange={(e) => {
            setTexto(e.target.value)
            setAbierto(true)
            alCambiar(e.target.value.trim() ? { nombre: e.target.value, telefono } : null)
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
        />
      </label>
      {abierto && lista.length ? (
        <ul className="sugerencias" id={`${id}-lista`} role="listbox">
          {lista.map((c) => (
            <li key={c.id} role="option" aria-selected={valor?.id === c.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(c)}>
                <strong>{c.nombre}</strong> <span className="suave">{c.telefono}{c.nit ? ` · NIT ${c.nit}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {valor && !valor.id ? (
        <Campo etiqueta="Teléfono / WhatsApp del cliente nuevo" value={telefono} inputMode="tel" onChange={(e) => {
          setTelefono(e.target.value)
          alCambiar({ ...valor, telefono: e.target.value })
        }} ayuda="Se creará el cliente al guardar." />
      ) : null}
    </div>
  )
}

/** Tabla simple con filas clicables. columnas: [{ titulo, valor: (fila) => nodo, num?: bool, clase? }] */
export function Tabla({ columnas, filas, alElegir, vacio = 'No hay registros.', pie, clave = 'id', etiqueta }) {
  return (
    <div className="tabla-caja">
      <table className="tabla">
        {etiqueta ? <caption className="oculto">{etiqueta}</caption> : null}
        <thead>
          <tr>{columnas.map((c) => <th key={c.titulo} scope="col" className={c.num ? 'num' : c.clase}>{c.titulo}</th>)}</tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr><td colSpan={columnas.length} className="vacio">{vacio}</td></tr>
          ) : (
            filas.map((f, i) => (
              <tr
                key={f[clave] ?? i}
                className={alElegir ? 'clicable' : ''}
                onClick={alElegir ? () => alElegir(f) : undefined}
                onKeyDown={alElegir ? (e) => e.key === 'Enter' && alElegir(f) : undefined}
                tabIndex={alElegir ? 0 : undefined}
              >
                {columnas.map((c) => <td key={c.titulo} className={c.num ? 'num' : c.clase}>{c.valor(f)}</td>)}
              </tr>
            ))
          )}
        </tbody>
        {pie ? <tfoot>{pie}</tfoot> : null}
      </table>
    </div>
  )
}

export function Confirmar({ titulo, texto, textoBoton = 'Confirmar', peligro, alConfirmar, alCerrar, children }) {
  const [ocupado, setOcupado] = useState(false)
  return (
    <Modal titulo={titulo} alCerrar={alCerrar} ancho="480px" pie={
      <>
        <button type="button" className="boton" onClick={alCerrar}>Cancelar</button>
        <button type="button" className={`boton ${peligro ? 'boton-peligro' : 'boton-primario'}`} disabled={ocupado} onClick={async () => {
          setOcupado(true)
          const ok = await alConfirmar()
          setOcupado(false)
          if (ok !== false) alCerrar()
        }}>{textoBoton}</button>
      </>
    }>
      <p>{texto}</p>
      {children}
    </Modal>
  )
}
