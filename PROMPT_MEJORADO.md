# Prompt mejorado — ERP Jerusalén S.R.L. (versión completa)

> Reemplaza a los tres prompts sueltos de `PROMPTS_CLAUDE_AMIGO_JERUSALEN.md`.
> Este es el prompt que se aplicó para construir este paquete. Si otra IA continúa
> el trabajo, debe leer primero `INDICE_PARA_IA.md` y `ESTADO.md`.

## Qué cambió frente a los prompts originales

| Problema del prompt original | Cómo lo resuelve este prompt |
|---|---|
| Tres entregas sueltas (matriz, panel, reportes) que no se conectaban entre sí ni con una API real. | Un solo monorepo funcional: API + ERP + panel del dueño, que comparten base de datos y paquetes. |
| La lógica de reportes y de geometría existía solo en el front. | Las funciones puras viven en `packages/` y las usan **la API y el front**: los mismos cálculos en los dos lados. |
| Faltaban criterios de aceptación medibles. | Cada módulo tiene criterios verificables (más abajo) y pruebas automáticas. |
| No pedía datos demo coherentes entre módulos. | Una semilla única y determinista: las ventas, proformas, planchas, planilla y egresos cuadran entre sí. |
| No definía seguridad. | Cookies httpOnly, bcrypt, roles por módulo, límite de intentos, PIN separado para el dueño y validación en el servidor. |
| No pedía documentación para otras IAs. | `INDICE_PARA_IA.md` (mapa de archivos), `CAMBIOS.md`, `ESTADO.md` y contratos de API en `docs/API.md`. |

## Prompt

Eres un equipo senior (arquitecto full-stack, especialista en React, especialista en accesibilidad para personas mayores y analista de negocio de marmolerías en Bolivia). Construye el **ERP de Jerusalén S.R.L.** (marmolería de Santa Cruz: mármol, granito, cuarzo y piedra sinterizada importada de Brasil) siguiendo `PEDIDO.md`. Entrega código **completo y funcional**, no maquetas.

### Restricciones
1. **Idioma:** todo en español (interfaz, código, comentarios, mensajes de error y documentación). Moneda Bs, coma decimal y punto de miles.
2. **Stack liviano:**
   - API: Node 20+, Express, better-sqlite3 (WAL), bcryptjs y cookie-parser. Nada más en el servidor.
   - Front: React 19 + Vite.
   - Gráficos: SVG propio, sin librería de gráficos.
   - PDF: solo jsPDF.
   - Peso: ERP < 400 KB gzip; panel del dueño < 150 KB gzip.
3. **Monorepo** con npm workspaces:
   - `apps/api`, `apps/erp` (erpj.cerice360.com) y `apps/dueno` (adminj.cerice360.com);
   - `packages/ui` (tema, formatos y gráficos), `packages/reportes` (funciones puras) y `packages/matriz-corte` (componente y geometría).
4. **Sin tienda en línea ni ganadería.** Tampoco secretos en el repo: solo `.env.example`.
5. **Estética** de la demo de referencia hecha con código propio: mármol/oro, Cinzel, Cormorant Garamond, Inter e IBM Plex Mono. Modo claro y modo noche. Muy cómoda en celular y tablet (áreas táctiles de 44 px o más).

### Módulos y criterios de aceptación
| # | Módulo | Se acepta si… |
|---|---|---|
| 1 | Proformas | Se crea con cliente e ítems (plancha, pieza por m², servicio, insumo), descuento y validez; calcula los totales en vivo; genera un PDF con marca; abre WhatsApp con el resumen; sigue los estados enviada → aceptada → convertida / vencida / rechazada; guarda el vendedor; las vencidas se marcan solas. |
| 2 | Ventas | Se crea desde una proforma (copia los ítems) o directa; registra pagos (efectivo, QR, transferencia, tarjeta); muestra el saldo; no acepta pagos mayores que el saldo; una venta se puede anular. |
| 3 | Costos por proyecto | Con largo × ancho, material, insumos con rendimiento kg/m², horas × costo, desperdicio % y margen, calcula el costo total y el precio. La misma función calcula en el front y en la API. Los resultados se guardan. |
| 4 | Matriz de corte | Lo que pide el Prompt 1, conectado a la API; los retazos útiles pasan al inventario; la merma queda registrada por cortador; hay historial de versiones. |
| 5 | Inventario | Existencias por sucursal, mínimos, entradas y ajustes, retazos, y una **lista de compras** que combina el stock bajo con la demanda proyectada. |
| 6 | Contabilidad | Ingresos (pagos cobrados) y egresos por categoría; resultado mensual por sucursal; cuentas por cobrar; exportación CSV para el contador. |
| 7 | RRHH | Sucursales, personal con fecha de ingreso, antigüedad automática, planilla mensual general y por sucursal con bono de antigüedad y aportes configurables, y CSV. |
| 8 | Reportes | Productos más y menos vendidos, ventas por mes y por día de la semana, tendencias (8 semanas contra el promedio de 12 meses), recomendación de compra, conversión de proformas por vendedor y mermas por material y por cortador. |
| 9 | Usuarios y ajustes | Altas, roles, sucursal, activo/inactivo, cambio de clave y PIN, y datos de la empresa para el PDF. |
| D | Panel del dueño | Una sola pantalla, letra de 20 px o más, ingreso con PIN, siete tarjetas, flechas de mes, selector de sucursal, botón «Escuchar» con Web Speech en español, modo demo sin backend, solo lectura. |

### Roles
- `dueno`: solo el panel adminj, con todo en lectura.
- `administrador`: acceso total.
- `vendedor`: clientes, proformas y ventas (solo las suyas, salvo que sea administrador) y lectura del inventario.
- `cortador`: planchas, matriz de corte, proyectos y lectura del inventario.
- `contador`: contabilidad, lectura de ventas y planilla.
- `rrhh`: sucursales, personal y planilla.

### Datos demo
Una semilla determinista que se repite igual cada vez (`npm run demo:reiniciar`):
- 3 sucursales en Santa Cruz y 20 trabajadores;
- unos 40 materiales y 12 meses de ventas con estacionalidad (picos en junio, julio, noviembre y diciembre);
- una «moda» creciente (piedra sinterizada Calacatta);
- proformas con distinta conversión por vendedor;
- planchas con cortes y retazos;
- egresos y planillas que cuadran.

### Calidad
- Pruebas con Vitest de geometría, reportes, costos, formatos, permisos, conversión de proformas y del flujo de la API de punta a punta.
- La API valida cada entrada y responde `{ error }` con códigos HTTP correctos. Las consultas usan parámetros, nunca SQL concatenado.
- Accesibilidad: etiquetas, foco visible, `aria-live`, contraste AA y navegación con teclado.

### Entrega
Un zip con el monorepo completo más:
- `README.md`: cómo correrlo;
- `INDICE_PARA_IA.md`: mapa de cada carpeta y archivo, y dónde tocar para cada cambio típico;
- `CAMBIOS.md`: qué se hizo y qué se mejoró;
- `ESTADO.md`: qué está listo, qué falta y qué se verificó;
- `docs/API.md`: todos los endpoints con su JSON;
- `docs/DESPLIEGUE.md`: Docker, nginx y los tres dominios.
