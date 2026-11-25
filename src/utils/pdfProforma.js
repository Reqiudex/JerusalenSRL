import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Genera el PDF con marca oficial de Jerusalén S.R.L. para Proforma o Nota de Venta
 */
export function generarProformaPDF(proforma, tipoDoc = 'PROFORMA DE VENTA') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cabecera Granito & Oro
  doc.setFillColor(28, 28, 30);
  doc.rect(0, 0, 210, 38, 'F');

  // Filete dorado
  doc.setFillColor(201, 168, 106);
  doc.rect(0, 38, 210, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('JERUSALEN S.R.L.', 15, 16);

  doc.setTextColor(201, 168, 106);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('Marmol, Granito, Cuarzo y Piedra Sinterizada · Importado de Brasil', 15, 23);

  doc.setTextColor(210, 210, 210);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Fabrica Km 13 Doble Via La Guardia · Showroom 4to Anillo Av. Pirai · Santa Cruz, Bolivia', 15, 29);
  doc.text('NIT: 389421029 · Tel / WhatsApp: +591 70314442', 15, 34);

  // Recuadro del documento
  doc.setFillColor(245, 243, 239);
  doc.roundedRect(138, 7, 57, 25, 2, 2, 'F');
  doc.setTextColor(28, 28, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(tipoDoc, 142, 14);
  doc.setTextColor(156, 125, 67);
  doc.setFontSize(11);
  doc.text(String(proforma.codigo || 'PRF-26-0001'), 142, 21);
  doc.setTextColor(90, 90, 90);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Fecha: ${proforma.fecha || ''}`, 142, 27);

  // Datos del cliente y vendedor
  doc.setTextColor(28, 28, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DATOS DEL CLIENTE Y COTIZACION', 15, 49);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 55, 55);
  doc.text(`Cliente: ${proforma.cliente_nombre || 'Cliente Particular'}`, 15, 56);
  doc.text(`NIT / C.I.: ${proforma.cliente_nit || 'S/N'}`, 15, 62);
  doc.text(`Telefono: ${proforma.cliente_telefono || 'No registrado'}`, 15, 68);

  doc.text(`Asesor / Vendedor: ${proforma.vendedor_nombre || 'Nain Torrico'}`, 120, 56);
  doc.text(`Sucursal: ${proforma.sucursal_nombre || 'Santa Cruz'}`, 120, 62);
  if (proforma.fecha_vencimiento) {
    doc.text(`Validez: ${proforma.validez_dias || 15} dias (vence ${proforma.fecha_vencimiento})`, 120, 68);
  } else {
    doc.text(`Metodo de pago: ${proforma.metodo_pago || 'Efectivo'}`, 120, 68);
  }

  const items = Array.isArray(proforma.items) ? proforma.items : [];
  const filas = items.map((it, idx) => [
    idx + 1,
    it.descripcion || 'Material / Servicio',
    it.tipo_item === 'plancha' ? 'Plancha' : it.tipo_item === 'corte_colocacion' ? 'Corte/Coloc.' : 'Pieza m²',
    Number(it.cantidad || 1).toFixed(2),
    `Bs ${Number(it.precio_unit_bs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
    `Bs ${Number(it.subtotal_bs || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}`,
  ]);

  const tableFn = typeof doc.autoTable === 'function' ? doc.autoTable.bind(doc) : (opts) => autoTable(doc, opts);
  tableFn({
    startY: 75,
    head: [['#', 'Descripcion de Material / Servicio', 'Tipo', 'Cant./m²', 'P. Unitario', 'Subtotal']],
    body: filas,
    theme: 'grid',
    headStyles: {
      fillColor: [28, 28, 30],
      textColor: [241, 232, 214],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 82 },
      2: { cellWidth: 25, halign: 'center' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 26, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
  });

  const finalY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 135) + 8;

  // Totales
  doc.setFillColor(245, 243, 239);
  doc.roundedRect(122, finalY, 73, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const sub = Number(proforma.subtotal_bs ?? proforma.total_bs ?? 0);
  const desc = Number(proforma.descuento_bs ?? 0);
  const tot = Number(proforma.total_bs ?? 0);

  doc.text('Subtotal:', 126, finalY + 7);
  doc.text(`Bs ${sub.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 191, finalY + 7, { align: 'right' });

  doc.text(`Descuento (${proforma.descuento_pct || 0}%):`, 126, finalY + 14);
  doc.text(`- Bs ${desc.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 191, finalY + 14, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(28, 28, 30);
  doc.text('TOTAL BS:', 126, finalY + 23);
  doc.setTextColor(47, 125, 91);
  doc.text(`Bs ${tot.toLocaleString('es-BO', { minimumFractionDigits: 2 })}`, 191, finalY + 23, { align: 'right' });

  // Notas y condiciones
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(28, 28, 30);
  doc.text('OBSERVACIONES Y CONDICIONES:', 15, finalY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(String(proforma.notas || 'Entrega e instalacion coordinada en taller/obra.'), 15, finalY + 12, { maxWidth: 100 });
  doc.text('• Marmoles y granitos naturales pueden presentar variaciones propias de cantera.', 15, finalY + 22);
  doc.text('• Anticipo del 50% al confirmar corte en taller y 50% contra entrega.', 15, finalY + 27);

  // Pie de página
  doc.setDrawColor(210, 205, 195);
  doc.line(15, 276, 195, 276);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Jerusalen S.R.L. · Marmoleria y Taller de Corte · Santa Cruz de la Sierra, Bolivia', 15, 282);

  doc.save(`${proforma.codigo || 'Documento'}_JerusalenSRL.pdf`);
}

/**
 * Genera enlace de envío directo por WhatsApp con el desglose de la proforma
 */
export function enlaceWhatsAppProforma(proforma) {
  const telLimpio = String(proforma.cliente_telefono || '59170314442').replace(/[^0-9]/g, '');
  const telefono = telLimpio.startsWith('591') ? telLimpio : `591${telLimpio}`;
  const itemsTexto = (proforma.items || [])
    .map(it => `• ${it.descripcion}: ${it.cantidad} (${it.tipo_item}) = Bs ${Number(it.subtotal_bs).toLocaleString('es-BO')}`)
    .join('\n');

  const mensaje = [
    `*JERUSALÉN S.R.L. · MARMOLERÍA*`,
    `Proforma: *${proforma.codigo}*`,
    `Cliente: ${proforma.cliente_nombre}`,
    `Fecha: ${proforma.fecha} (Válida por ${proforma.validez_dias || 15} días)`,
    ``,
    `*Detalle:*`,
    itemsTexto,
    ``,
    `*TOTAL: Bs ${Number(proforma.total_bs).toLocaleString('es-BO', { minimumFractionDigits: 2 })}*`,
    `Atendido por: ${proforma.vendedor_nombre}`,
  ].join('\n');

  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}
