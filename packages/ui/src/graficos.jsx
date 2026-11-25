// Gráficos SVG propios (sin librerías): columnas (1 o 2 series) y barras horizontales.
// Accesibles: cada gráfico trae una tabla equivalente para lectores de pantalla y un
// botón «Ver tabla». Colores por rol (--serie-1, --serie-2) definidos en tema.css.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { formatearNumero } from './formatos.js'

/** Ancho real del contenedor (para dibujar sin deformar el texto). */
function useAncho(ref, inicial = 640) {
  const [ancho, setAncho] = useState(inicial)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(([e]) => setAncho(Math.max(260, Math.round(e.contentRect.width))))
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return ancho
}

function escalaBonita(max) {
  if (max <= 0) return [0, 1]
  const exp = Math.pow(10, Math.floor(Math.log10(max)))
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * exp).find((p) => max / p <= 4) ?? exp * 10
  const tope = Math.ceil(max / paso) * paso
  return [paso, tope]
}

function TablaDatos({ titulo, columnas, filas, visible }) {
  return (
    <table className={visible ? 'g-tabla' : 'oculto'}>
      <caption className="oculto">{titulo}</caption>
      <thead>
        <tr>{columnas.map((c) => <th key={c} scope="col">{c}</th>)}</tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i}>{f.map((v, j) => (j === 0 ? <th key={j} scope="row">{v}</th> : <td key={j} className="num">{v}</td>))}</tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * Columnas verticales.
 * datos: [{ etiqueta, [clave]: valor }] · series: [{ clave, nombre }] (1 o 2)
 */
export function Columnas({ datos, series = [{ clave: 'valor', nombre: 'Valor' }], formato = (v) => formatearNumero(v, 0), formatoEje, alto = 220, titulo = 'Gráfico', resaltar }) {
  const [hover, setHover] = useState(null)
  const [verTabla, setVerTabla] = useState(false)
  const caja = useRef(null)
  const id = useId()
  const ancho = useAncho(caja)
  const m = { izq: 62, der: 8, arriba: 12, abajo: 28 }
  const max = Math.max(0, ...datos.flatMap((d) => series.map((s) => Number(d[s.clave]) || 0)))
  const min = Math.min(0, ...datos.flatMap((d) => series.map((s) => Number(d[s.clave]) || 0)))
  const [paso, tope] = escalaBonita(Math.max(max, -min))
  const piso = min < 0 ? -Math.ceil(-min / paso) * paso : 0
  const altoUtil = alto - m.arriba - m.abajo
  const y = (v) => m.arriba + altoUtil * (1 - (v - piso) / (tope - piso || 1))
  const banda = (ancho - m.izq - m.der) / Math.max(1, datos.length)
  const grosor = Math.min(28, (banda - 6) / series.length - 2)
  const marcas = []
  for (let v = piso; v <= tope + 1e-9; v += paso) marcas.push(v)
  const saltoEtiqueta = Math.ceil(datos.length / Math.max(3, Math.floor((ancho - m.izq) / 48)))
  const fEje = formatoEje ?? formato

  return (
    <figure className="grafico" ref={caja}>
      <div className="g-cabecera">
        {series.length > 1 ? (
          <ul className="g-leyenda" aria-label="Leyenda">
            {series.map((s, i) => <li key={s.clave}><span className={`g-muestra g-serie-${i + 1}`} aria-hidden="true" />{s.nombre}</li>)}
          </ul>
        ) : <span />}
        <button type="button" className="g-boton-tabla" onClick={() => setVerTabla((v) => !v)} aria-expanded={verTabla} aria-controls={id}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {!verTabla ? (
        <div className="g-lienzo">
          <svg viewBox={`0 0 ${ancho} ${alto}`} width="100%" height={alto} role="img" aria-label={titulo}>
            {marcas.map((v) => (
              <g key={v}>
                <line x1={m.izq} x2={ancho - m.der} y1={y(v)} y2={y(v)} className={v === 0 ? 'g-base' : 'g-grilla'} />
                <text x={m.izq - 6} y={y(v)} className="g-eje" textAnchor="end" dominantBaseline="middle">{fEje(v)}</text>
              </g>
            ))}
            {datos.map((d, i) => {
              const x0 = m.izq + i * banda + (banda - series.length * (grosor + 2)) / 2
              return (
                <g key={d.etiqueta}>
                  {series.map((s, k) => {
                    const v = Number(d[s.clave]) || 0
                    const yTop = y(Math.max(v, 0))
                    const h = Math.max(v === 0 ? 0 : 1, Math.abs(y(v) - y(0)))
                    const r = Math.min(4, grosor / 2, h)
                    const x = x0 + k * (grosor + 2)
                    // Extremo redondeado en el lado de los datos, base recta
                    const camino = v >= 0
                      ? `M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + grosor - r} Q${x + grosor},${yTop} ${x + grosor},${yTop + r} V${yTop + h} Z`
                      : `M${x},${y(0)} V${y(v) - r} Q${x},${y(v)} ${x + r},${y(v)} H${x + grosor - r} Q${x + grosor},${y(v)} ${x + grosor},${y(v) - r} V${y(0)} Z`
                    return <path key={s.clave} d={camino} className={`g-serie-${k + 1} ${hover != null && hover !== i ? 'g-atenuado' : ''} ${resaltar === i ? 'g-resaltado' : ''}`} />
                  })}
                  {i % saltoEtiqueta === 0 ? <text x={m.izq + i * banda + banda / 2} y={alto - 8} className="g-eje" textAnchor="middle">{d.etiqueta}</text> : null}
                  <rect x={m.izq + i * banda} y={m.arriba} width={banda} height={altoUtil} fill="transparent"
                    onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={-1} />
                </g>
              )
            })}
          </svg>
          {hover != null ? (
            <div className="g-tooltip" style={{ left: `${((m.izq + hover * banda + banda / 2) / ancho) * 100}%` }} role="status">
              <strong>{datos[hover].detalle ?? datos[hover].etiqueta}</strong>
              {series.map((s, k) => <span key={s.clave}><span className={`g-muestra g-serie-${k + 1}`} aria-hidden="true" />{series.length > 1 ? `${s.nombre}: ` : ''}{formato(datos[hover][s.clave])}</span>)}
            </div>
          ) : null}
        </div>
      ) : null}
      <div id={id}>
        <TablaDatos titulo={titulo} visible={verTabla} columnas={['', ...series.map((s) => s.nombre)]} filas={datos.map((d) => [d.detalle ?? d.etiqueta, ...series.map((s) => formato(d[s.clave]))])} />
      </div>
    </figure>
  )
}

/**
 * Barras horizontales (ranking). Valores negativos se dibujan hacia la izquierda con la serie 2.
 * datos: [{ etiqueta, valor, detalle? }]
 */
export function BarrasH({ datos, formato = (v) => formatearNumero(v, 0), titulo = 'Gráfico', vacio = 'Sin datos en este periodo.' }) {
  const max = useMemo(() => Math.max(1e-9, ...datos.map((d) => Math.abs(Number(d.valor) || 0))), [datos])
  const hayNegativos = datos.some((d) => d.valor < 0)
  if (!datos.length) return <p className="g-vacio">{vacio}</p>
  return (
    <figure className="grafico">
      <ul className="g-barras" role="list" aria-label={titulo}>
        {datos.map((d, i) => {
          const pct = (Math.abs(Number(d.valor) || 0) / max) * (hayNegativos ? 50 : 100)
          const neg = d.valor < 0
          return (
            <li key={`${d.etiqueta}-${i}`} className="g-barra">
              <span className="g-barra-etiqueta">{d.etiqueta}</span>
              <span className="g-barra-pista" aria-hidden="true">
                <span className={`g-barra-relleno ${neg ? 'g-serie-2' : 'g-serie-1'}`}
                  style={hayNegativos ? { width: `${pct}%`, marginLeft: neg ? `${50 - pct}%` : '50%' } : { width: `${pct}%` }} />
              </span>
              <span className="g-barra-valor num">{formato(d.valor)}{d.detalle ? <small> · {d.detalle}</small> : null}</span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
