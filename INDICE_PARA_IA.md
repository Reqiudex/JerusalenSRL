# Índice para IAs (y personas) que continúen este proyecto

Lee esto antes de tocar el código. Está pensado para encontrar rápido dónde está cada cosa.

## Reglas del proyecto (de `PEDIDO.md`)

- **Idioma:** todo en español: interfaz, nombres de variables y funciones, comentarios, mensajes de error y documentos.
- **Dependencias:** sin dependencias pesadas.
  - Servidor: express, better-sqlite3, bcryptjs y cookie-parser.
  - Front: react y react-dom; jsPDF y jspdf-autotable solo para el PDF.
  - Gráficos: SVG propio en `packages/ui/src/graficos.jsx`.
- **Sin secretos** en el repo (solo `.env.example`) y **sin `push --force`**.
- **Fuera de alcance:** no tocar otras apps, otras bases de datos ni el túnel del servidor; de eso se encarga la sesión de infraestructura.
- **Lógica de negocio:** va en `packages/reportes` (funciones puras) para que la usen la API y el front por igual.

## Mapa del repositorio

```
jerusalen-erp/
├── package.json            npm workspaces + scripts (dev:api, dev:erp, dev:dueno, build, start, test, demo:reiniciar)
├── vitest.config.js        pruebas de todo el monorepo (alias @ui, @reportes, @matriz)
├── .env.example            variables (PORT, DATA_DIR, FECHA_HOY, COOKIE_SEGURA, CLAVE_DEMO, PIN_DEMO…)
├── Dockerfile · docker-compose.yml · despliegue/nginx-jerusalen.conf
├── README.md · CAMBIOS.md · ESTADO.md · PROMPT_MEJORADO.md · INDICE_PARA_IA.md (este archivo)
├── docs/API.md · docs/DESPLIEGUE.md
├── apps/
│   ├── api/                Node + Express + SQLite (ESM)
│   ├── erp/                React + Vite: erpj.cerice360.com
│   └── dueno/              React + Vite: adminj.cerice360.com
└── packages/
    ├── reportes/           cálculos puros (costos, proformas, planilla, reportes, fechas)
    ├── ui/                 tema CSS, formatos Bs, gráficos SVG y fondo de mármol
    └── matriz-corte/       componente MatrizCorte + geometría pura
```

### `apps/api/src`

| Archivo | Qué hace |
|---|---|
| `servidor.js` | Punto de entrada: abre la base, carga la demo si está vacía y escucha en `PORT`. |
| `app.js` | `crearApp(db)`: middlewares (seguridad, CSRF por JSON, sesión), rutas, archivos estáticos (`/` ERP, `/dueno/` y `adminj.*` panel) y errores. |
| `config.js` | Lee el `.env` y las variables. `hoy()` devuelve la fecha de Bolivia o `FECHA_HOY`. |
| `db.js` | `abrirBD()` en modo WAL y crea el esquema. `leerAjuste` y `guardarAjuste` (JSON). |
| `esquema.sql` | **Todas las tablas** (sucursales, usuarios, sesiones, trabajadores, clientes, materiales, existencias, movimientos, planchas, plancha_cortes, plancha_historial, retazos, proformas, proforma_items, ventas, venta_items, pagos, proyectos, egresos, planillas, ajustes y bitacora). |
| `auth.js` | Ingreso con clave y con PIN, sesiones, límite de intentos y los middlewares `exigir(modulo, accion)` y `filtroVendedor`. |
| `permisos.js` | **Matriz rol × módulo.** Para dar o quitar acceso, se cambia aquí. |
| `util.js` | `ErrorHttp`, `validar()` (reglas de campos), `siguienteCodigo` (PRO-2026-0001), `aCSV`, `registrar` (bitácora). |
| `servicios.js` | Operaciones compartidas: `normalizarItems`, `crearVenta`, `registrarPago`, `moverStock`, `guardarCortes` (matriz → retazos, estado, historial). |
| `consultas.js` | Lecturas para reportes: `lineasVendidas`, `ventasRango`, `proformasRango`, `cortesRango`, `egresosPorCategoria`, `cobrado`, `porCobrar`. |
| `rutas/base.js` | Sucursales, usuarios, clientes, ajustes y bitácora. |
| `rutas/comercial.js` | Proformas (estados, conversión, duplicar, `marcarVencidas`), ventas, pagos y anulación. |
| `rutas/inventario.js` | Materiales, existencias, movimientos, planchas, `/planchas/:id/cortes`, retazos y `listaCompras`. |
| `rutas/gestion.js` | Proyectos (costos), producción, egresos, resultado contable, cobranzas, libro CSV, trabajadores y planillas. |
| `rutas/reportes.js` | `/reportes`, `/panel` y `/dueno/resumen` (`resumenDueno`). |
| `semilla.js` | **Datos demo deterministas** (generador con semilla 2026). `node src/semilla.js --reiniciar`. |
| `clave.js` | Cambiar la clave o el PIN desde la terminal. |
| `../test/api.test.js` | Prueba de punta a punta con la base en memoria: permisos, ciclo proforma → venta → pago, cortes, inventario, planilla y reportes. |

### `apps/erp/src`

| Archivo | Qué hace |
|---|---|
| `App.jsx` | Armazón: sesión, menú lateral según permisos (`MODULOS`), tema, avisos y carga diferida de páginas. **Para agregar un módulo**: una entrada en `MODULOS`, más el permiso en `permisos.js`. |
| `componentes.jsx` | Contexto (`useApp`, `usePuede`), ruta por hash (`useRuta`, `ir`), `useDatos`, `useAccion`, íconos SVG, `Modal`, `Campo`, `Tabla`, `Estado`, `Kpi`, `Pestanas`, `SelectorSucursal`, `SelectorCliente` y `Confirmar`. |
| `api.js` | `api.get/post/put/del`, `consulta()` y `descargar()`. |
| `editorItems.jsx` | Editor de ítems con totales en vivo (`calcularTotales` del paquete reportes). |
| `pdf.js` | PDF de la proforma con la marca (jsPDF se carga solo al usarlo). |
| `erp.css` | Distribución propia del ERP. El tema base está en `packages/ui/src/tema.css`. |
| `paginas/Ingresar.jsx` | Ingreso, con la lista de usuarios demo. |
| `paginas/Inicio.jsx` | KPIs del mes, ventas de 12 meses, proformas por vencer y compras. |
| `paginas/Proformas.jsx` | Lista, editor (nueva o editar), detalle con PDF, WhatsApp, estados y conversión. |
| `paginas/Ventas.jsx` | Lista con saldo, venta directa y detalle con pagos y anulación. |
| `paginas/Clientes.jsx` | Búsqueda, alta y ficha (ventas, proformas, WhatsApp). |
| `paginas/Proyectos.jsx` | Calculadora de costos y pestaña de producción. |
| `paginas/Planchas.jsx` | Lista de planchas, matriz de corte conectada a la API e historial de versiones. |
| `paginas/Inventario.jsx` | Existencias, qué comprar (con CSV), retazos, movimientos y materiales. |
| `paginas/Contabilidad.jsx` | Resultado (gráfico de ingresos contra egresos), egresos, por cobrar y libro CSV. |
| `paginas/RRHH.jsx` | Personal, planilla (cerrar, CSV, imprimir) y sucursales. |
| `paginas/Reportes.jsx` | Todos los gráficos y tablas de reportes. |
| `paginas/Ajustes.jsx` | Usuarios, empresa y PDF, planilla, bitácora y mi cuenta. |

### `apps/dueno/src`

Ver [`apps/dueno/README.md`](apps/dueno/README.md): `App.jsx` (PIN y panel), `calculos.js` (textos de voz), `datosDemo.js` (modo demo) y `dueno.css`.

### `packages/`

| Archivo | Qué hace |
|---|---|
| `reportes/src/costos.js` | `calcularCostoProyecto` (margen sobre el precio) e `INSUMOS_TIPICOS`. |
| `reportes/src/proformas.js` | `cantidadItem`, `calcularTotales`, `transicionPermitida`, `estaVencida`, `saldoVenta` (`estadoPago`), `textoWhatsApp`, `enlaceWhatsApp`. |
| `reportes/src/planilla.js` | `antiguedad`, escala del bono de antigüedad, `lineaPlanilla`, `calcularPlanilla`. |
| `reportes/src/reportes.js` | `rankingProductos`, `productoMasYMenosExitoso`, `ventasPorMes`, `ventasPorDiaSemana`, `indiceEstacional`, `tendencias`, `recomendacionCompra`, `conversionPorVendedor`, `mermasPor`, `produccionPorProducto`. |
| `reportes/src/util.js` | Fechas en UTC, meses, `r2`. |
| `ui/src/tema.css` | Variables mármol/oro, modo noche `[data-tema='noche']` y componentes base (botones, tarjetas, tablas, insignias, modal, gráficos). |
| `ui/src/formatos.js` | `formatearBs`, `formatearNumero` (coma decimal), `formatearFecha`, `formatearMes`, `bsParaVoz`. |
| `ui/src/graficos.jsx` | `Columnas` (1 o 2 series, tooltip y botón «Ver tabla») y `BarrasH`. Colores `--serie-1` y `--serie-2` validados para daltonismo. |
| `matriz-corte/src/*` | `MatrizCorte.jsx`, `geometria.js` (validación usada también por la API), `dibujo.js` (canvas), `api.js`. |

## Dónde tocar para cambios típicos

| Quiero… | Archivo(s) |
|---|---|
| Cambiar quién ve qué | `apps/api/src/permisos.js` (el menú del ERP se arma solo con esos permisos). |
| Agregar un campo a una tabla | `esquema.sql` (y una migración `ALTER TABLE` si la base ya existe), las reglas `validar` en la ruta y el formulario de la página. |
| Cambiar la fórmula de costos o de la planilla | `packages/reportes/src/costos.js` y `planilla.js`, con sus pruebas en `packages/reportes/test`. |
| Cambiar el diseño o los colores | `packages/ui/src/tema.css` (las variables de los dos modos). Si cambian los colores de las series, hay que validarlos. |
| Cambiar el PDF | `apps/erp/src/pdf.js`. Los datos de la empresa se editan en Ajustes. |
| Agregar un indicador al panel del dueño | `resumenDueno` en `apps/api/src/rutas/reportes.js`, la tarjeta en `apps/dueno/src/App.jsx`, el texto de voz en `calculos.js` y `datosDemo.js`. |
| Empezar con datos reales | Base nueva con `SEMBRAR_DEMO=0`, `ADMIN_EMAIL` y `ADMIN_CLAVE` (sin `FECHA_HOY`). Crea la sucursal y el administrador, sin la demo (ver `servidor.js`). |

## Convenciones

- **Rutas de la API:** devuelven la entidad completa después de crear o editar, para que el front no tenga que volver a pedirla.
- **Validación:** siempre en el servidor con `validar()`, y las consultas con parámetros (`?`).
- **Códigos:** `PRO-AAAA-0001`, `VEN-AAAA-0001`, `PRY-AAAA-0001`, y en planchas `GRA-AAAA-0001` (prefijo del material).
- **«Hoy»:** se usa `hoy()` de `config.js` en la API. Nunca `new Date()` directo, para que la demo con `FECHA_HOY` sea coherente.
- **Estado de pago y estado de la venta:** `estadoPago` (pendiente, parcial o pagada) es distinto de `estado` (vigente o anulada). No mezclarlos.
