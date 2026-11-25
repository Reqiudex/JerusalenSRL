/**
 * Dibujo de la matriz de corte sobre un <canvas>.
 *
 * Solo se dibujan las líneas y los cortes que se ven en pantalla, así que
 * una plancha de 300 × 170 (51.000 cuadros) o más grande se mueve fluida.
 * Las líneas de la cuadrícula se agrupan en pocos trazos (uno por nivel).
 */
import { area, formatearNumero, profundidad } from './geometria.js'

const FUENTE_MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'

/** Lee los colores del tema desde las variables CSS del contenedor. */
export function leerColores(elemento) {
  const css = getComputedStyle(elemento)
  const v = (nombre, defecto) => css.getPropertyValue(nombre).trim() || defecto
  return {
    lienzo: v('--mc-lienzo', '#ebe7df'),
    plancha: v('--mc-plancha', '#fbfaf7'),
    planchaBorde: v('--mc-plancha-borde', '#1c1c1e'),
    lineaMenor: v('--mc-linea-menor', 'rgba(28,28,30,0.07)'),
    lineaMedia: v('--mc-linea-media', 'rgba(28,28,30,0.18)'),
    lineaMayor: v('--mc-linea-mayor', 'rgba(156,125,67,0.55)'),
    regla: v('--mc-regla', '#5f6266'),
    vendido: v('--mc-vendido', '#2f7d5b'),
    retazo: v('--mc-retazo', '#b8892f'),
    merma: v('--mc-merma', '#a63d2f'),
    relleno: Number(v('--mc-relleno-alfa', '0.32')),
    textoCorte: v('--mc-texto-corte', '#1c1c1e'),
    fondoEtiqueta: v('--mc-fondo-etiqueta', 'rgba(253,252,250,0.88)'),
    seleccion: v('--mc-seleccion', '#c9a86a'),
    invalido: v('--mc-invalido', '#a63d2f'),
    tagFondo: v('--mc-tag-fondo', '#1c1c1e'),
    tagTexto: v('--mc-tag-texto', '#fdfcfa'),
  }
}

const cachePatrones = new Map()

/** Patrón de rayas (retazo) o cuadriculado (merma) para no depender solo del color. */
function patron(ctx, tipo, color, dpr) {
  const clave = `${tipo}|${color}|${dpr}`
  if (cachePatrones.has(clave)) return cachePatrones.get(clave)
  const lado = 8
  const c = document.createElement('canvas')
  c.width = c.height = lado * dpr
  const p = c.getContext('2d')
  p.scale(dpr, dpr)
  p.strokeStyle = color
  p.lineWidth = 1.2
  p.beginPath()
  if (tipo === 'retazo') {
    // Rayas diagonales
    p.moveTo(0, lado)
    p.lineTo(lado, 0)
    p.moveTo(-lado / 2, lado / 2)
    p.lineTo(lado / 2, -lado / 2)
    p.moveTo(lado / 2, lado * 1.5)
    p.lineTo(lado * 1.5, lado / 2)
  } else {
    // Cuadriculado en X
    p.moveTo(0, 0)
    p.lineTo(lado, lado)
    p.moveTo(0, lado)
    p.lineTo(lado, 0)
  }
  p.stroke()
  const resultado = ctx.createPattern(c, 'repeat')
  if (resultado && typeof resultado.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
    resultado.setTransform(new DOMMatrix().scale(1 / dpr, 1 / dpr))
  }
  cachePatrones.set(clave, resultado)
  return resultado
}

function conAlfa(color, alfa) {
  // Acepta #rrggbb; para otros formatos usa globalAlpha.
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`
}

function rellenar(ctx, color, alfa, x, y, w, h) {
  const rgba = conAlfa(color, alfa)
  if (rgba) {
    ctx.fillStyle = rgba
    ctx.fillRect(x, y, w, h)
  } else {
    ctx.save()
    ctx.globalAlpha = alfa
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
    ctx.restore()
  }
}

/** Paso de la regla para que las etiquetas no se amontonen. */
function pasoRegla(escala) {
  for (const paso of [1, 2, 5, 10, 20, 50, 100, 200, 500]) {
    if (paso * escala >= 42) return paso
  }
  return 1000
}

function etiqueta(ctx, texto, cx, cy, colores, tam = 11) {
  ctx.font = `500 ${tam}px ${FUENTE_MONO}`
  const ancho = ctx.measureText(texto).width + 8
  const alto = tam + 6
  ctx.fillStyle = colores.fondoEtiqueta
  ctx.fillRect(cx - ancho / 2, cy - alto / 2, ancho, alto)
  ctx.fillStyle = colores.textoCorte
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(texto, cx, cy + 0.5)
}

/**
 * Dibuja todo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} p
 */
export function dibujar(ctx, p) {
  const { ancho: W, alto: H, dpr, vista, estado, colores, seleccionId, vistaPrevia, tipoActivo } = p
  const { plancha, cortes } = estado
  const s = vista.escala
  const { ox, oy } = vista

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = colores.lienzo
  ctx.fillRect(0, 0, W, H)

  const pw = plancha.ancho * s
  const ph = plancha.alto * s

  // Plancha con una sombra suave
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  ctx.fillStyle = colores.plancha
  ctx.fillRect(ox, oy, pw, ph)
  ctx.restore()

  // Rango visible en cuadros
  const i0 = Math.max(0, Math.floor(-ox / s))
  const i1 = Math.min(plancha.ancho, Math.ceil((W - ox) / s))
  const j0 = Math.max(0, Math.floor(-oy / s))
  const j1 = Math.min(plancha.alto, Math.ceil((H - oy) / s))
  const yTop = Math.max(oy, 0)
  const yBot = Math.min(oy + ph, H)
  const xIzq = Math.max(ox, 0)
  const xDer = Math.min(ox + pw, W)

  const lineas = (paso, color, grosor) => {
    if (i1 <= i0 || j1 <= j0) return
    ctx.beginPath()
    for (let i = Math.ceil(i0 / paso) * paso; i <= i1; i += paso) {
      const x = Math.round(ox + i * s) + 0.5
      ctx.moveTo(x, yTop)
      ctx.lineTo(x, yBot)
    }
    for (let j = Math.ceil(j0 / paso) * paso; j <= j1; j += paso) {
      const y = Math.round(oy + j * s) + 0.5
      ctx.moveTo(xIzq, y)
      ctx.lineTo(xDer, y)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = grosor
    ctx.stroke()
  }
  if (s >= 5) lineas(1, colores.lineaMenor, 1)
  if (s * 10 >= 5) lineas(10, colores.lineaMedia, 1)
  lineas(50, colores.lineaMayor, 1)

  // Cortes: primero los padres, después las piezas de adentro
  const ordenados = [...cortes].sort((a, b) => profundidad(cortes, a) - profundidad(cortes, b))
  for (const c of ordenados) {
    const x = ox + c.x * s
    const y = oy + c.y * s
    const w = c.w * s
    const h = c.h * s
    if (x > W || y > H || x + w < 0 || y + h < 0) continue
    const color = colores[c.tipo] ?? colores.merma
    ctx.fillStyle = colores.plancha
    ctx.fillRect(x, y, w, h)
    rellenar(ctx, color, c.tipo === 'vendido' ? colores.relleno + 0.18 : colores.relleno, x, y, w, h)
    if (c.tipo !== 'vendido') {
      ctx.fillStyle = patron(ctx, c.tipo, color, dpr)
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.strokeRect(x + 0.75, y + 0.75, Math.max(0, w - 1.5), Math.max(0, h - 1.5))
  }

  // Medidas dentro de cada corte (al final, para que queden encima)
  for (const c of ordenados) {
    const w = c.w * s
    const h = c.h * s
    if (w < 52 || h < 20) continue
    const cx = ox + (c.x + c.w / 2) * s
    const cy = oy + (c.y + c.h / 2) * s
    if (cx < -50 || cy < -20 || cx > W + 50 || cy > H + 20) continue
    const tieneHijos = cortes.some((k) => k.padreId === c.id)
    if (tieneHijos) continue
    if (h >= 44 && w >= 80) {
      etiqueta(ctx, `${c.w} × ${c.h}`, cx, cy - 9, colores, 12)
      etiqueta(ctx, `${formatearNumero(area(c) / 10000)} m²`, cx, cy + 9, colores, 10)
    } else {
      etiqueta(ctx, `${c.w}×${c.h}`, cx, cy, colores, 10)
    }
  }

  // Corte con el que choca la vista previa
  if (vistaPrevia?.conflictoId) {
    const c = cortes.find((k) => k.id === vistaPrevia.conflictoId)
    if (c) {
      ctx.strokeStyle = colores.invalido
      ctx.lineWidth = 2.5
      ctx.setLineDash([4, 3])
      ctx.strokeRect(ox + c.x * s, oy + c.y * s, c.w * s, c.h * s)
      ctx.setLineDash([])
    }
  }

  // Seleccionado
  const sel = seleccionId ? cortes.find((k) => k.id === seleccionId) : null
  if (sel) {
    const x = ox + sel.x * s
    const y = oy + sel.y * s
    ctx.strokeStyle = colores.planchaBorde
    ctx.lineWidth = 4
    ctx.strokeRect(x - 1, y - 1, sel.w * s + 2, sel.h * s + 2)
    ctx.strokeStyle = colores.seleccion
    ctx.lineWidth = 2.5
    ctx.strokeRect(x - 1, y - 1, sel.w * s + 2, sel.h * s + 2)
  }

  // Borde de la plancha
  ctx.strokeStyle = colores.planchaBorde
  ctx.lineWidth = 1.5
  ctx.strokeRect(ox - 0.75, oy - 0.75, pw + 1.5, ph + 1.5)

  // Reglas (cm) arriba y a la izquierda
  const paso = pasoRegla(s)
  ctx.font = `400 10px ${FUENTE_MONO}`
  ctx.fillStyle = colores.regla
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'center'
  if (oy > 14) {
    for (let i = Math.ceil(i0 / paso) * paso; i <= i1; i += paso) {
      ctx.fillText(String(i), ox + i * s, oy - 5)
    }
  }
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  if (ox > 22) {
    for (let j = Math.ceil(j0 / paso) * paso; j <= j1; j += paso) {
      ctx.fillText(String(j), ox - 6, oy + j * s)
    }
  }

  // Vista previa del rectángulo que se está dibujando
  if (vistaPrevia?.rect) {
    const r = vistaPrevia.rect
    const x = ox + r.x * s
    const y = oy + r.y * s
    const w = r.w * s
    const h = r.h * s
    const color = vistaPrevia.valido ? colores[tipoActivo] ?? colores.seleccion : colores.invalido
    rellenar(ctx, color, 0.28, x, y, w, h)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.strokeRect(x, y, w, h)
    ctx.setLineDash([])
    const texto = `${r.w} × ${r.h} cm · ${formatearNumero(area(r) / 10000)} m²`
    ctx.font = `600 12px ${FUENTE_MONO}`
    const tw = ctx.measureText(texto).width + 12
    let tx = x
    let ty = y - 24
    if (ty < 2) ty = y + h + 4
    if (ty + 20 > H) ty = Math.max(2, y + 4)
    tx = Math.min(Math.max(2, tx), W - tw - 2)
    ctx.fillStyle = colores.tagFondo
    ctx.fillRect(tx, ty, tw, 20)
    ctx.fillStyle = color
    ctx.fillRect(tx, ty, 3, 20)
    ctx.fillStyle = colores.tagTexto
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(texto, tx + 6, ty + 10.5)
  }
}
