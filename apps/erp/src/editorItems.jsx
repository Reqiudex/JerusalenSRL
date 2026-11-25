// Editor de ítems de proformas y ventas, con cálculo en vivo (mismas reglas que la API).
import { cantidadItem, calcularTotales, totalItem, TIPOS_ITEM } from '@reportes/proformas.js'
import { formatearBs, formatearNumero } from '@ui/formatos.js'
import { Campo, Icono, useDatos } from './componentes.jsx'

export const itemVacio = () => ({ tipo: 'pieza', material_id: '', descripcion: '', ancho_cm: '', alto_cm: '', piezas: 1, cantidad: '', unidad: 'm2', precio_unit: '' })

export function EditorItems({ items, setItems, descuento, setDescuento }) {
  const { datos: materiales } = useDatos('/materiales')
  const cambiar = (i, cambios) => setItems(items.map((it, k) => (k === i ? { ...it, ...cambios } : it)))
  const elegirMaterial = (i, id) => {
    const m = materiales?.find((x) => x.id === Number(id))
    if (!m) return cambiar(i, { material_id: '' })
    const it = items[i]
    cambiar(i, {
      material_id: m.id,
      descripcion: it.descripcion && it.material_id ? it.descripcion : m.nombre,
      precio_unit: m.precio,
      unidad: it.tipo === 'pieza' || it.tipo === 'plancha' ? 'm2' : m.unidad,
      ...(it.tipo === 'plancha' && m.ancho_cm ? { cantidad: Math.round(((m.ancho_cm * m.alto_cm) / 10000) * 100) / 100 } : {}),
    })
  }
  const opciones = (tipo) => (materiales ?? []).filter((m) => (tipo === 'servicio' ? m.categoria === 'servicio' : tipo === 'insumo' ? m.categoria === 'insumo' : m.categoria === 'plancha'))
  const t = calcularTotales(items.map((i) => ({ ...i, cantidad: Number(i.cantidad) || 0 })), descuento)

  return (
    <div className="pila">
      <div className="items">
        {items.map((it, i) => {
          const conMedidas = it.tipo === 'pieza'
          return (
            <fieldset key={i} className="item">
              <legend className="oculto">Ítem {i + 1}</legend>
              <Campo etiqueta="Tipo" como="select" value={it.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value, material_id: '', unidad: ['pieza', 'plancha'].includes(e.target.value) ? 'm2' : 'unidad' })}>
                {Object.entries(TIPOS_ITEM).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Campo>
              <div className="item-desc pila" style={{ gap: 6 }}>
                <Campo etiqueta="Material o servicio" como="select" value={it.material_id} onChange={(e) => elegirMaterial(i, e.target.value)}>
                  <option value="">— Sin catálogo —</option>
                  {opciones(it.tipo).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </Campo>
                <Campo etiqueta="Descripción" value={it.descripcion} onChange={(e) => cambiar(i, { descripcion: e.target.value })} required />
              </div>
              {conMedidas ? (
                <>
                  <Campo etiqueta="Largo (cm)" type="number" min="0" inputMode="decimal" value={it.ancho_cm} onChange={(e) => cambiar(i, { ancho_cm: e.target.value })} />
                  <Campo etiqueta="Ancho (cm)" type="number" min="0" inputMode="decimal" value={it.alto_cm} onChange={(e) => cambiar(i, { alto_cm: e.target.value })} />
                  <Campo etiqueta="Piezas" type="number" min="1" value={it.piezas} onChange={(e) => cambiar(i, { piezas: e.target.value })} />
                  <Campo etiqueta="m²" type="number" min="0" step="0.01" value={Number(it.ancho_cm) && Number(it.alto_cm) ? cantidadItem(it) : it.cantidad} onChange={(e) => cambiar(i, { cantidad: e.target.value, ancho_cm: '', alto_cm: '' })} ayuda={Number(it.ancho_cm) && Number(it.alto_cm) ? 'Calculado' : 'o escribe los m²'} />
                </>
              ) : (
                <>
                  <Campo etiqueta="Cantidad" type="number" min="0" step="0.01" value={it.cantidad} onChange={(e) => cambiar(i, { cantidad: e.target.value })} />
                  <Campo etiqueta="Unidad" como="select" value={it.unidad} onChange={(e) => cambiar(i, { unidad: e.target.value })}>
                    {['m2', 'ml', 'unidad', 'bolsa', 'servicio'].map((u) => <option key={u} value={u}>{u === 'm2' ? 'm²' : u === 'ml' ? 'm lineal' : u}</option>)}
                  </Campo>
                  <span /><span />
                </>
              )}
              <Campo etiqueta={`Precio (Bs/${it.unidad === 'm2' ? 'm²' : it.unidad})`} type="number" min="0" step="0.01" value={it.precio_unit} onChange={(e) => cambiar(i, { precio_unit: e.target.value })} required />
              <div className="item-total" aria-label="Total del ítem">{formatearBs(totalItem({ ...it, cantidad: Number(it.cantidad) || 0 }))}</div>
              <button type="button" className="boton boton-icono boton-peligro" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`Quitar ítem ${i + 1}`} disabled={items.length === 1}>
                <Icono nombre="basura" />
              </button>
            </fieldset>
          )
        })}
      </div>
      <div className="fila-entre">
        <div className="fila">
          <button type="button" className="boton" onClick={() => setItems([...items, itemVacio()])}><Icono nombre="mas" /> Agregar ítem</button>
          <button type="button" className="boton" onClick={() => setItems([...items, { ...itemVacio(), tipo: 'servicio', unidad: 'ml' }])}><Icono nombre="mas" /> Servicio</button>
        </div>
        <div className="totales tarjeta">
          <ul className="lista-simple">
            <li><span>Subtotal</span><span className="num">{formatearBs(t.subtotal)}</span></li>
            <li>
              <label htmlFor="descuento">Descuento (%)</label>
              <input id="descuento" type="number" min="0" max="100" step="0.5" value={descuento} onChange={(e) => setDescuento(e.target.value)} style={{ width: 100, minHeight: 36 }} />
            </li>
            {t.descuento > 0 ? <li><span>Descuento</span><span className="num">− {formatearBs(t.descuento)}</span></li> : null}
            <li className="total-final"><span>Total</span><span className="num">{formatearBs(t.total)}</span></li>
          </ul>
          <p className="suave" style={{ fontSize: 12, margin: '6px 0 0' }}>{formatearNumero(items.reduce((s, i) => s + (['pieza', 'plancha'].includes(i.tipo) ? cantidadItem({ ...i, cantidad: Number(i.cantidad) || 0 }) : 0), 0))} m² de material</p>
        </div>
      </div>
    </div>
  )
}

/** Prepara los ítems para enviarlos a la API. */
export function itemsParaApi(items) {
  return items.map((i) => ({
    tipo: i.tipo,
    material_id: i.material_id || undefined,
    descripcion: i.descripcion,
    ancho_cm: i.ancho_cm || undefined,
    alto_cm: i.alto_cm || undefined,
    piezas: i.tipo === 'pieza' ? Number(i.piezas) || 1 : undefined,
    cantidad: Number(i.cantidad) || undefined,
    unidad: i.unidad,
    precio_unit: Number(i.precio_unit),
  }))
}
