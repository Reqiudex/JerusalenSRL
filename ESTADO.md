# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj)

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:** Limpieza de tienda online y ganadería; creación de `apps/erp`, `apps/dueno`, `packages/ui`, `.env.example` y tema mármol/oro (claro y noche).

## Etapa 2: API + BD + auth/roles + sucursales + seed — COMPLETADA
- **Qué se hizo:** Base de datos SQLite en modo WAL (`api/schema.sql`, `api/db.js`), autenticación con cookies `httpOnly`, `bcryptjs`, roles y PIN para Don Emiliano (`api/auth.js`), motor de cálculos (`api/compute.js`) y seed realista de Santa Cruz (`api/seed.js`).

## Etapa 3: Proformas + ventas + PDF — COMPLETADA
- **Qué se hizo:** Generador de proformas (`ProformasView.jsx`), conversión a ventas, pagos/saldos (`VentasView.jsx`), PDF con marca Jerusalén S.R.L. y envío por WhatsApp (`src/utils/pdfProforma.js`).

## Etapa 4: Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas — COMPLETADA
- **Qué se hizo:** Calculadora de producción y costos por proyecto (`ProduccionView.jsx`), matriz de corte visual interactiva con soporte táctil en tablet (`MatrizCorteView.jsx`) e inventario con retazos y lista de qué comprar (`InventarioView.jsx`).

## Etapa 5: Contabilidad + RRHH/planilla — COMPLETADA
- **Qué se hizo:**
  - `apps/erp/src/views/ContabilidadView.jsx`: Ingresos (ventas y cobros) y egresos (compras de planchas en Brasil, planilla, insumos/discos, servicios), resultado mensual consolidado y desglosado por cada una de las 3 sucursales, libro de movimientos y cuentas por cobrar.
  - `apps/erp/src/views/RrhhView.jsx`: Gestión de sucursales/fábricas (alta y edición), nómina de 20 trabajadores por sucursal con fecha de ingreso, cargo, haber básico, cálculo automático de antigüedad y bono de antigüedad, y planilla mensual general y por sucursal (~53.000 Bs/mes).
- **Cómo probar:**
  - En el ERP (`erpj`), abrir **Contabilidad Simple** (cambiar mes o registrar gasto/ingreso) y **RRHH y Planilla** (ver planilla por sucursal, editar sede o incorporar trabajador).
- **Qué falta:**
  - Etapa 6: Reportes/gráficas + panel del dueño (`adminj`) e integración completa de vistas en `ErpApp.jsx`.
  - Etapa 7: Pruebas automatizadas y `Dockerfile` / `docker-compose.yml`.
