# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj)

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:** Limpieza de tienda online y ganadería; creación de `apps/erp`, `apps/dueno`, `packages/ui`, `.env.example` y tema mármol/oro (claro y noche).

## Etapa 2: API + BD + auth/roles + sucursales + seed — COMPLETADA
- **Qué se hizo:** Base de datos SQLite en modo WAL (`api/schema.sql`, `api/db.js`), autenticación con cookies `httpOnly`, `bcryptjs`, roles y PIN para Don Emiliano (`api/auth.js`), motor de cálculos (`api/compute.js`) y seed realista de Santa Cruz (`api/seed.js`).

## Etapa 3: Proformas + ventas + PDF — COMPLETADA
- **Qué se hizo:** Generador de proformas (`ProformasView.jsx`), conversión a ventas, pagos/saldos (`VentasView.jsx`), PDF con marca Jerusalén S.R.L. y envío por WhatsApp (`src/utils/pdfProforma.js`).

## Etapa 4: Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas — COMPLETADA
- **Qué se hizo:**
  - `apps/erp/src/views/ProduccionView.jsx`: Calculadora técnica de producción y costos por proyecto (medidas largo × ancho como 7 m × 8 m = 56 m², piedra/plancha, preciosa/cola, cemento y pegamento con rendimiento en kg/m², mano de obra horas × costo, desperdicio % y margen % → cálculo automático del costo total y precio del servicio) + tabla de producción por producto (m² cortados/colocados).
  - `apps/erp/src/views/MatrizCorteView.jsx`: Matriz de corte visual de planchas (por defecto 300 × 170 cuadros = 3,00 m × 1,70 m, 1 cuadro = 1 cm, editable). Soporta arrastrar con mouse o dedo en tablet (`onPointerDown` / `onPointerMove` / `onPointerUp`, `touch-action: none`) para marcar rectángulos como **pieza vendida/usada**, **parte útil (retazo reutilizable)** o **desperdicio/merma**. Muestra m² y % de cada tipo; al guardar, los retazos útiles ingresan al inventario con sus medidas (y pueden volver a cargarse en la mesa de corte) y la merma alimenta los reportes.
  - `apps/erp/src/views/InventarioView.jsx`: Inventario de planchas, insumos y retazos por sucursal, control de mínimos y pestaña **Qué Tengo que Comprar** (combina stock bajo + tendencia de ventas en alza).
- **Cómo probar:**
  - En el ERP (`erpj`), abrir **Producción y Costos**, **Matriz de Corte** (arrastrar rectángulos sobre la cuadrícula y guardar corte) e **Inventario y Compras**.
- **Qué falta:**
  - Etapa 5: Contabilidad simple + RRHH/planilla mensual.
  - Etapa 6: Reportes/gráficas + panel del dueño (`adminj`) completo.
  - Etapa 7: Pruebas automatizadas y `Dockerfile` / `docker-compose.yml`.
