# Cambios y mejoras

## 1. Qué se construyó

| Pedido original | Entregado |
|---|---|
| Prompt 1: componente MatrizCorte suelto | Integrado en el ERP (`packages/matriz-corte`) y **conectado a la API**. La geometría se valida también en el servidor, los retazos pasan al inventario y hay historial de versiones por plancha. |
| Prompt 2: `apps/dueno` con datos demo | App completa, conectada a `/api/dueno/resumen` real y con modo demo. Pesa 77,5 KB gzip (el límite era 150 KB). |
| Prompt 3 (opcional): funciones de reportes | `packages/reportes` con funciones puras (y 17 pruebas) que la API usa para servir `/api/reportes`. Más la página de Reportes con gráficos. |
| Etapas 1 a 7 de `PEDIDO.md`: ERP completo, API, base de datos, seed y pruebas | Hecho, en un monorepo nuevo (`apps/api`, `apps/erp`, `apps/dueno`, `packages/*`). Los 9 módulos funcionan de punta a punta. |
| Quitar tienda, catálogo y ganadería | El repo nuevo no los incluye. Ver «Qué reemplaza al repo anterior», más abajo. |

## 2. Mejoras sobre lo pedido

### Negocio
- **Un solo cálculo en los dos lados.** Costos, totales de proformas, planilla, reportes y geometría viven en `packages/`. El precio que ve el vendedor en pantalla es exactamente el que guarda la API.
- **Proforma desde la calculadora.** «Crear proforma con este precio» lleva el resultado de la calculadora de costos directo a una proforma nueva.
- **Proformas vencidas automáticas.** Se marcan solas cuando pasa la validez. También se pueden reenviar con la fecha de hoy, o duplicar.
- **Motivo de rechazo.** Cada proforma rechazada guarda por qué se perdió («Precio alto», «Eligió otro proveedor», etc.).
- **Planchas como unidades.** Cada plancha es una unidad con código, matriz y estado (disponible, en corte o agotada). Una entrada de N planchas crea N planchas listas para cortar.
- **Búsqueda de retazos por medida.** Antes de cortar una plancha entera, se puede buscar «¿tengo un retazo de al menos 80 × 60?».
- **Lista de compras inteligente.** Combina mínimo, demanda de 90 días y tendencia, cubre 30 días y convierte los m² vendidos a planchas enteras. Incluye el costo estimado y se descarga en CSV.
- **Panel del dueño honesto.**
  - En el mes en curso avisa que **falta pagar la planilla** y cuánto quedaría después, para no mostrar una ganancia inflada.
  - Compara contra **los mismos días** del mes anterior, no contra el mes completo.
- **Planilla boliviana.** Antigüedad automática, bono de antigüedad según la escala de años sobre 3 salarios mínimos, aporte laboral, sueldo proporcional para quien ingresa o sale a mitad de mes, y cierre que pasa los sueldos a egresos.
  - Los parámetros se configuran en Ajustes porque cambian por decreto.
  - Con un salario mínimo de Bs 2.750, 20 trabajadores ya suman al menos Bs 55.000. Por eso la planilla demo ronda los Bs 85.000 y no los Bs 50.000 del ejemplo del pedido.
- **Cobranza por WhatsApp.** Las cuentas por cobrar tienen un botón para recordarle el saldo al cliente.
- **Anulación de ventas.** Solo el administrador puede anular. Los insumos vuelven al stock y la proforma queda como aceptada.
- **Inicio limpio para datos reales.** `SEMBRAR_DEMO=0` más `ADMIN_EMAIL` y `ADMIN_CLAVE`.

### Seguridad
- **Sesiones y claves:** cookie httpOnly con SameSite=Lax (y Secure con HTTPS), contraseñas y PIN con bcrypt, y sesiones con vencimiento.
- **Límite de intentos:** tras 5 fallos (clave o PIN) bloquea 5 minutos.
- **PIN restringido:** la sesión por PIN solo da acceso al panel del dueño.
- **Protección CSRF:** las escrituras se aceptan solo como JSON.
- **Permisos por rol y módulo en el servidor.**
  - Cada vendedor ve solo sus proformas y ventas.
  - El panel general y los reportes (totales y márgenes de la empresa) quedan para administración y contabilidad.
  - Nadie puede quitarse a sí mismo el rol de administrador.
- **Validación de todas las entradas** en el servidor, con consultas parametrizadas. Los mensajes de error son claros y en español.
- **Bitácora** de acciones importantes: ingresos, cambios de usuario, pagos, cierres de planilla y anulaciones.

### Interfaz y accesibilidad
- **Estética** mármol/oro hecha con código propio: Cinzel, Cormorant Garamond, Inter e IBM Plex Mono, fondo de mármol SVG estático y modo noche en las tres partes.
- **Gráficos SVG propios**, sin librería: tooltip, botón «Ver tabla» con la tabla equivalente para lectores de pantalla, y colores de series **validados** (contraste, daltonismo y separación) en los dos modos.
- **Pensado para tablet y celular:** áreas táctiles de 44 px o más, menú lateral que se pliega y tablas con desplazamiento.
- **Accesibilidad:** foco visible, enlace para saltar al contenido, modales con foco atrapado y Escape, avisos con `aria-live` e insignias de estado que siempre llevan texto (nunca solo color).
- **Carga liviana:** el ERP carga de entrada 84 KB gzip; cada módulo y jsPDF se descargan solo cuando se usan.

### Calidad
- **63 pruebas automáticas**, incluida una prueba de la API de punta a punta sobre la semilla demo.
- **Demo determinista y coherente.** Las ventas, proformas, planillas, egresos, planchas y cortes cuadran entre sí. Incluye estacionalidad, una «moda» real (sinterizada Calacatta, +520 %), un producto en caída (Verde Ubatuba) y vendedores con conversión distinta (26 % a 56 %).
- **Linter sin advertencias.**

## 3. Errores encontrados y corregidos durante el trabajo
- El estado de pago de una venta pisaba su estado vigente o anulada. Ahora son dos campos: `estadoPago` y `estado`.
- La lista de compras contaba la demanda una vez por cada sucursal (tres veces). Ahora agrupa por material.
- La «producción por producto» incluía servicios como «Colocación». Ahora solo cuenta planchas.
- Los vendedores podían ver los totales y márgenes de toda la empresa. Se restringió.

## 4. Qué reemplaza al repo anterior (`Reqiudex/JerusalenSRL`)

Este monorepo **reemplaza** el contenido del repo. Al subirlo, se pueden borrar estos archivos viejos:
- `src/components/StoreCatalog.jsx`, `PosCashier.jsx`, `CattleManagement.jsx`, `LinktreeSection.jsx`, `LandingPage.jsx` y `AdminStockDashboard.jsx`;
- `src/data.js` y `src/dataCattle.js` (tienda y ganadería);
- `src/utils/exportUtils.js`, `src/App.jsx` y `src/App.css`;
- el `Dockerfile` y `nginx.conf` viejos (los reemplazan los nuevos).

El fondo de mármol se conservó como idea, rehecho más liviano en `packages/ui/src/MarmolFondo.jsx`. La matriz de corte del Prompt 1 vive ahora en `packages/matriz-corte`.

## 5. Contenido del zip

```
entrega-jerusalen-completa.zip
└── jerusalen-erp/          el monorepo completo (sin node_modules, sin dist y sin bases de datos)
    ├── README.md           cómo correrlo
    ├── INDICE_PARA_IA.md   mapa de archivos para otras IAs
    ├── CAMBIOS.md          este archivo
    ├── ESTADO.md           qué está listo y qué falta
    ├── PROMPT_MEJORADO.md  el prompt aplicado
    ├── docs/API.md · docs/DESPLIEGUE.md
    ├── apps/api · apps/erp · apps/dueno
    └── packages/reportes · packages/ui · packages/matriz-corte
```
