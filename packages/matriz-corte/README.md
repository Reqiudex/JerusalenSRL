# Matriz de corte de planchas

Componente **MatrizCorte** para el ERP de Jerusalén S.R.L. (módulo 4 de `PEDIDO.md`).
Componente React del ERP (ya integrado en «Planchas y cortes», conectado a `GET/POST /api/planchas/:id/cortes`). La geometría (`src/geometria.js`) la usan también la API y la semilla.

## Contenido

```
packages/matriz-corte/src/
├── MatrizCorte.jsx      Componente (canvas, zoom, mouse y dedo, panel)
├── MatrizCorte.css      Estilos mármol/oro, modo claro y modo noche (todo dentro de .mc)
├── geometria.js         Lógica pura: rectángulos, validaciones, resumen, historial, JSON
├── dibujo.js            Dibujo en <canvas> (solo lo visible)
├── api.js               GET/POST /api/planchas/:id/cortes
├── index.js             Exporta todo lo anterior
├── geometria.test.js    Pruebas con Vitest (26 pruebas)
└── demo/                Demo independiente con datos de ejemplo
```

No usa librerías nuevas: solo React, que el repo ya tiene. El componente pesa unos 20 KB comprimido.

## Qué hace

- **Plancha editable:** ancho × alto en cuadros (1 cuadro = 1 cm, por defecto 300 × 170 = 3,00 × 1,70 m), además de código, material y espesor. No deja achicar la plancha si algún corte quedaría afuera.
- **Cuadrícula en `<canvas>`:** solo dibuja lo que se ve, así que se mueve fluida con 51.000 celdas o más. La rueda del mouse hace zoom hacia el cursor (Shift + rueda desplaza a los lados), los botones − / + / «ver todo» también, y en tablet se usan dos dedos para hacer zoom y mover. El modo «Mover», el botón central del mouse o arrastrar fuera de la plancha desplazan la vista.
- **Cortes:** se arrastra con el mouse o con el dedo, y el tamaño en cm y m² se ve mientras se dibuja. Cada corte es **Vendido/Usado**, **Retazo útil** o **Merma/Desperdicio**. Además del color, cada tipo tiene un relleno distinto (liso, rayado o cuadriculado) para no depender solo del color.
- **Retazos reutilizables:** si se dibuja un corte completamente dentro de un retazo útil, el corte queda como pieza hija (`padreId`). Se puede repetir en varios niveles, por ejemplo un retazo dentro de otro retazo.
- **Validaciones:** un corte no puede salirse de la plancha ni superponerse con otro. Un vendido o una merma no se pueden volver a cortar. Un retazo que ya tiene piezas adentro no puede cambiar de tipo. Si se elimina un retazo, también se eliminan sus piezas.
- **Deshacer y rehacer:** Ctrl+Z y Ctrl+Y (o Ctrl+Shift+Z), o con los botones. Guarda hasta 200 pasos.
- **Resumen en vivo:** m² y % de vendido, retazo, merma y libre (siempre suman 100 %), más el aprovechamiento (lo vendido sobre lo ya cortado). De un retazo ya recortado solo se cuenta como retazo la parte que le queda libre.
- **Retazos para inventario:** una lista con las medidas de cada retazo y cuánto le queda libre (`retazosParaInventario()` en `geometria.js`).
- **Accesibilidad:** se puede usar con teclado, porque el formulario «Agregar por medidas» y la lista de cortes hacen lo mismo que el canvas. Los avisos se anuncian con `aria-live`, el canvas tiene una descripción que se actualiza sola, los botones miden 44 px como mínimo, el foco se ve y hay atajos de teclado (1/2/3, Supr, + − 0, flechas, Esc).

## Integrarlo

1. Copiar `packages/matriz-corte/src/` donde corresponda, por ejemplo en `packages/ui/matriz-corte/` o en `apps/erp/src/modulos/`.
2. Cargar las fuentes una sola vez en el `index.html` de la app:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Cormorant+Garamond:wght@500;600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" />
```

3. Usarlo así:

```jsx
import { MatrizCorte } from './matriz-corte'

// Conectado a la API: carga con GET y guarda con POST
<MatrizCorte planchaId={plancha.id} apiBase="" tema={tema} onCambioTema={setTema} />

// O con datos propios
<MatrizCorte valorInicial={datos} onGuardar={async (d) => guardarEnMiApi(d)} onCambio={(d) => setBorrador(d)} />

// Historial de una plancha, solo para mirar
<MatrizCorte valorInicial={version} soloLectura />
```

| Prop | Tipo | Para qué |
|---|---|---|
| `valorInicial` | `{ plancha, cortes }` | Datos con los que empieza. |
| `planchaId` + `apiBase` | `string \| number`, `string` | Carga y guarda en la API (`''` = mismo dominio). |
| `onGuardar(datos)` | `async fn` | Si se pasa, el botón «Guardar» la usa en lugar de la API. |
| `onCambio(datos)` | `fn` | Se llama en cada cambio (para borradores o autoguardado). |
| `soloLectura` | `boolean` | Solo mirar y seleccionar. |
| `tema` / `onCambioTema` | `'claro' \| 'noche'` | Si no se pasa, sigue al `data-theme` del `<html>` (`dark`/`light`) o al sistema. |

Todas las funciones de `geometria.js` también se exportan, y la API (Node) puede usar `cargarDatos()` para validar lo que recibe con las mismas reglas que el front.

## Formato JSON

Es el mismo para exportar y cargar archivos, y para la API:

```json
{
  "plancha": { "id": "P-12", "ancho": 300, "alto": 170, "material": "Granito Negro San Gabriel", "espesor": 2, "codigo": "GR-0012" },
  "cortes": [
    { "id": "c1", "x": 0,   "y": 0, "w": 180, "h": 62, "tipo": "vendido", "nota": "Mesón cocina" },
    { "id": "c3", "x": 180, "y": 0, "w": 120, "h": 90, "tipo": "retazo",  "nota": "" },
    { "id": "c4", "x": 180, "y": 0, "w": 60,  "h": 45, "tipo": "vendido", "nota": "Lavamanos", "padreId": "c3" }
  ]
}
```

- `x`, `y`, `w` y `h` son números enteros en cuadros (= cm). `(x, y)` es la esquina superior izquierda y empieza en 0.
- `tipo` puede ser `"vendido"`, `"retazo"` o `"merma"`.
- `padreId` es opcional y apunta a un corte de tipo `retazo` que contiene por completo a esta pieza.
- `espesor` va en cm. `codigo` es un campo extra opcional; si no viene, el componente funciona igual.

## Contrato de la API

### `GET /api/planchas/:id/cortes`

Responde `200` con el JSON de arriba. Si la plancha no tiene cortes, `cortes` viene como `[]`. Responde `404 { "error": "Plancha no encontrada" }` si no existe y `401` si no hay sesión. Usa la sesión con cookie httpOnly (el front manda `credentials: 'include'`).

### `POST /api/planchas/:id/cortes`

- **Cuerpo:** el JSON completo. Reemplaza todos los cortes de esa plancha.
- **Validación en el servidor:** usar `cargarDatos(cuerpo)` de `geometria.js`. Si `ok` es `false`, responder `422 { "error": "...", "errores": [...] }`. También hay que comprobar que `cuerpo.plancha.id` coincida con `:id`.
- **Permisos:** solo `administrador` y `cortador/arquitecto` pueden escribir. Los demás roles reciben `403`.
- **Efectos sugeridos (en una transacción):**
  1. guardar los cortes en la tabla `plancha_cortes` (`id, plancha_id, x, y, w, h, tipo, nota, padre_id`);
  2. sincronizar el inventario de retazos con `retazosParaInventario(estado)`: cada retazo útil queda como pieza con sus medidas, su material y su sucursal;
  3. registrar la merma (m² por material y cortador) para los reportes;
  4. guardar una versión en `plancha_cortes_historial` (fecha, usuario, JSON) para el historial de cada plancha.
- **Respuesta:** `200` con el JSON guardado y, si se quiere, `"retazos": [...]` con los ids que se crearon en el inventario.

Esquema SQLite sugerido:

```sql
CREATE TABLE plancha_cortes (
  id TEXT PRIMARY KEY,
  plancha_id INTEGER NOT NULL REFERENCES planchas(id) ON DELETE CASCADE,
  x INTEGER NOT NULL, y INTEGER NOT NULL, w INTEGER NOT NULL, h INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('vendido','retazo','merma')),
  nota TEXT NOT NULL DEFAULT '',
  padre_id TEXT REFERENCES plancha_cortes(id) ON DELETE CASCADE
);
CREATE INDEX idx_plancha_cortes_plancha ON plancha_cortes(plancha_id);
```

## Pruebas

Vitest no está en el `package.json` del repo, así que hay que agregarlo:

```bash
npm i -D vitest
npm test
```

Prueban la superposición (incluidos los bordes compartidos), los límites de la plancha, los retazos dentro de retazos, las áreas y porcentajes (que siempre suman 100 %), editar y eliminar en cascada, deshacer y rehacer, el JSON de ida y vuelta, los errores de carga y los formatos con coma decimal.

## Probar la demo

```bash
npx vite packages/matriz-corte/src/demo --config vite.config.js
```

La demo arranca con una plancha de ejemplo y guarda en `localStorage` al tocar «Guardar».
