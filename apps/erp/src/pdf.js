// PDF de proformas con la marca (jsPDF se carga solo al generar el PDF).
import { cantidadItem, calcularTotales, fechaVencimiento } from '@reportes/proformas.js'
import { formatearBs, formatearFecha, formatearNumero } from '@ui/formatos.js'

export async function generarPdfProforma(p, empresa = {}, condiciones = '') {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const oro = [156, 125, 67]
  const granito = [28, 28, 30]

  // Encabezado con franja de granito y filete dorado
  doc.setFillColor(...granito)
  doc.rect(0, 0, ancho, 30, 'F')
  doc.setFillColor(...oro)
  doc.rect(0, 30, ancho, 1.2, 'F')
  doc.setDrawColor(...oro)
  doc.setLineWidth(0.6)
  doc.rect(14, 8, 14, 14)
  doc.setTextColor(201, 168, 106)
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.text('J', 21, 18, { align: 'center' })
  doc.setFontSize(18)
  doc.text((empresa.nombre ?? 'Jerusalén S.R.L.').toUpperCase(), 33, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(220, 214, 200)
  doc.text(empresa.lema ?? 'Mármol · Granito · Cuarzo · Piedra sinterizada', 33, 21)
  doc.text([empresa.direccion, [empresa.telefono && `Tel. ${empresa.telefono}`, empresa.whatsapp && `WhatsApp ${empresa.whatsapp}`].filter(Boolean).join(' · '), empresa.nit && `NIT ${empresa.nit}`].filter(Boolean), ancho - 14, 11, { align: 'right' })

  // Datos de la proforma
  doc.setTextColor(...granito)
  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.text('PROFORMA', 14, 44)
  doc.setFont('courier', 'bold')
  doc.setFontSize(11)
  doc.text(p.codigo, 14, 50)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const filas = [
    ['Cliente', p.cliente], ['Teléfono', p.cliente_telefono || '—'], ['NIT / CI', p.cliente_nit || '—'],
  ]
  const filas2 = [['Fecha', formatearFecha(p.fecha)], ['Válida hasta', formatearFecha(fechaVencimiento(p))], ['Atendido por', p.vendedor]]
  filas.forEach(([k, v], i) => {
    doc.setTextColor(110, 110, 110)
    doc.text(k, 70, 42 + i * 5)
    doc.setTextColor(...granito)
    doc.text(String(v ?? ''), 92, 42 + i * 5)
  })
  filas2.forEach(([k, v], i) => {
    doc.setTextColor(110, 110, 110)
    doc.text(k, 145, 42 + i * 5)
    doc.setTextColor(...granito)
    doc.text(String(v ?? ''), ancho - 14, 42 + i * 5, { align: 'right' })
  })

  const unidad = (u) => ({ m2: 'm²', ml: 'm', unidad: 'unid.', servicio: 'serv.', bolsa: 'bolsa' })[u] ?? u
  autoTable(doc, {
    startY: 60,
    head: [['#', 'Descripción', 'Medidas', 'Cantidad', 'Precio unit.', 'Total']],
    body: p.items.map((i, k) => [
      k + 1,
      i.descripcion,
      i.ancho_cm && i.alto_cm ? `${formatearNumero(i.ancho_cm, 0)} × ${formatearNumero(i.alto_cm, 0)} cm${i.piezas > 1 ? ` × ${i.piezas}` : ''}` : '',
      `${formatearNumero(cantidadItem(i))} ${unidad(i.unidad)}`,
      formatearBs(i.precio_unit),
      formatearBs(i.total),
    ]),
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.2, textColor: granito, lineColor: [226, 221, 212], lineWidth: 0.1 },
    headStyles: { fillColor: granito, textColor: [232, 211, 162], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [247, 245, 241] },
    columnStyles: { 0: { cellWidth: 8 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  const t = calcularTotales(p.items, p.descuento_pct)
  let y = doc.lastAutoTable.finalY + 6
  const linea = (k, v, negrita) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(negrita ? 12 : 10)
    doc.text(k, ancho - 70, y)
    doc.text(v, ancho - 14, y, { align: 'right' })
    y += negrita ? 7 : 5.5
  }
  linea('Subtotal', formatearBs(t.subtotal))
  if (t.descuento > 0) linea(`Descuento (${formatearNumero(t.descuentoPct, 1)} %)`, `− ${formatearBs(t.descuento)}`)
  doc.setDrawColor(...oro)
  doc.line(ancho - 70, y - 3, ancho - 14, y - 3)
  y += 1
  linea('TOTAL', formatearBs(t.total), true)

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(90, 90, 90)
  const notas = [p.notas, condiciones].filter(Boolean).join('\n\n')
  if (notas) doc.text(doc.splitTextToSize(notas, ancho - 28), 14, y)

  // Pie
  const alto = doc.internal.pageSize.getHeight()
  doc.setFillColor(...oro)
  doc.rect(0, alto - 10, ancho, 0.8, 'F')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(`${empresa.nombre ?? 'Jerusalén S.R.L.'} · Proforma ${p.codigo} · No es factura`, ancho / 2, alto - 5, { align: 'center' })

  doc.save(`${p.codigo}.pdf`)
}
