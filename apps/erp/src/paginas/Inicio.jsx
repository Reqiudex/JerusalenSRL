// Panel de inicio: indicadores del mes, ventas de 12 meses, proformas por vencer y compras urgentes.
import { Columnas } from '@ui/graficos.jsx'
import { formatearBs, formatearBsCorto, formatearFecha, formatearMes, formatearPorcentaje, formatearUnidad } from '@ui/formatos.js'
import { Cabecera, Cargando, ErrorCarga, Estado, Kpi, useApp, useDatos, usePuede } from '../componentes.jsx'

export default function Inicio() {
  const { usuario } = useApp()
  const puede = usePuede()
  const { datos: d, error, cargando, recargar } = useDatos('/panel')
  if (cargando && !d) return <Cargando />
  if (error) return <ErrorCarga error={error} reintentar={recargar} />
  const k = d.kpis
  const variacion = k.variacionPct == null ? '' : `${k.variacionPct >= 0 ? '▲' : '▼'} ${formatearPorcentaje(Math.abs(k.variacionPct), 0)} vs. mismo tramo del mes anterior`
  return (
    <>
      <Cabecera titulo={`Hola, ${usuario.nombre.split(' ')[0]}`} subtitulo={`Resumen de ${formatearMes(d.fecha.slice(0, 7))} al ${formatearFecha(d.fecha)}`}
        acciones={puede('proformas', 'escribir') ? <a className="boton boton-primario" href="#/proformas/nueva">Nueva proforma</a> : null} />
      <div className="rejilla" style={{ '--min': '210px' }}>
        <Kpi etiqueta="Ventas del mes" valor={formatearBs(k.ventasMes, { entero: true })} detalle={`${k.ventasMesN} ventas · ${variacion}`} href={puede('ventas') ? '#/ventas' : undefined} />
        <Kpi etiqueta="Margen bruto" valor={formatearBs(k.margenMes, { entero: true })} detalle={k.ventasMes ? `${formatearPorcentaje((k.margenMes / k.ventasMes) * 100, 0)} de las ventas` : ''} />
        <Kpi etiqueta="Cobrado este mes" valor={formatearBs(k.cobradoMes, { entero: true })} detalle={`Por cobrar: ${formatearBs(k.porCobrar, { entero: true })}`} href={puede('contabilidad') ? '#/contabilidad' : undefined} />
        <Kpi etiqueta="Proformas abiertas" valor={k.proformasAbiertas} detalle={formatearBs(k.proformasAbiertasMonto, { entero: true })} href={puede('proformas') ? '#/proformas?estado=enviada' : undefined} />
        <Kpi etiqueta="Compras urgentes" valor={k.comprasUrgentes} detalle={`${k.planchasEnCorte} planchas en corte`} href={puede('inventario') ? '#/inventario?pestana=compras' : undefined} />
      </div>
      <div className="rejilla seccion" style={{ '--min': '420px' }}>
        <section className="tarjeta">
          <h2>Ventas de los últimos 12 meses</h2>
          <Columnas titulo="Ventas por mes" datos={d.porMes.map((m) => ({ etiqueta: formatearMes(m.mes, { corto: true }), detalle: formatearMes(m.mes), valor: m.total }))} formato={(v) => formatearBs(v, { entero: true })} formatoEje={formatearBsCorto} resaltar={d.porMes.length - 1} />
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cabecera"><h2>Proformas por vencer</h2>{puede('proformas') ? <a href="#/proformas">Ver todas</a> : null}</div>
          <ul className="lista-simple">
            {d.porVencer.length === 0 ? <li className="suave">No hay proformas abiertas.</li> : d.porVencer.map((p) => (
              <li key={p.id}>
                <a href={`#/proformas/${p.id}`}><strong>{p.codigo}</strong> · {p.cliente}<br /><small className="suave">{p.vendedor} · vence {formatearFecha(p.vence)}</small></a>
                <span className="num">{formatearBs(p.total, { entero: true })}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cabecera"><h2>Últimas ventas</h2>{puede('ventas') ? <a href="#/ventas">Ver todas</a> : null}</div>
          <ul className="lista-simple">
            {d.ultimas.map((v) => (
              <li key={v.id}>
                <a href={`#/ventas/${v.id}`}><strong>{v.codigo}</strong> · {v.cliente}<br /><small className="suave">{formatearFecha(v.fecha)} · {v.vendedor}</small></a>
                <span className="num">{formatearBs(v.total, { entero: true })}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="tarjeta">
          <div className="tarjeta-cabecera"><h2>Qué comprar</h2>{puede('inventario') ? <a href="#/inventario?pestana=compras">Lista completa</a> : null}</div>
          <ul className="lista-simple">
            {d.compras.length === 0 ? <li className="suave">Nada urgente.</li> : d.compras.map((c) => (
              <li key={c.material_id}>
                <span><Estado valor={c.urgencia} /> {c.nombre}<br /><small className="suave">{c.sucursal}</small></span>
                <span className="num">{c.sugerido} {formatearUnidad(c.unidad)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
