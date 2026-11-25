# Panel del dueño (adminj.cerice360.com)

App React + Vite **aparte**, para Don Emiliano Acero. Muestra una sola pantalla con letra de 20 px o más, alto contraste, botones grandes y nada de menús. Es solo de lectura.

## Qué hace

- **Ingreso con PIN** de 4 a 6 dígitos, con un teclado numérico grande (también acepta el teclado físico). La sesión dura 30 días y solo da acceso a `/api/dueno/*`.
- **Siete tarjetas:**
  - Lo que gané este mes (con lo cobrado y lo que me deben);
  - Lo que gasté (las categorías principales);
  - Lo que me queda (avisa si **falta pagar la planilla del mes** y cuánto quedaría después);
  - Producción de cada producto (barras SVG);
  - Mermas (con una lectura simple: «Normal», «Un poco alta» o «Alta»);
  - Qué tengo que comprar (Urgente o Pronto, con el costo estimado);
  - Cómo van mis vendedores («De cada 10, cierra 5»).
- **Controles:** cambio de mes con flechas, selector de sucursal («Todas», Casa Matriz, Fábrica o Equipetrol), modo claro y modo noche.
- **«Escuchar»** en cada tarjeta y **«Escuchar todo»**, con la Web Speech API en español. Prefiere una voz `es-BO` o latinoamericana.
- **Comparación justa:** en el mes en curso compara contra **los mismos días** del mes anterior.
- **Modo demo** sin backend: «Ver con datos de ejemplo» en la pantalla del PIN, o `?demo=1` en la dirección.
- **Peso:** 77,5 KB gzip de JavaScript y 4,7 KB de CSS. Los gráficos son SVG propio, sin librerías.

## Correr

```bash
npm install                 # en la raíz del repo
npm run dev:api             # API en :3100
npm run dev:dueno           # http://localhost:5174 (pasa /api al :3100)
npm run build -w @jerusalen/dueno   # → apps/dueno/dist (la API lo sirve en /dueno/ y en el dominio adminj.*)
```

PIN de la demo: **2580** (Don Emiliano). El administrador Nain también tiene el PIN **1234**.

## Contrato: `GET /api/dueno/resumen?mes=AAAA-MM&sucursal=ID`

- `sucursal` es opcional: si se omite (o vale `todas`), muestra toda la empresa.
- Permisos: rol `dueno` o `administrador` (con sesión de clave o de PIN).

| Campo | Tipo | Significado |
|---|---|---|
| `mes`, `hoy` | texto | Mes consultado y fecha del servidor. |
| `sucursal` | objeto o null | La sucursal elegida, o `null` para todas. |
| `sucursales` | `[{ id, nombre }]` | Para el selector. |
| `ingresos.total` | número | Ventas vigentes del mes (Bs). |
| `ingresos.ventas` | entero | Cantidad de ventas. |
| `ingresos.variacionPct` | número o null | Contra el mes anterior (en el mes en curso, contra los mismos días). |
| `ingresos.mesEnCurso`, `comparadoHasta` | | Indican cómo se comparó. |
| `gastos.total`, `gastos.porCategoria[]` | | Egresos del mes: `{ categoria, nombre, monto }` de mayor a menor. |
| `resultado.total`, `resultado.positivo` | | Ingresos − gastos. |
| `pendientes.planilla` | número | Planilla estimada del mes si todavía no se cerró (0 si ya se cerró). |
| `pendientes.resultadoEstimado` | número | Resultado después de pagar la planilla. |
| `cobrado` | número | Pagos recibidos en el mes. |
| `porCobrar` | `{ total, clientes }` | Saldo pendiente de todas las ventas. |
| `produccion[]` | `{ producto, cantidad, unidad }` | m² de planchas vendidos (los 6 primeros). |
| `mermas` | `{ m2, porcentaje, cortadoM2, planchasCortadas }` | Mermas registradas en la matriz de corte. |
| `compras[]` | `{ material, sucursal, comprar, unidad, urgencia, costoEstimado }` | Los 8 primeros. |
| `vendedores[]` | `{ nombre, proformas, ventas, conversionPct, vendido }` | Por vendedor. |
| `actualizado` | ISO | Hora en que se generó. |

Ejemplo real (recortado), de la Casa Matriz en noviembre de 2026:

```json
{
  "mes": "2026-11",
  "hoy": "2026-11-25",
  "sucursal": {
    "id": 1,
    "nombre": "Casa Matriz — Showroom 4to anillo"
  },
  "sucursales": [
    {
      "id": 1,
      "nombre": "Casa Matriz — Showroom 4to anillo"
    },
    {
      "id": 2,
      "nombre": "Fábrica Parque Industrial"
    },
    {
      "id": 3,
      "nombre": "Showroom Equipetrol"
    }
  ],
  "ingresos": {
    "total": 170272.02,
    "ventas": 24,
    "mesAnterior": 285110.72,
    "variacionPct": -40.28,
    "comparadoHasta": "2026-10-25",
    "mesEnCurso": true
  },
  "gastos": {
    "total": 34766.14,
    "porCategoria": [
      {
        "categoria": "compras",
        "nombre": "Compras de material",
        "monto": 24866.14
      },
      {
        "categoria": "alquiler",
        "nombre": "Alquiler",
        "monto": 9000
      },
      {
        "categoria": "servicios",
        "nombre": "Luz, agua e internet",
        "monto": 900
      }
    ]
  },
  "resultado": {
    "total": 135505.88,
    "positivo": true
  },
  "pendientes": {
    "planilla": 34247.5,
    "resultadoEstimado": 101258.38
  },
  "cobrado": 139958.31,
  "porCobrar": {
    "total": 103804.53,
    "clientes": 18
  },
  "produccion": [
    {
      "producto": "Granito Negro San Gabriel",
      "cantidad": 35.66,
      "unidad": "m2"
    },
    {
      "producto": "Piedra sinterizada Calacatta",
      "cantidad": 32.33,
      "unidad": "m2"
    },
    {
      "producto": "Granito Amarillo Santa Cecilia",
      "cantidad": 25.13,
      "unidad": "m2"
    }
  ],
  "mermas": {
    "m2": 0,
    "porcentaje": 0,
    "cortadoM2": 1.51,
    "planchasCortadas": 1
  },
  "compras": [
    {
      "material": "Piedra sinterizada Calacatta",
      "sucursal": "Falta en: Casa Matriz — Showroom 4to anillo",
      "comprar": 5,
      "unidad": "planchas",
      "urgencia": "urgente",
      "costoEstimado": 23040
    },
    {
      "material": "Pegamento porcelanato (bolsa 25 kg)",
      "sucursal": "Casa Matriz — Showroom 4to anillo",
      "comprar": 34,
      "unidad": "bolsa",
      "urgencia": "pronto",
      "costoEstimado": 1972
    }
  ],
  "vendedores": [
    {
      "nombre": "Carla Mendoza",
      "proformas": 21,
      "ventas": 12,
      "conversionPct": 57.14,
      "vendido": 85927.34
    },
    {
      "nombre": "Jorge Suárez",
      "proformas": 9,
      "ventas": 3,
      "conversionPct": 33.33,
      "vendido": 21330.5
    }
  ],
  "actualizado": "2026-11-25T16:07:06.587Z"
}

```

## Archivos

- `src/App.jsx`: pantalla del PIN y panel.
- `src/calculos.js`: textos para leer en voz alta, variación y lectura de la merma (puros, con pruebas en `test/calculos.test.js`).
- `src/datosDemo.js`: genera datos de ejemplo con la misma forma que la API.
- `src/api.js`: llamadas a `/api`.
- `src/dueno.css`: estilos grandes. El tema base está en `packages/ui/src/tema.css`.
