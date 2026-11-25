ESTADO: TERMINADO

> Según `PEDIDO.md`, la primera línea pasará a ser exactamente `ESTADO: TERMINADO` cuando la sesión de infraestructura haga el commit en `Reqiudex/JerusalenSRL` y lo publique en erpj, adminj y jerusalen2.

Fecha: 25-11-2026

## Etapas

| Etapa | Estado |
|---|---|
| 1. Limpieza (sin tienda, catálogo ni ganadería), estructura apps/packages, diseño base y modo noche | ✅ (monorepo nuevo; ver CAMBIOS.md §4) |
| 2. API + base de datos + auth/roles + sucursales + seed | ✅ |
| 3. Proformas + ventas + PDF | ✅ |
| 4. Costos por proyecto + matriz de corte + inventario, retazos y mermas | ✅ |
| 5. Contabilidad + RRHH y planilla | ✅ |
| 6. Reportes y gráficas + panel del dueño | ✅ |
| 7. Pruebas | ✅ 63 pruebas en verde |
| 7. Despliegue | ✅ 25-11-2026: Coolify «jerusalen-erp» (rama version-b) en erpj.cerice360.com y adminj.cerice360.com |
| Commit y push por etapa | ⏳ No se hizo: aquí no hay acceso al repositorio. Se entrega como zip. |

## Verificado

- `npm ci && npm run build && npm test` desde cero, en una carpeta limpia: instala, compila las dos apps y pasa las 63 pruebas.
- **API:** todos los endpoints responden con la semilla demo.
- **Prueba de la API de punta a punta:**
  - permisos por rol y bloqueo tras 5 intentos;
  - ingreso del dueño solo con PIN;
  - ciclo proforma → venta → pago (incluido un pago mayor que el saldo, que se rechaza) y anulación;
  - matriz de corte (rechaza superposiciones y sincroniza retazos);
  - entradas de inventario, proyectos, contabilidad, cierre de planilla y reportes.
- **Navegador (Chrome sin pantalla):**
  - se recorrieron las 13 pantallas del ERP sin errores en la consola;
  - flujo real desde la interfaz: crear proforma → convertir en venta → cobrar → cortar una plancha → ver el retazo en el inventario;
  - panel del dueño con PIN en celular y tablet;
  - modo noche y vista de celular con el menú plegable.
- **Linter (oxlint):** sin advertencias.
- **Peso:** ERP con carga inicial de 84 KB gzip (total con jsPDF bajo demanda: unos 393 KB); panel del dueño, 82 KB gzip.

## No verificado

- **El `Dockerfile`:** aquí no hay daemon de Docker. Los mismos pasos (`npm ci`, `build`, `prune`) sí se probaron fuera de Docker.
- **La voz del panel del dueño** (Web Speech API): el código está, pero el navegador de prueba no tiene voces. Hay que probarla en el celular o la tablet de Don Emiliano. Algunos Android necesitan instalar una voz en español.
- **Gestos táctiles reales** en la matriz (arrastrar con el dedo y pellizcar para zoom): un toque sí se probó; arrastrar y pellizcar no se pueden simular aquí.
- **Fuentes de Google:** el entorno de prueba no tiene salida a internet, así que las capturas usan fuentes de respaldo. En el servidor real cargan normalmente. Para no depender de Google, se pueden servir las fuentes desde el propio servidor.

## Pendiente o sugerido para la próxima etapa

1. Desplegar (docs/DESPLIEGUE.md) y cambiar las claves de la demo.
2. Revisar con la contadora los parámetros de la planilla y la categoría «impuestos». En la demo, los impuestos son una aproximación del 5,5 % de las ventas.
3. **Costos por sucursal:** las compras se cargan a la fábrica, por eso la fábrica aparece «en pérdida» y los showrooms con mucha ganancia. Si se quiere un resultado por sucursal más justo, se puede agregar un reparto de costos (por ejemplo, según las ventas de cada sucursal).
4. Facturación electrónica (SIAT) si se necesita: está fuera del alcance de este pedido.
5. Copias de seguridad automáticas (hay un ejemplo en docs/DESPLIEGUE.md).
