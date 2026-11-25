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
- **Qué se hizo:** Contabilidad simple con ingresos/egresos, resultado mensual por sucursal y cuentas por cobrar (`ContabilidadView.jsx`); RRHH con sucursales, 20 trabajadores, antigüedad automática y planilla mensual (`RrhhView.jsx`).

## Etapa 6: Reportes/gráficas + panel del dueño (adminj) — COMPLETADA
- **Qué se hizo:**
  - `apps/erp/src/views/ReportesView.jsx`: Gráficas y reportes de evolución mensual de ventas (12 meses con estacionalidad), ventas por día de la semana, producto más exitoso y menos vendido, tendencias/modas nuevas (crecimiento reciente de Piedra Sinterizada vs promedio histórico), recomendación de cuánto comprar, proformas por empleado con tasa de conversión a ventas, y mermas por material y por cortador.
  - `apps/erp/src/views/AjustesView.jsx`: Gestión de usuarios y roles por el administrador + botón para reiniciar la demo.
  - `apps/erp/src/ErpApp.jsx`: Integración completa de los 9 módulos del ERP, login con selector rápido de usuarios demo y filtrado por sucursal según permisos del rol.
  - `apps/dueno/src/DuenoApp.jsx`: Panel súper simplificado de pantalla única para Don Emiliano Acero (`adminj.cerice360.com`), ingreso con PIN de 4–6 dígitos (`1954`) y teclado táctil grande, letra >= 20px, alto contraste, tarjetas **Lo que gané este mes**, **Lo que gasté**, **Lo que me queda**, **Producción de cada producto**, **Mermas**, **Qué tengo que comprar**, **Cómo van mis vendedores**, selector de mes con flechas, selector de sucursal y botón **Leer en voz alta** (Web Speech API).
- **Cómo probar:**
  - En `erpj` (`http://localhost:3030`), iniciar sesión como `nain@jerusalensrl.com` / `jerusalen2026` y recorrer todos los módulos.
  - En `adminj` (`http://localhost:3030/?app=dueno` o hostname `adminj.*`), ingresar con el PIN `1954`.
- **Qué falta:**
  - Etapa 7: Suite de pruebas automatizadas (`npm test`), actualización de `Dockerfile` y `docker-compose.yml` listos para despliegue y verificación final de `npm run build`.
