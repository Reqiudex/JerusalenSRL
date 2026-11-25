// Panel del dueño: una sola pantalla, letra grande, sin menús, solo lectura.
import { useCallback, useEffect, useRef, useState } from 'react'
import { BarrasH } from '@ui/graficos.jsx'
import { formatearBs, formatearMes, formatearNumero, formatearUnidad, sumarMes } from '@ui/formatos.js'
import MarmolFondo from '@ui/MarmolFondo.jsx'
import { api } from './api.js'
import { resumenDemo } from './datosDemo.js'
import { deCadaDiez, formatoGrande, nivelMerma, saludo, textoCompra, textoVariacion, textosVoz } from './calculos.js'

const hayVoz = typeof window !== 'undefined' && 'speechSynthesis' in window

function hablar(texto, alTerminar) {
  if (!hayVoz) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(texto)
  u.lang = 'es-BO'
  const voces = window.speechSynthesis.getVoices()
  u.voice = voces.find((v) => v.lang === 'es-BO') ?? voces.find((v) => v.lang?.startsWith('es-') && /419|US|MX|AR/.test(v.lang)) ?? voces.find((v) => v.lang?.startsWith('es')) ?? null
  u.rate = 0.9
  u.onend = alTerminar
  u.onerror = alTerminar
  window.speechSynthesis.speak(u)
}

function Icono({ d, grande }) {
  return (
    <svg className={grande ? 'ico ico-grande' : 'ico'} viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const I = {
  altavoz: 'M4 9v6h4l5 4V5L8 9H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  parar: 'M7 7h10v10H7z',
  izq: 'M15 5l-7 7 7 7',
  der: 'M9 5l7 7-7 7',
  sol: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  luna: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
  sube: 'M12 19V5M5 12l7-7 7 7',
  baja: 'M12 5v14M5 12l7 7 7-7',
  alerta: 'M12 3 2 20h20L12 3zM12 10v4M12 17h.01',
  ok: 'M5 12l5 5 9-10',
  borrar: 'M21 5H8l-6 7 6 7h13zM12 9l6 6M18 9l-6 6',
}

// ───────────────────────── Ingreso con PIN ─────────────────────────

function Ingreso({ alEntrar, alDemo, alSinPin, error, ocupado }) {
  const [pin, setPin] = useState('')
  const enviar = useCallback(() => pin.length >= 4 && alEntrar(pin), [pin, alEntrar])
  const tocar = (d) => setPin((p) => (p.length < 6 ? p + d : p))
  useEffect(() => {
    const tecla = (e) => {
      if (/^\d$/.test(e.key)) tocar(e.key)
      else if (e.key === 'Backspace') setPin((p) => p.slice(0, -1))
      else if (e.key === 'Enter') enviar()
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [enviar])
  useEffect(() => {
    if (error) setPin('')
  }, [error])

  return (
    <main className="ingreso">
      <p className="marca-grande">JERUSALÉN</p>
      <h1>Escriba su clave</h1>
      <div className="puntos" aria-label={`${pin.length} números escritos`} role="status">
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => <span key={i} className={i < pin.length ? 'lleno' : ''} />)}
      </div>
      {error ? <p className="error-pin" role="alert">{error}</p> : null}
      <div className="teclado" role="group" aria-label="Teclado numérico">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" onClick={() => tocar(d)}>{d}</button>
        ))}
        <button type="button" className="tecla-borrar" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar el último número">
          <Icono d={I.borrar} grande />
        </button>
        <button type="button" onClick={() => tocar('0')}>0</button>
        <button type="button" className="tecla-entrar" onClick={enviar} disabled={pin.length < 4 || ocupado}>
          {ocupado ? '…' : 'Entrar'}
        </button>
      </div>
      {alSinPin ? (
        <button type="button" className="boton-sin-pin" onClick={alSinPin} disabled={ocupado}>Entrar sin PIN (demo)</button>
      ) : null}
      <button type="button" className="enlace-demo" onClick={alDemo}>Ver con datos de ejemplo</button>
    </main>
  )
}

// ───────────────────────── Tarjetas ─────────────────────────

function Tarjeta({ titulo, texto, hablando, alEscuchar, children, clase = '' }) {
  return (
    <section className={`tarjeta-d ${clase}`} aria-labelledby={`t-${titulo}`}>
      <div className="tarjeta-d-cabecera">
        <h2 id={`t-${titulo}`}>{titulo}</h2>
        {hayVoz ? (
          <button type="button" className="boton-escuchar" onClick={alEscuchar} aria-pressed={hablando}>
            <Icono d={hablando ? I.parar : I.altavoz} /> {hablando ? 'Parar' : 'Escuchar'}
          </button>
        ) : null}
      </div>
      {children}
      <p className="oculto">{texto}</p>
    </section>
  )
}

// ───────────────────────── Panel ─────────────────────────

export default function App() {
  const hoyMes = new Date(Date.now() - 4 * 3600e3).toISOString().slice(0, 7)
  const [fase, setFase] = useState('cargando') // cargando | pin | panel
  const [demo, setDemo] = useState(() => new URLSearchParams(location.search).has('demo'))
  const [usuario, setUsuario] = useState(null)
  const [mes, setMes] = useState(hoyMes)
  const [mesMax, setMesMax] = useState(hoyMes)
  const [sucursal, setSucursal] = useState(null)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [errorPin, setErrorPin] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [hablando, setHablando] = useState(null)
  const [tema, setTema] = useState(() => document.documentElement.dataset.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'noche' : 'claro'))
  const peticion = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.tema = tema
    try {
      localStorage.setItem('jerusalen-tema', tema)
    } catch {
      /* sin almacenamiento */
    }
  }, [tema])

  // ¿Ya hay sesión?
  useEffect(() => {
    if (demo) {
      setFase('panel')
      return
    }
    api.yo()
      .then((r) => {
        if (r.tipoSesion === 'pin' || ['dueno', 'administrador'].includes(r.usuario.rol)) {
          setUsuario(r.usuario)
          setFase('panel')
        } else setFase('pin')
      })
      .catch(() => setFase('pin'))
  }, [demo])

  // Cargar el resumen
  useEffect(() => {
    if (fase !== 'panel') return
    const n = ++peticion.current
    setError('')
    if (demo) {
      setDatos(resumenDemo(mes, sucursal))
      return
    }
    api.resumen(mes, sucursal)
      .then((d) => {
        if (n !== peticion.current) return
        setDatos(d)
        setMesMax(d.hoy.slice(0, 7))
      })
      .catch((e) => {
        if (n !== peticion.current) return
        if (e.estado === 401 || e.estado === 403) setFase('pin')
        else setError('No se pudieron traer los datos. Revise la conexión a internet.')
      })
  }, [fase, mes, sucursal, demo])

  useEffect(() => () => hayVoz && window.speechSynthesis.cancel(), [])

  const entrar = async (pin) => {
    setOcupado(true)
    setErrorPin('')
    try {
      const r = await api.pin(pin)
      setUsuario(r.usuario)
      setFase('panel')
    } catch (e) {
      setErrorPin(e.estado === 401 ? 'Clave incorrecta. Intente de nuevo.' : e.estado === 429 ? e.message : 'No hay conexión con el sistema. Puede ver los datos de ejemplo.')
    } finally {
      setOcupado(false)
    }
  }

  const [sinPin, setSinPin] = useState(false)
  useEffect(() => {
    api.demoActivo().then((r) => setSinPin(!!r?.activo)).catch(() => setSinPin(false))
  }, [])
  const entrarSinPin = async () => {
    setOcupado(true)
    setErrorPin('')
    try {
      const r = await api.demoEntrar()
      setDemo(false)
      setUsuario(r.usuario)
      setFase('panel')
    } catch (e) {
      setErrorPin(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const salir = async () => {
    if (hayVoz) window.speechSynthesis.cancel()
    if (!demo) await api.salir().catch(() => {})
    setDemo(false)
    setDatos(null)
    setFase('pin')
  }

  const escuchar = (clave, texto) => {
    if (hablando === clave) {
      window.speechSynthesis.cancel()
      setHablando(null)
      return
    }
    setHablando(clave)
    hablar(texto, () => setHablando((h) => (h === clave ? null : h)))
  }

  if (fase === 'cargando') return <main className="cargando" aria-busy="true"><p className="marca-grande">JERUSALÉN</p></main>
  if (fase === 'pin') return <><MarmolFondo /><Ingreso alEntrar={entrar} alDemo={() => { setDemo(true); setFase('panel') }} alSinPin={sinPin ? entrarSinPin : null} error={errorPin} ocupado={ocupado} /></>

  const voz = datos ? textosVoz(datos) : null
  const variacion = datos ? textoVariacion(datos.ingresos.variacionPct, datos.mes) : null
  const merma = datos ? nivelMerma(datos.mermas.porcentaje) : null
  const nombreCorto = (n) => n.split(' — ')[0].replace('Showroom ', '').replace('Fábrica Parque Industrial', 'Fábrica')
  const todoElTexto = voz ? Object.values(voz).join(' ') : ''

  return (
    <>
      <MarmolFondo />
      <header className="cabecera">
        <div>
          <p className="marca-grande">JERUSALÉN</p>
          <p className="saludo">{saludo(new Date().getHours())}{usuario?.rol === 'dueno' ? `, ${usuario.nombre.replace(/^Don /, 'Don ')}` : ''}</p>
        </div>
        <div className="cabecera-botones">
          <button type="button" className="boton-d boton-icono-d" onClick={() => setTema(tema === 'noche' ? 'claro' : 'noche')} aria-label={tema === 'noche' ? 'Poner pantalla clara' : 'Poner pantalla oscura'}>
            <Icono d={tema === 'noche' ? I.sol : I.luna} grande />
          </button>
          <button type="button" className="boton-d" onClick={salir}>Salir</button>
        </div>
      </header>

      <main className="panel">
        {demo ? <p className="aviso-demo" role="note">Está viendo <strong>datos de ejemplo</strong>, no los reales.</p> : null}

        <div className="controles">
          <div className="selector-mes" role="group" aria-label="Elegir mes">
            <button type="button" className="flecha" onClick={() => setMes(sumarMes(mes, -1))} aria-label={`Ver ${formatearMes(sumarMes(mes, -1))}`}>
              <Icono d={I.izq} grande />
            </button>
            <p className="mes" aria-live="polite">{formatearMes(mes).replace(/^./, (c) => c.toUpperCase())}</p>
            <button type="button" className="flecha" onClick={() => setMes(sumarMes(mes, 1))} disabled={mes >= mesMax} aria-label={`Ver ${formatearMes(sumarMes(mes, 1))}`}>
              <Icono d={I.der} grande />
            </button>
          </div>
          {datos ? (
            <div className="selector-sucursal" role="radiogroup" aria-label="Elegir sucursal">
              <button type="button" role="radio" aria-checked={!sucursal} onClick={() => setSucursal(null)}>Todas</button>
              {datos.sucursales.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={sucursal === s.id} onClick={() => setSucursal(s.id)}>{nombreCorto(s.nombre)}</button>
              ))}
            </div>
          ) : null}
          {hayVoz && datos ? (
            <button type="button" className="boton-d boton-todo" onClick={() => escuchar('todo', todoElTexto)} aria-pressed={hablando === 'todo'}>
              <Icono d={hablando === 'todo' ? I.parar : I.altavoz} grande /> {hablando === 'todo' ? 'Parar' : 'Escuchar todo'}
            </button>
          ) : null}
        </div>

        {error ? <p className="error-carga" role="alert">{error}</p> : null}
        {!datos && !error ? <p className="cargando-texto" aria-busy="true">Trayendo los números…</p> : null}

        {datos ? (
          <div className="tarjetas">
            <Tarjeta titulo="Lo que gané este mes" texto={voz.gane} hablando={hablando === 'gane'} alEscuchar={() => escuchar('gane', voz.gane)} clase="t-gane">
              <p className="monto">{formatoGrande(datos.ingresos.total)}</p>
              <p className="detalle">En {datos.ingresos.ventas} ventas</p>
              {variacion ? (
                <p className={`variacion ${variacion.sube === true ? 'sube' : variacion.sube === false ? 'baja' : ''}`}>
                  {variacion.sube != null ? <Icono d={variacion.sube ? I.sube : I.baja} /> : null} {variacion.texto}{datos.ingresos.mesEnCurso ? ' (mismos días)' : ''}
                </p>
              ) : null}
              <p className="detalle-chico">Ya cobrado: <strong className="num">{formatoGrande(datos.cobrado)}</strong> · Me deben: <strong className="num">{formatoGrande(datos.porCobrar.total)}</strong></p>
            </Tarjeta>

            <Tarjeta titulo="Lo que gasté" texto={voz.gaste} hablando={hablando === 'gaste'} alEscuchar={() => escuchar('gaste', voz.gaste)}>
              <p className="monto">{formatoGrande(datos.gastos.total)}</p>
              <ul className="lista-simple">
                {datos.gastos.porCategoria.slice(0, 4).map((g) => (
                  <li key={g.categoria}><span>{g.nombre}</span><strong className="num">{formatoGrande(g.monto)}</strong></li>
                ))}
              </ul>
            </Tarjeta>

            <Tarjeta titulo="Lo que me queda" texto={voz.queda} hablando={hablando === 'queda'} alEscuchar={() => escuchar('queda', voz.queda)} clase={datos.resultado.total >= 0 ? 't-ganancia' : 't-perdida'}>
              <p className="monto">{datos.resultado.total < 0 ? '− ' : ''}{formatoGrande(Math.abs(datos.resultado.total))}</p>
              <p className={`estado-grande ${datos.resultado.total >= 0 ? 'ok' : 'peligro'}`}>
                <Icono d={datos.resultado.total >= 0 ? I.ok : I.alerta} /> {datos.resultado.total >= 0 ? 'Ganancia' : 'Pérdida'}
              </p>
              {datos.pendientes?.planilla > 0 ? (
                <p className="nota-pendiente">
                  Falta pagar los sueldos de este mes (más o menos {formatoGrande(datos.pendientes.planilla)}). Después de pagarlos {datos.pendientes.resultadoEstimado >= 0 ? 'quedarían' : 'faltarían'} <strong className="num">{formatoGrande(Math.abs(datos.pendientes.resultadoEstimado))}</strong>.
                </p>
              ) : null}
            </Tarjeta>

            <Tarjeta titulo="Producción de cada producto" texto={voz.produccion} hablando={hablando === 'produccion'} alEscuchar={() => escuchar('produccion', voz.produccion)} clase="t-ancha">
              <p className="detalle">Metros cuadrados vendidos este mes</p>
              <BarrasH titulo="Metros cuadrados por producto" datos={datos.produccion.map((p) => ({ etiqueta: p.producto, valor: p.cantidad }))} formato={(v) => `${formatearNumero(v, 0)} m²`} vacio="Todavía no hay producción este mes." />
            </Tarjeta>

            <Tarjeta titulo="Mermas" texto={voz.mermas} hablando={hablando === 'mermas'} alEscuchar={() => escuchar('mermas', voz.mermas)}>
              <p className="monto">{formatearNumero(datos.mermas.m2, 1)} m²</p>
              <p className="detalle">desperdiciados, el {formatearNumero(datos.mermas.porcentaje, 0)} % de lo cortado en {datos.mermas.planchasCortadas} planchas</p>
              <p className={`estado-grande ${merma.nivel}`}><Icono d={merma.nivel === 'ok' ? I.ok : I.alerta} /> {merma.texto}</p>
            </Tarjeta>

            <Tarjeta titulo="Qué tengo que comprar" texto={voz.comprar} hablando={hablando === 'comprar'} alEscuchar={() => escuchar('comprar', voz.comprar)}>
              {datos.compras.length ? (
                <ul className="lista-compras">
                  {datos.compras.slice(0, 5).map((c) => (
                    <li key={c.material}>
                      <span className={`etiqueta-urgencia ${c.urgencia}`}>
                        <Icono d={c.urgencia === 'urgente' ? I.alerta : I.ok} /> {c.urgencia === 'urgente' ? 'Urgente' : 'Pronto'}
                      </span>
                      <span>{textoCompra(c)}</span>
                      <small className="num">≈ {formatoGrande(c.costoEstimado)}</small>
                    </li>
                  ))}
                </ul>
              ) : <p className="detalle">No hace falta comprar nada por ahora.</p>}
            </Tarjeta>

            <Tarjeta titulo="Cómo van mis vendedores" texto={voz.vendedores} hablando={hablando === 'vendedores'} alEscuchar={() => escuchar('vendedores', voz.vendedores)} clase="t-ancha">
              {datos.vendedores.length ? (
                <ul className="lista-vendedores">
                  {datos.vendedores.map((v) => (
                    <li key={v.nombre}>
                      <div className="vend-nombre"><strong>{v.nombre}</strong><span>{v.proformas} proformas → <strong>{v.ventas} ventas</strong></span></div>
                      <div className="vend-barra" aria-hidden="true"><span style={{ width: `${Math.min(100, v.conversionPct)}%` }} /></div>
                      <p className="vend-texto">{deCadaDiez(v.conversionPct)} · vendió {formatearBs(v.vendido, { entero: true })}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="detalle">Este mes no hay proformas.</p>}
            </Tarjeta>
          </div>
        ) : null}
        {datos ? <p className="actualizado">Datos al {new Date(datos.actualizado).toLocaleString('es-BO', { dateStyle: 'long', timeStyle: 'short' })}{datos.sucursal ? ` · ${datos.sucursal.nombre}` : ' · Todas las sucursales'} · {formatearUnidad('m2') && 'Solo lectura'}</p> : null}
      </main>
    </>
  )
}
