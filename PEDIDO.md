# PEDIDO — ERP Jerusalén S.R.L. (demo) · 25-11-2026

## Cliente
Jerusalén S.R.L. (marmolería: mármol, granito, cuarzo, piedra sinterizada importada de Brasil; taller y showroom). Dueño: **Don Emiliano Acero** (persona mayor, poca tecnología). Administrador: **Nain Torrico**. Clientela principal: gente mayor que compra en el taller/showroom → **NO hay tienda online** (quitar catálogo/tienda/carrito del repo actual; la ganadería tampoco entra en esta demo).

## Webs
| Dominio | Para quién | Qué es |
|---|---|---|
| erpj.cerice360.com | Nain y empleados | ERP completo (todo lo de abajo) |
| adminj.cerice360.com | Don Emiliano | Panel del dueño SUPER simplificado, conectado a la misma API/BD que erpj (como erp/admin de Ensilados) |
| jerusalen2.cerice360.com | comparación | La demo de referencia (`~/entrantes/20261125/jerusalen-sistema`: server.js + web/) desplegada tal cual, con usuarios demo propios, para comparar con erpj |

## Diseño
Basarse en la demo de referencia (abrirla en jerusalen2 o servir `jerusalen-sistema/web`): estética mármol/oro, fuentes Cinzel (logo), Cormorant Garamond (títulos), Inter (interfaz), IBM Plex Mono (números). Reproducir el estilo y las pantallas con código PROPIO (no copiar el bundle compilado). Mantener el fondo de mármol SVG liviano del repo. Modo claro y noche. Muy bueno en celular y tablet.

## Stack (liviano a propósito)
- Front: React + Vite (repo actual). Dos apps en el mismo repo: `apps/erp` y `apps/dueno` (o una app con dos builds/entradas), componentes compartidos en `packages/ui`.
- API: Node + Express + SQLite (better-sqlite3, WAL), basada en la referencia (`docs/referencia/src`: schema.sql, routes/mj.js, compute.js, auth.js). Cookies httpOnly, bcrypt, roles. Datos en `/mnt/disco-lento/jerusalen/` (montado como volumen).
- Sin dependencias pesadas: gráficos con una sola librería chica (recharts o chart.js), PDF con una sola (pdfmake o jsPDF). Bundle por app < 400 KB gzip.

## Roles
dueno (solo adminj), administrador (Nain: todo), vendedor, cortador/arquitecto, contador, rrhh. Sucursales/fábricas: cada usuario pertenece a una; el administrador ve todas o filtra.

## Módulos ERP (erpj)
1. **Proformas de venta (generador)**: cliente, ítems (plancha entera o pieza por m², servicio de corte/colocación), descuentos, validez, PDF con marca y envío por WhatsApp. Estado: enviada → aceptada → convertida en venta / vencida / rechazada. Cada proforma registra el vendedor.
2. **Ventas**: desde proforma o directa; pagos (efectivo, QR, transferencia, tarjeta), saldo/crédito.
3. **Producción y costos por proyecto**: proyecto con medidas (ej. 7 m × 8 m = 56 m²), material (plancha, preciosa/cola, cemento, pegamento con rendimiento kg/m²), mano de obra (horas × costo), desperdicio %, margen → **costo total y precio del servicio** calculados automáticamente. Producción por producto (m² cortados/colocados por período).
4. **Matriz de corte de planchas**: crear el tamaño de la plancha (por defecto 300 × 170 cuadros = 3,00 m × 1,70 m, 1 cuadro = 1 cm; editable). Cuadrícula visual donde el cortador selecciona rectángulos (arrastrar) y marca cada uno como **pieza vendida/usada**, **parte útil (retazo reutilizable, que luego puede volver a cortarse)** o **desperdicio/merma**. Muestra m² y % de cada tipo; los retazos útiles pasan al inventario como piezas con sus medidas; la merma alimenta reportes. Historial por plancha. Funciona con dedo en tablet.
5. **Inventario**: planchas y retazos por sucursal, mínimos y **lista de qué comprar** (stock bajo + tendencia de ventas).
6. **Contabilidad simple**: ingresos (ventas) y egresos (compras, planilla, gastos por categoría), resultado mensual por sucursal, cuentas por cobrar.
7. **Recursos humanos**: sucursales (alta/edición), personal por fábrica/sucursal con fecha de ingreso, cargo, sueldo; **planilla mensual general y por sucursal** (ej. 20 trabajadores ≈ 50.000 Bs). Antigüedad automática.
8. **Reportes y gráficas**: productos más y menos vendidos, ventas por fecha/mes/día de semana (estacionalidad), producto más exitoso y menos, tendencias/modas nuevas (crecimiento reciente vs. promedio), recomendación de cuánto comprar de cada uno. **Proformas por empleado y tasa de conversión a ventas**. Mermas por material/cortador.
9. **Usuarios y ajustes** (administrador).

## Panel del dueño (adminj) — lo más sencillo posible
Pantalla única, letra grande (≥ 20 px), alto contraste, botones enormes, sin menús anidados, sin jerga. Tarjetas: **Lo que gané este mes**, **Lo que gasté**, **Lo que me queda**, **Producción de cada producto** (barras simples), **Mermas**, **Qué tengo que comprar**, **Cómo van mis vendedores** (proformas → ventas). Selector de mes con flechas y de sucursal. Opción “leer en voz alta” (Web Speech API). Ingreso con PIN de 4–6 dígitos. Solo lectura.

## Datos demo
Seed realista boliviano (Santa Cruz, Bs): ~3 sucursales, 20 trabajadores, ~40 materiales, 12 meses de ventas con estacionalidad y una “moda” creciente, proformas con conversión variada, planchas con cortes y retazos. Reinicio de demo con un comando.

## Etapas (commit + push al terminar cada una; ESTADO.md al día)
1. Limpieza del repo (quitar tienda/catálogo/ganadería) + estructura apps/api + diseño base (tema, fuentes, layout, modo noche).
2. API + BD + auth/roles + sucursales + seed.
3. Proformas + ventas + PDF.
4. Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas.
5. Contabilidad + RRHH/planilla.
6. Reportes/gráficas + panel del dueño (adminj).
7. Pruebas (cálculo de costos, matriz de corte, conversión proformas, permisos) y despliegue.

## Reglas
- Español en UI, código y documentos. Repo Reqiudex/JerusalenSRL. Sin secretos en el repo (.env.example). Sin push --force.
- No tocar otras apps, otras BD ni el túnel (eso lo hace la sesión de infraestructura).
- Ahorrar tokens: salidas cortas, sin builds repetidos.
- Al terminar todo: primera línea de ESTADO.md exactamente `ESTADO: TERMINADO`.
