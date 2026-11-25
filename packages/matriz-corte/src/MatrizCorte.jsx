/**
 * MatrizCorte — herramienta para marcar los cortes de una plancha.
 *
 * El cortador define la plancha (ancho × alto en cuadros de 1 cm), arrastra
 * rectángulos sobre la cuadrícula (mouse o dedo) y marca cada uno como
 * Vendido/Usado, Retazo útil o Merma. Un retazo útil se puede volver a
 * cortar dibujando dentro de él: las piezas nuevas quedan como hijas.
 *
 * Props (todas opcionales):
 *   valorInicial   { plancha, cortes }  datos para empezar
 *   planchaId      id en el sistema; con `apiBase` carga y guarda en la API
 *   apiBase        prefijo de la API ('' = mismo dominio)
 *   onCambio(datos)   se llama en cada cambio con { plancha, cortes }
 *   onGuardar(datos)  si se pasa, el botón «Guardar» lo usa en vez de la API
 *   soloLectura    solo mirar (historial de una plancha)
 *   tema           'claro' | 'noche' (si no se pasa, sigue al sistema)
 *   onCambioTema(tema)
 */
import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react'
import * as G from './geometria.js'
import { dibujar, leerColores } from './dibujo.js'
import { guardarCortes, obtenerCortes } from './api.js'
import './MatrizCorte.css'

const ESCALA_MIN = 0.3
const ESCALA_MAX = 60
const MARGEN = { izq: 40, arriba: 24, der: 14, abajo: 14 }
const UMBRAL_CLIC = 6 // px que se puede mover el puntero y seguir siendo un toque

function estadoInicial(valorInicial) {
  if (valorInicial) {
    const r = G.cargarDatos(valorInicial)
    if (r.ok) return r.estado
  }
  return { plancha: { ...G.PLANCHA_POR_DEFECTO }, cortes: [] }
}

function reductor(historial, accion) {
  switch (accion.op) {
    case 'confirmar':
      return G.confirmar(historial, accion.estado)
    case 'deshacer':
      return G.deshacer(historial)
    case 'rehacer':
      return G.rehacer(historial)
    case 'reiniciar':
      return G.crearHistorial(accion.estado)
    default:
      return historial
  }
}

function temaDelSistema() {
  if (typeof document !== 'undefined') {
    const t = document.documentElement.dataset.theme
    if (t === 'dark' || t === 'noche') return 'noche'
    if (t === 'light' || t === 'claro') return 'claro'
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'noche'
  return 'claro'
}

const esCampoDeTexto = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

// ───────────────────────── Íconos (SVG propio, sin librerías) ─────────────────────────

function Icono({ d, titulo }) {
  return (
    <svg className="mc-icono" viewBox="0 0 24 24" aria-hidden={titulo ? undefined : 'true'} role={titulo ? 'img' : undefined}>
      {titulo ? <title>{titulo}</title> : null}
      <path d={d} />
    </svg>
  )
}
const ICONOS = {
  deshacer: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  rehacer: 'm15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  mas: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  ajustar: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  cortar: 'M4 4h7v7H4zM13 13h7v7h-7z',
  mover: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  sol: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  luna: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  bajar: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  subir: 'M12 16V4M7 9l5-5 5 5M5 20h14',
  guardar: 'M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6',
  basura: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
}

// ───────────────────────── Componente ─────────────────────────

export default function MatrizCorte({
  valorInicial,
  planchaId,
  apiBase,
  onCambio,
  onGuardar,
  soloLectura = false,
  tema: temaProp,
  onCambioTema,
  className = '',
}) {
  const uid = useId()
  const [historial, despachar] = useReducer(reductor, valorInicial, (v) => G.crearHistorial(estadoInicial(v)))
  const estado = historial.presente
  const { plancha, cortes } = estado

  const [temaInterno, setTemaInterno] = useState(temaProp ?? temaDelSistema)
  const tema = temaProp ?? temaInterno
  const [tipoActivo, setTipoActivo] = useState('vendido')
  const [herramienta, setHerramienta] = useState('cortar')
  const [seleccionId, setSeleccionId] = useState(null)
  const [vista, setVista] = useState({ escala: 2, ox: MARGEN.izq, oy: MARGEN.arriba })
  const [tamano, setTamano] = useState({ w: 0, h: 0 })
  const [vistaPrevia, setVistaPrevia] = useState(null)
  const [celdaCursor, setCeldaCursor] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [versionFuentes, setVersionFuentes] = useState(0)

  const raizRef = useRef(null)
  const lienzoRef = useRef(null)
  const cajaRef = useRef(null)
  const archivoRef = useRef(null)
  const vistaRef = useRef(vista)
  vistaRef.current = vista
  const estadoRef = useRef(estado)
  estadoRef.current = estado
  const punterosRef = useRef(new Map())
  const gestoRef = useRef(null)
  const ajustadoRef = useRef(false)
  const temporizadorAviso = useRef(null)

  const seleccionado = useMemo(() => cortes.find((c) => c.id === seleccionId) ?? null, [cortes, seleccionId])
  const datosResumen = useMemo(() => G.resumen(estado), [estado])
  const retazos = useMemo(() => G.retazosParaInventario(estado), [estado])

  // ── Avisos (se leen con lector de pantalla gracias a aria-live) ──
  const avisar = useCallback((texto, nivel = 'info') => {
    setAviso({ texto, nivel, n: Date.now() })
    clearTimeout(temporizadorAviso.current)
    temporizadorAviso.current = setTimeout(() => setAviso(null), nivel === 'error' ? 7000 : 4500)
  }, [])
  useEffect(() => () => clearTimeout(temporizadorAviso.current), [])

  /** Aplica el resultado de una operación de geometria.js al historial. */
  const aplicar = useCallback(
    (resultado, textoOk) => {
      if (!resultado.ok) {
        avisar(resultado.error ?? resultado.errores?.join(' ') ?? 'No se pudo hacer el cambio.', 'error')
        return false
      }
      despachar({ op: 'confirmar', estado: resultado.estado })
      if (textoOk) avisar(textoOk, 'ok')
      return true
    },
    [avisar],
  )

  // ── Avisar cambios hacia afuera ──
  const primeraVez = useRef(true)
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    onCambio?.(G.exportarDatos(estado))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])

  // Si se deshace un corte seleccionado, quitar la selección
  useEffect(() => {
    if (seleccionId && !cortes.some((c) => c.id === seleccionId)) setSeleccionId(null)
  }, [cortes, seleccionId])

  // ── Cargar desde la API ──
  useEffect(() => {
    if (!planchaId || apiBase == null || onGuardar) return
    const control = new AbortController()
    setCargando(true)
    obtenerCortes(planchaId, { base: apiBase, signal: control.signal })
      .then((datos) => {
        const r = G.cargarDatos(datos)
        if (r.ok) {
          despachar({ op: 'reiniciar', estado: r.estado })
          ajustadoRef.current = false
        } else avisar(`Los datos de la plancha tienen errores: ${r.errores.join(' ')}`, 'error')
      })
      .catch((e) => {
        if (e.name !== 'AbortError') avisar(`No se pudo cargar la plancha: ${e.message}`, 'error')
      })
      .finally(() => setCargando(false))
    return () => control.abort()
  }, [planchaId, apiBase, onGuardar, avisar])

  // ── Tamaño del lienzo ──
  useEffect(() => {
    const caja = cajaRef.current
    if (!caja) return
    const medir = () => {
      const r = caja.getBoundingClientRect()
      setTamano((t) => (t.w === Math.round(r.width) && t.h === Math.round(r.height) ? t : { w: Math.round(r.width), h: Math.round(r.height) }))
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(caja)
    return () => obs.disconnect()
  }, [])

  // Redibujar cuando cargan las fuentes
  useEffect(() => {
    document.fonts?.ready?.then(() => setVersionFuentes((v) => v + 1))
  }, [])

  const vistaAjustada = useCallback(
    (p = estadoRef.current.plancha, t = tamano) => {
      const anchoUtil = Math.max(40, t.w - MARGEN.izq - MARGEN.der)
      const altoUtil = Math.max(40, t.h - MARGEN.arriba - MARGEN.abajo)
      const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Math.min(anchoUtil / p.ancho, altoUtil / p.alto)))
      return {
        escala,
        ox: Math.round(MARGEN.izq + (anchoUtil - p.ancho * escala) / 2),
        oy: Math.round(MARGEN.arriba + (altoUtil - p.alto * escala) / 2),
      }
    },
    [tamano],
  )
  const ajustar = useCallback(() => setVista(vistaAjustada()), [vistaAjustada])

  // Ajustar la vista al medir por primera vez y cuando cambia el tamaño de la plancha
  useEffect(() => {
    if (tamano.w === 0) return
    if (!ajustadoRef.current) {
      ajustadoRef.current = true
      setVista(vistaAjustada(plancha, tamano))
    }
  }, [tamano, plancha, vistaAjustada])
  const ladoAnterior = useRef(`${plancha.ancho}x${plancha.alto}`)
  useEffect(() => {
    const clave = `${plancha.ancho}x${plancha.alto}`
    if (clave !== ladoAnterior.current) {
      ladoAnterior.current = clave
      if (tamano.w) setVista(vistaAjustada(plancha, tamano))
    }
  }, [plancha, tamano, vistaAjustada])

  // ── Dibujo ──
  useEffect(() => {
    const lienzo = lienzoRef.current
    if (!lienzo || tamano.w === 0) return
    const id = requestAnimationFrame(() => {
      const dpr = Math.min(3, window.devicePixelRatio || 1)
      const anchoPx = Math.round(tamano.w * dpr)
      const altoPx = Math.round(tamano.h * dpr)
      if (lienzo.width !== anchoPx) lienzo.width = anchoPx
      if (lienzo.height !== altoPx) lienzo.height = altoPx
      const ctx = lienzo.getContext('2d')
      dibujar(ctx, {
        ancho: tamano.w,
        alto: tamano.h,
        dpr,
        vista,
        estado,
        colores: leerColores(raizRef.current),
        seleccionId,
        vistaPrevia,
        tipoActivo,
      })
    })
    return () => cancelAnimationFrame(id)
  }, [tamano, vista, estado, seleccionId, vistaPrevia, tipoActivo, tema, versionFuentes])

  // ── Zoom ──
  const zoomEn = useCallback((px, py, factor) => {
    setVista((v) => {
      const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v.escala * factor))
      const k = escala / v.escala
      return { escala, ox: px - (px - v.ox) * k, oy: py - (py - v.oy) * k }
    })
  }, [])
  const zoomCentro = useCallback((factor) => zoomEn(tamano.w / 2, tamano.h / 2, factor), [zoomEn, tamano])
  const mover = useCallback((dx, dy) => setVista((v) => ({ ...v, ox: v.ox + dx, oy: v.oy + dy })), [])

  // Rueda del mouse (necesita passive: false para evitar que la página se desplace)
  useEffect(() => {
    const lienzo = lienzoRef.current
    if (!lienzo) return
    const alGirar = (e) => {
      e.preventDefault()
      const r = lienzo.getBoundingClientRect()
      if (e.shiftKey) {
        mover(-e.deltaY, 0)
        return
      }
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
      zoomEn(e.clientX - r.left, e.clientY - r.top, factor)
    }
    lienzo.addEventListener('wheel', alGirar, { passive: false })
    return () => lienzo.removeEventListener('wheel', alGirar)
  }, [zoomEn, mover])

  // ── Punteros: mouse, dedo y lápiz ──
  const puntoLocal = (e) => {
    const r = lienzoRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const celdaEn = (p) => {
    const v = vistaRef.current
    return { x: Math.floor((p.x - v.ox) / v.escala), y: Math.floor((p.y - v.oy) / v.escala) }
  }
  const dentro = (celda) => {
    const pl = estadoRef.current.plancha
    return celda.x >= 0 && celda.y >= 0 && celda.x < pl.ancho && celda.y < pl.alto
  }

  const iniciarPellizco = () => {
    const [a, b] = [...punterosRef.current.values()]
    gestoRef.current = {
      tipo: 'pellizco',
      distancia: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      medio: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      vista: vistaRef.current,
    }
    setVistaPrevia(null)
  }

  const alBajar = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return
    lienzoRef.current.setPointerCapture?.(e.pointerId)
    const p = puntoLocal(e)
    punterosRef.current.set(e.pointerId, p)
    if (punterosRef.current.size === 2) {
      iniciarPellizco()
      return
    }
    if (punterosRef.current.size > 2) return
    const celda = celdaEn(p)
    const quiereMover = herramienta === 'mover' || e.button === 1 || !dentro(celda)
    if (quiereMover) {
      gestoRef.current = { tipo: 'mover', inicio: p, vista: vistaRef.current, celda, movido: false }
    } else {
      gestoRef.current = { tipo: 'dibujar', inicio: p, celda, movido: false }
      if (!soloLectura) actualizarVistaPrevia(celda, celda)
    }
  }

  const actualizarVistaPrevia = (a, b) => {
    const pl = estadoRef.current.plancha
    const rect = G.rectDesdeCeldas(G.limitarCelda(a, pl), G.limitarCelda(b, pl))
    const v = G.validarCorte(estadoRef.current, rect)
    setVistaPrevia({ rect, valido: v.ok, error: v.error, conflictoId: v.conflictoId ?? null, padreId: v.padreId ?? null })
  }

  const alMover = (e) => {
    const p = puntoLocal(e)
    // Celda bajo el cursor (barra de estado)
    const celda = celdaEn(p)
    const nueva = dentro(celda) ? celda : null
    setCeldaCursor((c) => (c?.x === nueva?.x && c?.y === nueva?.y ? c : nueva))

    if (!punterosRef.current.has(e.pointerId)) return
    punterosRef.current.set(e.pointerId, p)
    const g = gestoRef.current
    if (!g) return

    if (g.tipo === 'pellizco' && punterosRef.current.size >= 2) {
      const [a, b] = [...punterosRef.current.values()]
      const distancia = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const v0 = g.vista
      const escala = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, v0.escala * (distancia / g.distancia)))
      const mundoX = (g.medio.x - v0.ox) / v0.escala
      const mundoY = (g.medio.y - v0.oy) / v0.escala
      setVista({ escala, ox: medio.x - mundoX * escala, oy: medio.y - mundoY * escala })
      return
    }
    if (Math.hypot(p.x - g.inicio.x, p.y - g.inicio.y) > UMBRAL_CLIC) g.movido = true
    if (g.tipo === 'mover') {
      setVista({ ...g.vista, ox: g.vista.ox + (p.x - g.inicio.x), oy: g.vista.oy + (p.y - g.inicio.y) })
    } else if (g.tipo === 'dibujar' && !soloLectura) {
      actualizarVistaPrevia(g.celda, celda)
    }
  }

  const alSubir = (e) => {
    const g = gestoRef.current
    punterosRef.current.delete(e.pointerId)
    if (g?.tipo === 'pellizco') {
      // Al soltar un dedo, termina el gesto; el otro no empieza a dibujar
      if (punterosRef.current.size === 0) gestoRef.current = null
      else gestoRef.current = { tipo: 'nada' }
      return
    }
    gestoRef.current = punterosRef.current.size ? { tipo: 'nada' } : null
    if (!g) return

    if (!g.movido && (g.tipo === 'dibujar' || g.tipo === 'mover')) {
      // Fue un toque: seleccionar el corte que está ahí
      const corte = dentro(g.celda) ? G.corteEnCelda(estadoRef.current.cortes, g.celda) : null
      setSeleccionId(corte ? corte.id : null)
      setVistaPrevia(null)
      if (corte) avisar(`Seleccionado: ${G.TIPOS[corte.tipo].nombre}, ${G.formatearMedidas(corte)}.`)
      return
    }
    if (g.tipo === 'dibujar' && !soloLectura) {
      const pl = estadoRef.current.plancha
      const rect = G.rectDesdeCeldas(G.limitarCelda(g.celda, pl), G.limitarCelda(celdaEn(puntoLocal(e)), pl))
      setVistaPrevia(null)
      agregar(rect, tipoActivo)
    }
  }

  const alCancelar = (e) => {
    punterosRef.current.delete(e.pointerId)
    gestoRef.current = null
    setVistaPrevia(null)
  }

  // ── Acciones ──
  const agregar = (rect, tipo) => {
    const r = G.agregarCorte(estadoRef.current, rect, tipo)
    if (!r.ok) {
      avisar(r.error, 'error')
      return false
    }
    despachar({ op: 'confirmar', estado: r.estado })
    setSeleccionId(r.corte.id)
    const enRetazo = r.corte.padreId ? ' (cortado de un retazo)' : ''
    avisar(`${G.TIPOS[tipo].corto}: ${G.formatearMedidas(rect)}, ${G.formatearM2(G.area(rect))}${enRetazo}.`, 'ok')
    return true
  }

  const eliminarSeleccionado = () => {
    if (!seleccionado) return
    const r = G.eliminarCorte(estado, seleccionado.id)
    if (aplicar(r)) {
      setSeleccionId(null)
      avisar(
        r.eliminados > 1
          ? `Se eliminó el retazo y ${r.eliminados - 1} pieza(s) de adentro. Puedes deshacer.`
          : 'Corte eliminado. Puedes deshacer.',
        'ok',
      )
    }
  }

  const deshacerAccion = () => historial.pasado.length && despachar({ op: 'deshacer' })
  const rehacerAccion = () => historial.futuro.length && despachar({ op: 'rehacer' })

  const cambiarTema = () => {
    const nuevo = tema === 'noche' ? 'claro' : 'noche'
    setTemaInterno(nuevo)
    onCambioTema?.(nuevo)
  }

  const exportar = () => {
    const datos = G.exportarDatos(estado)
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
    const enlace = document.createElement('a')
    const nombre = (plancha.codigo || plancha.id || 'plancha').toString().replace(/[^\w.-]+/g, '_')
    enlace.href = URL.createObjectURL(blob)
    enlace.download = `${nombre}-cortes.json`
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
    setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
  }

  const alElegirArchivo = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    try {
      const datos = JSON.parse(await archivo.text())
      const r = G.cargarDatos(datos)
      if (!r.ok) {
        avisar(`No se pudo cargar: ${r.errores.slice(0, 3).join(' ')}`, 'error')
        return
      }
      despachar({ op: 'confirmar', estado: r.estado })
      setSeleccionId(null)
      setVista(vistaAjustada(r.estado.plancha))
      avisar(`Plancha cargada con ${r.estado.cortes.length} corte(s).`, 'ok')
    } catch {
      avisar('El archivo no es un JSON válido.', 'error')
    }
  }

  const puedeGuardar = Boolean(onGuardar) || (planchaId != null && apiBase != null)
  const guardar = async () => {
    const datos = G.exportarDatos(estado)
    setGuardando(true)
    try {
      if (onGuardar) await onGuardar(datos)
      else await guardarCortes(planchaId, datos, { base: apiBase })
      avisar('Cortes guardados.', 'ok')
    } catch (e) {
      avisar(`No se pudo guardar: ${e.message}`, 'error')
    } finally {
      setGuardando(false)
    }
  }

  // ── Atajos de teclado ──
  const alTeclear = (e) => {
    const ctrl = e.ctrlKey || e.metaKey
    if (e.key === 'Escape') {
      gestoRef.current = null
      setVistaPrevia(null)
      setSeleccionId(null)
      return
    }
    if (esCampoDeTexto(e.target)) return
    const tecla = e.key.toLowerCase()
    if (ctrl && tecla === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (!soloLectura) deshacerAccion()
    } else if (ctrl && (tecla === 'y' || (tecla === 'z' && e.shiftKey))) {
      e.preventDefault()
      if (!soloLectura) rehacerAccion()
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && seleccionado && !soloLectura) {
      e.preventDefault()
      eliminarSeleccionado()
    } else if (!ctrl && ['1', '2', '3'].includes(e.key) && !soloLectura) {
      setTipoActivo(G.LISTA_TIPOS[Number(e.key) - 1])
    } else if (!ctrl && (e.key === '+' || e.key === '=')) {
      zoomCentro(1.25)
    } else if (!ctrl && (e.key === '-' || e.key === '_')) {
      zoomCentro(0.8)
    } else if (!ctrl && e.key === '0') {
      ajustar()
    } else if (e.target === lienzoRef.current && e.key.startsWith('Arrow')) {
      e.preventDefault()
      const paso = e.shiftKey ? 120 : 40
      if (e.key === 'ArrowLeft') mover(paso, 0)
      if (e.key === 'ArrowRight') mover(-paso, 0)
      if (e.key === 'ArrowUp') mover(0, paso)
      if (e.key === 'ArrowDown') mover(0, -paso)
    }
  }

  const descripcionLienzo =
    `Plancha de ${plancha.ancho} por ${plancha.alto} centímetros con ${cortes.length} cortes. ` +
    `Vendido ${G.formatearPorcentaje(datosResumen.vendido.porcentaje)}, retazo útil ${G.formatearPorcentaje(datosResumen.retazo.porcentaje)}, ` +
    `merma ${G.formatearPorcentaje(datosResumen.merma.porcentaje)}, libre ${G.formatearPorcentaje(datosResumen.libre.porcentaje)}. ` +
    'La lista de cortes y el formulario «Agregar por medidas» permiten hacer lo mismo con el teclado.'

  return (
    <section
      ref={raizRef}
      className={`mc ${className}`}
      data-tema={tema}
      onKeyDown={alTeclear}
      aria-labelledby={`${uid}-titulo`}
    >
      <header className="mc-cabecera">
        <div>
          <p className="mc-sobretitulo">Taller · Producción</p>
          <h2 id={`${uid}-titulo`} className="mc-titulo">
            Matriz de corte
          </h2>
          <p className="mc-subtitulo">
            {plancha.codigo ? <span className="mc-codigo">{plancha.codigo}</span> : null}
            {plancha.material || 'Material sin definir'}
            {plancha.espesor !== '' && plancha.espesor != null ? ` · ${plancha.espesor} cm de espesor` : ''} ·{' '}
            <span className="mc-num">
              {plancha.ancho} × {plancha.alto} cm ({G.formatearNumero(plancha.ancho / 100)} × {G.formatearNumero(plancha.alto / 100)} m)
            </span>
          </p>
        </div>
        <div className="mc-cabecera-acciones">
          {cargando ? <span className="mc-insignia">Cargando…</span> : null}
          {soloLectura ? <span className="mc-insignia">Solo lectura</span> : null}
          <button type="button" className="mc-boton mc-boton-icono" onClick={cambiarTema} aria-label={tema === 'noche' ? 'Cambiar a modo claro' : 'Cambiar a modo noche'} title={tema === 'noche' ? 'Modo claro' : 'Modo noche'}>
            <Icono d={tema === 'noche' ? ICONOS.sol : ICONOS.luna} />
          </button>
        </div>
      </header>

      <div className="mc-cuerpo">
        <div className="mc-area">
          {/* Barra de herramientas */}
          <div className="mc-barra" role="toolbar" aria-label="Herramientas de corte">
            {!soloLectura ? (
              <div className="mc-grupo" role="radiogroup" aria-label="Tipo de corte">
                {G.LISTA_TIPOS.map((t, i) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tipoActivo === t}
                    className={`mc-tipo mc-tipo-${t}`}
                    onClick={() => {
                      setTipoActivo(t)
                      setHerramienta('cortar')
                    }}
                    title={`${G.TIPOS[t].nombre} (tecla ${i + 1})`}
                  >
                    <span className={`mc-muestra mc-muestra-${t}`} aria-hidden="true" />
                    {G.TIPOS[t].nombre}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mc-grupo">
              <div className="mc-segmentado" role="radiogroup" aria-label="Modo">
                {!soloLectura ? (
                  <button type="button" role="radio" aria-checked={herramienta === 'cortar'} className="mc-boton" onClick={() => setHerramienta('cortar')} title="Cortar: arrastra sobre la plancha">
                    <Icono d={ICONOS.cortar} /> Cortar
                  </button>
                ) : null}
                <button type="button" role="radio" aria-checked={herramienta === 'mover' || soloLectura} className="mc-boton" onClick={() => setHerramienta('mover')} title="Mover la vista: arrastra para desplazarte">
                  <Icono d={ICONOS.mover} /> Mover
                </button>
              </div>
              {!soloLectura ? (
                <>
                  <button type="button" className="mc-boton mc-boton-icono" onClick={deshacerAccion} disabled={!historial.pasado.length} aria-label="Deshacer" title="Deshacer (Ctrl+Z)">
                    <Icono d={ICONOS.deshacer} />
                  </button>
                  <button type="button" className="mc-boton mc-boton-icono" onClick={rehacerAccion} disabled={!historial.futuro.length} aria-label="Rehacer" title="Rehacer (Ctrl+Y)">
                    <Icono d={ICONOS.rehacer} />
                  </button>
                </>
              ) : null}
              <button type="button" className="mc-boton mc-boton-icono" onClick={() => zoomCentro(0.8)} aria-label="Alejar" title="Alejar (−)">
                <Icono d={ICONOS.menos} />
              </button>
              <span className="mc-zoom mc-num" aria-live="off" title="Píxeles por centímetro">
                {G.formatearNumero(vista.escala, 1)} px/cm
              </span>
              <button type="button" className="mc-boton mc-boton-icono" onClick={() => zoomCentro(1.25)} aria-label="Acercar" title="Acercar (+)">
                <Icono d={ICONOS.mas} />
              </button>
              <button type="button" className="mc-boton mc-boton-icono" onClick={ajustar} aria-label="Ver la plancha completa" title="Ver toda la plancha (0)">
                <Icono d={ICONOS.ajustar} />
              </button>
            </div>
          </div>

          {/* Lienzo */}
          <div
            ref={cajaRef}
            className={`mc-lienzo-caja ${herramienta === 'mover' || soloLectura ? 'mc-modo-mover' : 'mc-modo-cortar'}`}
            // La caja toma la forma de la plancha (con lugar para las reglas), sin pasarse de la pantalla
            style={{ aspectRatio: `${plancha.ancho} / ${Math.round(plancha.alto * 1.12)}` }}
          >
            <canvas
              ref={lienzoRef}
              className="mc-lienzo"
              style={{ width: tamano.w || '100%', height: tamano.h || '100%' }}
              tabIndex={0}
              role="img"
              aria-label={descripcionLienzo}
              onPointerDown={alBajar}
              onPointerMove={alMover}
              onPointerUp={alSubir}
              onPointerCancel={alCancelar}
              onPointerLeave={() => setCeldaCursor(null)}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>

          {/* Estado y leyenda */}
          <div className="mc-estado">
            <span className="mc-num" aria-hidden="true">
              {vistaPrevia?.rect
                ? `${vistaPrevia.rect.w} × ${vistaPrevia.rect.h} cm · ${G.formatearM2(G.area(vistaPrevia.rect))}${vistaPrevia.valido ? (vistaPrevia.padreId ? ' · dentro de un retazo' : '') : ' · no válido'}`
                : celdaCursor
                  ? `x ${celdaCursor.x} cm · y ${celdaCursor.y} cm`
                  : soloLectura
                    ? 'Toca un corte para ver sus datos.'
                    : 'Arrastra sobre la plancha para marcar un corte. Con dos dedos: zoom y mover.'}
            </span>
            <ul className="mc-leyenda" aria-label="Leyenda">
              {G.LISTA_TIPOS.map((t) => (
                <li key={t}>
                  <span className={`mc-muestra mc-muestra-${t}`} aria-hidden="true" /> {G.TIPOS[t].nombre}
                </li>
              ))}
              <li>
                <span className="mc-muestra mc-muestra-libre" aria-hidden="true" /> Libre
              </li>
            </ul>
          </div>
          <p className={`mc-aviso ${aviso ? `mc-aviso-${aviso.nivel}` : ''}`} role={aviso?.nivel === 'error' ? 'alert' : 'status'} aria-live="polite">
            {aviso?.texto ?? ''}
          </p>
        </div>

        {/* Panel lateral */}
        <aside className="mc-panel" aria-label="Datos de la plancha y de los cortes">
          <Resumen datos={datosResumen} />

          {seleccionado ? (
            <CorteSeleccionado
              key={seleccionado.id}
              corte={seleccionado}
              cortes={cortes}
              soloLectura={soloLectura}
              onCambiarTipo={(tipo) => aplicar(G.editarCorte(estado, seleccionado.id, { tipo }), `Ahora es ${G.TIPOS[tipo].nombre}.`)}
              onCambiarNota={(nota) => nota !== (seleccionado.nota ?? '') && aplicar(G.editarCorte(estado, seleccionado.id, { nota }))}
              onEliminar={eliminarSeleccionado}
              onCerrar={() => setSeleccionId(null)}
              onSeleccionar={setSeleccionId}
            />
          ) : null}

          {!soloLectura ? (
            <>
              <AgregarPorMedidas plancha={plancha} tipoActivo={tipoActivo} onAgregar={agregar} uid={uid} />
              <FormularioPlancha key={JSON.stringify(plancha)} plancha={plancha} uid={uid} onAplicar={(cambios) => aplicar(G.actualizarPlancha(estado, cambios), 'Plancha actualizada.')} />
            </>
          ) : null}

          <ListaCortes cortes={cortes} seleccionId={seleccionId} onSeleccionar={setSeleccionId} />

          {retazos.length ? <ListaRetazos retazos={retazos} onSeleccionar={setSeleccionId} /> : null}

          <div className="mc-tarjeta">
            <h3 className="mc-h3">Archivo</h3>
            <div className="mc-fila-botones">
              {puedeGuardar && !soloLectura ? (
                <button type="button" className="mc-boton mc-boton-primario" onClick={guardar} disabled={guardando}>
                  <Icono d={ICONOS.guardar} /> {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              ) : null}
              <button type="button" className="mc-boton" onClick={exportar}>
                <Icono d={ICONOS.bajar} /> Exportar JSON
              </button>
              {!soloLectura ? (
                <>
                  <button type="button" className="mc-boton" onClick={() => archivoRef.current?.click()}>
                    <Icono d={ICONOS.subir} /> Cargar JSON
                  </button>
                  <input ref={archivoRef} type="file" accept="application/json,.json" hidden onChange={alElegirArchivo} />
                </>
              ) : null}
            </div>
          </div>

          {!soloLectura ? (
            <details className="mc-ayuda">
              <summary>Atajos de teclado</summary>
              <dl>
                <dt>1 · 2 · 3</dt>
                <dd>Vendido · Retazo útil · Merma</dd>
                <dt>Ctrl+Z · Ctrl+Y</dt>
                <dd>Deshacer · Rehacer</dd>
                <dt>Supr</dt>
                <dd>Eliminar el corte seleccionado</dd>
                <dt>+ · − · 0</dt>
                <dd>Acercar · Alejar · Ver todo</dd>
                <dt>Flechas</dt>
                <dd>Mover la vista (con la plancha enfocada)</dd>
                <dt>Esc</dt>
                <dd>Cancelar o quitar la selección</dd>
              </dl>
            </details>
          ) : null}
        </aside>
      </div>
    </section>
  )
}

// ───────────────────────── Partes del panel ─────────────────────────

function Resumen({ datos }) {
  const filas = [
    ['vendido', 'Vendido / Usado'],
    ['retazo', 'Retazo útil'],
    ['merma', 'Merma'],
    ['libre', 'Libre'],
  ]
  return (
    <div className="mc-tarjeta">
      <h3 className="mc-h3">Resumen</h3>
      <div className="mc-barra-resumen" aria-hidden="true">
        {filas.map(([clave]) =>
          datos[clave].porcentaje > 0 ? (
            <span key={clave} className={`mc-muestra-${clave}`} style={{ width: `${datos[clave].porcentaje}%` }} />
          ) : null,
        )}
      </div>
      <table className="mc-tabla mc-tabla-resumen">
        <caption className="mc-oculto">Áreas por tipo de corte</caption>
        <thead>
          <tr>
            <th scope="col">Tipo</th>
            <th scope="col" className="mc-der">m²</th>
            <th scope="col" className="mc-der">%</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([clave, nombre]) => (
            <tr key={clave}>
              <th scope="row">
                <span className={`mc-muestra mc-muestra-${clave}`} aria-hidden="true" /> {nombre}
                {datos[clave].cantidad != null ? <span className="mc-suave"> ({datos[clave].cantidad})</span> : null}
              </th>
              <td className="mc-der mc-num">{G.formatearNumero(datos[clave].m2)}</td>
              <td className="mc-der mc-num">{G.formatearNumero(datos[clave].porcentaje, 1)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Plancha</th>
            <td className="mc-der mc-num">{G.formatearNumero(datos.totalM2)}</td>
            <td className="mc-der mc-num">100,0</td>
          </tr>
        </tfoot>
      </table>
      <p className="mc-nota">
        Aprovechamiento de lo cortado: <strong className="mc-num">{G.formatearPorcentaje(datos.aprovechamiento)}</strong>
      </p>
    </div>
  )
}

function CorteSeleccionado({ corte, cortes, soloLectura, onCambiarTipo, onCambiarNota, onEliminar, onCerrar, onSeleccionar }) {
  const [nota, setNota] = useState(corte.nota ?? '')
  const hijos = G.hijosDe(cortes, corte.id)
  const padre = corte.padreId ? cortes.find((c) => c.id === corte.padreId) : null
  const idNota = useId()
  return (
    <div className="mc-tarjeta mc-tarjeta-seleccion">
      <div className="mc-tarjeta-cabecera">
        <h3 className="mc-h3">Corte seleccionado</h3>
        <button type="button" className="mc-boton mc-boton-chico" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
      <p className="mc-medidas mc-num">{G.formatearMedidas(corte)}</p>
      <p className="mc-suave mc-num">
        {G.formatearM2(G.area(corte))} · posición x {corte.x}, y {corte.y}
      </p>
      {padre ? (
        <p className="mc-nota">
          Cortado de un{' '}
          <button type="button" className="mc-enlace" onClick={() => onSeleccionar(padre.id)}>
            retazo de {padre.w} × {padre.h} cm
          </button>
          .
        </p>
      ) : null}
      {hijos.length ? (
        <p className="mc-nota">
          Tiene {hijos.length} pieza(s) cortadas adentro. Le quedan libres{' '}
          <span className="mc-num">{G.formatearM2(G.area(corte) - hijos.reduce((s, h) => s + G.area(h), 0))}</span>.
        </p>
      ) : corte.tipo === 'retazo' && !soloLectura ? (
        <p className="mc-nota">Para recortar este retazo, dibuja las piezas nuevas dentro de él.</p>
      ) : null}

      <fieldset className="mc-campo" disabled={soloLectura}>
        <legend>Tipo</legend>
        <div className="mc-opciones">
          {G.LISTA_TIPOS.map((t) => (
            <label key={t} className="mc-opcion">
              <input type="radio" name={`tipo-${corte.id}`} value={t} checked={corte.tipo === t} onChange={() => onCambiarTipo(t)} />
              <span className={`mc-muestra mc-muestra-${t}`} aria-hidden="true" /> {G.TIPOS[t].nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mc-campo" htmlFor={idNota}>
        <span>Nota</span>
        <textarea
          id={idNota}
          rows={2}
          value={nota}
          readOnly={soloLectura}
          placeholder="Ej.: mesón cocina, cliente Rojas"
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => onCambiarNota(nota)}
        />
      </label>
      {!soloLectura ? (
        <button type="button" className="mc-boton mc-boton-peligro" onClick={onEliminar}>
          <Icono d={ICONOS.basura} /> Eliminar {hijos.length ? 'retazo y sus piezas' : 'corte'}
        </button>
      ) : null}
    </div>
  )
}

function CampoNumero({ id, etiqueta, valor, onCambio, min = 0, max, sufijo }) {
  return (
    <label className="mc-campo" htmlFor={id}>
      <span>{etiqueta}</span>
      <span className="mc-entrada-sufijo">
        <input id={id} type="number" inputMode="numeric" min={min} max={max} step={1} value={valor} onChange={(e) => onCambio(e.target.value)} required />
        {sufijo ? <span aria-hidden="true">{sufijo}</span> : null}
      </span>
    </label>
  )
}

function AgregarPorMedidas({ plancha, tipoActivo, onAgregar, uid }) {
  const [v, setV] = useState({ x: '0', y: '0', w: '60', h: '60' })
  const cambiar = (k) => (valor) => setV((a) => ({ ...a, [k]: valor }))
  const enviar = (e) => {
    e.preventDefault()
    const rect = { x: Number(v.x), y: Number(v.y), w: Number(v.w), h: Number(v.h) }
    onAgregar(rect, tipoActivo)
  }
  return (
    <form className="mc-tarjeta" onSubmit={enviar} aria-labelledby={`${uid}-agregar`}>
      <h3 id={`${uid}-agregar`} className="mc-h3">
        Agregar por medidas
      </h3>
      <p className="mc-nota">
        Se agrega como <strong>{G.TIPOS[tipoActivo].nombre}</strong>. Posición desde la esquina superior izquierda.
      </p>
      <div className="mc-rejilla-4">
        <CampoNumero id={`${uid}-x`} etiqueta="Desde x" valor={v.x} onCambio={cambiar('x')} max={plancha.ancho - 1} sufijo="cm" />
        <CampoNumero id={`${uid}-y`} etiqueta="Desde y" valor={v.y} onCambio={cambiar('y')} max={plancha.alto - 1} sufijo="cm" />
        <CampoNumero id={`${uid}-w`} etiqueta="Ancho" valor={v.w} onCambio={cambiar('w')} min={1} max={plancha.ancho} sufijo="cm" />
        <CampoNumero id={`${uid}-h`} etiqueta="Alto" valor={v.h} onCambio={cambiar('h')} min={1} max={plancha.alto} sufijo="cm" />
      </div>
      <button type="submit" className="mc-boton mc-boton-primario">
        <Icono d={ICONOS.mas} /> Agregar corte
      </button>
    </form>
  )
}

function FormularioPlancha({ plancha, onAplicar, uid }) {
  const [v, setV] = useState({
    codigo: plancha.codigo ?? '',
    material: plancha.material ?? '',
    espesor: plancha.espesor ?? '',
    ancho: String(plancha.ancho),
    alto: String(plancha.alto),
  })
  const cambiar = (k) => (valor) => setV((a) => ({ ...a, [k]: valor }))
  const enviar = (e) => {
    e.preventDefault()
    onAplicar({
      codigo: v.codigo.trim(),
      material: v.material.trim(),
      espesor: v.espesor === '' ? '' : Number(String(v.espesor).replace(',', '.')),
      ancho: Number(v.ancho),
      alto: Number(v.alto),
    })
  }
  return (
    <details className="mc-tarjeta mc-desplegable" open={!plancha.material}>
      <summary className="mc-h3">Datos de la plancha</summary>
      <form onSubmit={enviar}>
        <div className="mc-rejilla-2">
          <label className="mc-campo" htmlFor={`${uid}-codigo`}>
            <span>Código</span>
            <input id={`${uid}-codigo`} value={v.codigo} onChange={(e) => cambiar('codigo')(e.target.value)} placeholder="GR-0012" />
          </label>
          <label className="mc-campo" htmlFor={`${uid}-espesor`}>
            <span>Espesor</span>
            <span className="mc-entrada-sufijo">
              <input id={`${uid}-espesor`} inputMode="decimal" value={v.espesor} onChange={(e) => cambiar('espesor')(e.target.value)} placeholder="2" />
              <span aria-hidden="true">cm</span>
            </span>
          </label>
        </div>
        <label className="mc-campo" htmlFor={`${uid}-material`}>
          <span>Material</span>
          <input id={`${uid}-material`} value={v.material} onChange={(e) => cambiar('material')(e.target.value)} placeholder="Granito Negro San Gabriel" />
        </label>
        <div className="mc-rejilla-2">
          <CampoNumero id={`${uid}-ancho`} etiqueta="Ancho" valor={v.ancho} onCambio={cambiar('ancho')} min={G.LIMITES.minLado} max={G.LIMITES.maxLado} sufijo="cm" />
          <CampoNumero id={`${uid}-alto`} etiqueta="Alto" valor={v.alto} onCambio={cambiar('alto')} min={G.LIMITES.minLado} max={G.LIMITES.maxLado} sufijo="cm" />
        </div>
        <p className="mc-nota">1 cuadro = 1 cm. Medida común: 300 × 170 (3,00 × 1,70 m).</p>
        <button type="submit" className="mc-boton mc-boton-primario">
          Aplicar
        </button>
      </form>
    </details>
  )
}

function ListaCortes({ cortes, seleccionId, onSeleccionar }) {
  // Orden de árbol: cada retazo seguido de sus piezas
  const filas = []
  const agregarRama = (padreId, nivel) => {
    cortes
      .filter((c) => (c.padreId ?? null) === padreId)
      .forEach((c) => {
        filas.push({ c, nivel })
        agregarRama(c.id, nivel + 1)
      })
  }
  agregarRama(null, 0)
  return (
    <div className="mc-tarjeta">
      <h3 className="mc-h3">Cortes ({cortes.length})</h3>
      {filas.length === 0 ? (
        <p className="mc-nota">Todavía no hay cortes.</p>
      ) : (
        <div className="mc-desplazable">
          <table className="mc-tabla">
            <caption className="mc-oculto">Lista de cortes de la plancha</caption>
            <thead>
              <tr>
                <th scope="col">Tipo</th>
                <th scope="col">Medidas</th>
                <th scope="col" className="mc-der">m²</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ c, nivel }) => (
                <tr key={c.id} className={c.id === seleccionId ? 'mc-fila-activa' : ''}>
                  <td style={{ paddingLeft: `${6 + nivel * 14}px` }}>
                    <button type="button" className="mc-enlace" onClick={() => onSeleccionar(c.id)} aria-current={c.id === seleccionId ? 'true' : undefined}>
                      <span className={`mc-muestra mc-muestra-${c.tipo}`} aria-hidden="true" /> {nivel ? '↳ ' : ''}
                      {G.TIPOS[c.tipo].corto}
                    </button>
                    {c.nota ? <span className="mc-suave mc-recorte"> · {c.nota}</span> : null}
                  </td>
                  <td className="mc-num">
                    {c.w} × {c.h}
                  </td>
                  <td className="mc-der mc-num">{G.formatearNumero(G.area(c) / 10000)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ListaRetazos({ retazos, onSeleccionar }) {
  return (
    <div className="mc-tarjeta">
      <h3 className="mc-h3">Retazos para inventario</h3>
      <ul className="mc-lista-retazos">
        {retazos.map((r) => (
          <li key={r.id}>
            <button type="button" className="mc-enlace" onClick={() => onSeleccionar(r.id)}>
              <span className="mc-num">
                {r.ancho} × {r.alto} cm
              </span>
            </button>
            <span className="mc-suave mc-num">
              {' '}
              {G.formatearNumero(r.m2)} m²{r.recortado ? ` · libre ${G.formatearNumero(r.libreM2)} m²` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
