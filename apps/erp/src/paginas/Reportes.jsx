// Reportes y gráficas: productos, estacionalidad, tendencias, compras, vendedores y mermas.
import { useState } from 'react'
import { BarrasH, Columnas } from '@ui/graficos.jsx'
import { formatearBs, formatearBsCorto, formatearMes, formatearNumero, formatearPorcentaje, formatearUnidad, MESES_CORTOS } from '@ui/formatos.js'
import { consulta } from '../api.js'
import { Cabecera, Campo, Cargando, ErrorCarga, Estado, Kpi, SelectorSucursal, Tabla, useDatos } from '../componentes.jsx'

export default function Reportes() {
  const [f, setF] = useState({ desde: '', hasta: '', sucursal: '', por: 'total' })
  const { datos: d, error, cargando, recargar } = useDatos(`/reportes${consulta(f)}`)
  const fmtProducto = f.por === 'total' ? (v) => formatearBs(v, { entero: true }) : (v) => `${formatearNumero(v, 1)} m²`
  return (
    <>
      <Cabecera titulo="Reportes" subtitulo={d ? `Del ${d.desde.split('-').reverse().join('/')} al ${d.hasta.split('-').reverse().join('/')}` : 'Últimos 12 meses'} />
      <div className="filtros no-imprimir">
        <Campo etiqueta="Desde" type="date" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} ayuda="Vacío = hace 12 meses" />
        <Campo etiqueta="Hasta" type="date" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} ayuda="Vacío = hoy" />
        <SelectorSucursal valor={f.sucursal} alCambiar={(v) => setF({ ...f, sucursal: v ?? '' })} />
        <Campo etiqueta="Medir productos por" como="select" value={f.por} onChange={(e) => setF({ ...f, por: e.target.value })}>
          <option value="total">Dinero vendido (Bs)</option><option value="cantidad">m² vendidos</option>
        </Campo>
        <button type="button" className="boton" style={{ alignSelf: 'center' }} onClick={() => window.print()}>Imprimir</button>
      </div>
      <ErrorCarga error={error} reintentar={recargar} />
      {cargando && !d ? <Cargando texto="Calculando reportes…" /> : d ? (
        <div className="pila">
          <div className="rejilla" style={{ '--min': '240px' }}>
            <Kpi etiqueta="Producto más exitoso" valor={<span style={{ fontSize: 18, fontFamily: 'var(--sans)' }}>{d.exito.masExitoso?.nombre ?? '—'}</span>} detalle={d.exito.masExitoso ? `${formatearBs(d.exito.masExitoso.total, { entero: true })} · margen ${formatearPorcentaje(d.exito.masExitoso.margenPct, 0)}` : ''} />
            <Kpi etiqueta="Producto menos exitoso" valor={<span style={{ fontSize: 18, fontFamily: 'var(--sans)' }}>{d.exito.menosExitoso?.nombre ?? '—'}</span>} detalle={d.exito.menosExitoso ? `${formatearBs(d.exito.menosExitoso.total, { entero: true })} vendidos` : ''} />
            <Kpi etiqueta="Moda del momento" valor={<span style={{ fontSize: 18, fontFamily: 'var(--sans)' }}>{d.tendencias.find((t) => t.estado === 'moda')?.nombre ?? 'Sin modas nuevas'}</span>} detalle={d.tendencias[0]?.estado === 'moda' ? `+${formatearNumero(d.tendencias[0].crecimientoPct, 0)} % en 8 semanas` : ''} />
          </div>

          <div className="rejilla" style={{ '--min': '420px' }}>
            <section className="tarjeta"><h2>Más vendidos</h2><BarrasH titulo="Productos más vendidos" datos={d.productos.masVendidos.map((p) => ({ etiqueta: p.nombre, valor: p[f.por] }))} formato={fmtProducto} /></section>
            <section className="tarjeta"><h2>Menos vendidos</h2><BarrasH titulo="Productos menos vendidos" datos={d.productos.menosVendidos.map((p) => ({ etiqueta: p.nombre, valor: p[f.por] }))} formato={fmtProducto} /></section>
          </div>

          <section className="tarjeta">
            <h2>Ventas por mes</h2>
            <Columnas titulo="Ventas por mes" datos={d.porMes.map((m) => ({ etiqueta: formatearMes(m.mes, { corto: true }), detalle: `${formatearMes(m.mes)} · ${m.cantidad} ventas`, valor: m.total }))} formato={(v) => formatearBs(v, { entero: true })} formatoEje={formatearBsCorto} alto={240} />
          </section>

          <div className="rejilla" style={{ '--min': '420px' }}>
            <section className="tarjeta">
              <h2>¿Qué día se vende más?</h2>
              <p className="suave">Promedio vendido por día de la semana.</p>
              <Columnas titulo="Venta promedio por día de la semana" datos={d.porDiaSemana.map((x) => ({ etiqueta: x.nombre.slice(0, 3), detalle: `${x.nombre} · ${x.cantidad} ventas en total`, valor: x.promedioPorDia }))} formato={(v) => formatearBs(v, { entero: true })} formatoEje={formatearBsCorto} />
            </section>
            <section className="tarjeta">
              <h2>Estacionalidad</h2>
              <p className="suave">1,00 = mes promedio. Más de 1 = temporada alta.</p>
              <Columnas titulo="Índice estacional por mes" datos={d.estacionalidad.filter((x) => x.indice != null).map((x) => ({ etiqueta: MESES_CORTOS[x.mes - 1], valor: x.indice }))} formato={(v) => formatearNumero(v, 2)} formatoEje={(v) => formatearNumero(v, 1)} />
            </section>
          </div>

          <section className="tarjeta">
            <h2>Tendencias y modas</h2>
            <p className="suave">Ritmo de las últimas 8 semanas comparado con el promedio semanal de los últimos 12 meses (m² por semana).</p>
            <BarrasH titulo="Crecimiento por producto" datos={d.tendencias.filter((t) => t.estado !== 'estable').slice(0, 12).map((t) => ({ etiqueta: t.nombre, valor: t.crecimientoPct, detalle: t.estado === 'moda' ? 'moda' : 'en caída' }))} formato={(v) => `${v > 0 ? '+' : ''}${formatearNumero(v, 0)} %`} vacio="Ningún producto cambió mucho." />
            <details className="seccion">
              <summary>Ver todos los productos</summary>
              <Tabla etiqueta="Tendencias" filas={d.tendencias} clave="material_id" columnas={[
                { titulo: 'Producto', valor: (t) => t.nombre },
                { titulo: 'Últimas 8 semanas', num: true, valor: (t) => `${formatearNumero(t.semanalReciente, 1)} m²/sem` },
                { titulo: 'Promedio 12 meses', num: true, valor: (t) => `${formatearNumero(t.semanalAnual, 1)} m²/sem` },
                { titulo: 'Cambio', num: true, valor: (t) => `${t.crecimientoPct > 0 ? '+' : ''}${formatearNumero(t.crecimientoPct, 0)} %` },
                { titulo: 'Estado', valor: (t) => <Estado valor={t.estado} /> },
              ]} />
            </details>
          </section>

          <section className="tarjeta">
            <div className="tarjeta-cabecera"><h2>Recomendación de compra</h2><a href="#/inventario?pestana=compras">Lista completa</a></div>
            <Tabla etiqueta="Recomendación de compra" filas={d.compras.slice(0, 10)} clave="material_id" vacio="No hace falta comprar nada." columnas={[
              { titulo: 'Urgencia', valor: (c) => <Estado valor={c.urgencia} /> },
              { titulo: 'Material', valor: (c) => c.nombre },
              { titulo: 'Stock / mínimo', num: true, valor: (c) => `${formatearNumero(c.stock, 0)} / ${formatearNumero(c.minimo, 0)}` },
              { titulo: 'Demanda 30 días', num: true, valor: (c) => formatearNumero(c.demandaProyectada, 1) },
              { titulo: 'Comprar', num: true, valor: (c) => <strong>{c.sugerido} {formatearUnidad(c.unidad)}</strong> },
              { titulo: 'Costo estimado', num: true, valor: (c) => formatearBs(c.costoEstimado, { entero: true }) },
            ]} />
          </section>

          <section className="tarjeta">
            <h2>Proformas por vendedor y conversión</h2>
            <Tabla etiqueta="Conversión por vendedor" filas={d.vendedores} clave="vendedor_id" columnas={[
              { titulo: 'Vendedor', valor: (v) => <strong>{v.nombre}</strong> },
              { titulo: 'Proformas', num: true, valor: (v) => v.proformas },
              { titulo: 'Convertidas', num: true, valor: (v) => v.convertidas },
              { titulo: 'Rechazadas', num: true, valor: (v) => v.rechazadas },
              { titulo: 'Vencidas', num: true, valor: (v) => v.vencidas },
              { titulo: 'Abiertas', num: true, valor: (v) => v.abiertas },
              { titulo: 'Conversión', num: true, valor: (v) => <strong>{formatearPorcentaje(v.tasaPct, 0)}</strong> },
              { titulo: 'Vendido', num: true, valor: (v) => formatearBs(v.montoVendido, { entero: true }) },
            ]} />
            <div className="seccion"><BarrasH titulo="Tasa de conversión" datos={d.vendedores.map((v) => ({ etiqueta: v.nombre, valor: v.tasaPct }))} formato={(v) => formatearPorcentaje(v, 0)} /></div>
          </section>

          <div className="rejilla" style={{ '--min': '420px' }}>
            <section className="tarjeta"><h2>Mermas por material</h2>
              <BarrasH titulo="Mermas por material" datos={d.mermas.porMaterial.slice(0, 10).map((m) => ({ etiqueta: m.clave, valor: m.mermaM2, detalle: formatearPorcentaje(m.mermaPct, 0) }))} formato={(v) => `${formatearNumero(v, 2)} m²`} vacio="Sin cortes en el periodo." />
            </section>
            <section className="tarjeta"><h2>Mermas por cortador</h2>
              <BarrasH titulo="Mermas por cortador" datos={d.mermas.porCortador.map((m) => ({ etiqueta: m.clave, valor: m.mermaPct, detalle: `${formatearNumero(m.mermaM2, 1)} de ${formatearNumero(m.cortadoM2, 1)} m²` }))} formato={(v) => formatearPorcentaje(v, 1)} vacio="Sin cortes en el periodo." />
            </section>
          </div>
        </div>
      ) : null}
    </>
  )
}
