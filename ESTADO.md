ESTADO: CODIGO LISTO

# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj) · 25-11-2026

## Resumen General
Todas las etapas de desarrollo (1 a 6) y la batería de pruebas automatizadas + configuración Docker (Etapa 7 de código) están terminadas y verificadas. `npm run build` y `npm test` pasan al 100%, y el bundle gzip por aplicación es ~240 KB (< 400 KB requeridos).

---

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:**
  - Se eliminaron del repositorio el catálogo/tienda online, carrito y módulo de ganadería.
  - Se creó la estructura monorepo con `apps/erp` (`erpj.cerice360.com`), `apps/dueno` (`adminj.cerice360.com`) y componentes compartidos en `packages/ui` (`MarbleBackground` SVG 0% CPU, `MuestraPiedra`, `EtiquetaEstado`, `fmtBs`, `fmtNum`).
  - Diseño mármol/oro propio con fuentes `Cinzel` (logo), `Cormorant Garamond` (títulos), `Inter` (interfaz) e `IBM Plex Mono` (números), modo claro y modo noche, adaptable a celular y tablet.

## Etapa 2: API + BD + auth/roles + sucursales + seed — COMPLETADA
- **Qué se hizo:**
  - Backend Node + Express + SQLite (`better-sqlite3` en modo WAL) en `server.js` y `api/` (`schema.sql`, `db.js`, `auth.js`, `compute.js`, `seed.js`, `routes/erp.js`).
  - Cookies `httpOnly`, `bcryptjs`, roles (`dueno`, `administrador`, `vendedor`, `cortador`, `contador`, `rrhh`) y acceso por PIN de 4–6 dígitos (`1954`) para Don Emiliano.
  - Seed realista boliviano (Santa Cruz, Bs): 3 sucursales, 20 trabajadores (~53.000 Bs/mes en planilla), 40 materiales importados de Brasil + insumos, 12 meses de ventas con estacionalidad y moda creciente (Piedra Sinterizada), proformas con conversión variada y planchas con cortes y retazos. Reiniciable con `npm run reset`.

## Etapa 3: Proformas + ventas + PDF — COMPLETADA
- **Qué se hizo:**
  - Generador de proformas (`apps/erp/src/views/ProformasView.jsx`): cliente, ítems (plancha entera, pieza por m² o servicio de corte/colocación), descuentos, validez, PDF con marca Jerusalén S.R.L. (`src/utils/pdfProforma.js`) y envío directo por WhatsApp.
  - Estados `enviada` → `aceptada` → `convertida` en venta / `vencida` / `rechazada`.
  - Ventas (`apps/erp/src/views/VentasView.jsx`): desde proforma o directa; pagos en Efectivo, QR, Transferencia o Tarjeta; control de saldos/crédito y abonos.

## Etapa 4: Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas — COMPLETADA
- **Qué se hizo:**
  - Producción y costos por proyecto (`apps/erp/src/views/ProduccionView.jsx`): medidas (ej. 7 m × 8 m = 56 m²), material (plancha, preciosa/cola, cemento y pegamento con rendimiento en kg/m²), mano de obra (horas × costo), desperdicio % y margen % → cálculo automático de costo total y precio del servicio + producción por producto.
  - Matriz de corte de planchas (`apps/erp/src/views/MatrizCorteView.jsx`): tamaño editable (por defecto 300 × 170 cuadros = 3,00 m × 1,70 m, 1 cuadro = 1 cm), selección táctil/mouse arrastrando rectángulos para marcar **pieza vendida/usada**, **parte útil (retazo reutilizable)** o **desperdicio/merma**. Muestra m² y % de cada tipo; los retazos útiles pasan al inventario con sus medidas (y pueden volver a cortarse) y la merma alimenta reportes.
  - Inventario (`apps/erp/src/views/InventarioView.jsx`): planchas, insumos y retazos por sucursal, mínimos y lista de **Qué Tengo que Comprar** (stock bajo + tendencia de ventas).

## Etapa 5: Contabilidad + RRHH/planilla — COMPLETADA
- **Qué se hizo:**
  - Contabilidad simple (`apps/erp/src/views/ContabilidadView.jsx`): ingresos (ventas/abonos) y egresos (compras Brasil, planilla, gastos por categoría), resultado mensual consolidado y por sucursal, y cuentas por cobrar.
  - Recursos humanos (`apps/erp/src/views/RrhhView.jsx`): alta/edición de sucursales, 20 trabajadores con fecha de ingreso, cargo, sueldo, antigüedad automática y planilla mensual general y por sucursal.

## Etapa 6: Reportes/gráficas + panel del dueño (adminj) — COMPLETADA
- **Qué se hizo:**
  - Reportes y gráficas (`apps/erp/src/views/ReportesView.jsx`): productos más y menos vendidos, ventas por mes (12 meses con estacionalidad) y día de la semana, producto más y menos exitoso, tendencias/modas nuevas, recomendación de cuánto comprar, proformas por empleado con tasa de conversión a ventas, y mermas por material/cortador.
  - Usuarios y ajustes (`apps/erp/src/views/AjustesView.jsx`): gestión de cuentas/roles y reinicio de demo.
  - Panel del dueño (`apps/dueno/src/DuenoApp.jsx`): pantalla única para Don Emiliano Acero (`adminj.cerice360.com`), letra >= 20 px, alto contraste, botones enormes, ingreso con PIN (`1954`), selector de mes con flechas y de sucursal, lectura en voz alta (Web Speech API) y tarjetas: **Lo que gané este mes**, **Lo que gasté**, **Lo que me queda**, **Producción de cada producto**, **Mermas**, **Qué tengo que comprar** y **Cómo van mis vendedores**.

## Etapa 7 (Código y Pruebas): Suite de pruebas + Dockerfile y docker-compose — COMPLETADA
- **Qué se hizo:**
  - `tests/erp.test.js`: Pruebas automatizadas de cálculo de costos (7m × 8m = 56 m²), matriz de corte (300 × 170 cm), antigüedad laboral, login/PIN, permisos por rol (403 Forbidden), conversión de proforma a venta con descuento de stock y creación de retazos desde matriz de corte.
  - `Dockerfile` y `docker-compose.yml` listos para producción sirviendo Node + Express + SQLite (con volumen `/mnt/disco-lento/jerusalen:/app/data`) y el frontend compilado en el puerto `3030`.

---

## Cómo Probar
1. **Pruebas automatizadas:** `npm test`
2. **Compilar frontend:** `npm run build`
3. **Reiniciar base de datos demo:** `npm run reset`
4. **Iniciar servidor completo (API + Frontend):** `npm start`
   - **ERP (`erpj`):** `http://localhost:3030` — Usuario: `nain@jerusalensrl.com` (o `nain@demo.test`), Clave: `jerusalen2026`.
   - **Panel del Dueño (`adminj`):** `http://localhost:3030/?app=dueno` (o por dominio `adminj.cerice360.com`) — PIN: `1954`.

## Qué Falta
- Únicamente el despliegue en infraestructura/Coolify y configuración de dominios (`erpj.cerice360.com`, `adminj.cerice360.com`, `jerusalen2.cerice360.com`) a cargo de la sesión de despliegue.
