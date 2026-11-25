# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj)

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:** Limpieza de tienda online y ganadería; creación de `apps/erp`, `apps/dueno`, `packages/ui`, `.env.example` y tema mármol/oro (claro y noche).

## Etapa 2: API + BD + auth/roles + sucursales + seed — COMPLETADA
- **Qué se hizo:**
  - Base de datos SQLite con `better-sqlite3` en modo WAL (`api/db.js` y `api/schema.sql`), configurable vía `DATA_DIR` / `DB_PATH` (lista para `/mnt/disco-lento/jerusalen`).
  - Autenticación con cookies `httpOnly`, `bcryptjs`, tokens de sesión y control de permisos por rol (`dueno`, `administrador`, `vendedor`, `cortador`, `contador`, `rrhh`) + login por PIN de 4–6 dígitos (`1954`) para Don Emiliano (`api/auth.js`).
  - Motor de cálculos (`api/compute.js`) y rutas completas (`api/routes/erp.js`, `server.js`).
  - Seed realista boliviano (`api/seed.js`, reiniciable con `npm run reset`): 3 sucursales en Santa Cruz (Fábrica Km 13, Showroom 4to Anillo Piraí, Almacén Roca y Coronado), 20 trabajadores (~50.000 Bs/mes en planilla), 40 materiales importados de Brasil + insumos, 12 meses de ventas con estacionalidad y moda creciente (Piedra Sinterizada), proformas con conversión variada y planchas cortadas con retazos y mermas.
- **Cómo probar:**
  - `npm run reset` recarga la base de datos SQLite con los datos demo de Santa Cruz.
  - `npm start` levanta el servidor Express + SQLite en `http://localhost:3030` (`/api/health`, `/api/auth/login`, `/api/auth/pin`, `/api/erp/*`).
- **Qué falta:**
  - Etapa 3: Proformas + ventas + PDF en el frontend del ERP.
  - Etapa 4: Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas en el frontend.
  - Etapa 5: Contabilidad + RRHH/planilla en el frontend.
  - Etapa 6: Reportes/gráficas + panel del dueño (`adminj`) conectado a la API en vivo.
  - Etapa 7: Suite de pruebas automatizadas y `Dockerfile` + `docker-compose.yml` para producción.
