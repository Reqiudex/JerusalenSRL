import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Generates official PDF invoice for customer in Bolivia
 */
export function generateInvoicePDF(saleData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header Colors & Logo area
  doc.setFillColor(18, 20, 26);
  doc.rect(0, 0, 210, 36, 'F');

  // Title & Company Name
  doc.setTextColor(243, 229, 171); // Gold tint
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('JERUSALEN S.R.L.', 15, 16);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220);
  doc.text('STONE TECH CENTER | Mármol, Granito, Cuarzo y Piedra Sinterizada', 15, 23);
  doc.text('Casa Matriz: Km 13 Doble Vía La Guardia • Santa Cruz, Bolivia', 15, 29);

  // Invoice Box
  doc.setFillColor(245, 245, 248);
  doc.roundedRect(140, 8, 55, 22, 3, 3, 'F');
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FACTURA COMERCIAL', 144, 15);
  doc.setFontSize(9);
  doc.setTextColor(170, 130, 10);
  doc.text(`N° ${saleData.invoiceNumber || 'FAC-2026-001'}`, 144, 21);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`NIT: 389421029`, 144, 26);

  // Client Details Section
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('DATOS DEL CLIENTE Y OPERACIÓN:', 15, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  doc.text(`Cliente / Razón Social: ${saleData.clientName || 'Cliente Particular'}`, 15, 53);
  doc.text(`NIT / C.I.: ${saleData.clientNit || 'S/N'}`, 15, 59);
  doc.text(`Teléfono / Contacto: ${saleData.clientPhone || 'No registrado'}`, 15, 65);

  doc.text(`Fecha y Hora: ${saleData.dateTime || new Date().toLocaleString()}`, 120, 53);
  doc.text(`Cajero / Operador: ${saleData.cashierName || 'Cajero 1'}`, 120, 59);
  doc.text(`Método de Pago: ${saleData.paymentMethod || 'Efectivo'}`, 120, 65);
  doc.text(`Punto de Venta: Showroom 4to Anillo SCZ`, 120, 71);

  // Items Table
  const tableRows = (saleData.items || []).map((item, index) => [
    index + 1,
    `${item.name}\nDim: ${item.dimensions || 'Estándar'} | Espesor: ${item.thickness || '20mm'}\nOrigen: Brasil 🇧🇷`,
    item.quantity,
    `$${Number(item.priceUsd).toLocaleString()} USD`,
    `Bs. ${Number(item.priceBs).toLocaleString()}`,
    `$${(item.quantity * item.priceUsd).toLocaleString()} USD\n(Bs. ${(item.quantity * item.priceBs).toLocaleString()})`
  ]);

  doc.autoTable({
    startY: 77,
    head: [['#', 'Descripción de la Plancha / Material', 'Cant.', 'P. Unit (USD)', 'P. Unit (Bs)', 'Subtotal']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 20, 26],
      textColor: [243, 229, 171],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 85 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // Totals Box
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(120, finalY, 75, 28, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(`TOTAL USD:`, 125, finalY + 8);
  doc.setTextColor(170, 130, 10);
  doc.text(`$${Number(saleData.totalUsd).toLocaleString()} USD`, 160, finalY + 8);

  doc.setTextColor(30, 30, 30);
  doc.text(`TOTAL BS:`, 125, finalY + 16);
  doc.setTextColor(20, 120, 40);
  doc.text(`Bs. ${Number(saleData.totalBs).toLocaleString()}`, 160, finalY + 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`(Tipo de Cambio Oficial: 6.96 Bs/USD)`, 125, finalY + 23);

  // Legal and Warranty text
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text('CONDICIONES DE VENTA Y GARANTÍA:', 15, finalY + 6);
  doc.text('1. El cliente inspeccionó la plancha en almacén libre de fracturas antes de su despacho.', 15, finalY + 11);
  doc.text('2. Mármoles y granitos naturales presentan variaciones propias de la naturaleza mineral de las canteras de Brasil.', 15, finalY + 16);
  doc.text('3. Para servicio de corte especializado o instalación en obra contactar a: +591 70314442.', 15, finalY + 21);

  // Footer
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 275, 195, 275);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Jerusalén S.R.L. - Sistema de Facturación & Control POS - Santa Cruz, Bolivia', 15, 280);

  doc.save(`Factura_Jerusalen_${saleData.invoiceNumber || '001'}.pdf`);
}

/**
 * Generates Stock and Purchases PDF Report for Admin
 */
export function generatePurchasesReportPDF(products, importOrders) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFillColor(18, 20, 26);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(243, 229, 171);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('JERUSALEN S.R.L. - REPORTE DE COMPRAS Y STOCK', 15, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 220, 220);
  doc.text(`Informe Oficial de Almacén e Importaciones desde Brasil | Emitido: ${new Date().toLocaleDateString()}`, 15, 24);

  // Section 1: Physical Stock
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('1. INVENTARIO FÍSICO DISPONIBLE (POR PIEZA):', 15, 42);

  const stockRows = products.map((p, i) => [
    p.id,
    p.name,
    p.origin,
    p.dimensions,
    `$${p.costPerPieceUsd} USD`,
    `$${p.pricePerPieceUsd} USD`,
    `${p.piecesInStock} planchas`,
    p.piecesInStock <= p.minAlertStock ? 'ALERTA REPOSICIÓN' : 'NORMAL'
  ]);

  doc.autoTable({
    startY: 47,
    head: [['Cód', 'Material', 'Origen', 'Dim.', 'Costo FOB', 'PVP', 'Stock', 'Estado']],
    body: stockRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 35, 45], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 }
  });

  // Section 2: Brazil Import Orders
  const nextY = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('2. ÓRDENES DE IMPORTACIÓN EN TRÁNSITO (BRASIL → BOLIVIA):', 15, nextY);

  const importRows = importOrders.map(o => [
    o.id,
    o.supplier,
    o.material,
    `${o.pieces} pzas`,
    `$${o.totalFOBUsd.toLocaleString()} USD`,
    `$${o.freightAndCustomsUsd.toLocaleString()} USD`,
    `$${o.totalLandedUsd.toLocaleString()} USD`,
    o.status
  ]);

  doc.autoTable({
    startY: nextY + 5,
    head: [['ID Orden', 'Cantera Proveedor', 'Material', 'Cant.', 'FOB', 'Flete/Aduana', 'Total Landed', 'Estado Logístico']],
    body: importRows,
    theme: 'grid',
    headStyles: { fillColor: [170, 130, 10], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7 }
  });

  doc.save(`Reporte_Compras_Stock_Jerusalen_${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Exports current stock and purchases data to Microsoft Excel (.xlsx)
 */
export function exportToExcel(products, importOrders) {
  // Sheet 1: Stock
  const stockData = products.map(p => ({
    'Código': p.id,
    'Nombre del Material': p.name,
    'Categoría': p.category,
    'Acabado': p.finish,
    'Origen en Brasil': p.origin,
    'Dimensiones': p.dimensions,
    'Espesor': p.thickness,
    'Costo FOB (USD)': p.costPerPieceUsd,
    'Precio Venta (USD)': p.pricePerPieceUsd,
    'Precio Venta (Bs)': p.pricePerPieceBs,
    'Planchas en Stock': p.piecesInStock,
    'Stock Mínimo': p.minAlertStock,
    'Alerta': p.piecesInStock <= p.minAlertStock ? 'REPONER URGENTE' : 'ÓPTIMO'
  }));

  // Sheet 2: Import Orders
  const importsData = importOrders.map(o => ({
    'ID Orden': o.id,
    'Proveedor / Cantera': o.supplier,
    'Ruta Logística': o.cargoPort,
    'Transporte': o.transportType,
    'Material': o.material,
    'Cantidad Planchas': o.pieces,
    'M2 Estimados': o.totalAreaM2,
    'Costo FOB Total (USD)': o.totalFOBUsd,
    'Flete y Aduana (USD)': o.freightAndCustomsUsd,
    'Costo Puesto SCZ (USD)': o.totalLandedUsd,
    'Fecha Salida': o.departureDate,
    'Fecha Llegada Estimada': o.estimatedArrival,
    'Estado': o.status,
    'Código Rastreo': o.trackingCode,
    'Notas': o.notes
  }));

  const wb = XLSX.utils.book_new();
  const wsStock = XLSX.utils.json_to_sheet(stockData);
  const wsImports = XLSX.utils.json_to_sheet(importsData);

  XLSX.utils.book_append_sheet(wb, wsStock, 'Inventario Planchas');
  XLSX.utils.book_append_sheet(wb, wsImports, 'Importaciones Brasil');

  XLSX.writeFile(wb, `Jerusalen_SRL_Inventario_Compras_${new Date().toISOString().split('T')[0]}.xlsx`);
}
