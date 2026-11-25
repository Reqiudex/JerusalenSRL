# ERP Jerusalén S.R.L.

Sistema de gestión para una marmolería de Santa Cruz, Bolivia (mármol, granito, cuarzo y piedra sinterizada importada de Brasil). Tiene tres partes que comparten la misma API y la misma base de datos:

| Parte | Dominio | Para quién |
|---|---|---|
| **ERP** (`apps/erp`) | erpj.cerice360.com | Nain (administrador) y los empleados: vendedores, cortadores, contadora y RRHH. |
| **Panel del dueño** (`apps/dueno`) | adminj.cerice360.com | Don Emiliano: una pantalla con letra grande, ingreso con PIN y lectura en voz alta. |
| **API** (`apps/api`) | (interna, `/api`) | Node + Express + SQLite. También sirve las dos apps ya compiladas. |

No incluye tienda en línea ni ganadería, como se pidió.

## Empezar en 3 pasos

Requisitos: Node 20 o más reciente.

```bash
npm install          # instala todo (workspaces)
npm run build        # compila el ERP y el panel del dueño
npm start            # http://localhost:3100  (ERP en /, panel del dueño en /dueno/)
```

En el primer arranque se carga sola la **demo** con datos bolivianos realistas. Para volver a empezar de cero: `npm run demo:reiniciar`.

**Usuarios de la demo** (clave `jerusalen2026`): En erpj.cerice360.com la clave y el PIN son otros (variables CLAVE_DEMO y PIN_DEMO en Coolify).

| Correo | Rol |
|---|---|
| nain@jerusalen.demo | Administrador (todo). También tiene el PIN **1234** para el panel del dueño. |
| carla@, jorge@, lucia@, rodrigo@jerusalen.demo | Vendedores (cada uno ve solo sus proformas y ventas). |
| marcelo@, wilson@, alvaro@jerusalen.demo | Cortadores / arquitecto. |
| patricia@jerusalen.demo | Contadora. |
| fernanda@jerusalen.demo | Recursos humanos. |
| Don Emiliano | Entra al panel del dueño con el PIN **2580**. |

Antes de cargar datos reales, cambia las claves: en *Usuarios y ajustes*, o con `npm run clave -w @jerusalen/api -- correo NuevaClave`.

## Desarrollo

```bash
npm run dev:api      # API en :3100 (se reinicia sola al guardar)
npm run dev:erp      # ERP en :5173 (pasa /api a :3100)
npm run dev:dueno    # Panel del dueño en :5174
npm test             # 63 pruebas (Vitest): geometría, reportes, costos, planilla, formatos y la API de punta a punta
npm run lint         # oxlint
```

## Qué hay en cada módulo del ERP

1. **Proformas:** se arman con cliente e ítems (plancha entera, pieza por m² con medidas, servicio o insumo), descuento y validez, y el total se calcula en vivo. Se genera un **PDF con la marca** y se envía por **WhatsApp**. Los estados son enviada → aceptada → convertida, vencida (automático) o rechazada (con el motivo). Cada proforma guarda el vendedor que la hizo.
2. **Ventas y cobros:** desde una proforma o directas. Pagos en efectivo, QR, transferencia o tarjeta, con saldo y crédito. Una venta se puede anular.
3. **Costos y producción:** calculadora de un trabajo (por ejemplo, 7 m × 8 m) con plancha, desperdicio, pegamento, cemento y preciosa por rendimiento, mano de obra, otros gastos y margen. Calcula **costo total, precio y planchas necesarias**, y con un clic crea la proforma con ese precio. Muestra la producción en m² por producto.
4. **Planchas y cortes:** inventario plancha por plancha con la **matriz de corte** (300 × 170 editable, mouse o dedo, vendido / retazo útil / merma). Los retazos pasan al inventario, la merma queda registrada por cortador y cada plancha tiene historial de versiones.
5. **Inventario y compras:** existencias por sucursal, mínimos, entradas y ajustes, búsqueda de retazos por medida y la **lista de qué comprar** (stock bajo más la demanda con tendencia).
6. **Contabilidad:** ingresos y egresos por categoría, resultado mensual general y por sucursal, cuentas por cobrar (con recordatorio por WhatsApp) y un **CSV para el contador**.
7. **Personal y planilla:** sucursales, personal por fábrica, antigüedad automática y **planilla mensual** general y por sucursal, con bono de antigüedad y aportes configurables. Al cerrar la planilla, los sueldos pasan a los egresos.
8. **Reportes:** productos más y menos vendidos, más y menos exitoso, ventas por mes y por día de la semana, estacionalidad, **modas nuevas** (8 semanas contra 12 meses), recomendación de compra, **conversión de proformas por vendedor** y mermas por material y por cortador.
9. **Usuarios y ajustes:** roles, sucursal, claves y PIN, datos de la empresa para el PDF, parámetros de la planilla y bitácora de acciones.

## Documentos

- [`INDICE_PARA_IA.md`](INDICE_PARA_IA.md): mapa de cada carpeta y archivo, y dónde tocar para cada cambio. **Empieza por aquí si eres otra IA.**
- [`CAMBIOS.md`](CAMBIOS.md): qué se hizo y qué se mejoró respecto del pedido.
- [`ESTADO.md`](ESTADO.md): qué está listo, qué se verificó y qué falta.
- [`PROMPT_MEJORADO.md`](PROMPT_MEJORADO.md): el prompt con el que se construyó todo.
- [`docs/API.md`](docs/API.md): todos los endpoints. [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): Docker, nginx y los tres dominios.
- [`apps/dueno/README.md`](apps/dueno/README.md): contrato del panel del dueño. [`packages/matriz-corte/README.md`](packages/matriz-corte/README.md): la matriz de corte.
