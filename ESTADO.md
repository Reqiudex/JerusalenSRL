# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj)

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:** Limpieza de tienda online y ganadería; creación de `apps/erp`, `apps/dueno`, `packages/ui`, `.env.example` y tema mármol/oro (claro y noche).

## Etapa 2: API + BD + auth/roles + sucursales + seed — COMPLETADA
- **Qué se hizo:** Base de datos SQLite en modo WAL (`api/schema.sql`, `api/db.js`), autenticación con cookies `httpOnly`, `bcryptjs`, roles y PIN para Don Emiliano (`api/auth.js`), motor de cálculos (`api/compute.js`) y seed realista de Santa Cruz (`api/seed.js`).

## Etapa 3: Proformas + ventas + PDF — COMPLETADA
- **Qué se hizo:**
  - `apps/erp/src/views/ProformasView.jsx`: Generador completo de proformas de venta (cliente frecuente o nuevo, ítems por plancha entera, pieza por m² con largo × ancho automático o servicio de corte/colocación, descuento %, validez en días, registro del vendedor y sucursal).
  - Flujo de estados: `enviada` → `aceptada` → `convertida` en venta (con descuento automático de stock y asiento contable) / `vencida` / `rechazada`.
  - `src/utils/pdfProforma.js`: Generación de PDF oficial con marca Jerusalén S.R.L. (`jsPDF` + `jspdf-autotable`) y botón de envío directo por WhatsApp con el desglose formateado.
  - `apps/erp/src/views/VentasView.jsx`: Ventas originadas desde proforma o venta directa en taller/showroom, pagos por Efectivo, QR, Transferencia o Tarjeta, control de saldos/crédito y registro de abonos posteriores.
- **Cómo probar:**
  - Entrar a la sección **Proformas de Venta** o **Ventas y Cobros** en el ERP (`erpj`), crear una proforma, descargar el PDF con marca, abrir el enlace de WhatsApp o convertirla en venta con pago total o parcial.
- **Qué falta:**
  - Etapa 4: Producción/costos por proyecto + matriz de corte interactiva + inventario/retazos/mermas.
  - Etapa 5: Contabilidad simple + RRHH/planilla mensual.
  - Etapa 6: Reportes/gráficas + integración completa del panel del dueño (`adminj`).
  - Etapa 7: Pruebas automatizadas y `Dockerfile` / `docker-compose.yml`.
