# API del ERP Jerusalén

Base: `/api`. JSON en las dos direcciones. La sesión viaja en una cookie httpOnly (`jerusalen_sesion`, SameSite=Lax, Secure si `COOKIE_SEGURA=1`).

- **Errores:** `{ "error": "mensaje en español", "errores"?: ["..."] }`, con los códigos 400 (JSON inválido), 401 (sin sesión), 403 (sin permiso), 404, 409 (conflicto o duplicado), 415 (la escritura no viene como JSON), 422 (validación) y 429 (demasiados intentos).
- **Escrituras** (POST, PUT, DELETE): deben enviarse con `Content-Type: application/json`, como protección CSRF.
- **Montos:** en Bs. Las áreas van en m² y las medidas de las planchas en cm.
- **Fechas:** `AAAA-MM-DD` y meses `AAAA-MM`. «Hoy» es la fecha de Bolivia (UTC−4), o `FECHA_HOY` si está definida.

## Permisos por rol

`e` = leer y escribir · `l` = solo leer · vacío = sin acceso. El cuadro completo está en `apps/api/src/permisos.js`.

| Módulo | administrador | vendedor | cortador | contador | rrhh | dueno |
|---|---|---|---|---|---|---|
| panel (inicio del ERP) | e | | | l | | |
| clientes, proformas, ventas | e | e (solo lo suyo) | | l | | |
| proyectos, planchas | e | l | e | | | |
| inventario | e | l | l | l | | |
| contabilidad | e | | | e | | |
| rrhh | e | | | l | e | |
| sucursales | e | l | l | l | e | |
| reportes | e | | | l | | |
| usuarios | e | | | | | |
| dueno (panel adminj) | l | | | | | l |

Una sesión abierta con PIN solo da acceso a `/api/dueno/*`.

## Autenticación

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| POST | `/auth/ingresar` | `{ email, clave }` → `{ usuario }`. El dueño no entra por aquí. Bloquea 5 minutos tras 5 fallos. |
| POST | `/auth/pin` | `{ pin }` (4 a 6 dígitos) → `{ usuario }`. Para el dueño o un administrador con PIN. La sesión dura 30 días. |
| GET | `/auth/yo` | → `{ usuario: { id, nombre, email, rol, rolNombre, sucursal_id, sucursal, permisos: { modulo: 'leer'\|'escribir' } }, tipoSesion }` |
| POST | `/auth/salir` | Cierra la sesión. |
| POST | `/auth/clave` | `{ actual, nueva }`. La nueva tiene al menos 8 caracteres. Cierra las otras sesiones. |
| GET | `/salud` | `{ ok, hoy }` |

## Base

| Método | Ruta | Notas |
|---|---|---|
| GET | `/sucursales` | Con el número de trabajadores. |
| POST, PUT | `/sucursales`, `/sucursales/:id` | `{ nombre, tipo: showroom\|fabrica\|mixta, direccion, ciudad, telefono, activo }` |
| GET | `/usuarios` | Solo administración. |
| POST, PUT | `/usuarios`, `/usuarios/:id` | `{ nombre, email, rol, sucursal_id, telefono, activo, clave?, pin? }`. Nadie puede quitarse a sí mismo el rol de administrador. |
| GET | `/personas?rol=vendedor` | Lista corta para filtros. |
| GET | `/clientes?q=&limite=` | Con `ventas`, `comprado` y `saldo`. |
| GET | `/clientes/:id` | Ficha con sus proformas, y sus ventas con saldo. |
| POST, PUT | `/clientes`, `/clientes/:id` | `{ nombre, telefono, nit, direccion, ciudad, notas }` |
| GET | `/ajustes` | `{ empresa, proformas, planilla }` |
| PUT | `/ajustes/:clave` | `empresa` \| `proformas` \| `planilla` (`salario_minimo`, `aporte_laboral_pct`). |
| GET | `/bitacora` | Las últimas 200 acciones. |

## Proformas y ventas

| Método | Ruta | Notas |
|---|---|---|
| GET | `/proformas?estado=&vendedor=&sucursal=&desde=&hasta=&q=&limite=` | Antes de responder, marca como vencidas las que pasaron su validez. Un vendedor solo ve las suyas. |
| GET | `/proformas/:id` | Incluye `items`, `vence`, `cliente_telefono`, `venta_codigo`, etc. |
| POST | `/proformas` | Ver el cuerpo abajo. |
| PUT | `/proformas/:id` | Mismo cuerpo. No se puede editar si está `convertida` o `rechazada`. |
| POST | `/proformas/:id/estado` | `{ estado, motivo? }`. Las transiciones válidas están en `packages/reportes/src/proformas.js`. |
| POST | `/proformas/:id/convertir` | `{ fecha?, pago?: { monto, metodo } }` → la venta creada. La proforma pasa a `convertida`. |
| POST | `/proformas/:id/duplicar` | Crea un borrador nuevo con los mismos ítems. |
| GET | `/ventas?desde=&hasta=&sucursal=&vendedor=&estado=&q=&conSaldo=1` | Con `pagado`, `saldo` y `estadoPago` (`pendiente`, `parcial` o `pagada`). |
| GET | `/ventas/:id` | Con `items` y `pagos`. |
| POST | `/ventas` | Venta directa: el mismo cuerpo de la proforma, más `pago?`. Los insumos se descuentan del stock. |
| POST | `/ventas/:id/pagos` | `{ monto, metodo: efectivo\|qr\|transferencia\|tarjeta, referencia?, fecha? }`. No puede superar el saldo (422). |
| POST | `/ventas/:id/anular` | Solo administración. `{ motivo }`. Devuelve los insumos al stock y la proforma vuelve a `aceptada`. |

Cuerpo de una proforma:

```json
{
  "cliente_id": 12,
  "cliente": { "nombre": "Cliente nuevo", "telefono": "71234567" },
  "sucursal_id": 1, "vendedor_id": 3, "fecha": "2026-11-25", "validez_dias": 15, "descuento_pct": 5, "notas": "",
  "estado": "borrador | enviada",
  "items": [
    { "tipo": "pieza", "material_id": 1, "descripcion": "Mesón", "ancho_cm": 240, "alto_cm": 62, "piezas": 1, "precio_unit": 480 },
    { "tipo": "servicio", "material_id": 37, "descripcion": "Canto pulido", "cantidad": 2.4, "unidad": "ml", "precio_unit": 80 }
  ]
}
```

- **Cliente:** se manda `cliente_id` o `cliente`. Con `cliente`, se crea al guardar.
- **Tipos de ítem:** `plancha`, `pieza`, `servicio` o `insumo`. En `pieza`, si vienen las medidas, la cantidad es ancho × alto × piezas en m²; si no, se usa `cantidad`.
- **Totales:** se calculan con `calcularTotales` de `@jerusalen/reportes`, la misma función que usa el front.

## Inventario, planchas y matriz de corte

| Método | Ruta | Notas |
|---|---|---|
| GET | `/materiales?categoria=plancha\|insumo\|servicio&q=&activos=0` | Con `stock_total`. |
| POST, PUT | `/materiales`, `/materiales/:id` | `{ codigo, nombre, categoria, tipo, unidad, costo, precio, espesor_cm, ancho_cm, alto_cm, origen, rendimiento, presentacion, activo }` |
| GET | `/existencias?sucursal=` | Con `estado` (`bajo`, `justo` u `ok`), `valor`, `retazos`, `retazos_m2` y `planchas_en_corte`. En planchas, `cantidad` = planchas enteras disponibles. |
| PUT | `/existencias` | `{ material_id, sucursal_id, minimo }` |
| GET, POST | `/movimientos` | Ver la nota abajo. |
| GET | `/planchas?sucursal=&material=&estado=&q=` | Con `resumen` (% vendido, retazo, merma y libre, y `libreM2`). |
| POST | `/planchas` | `{ material_id, sucursal_id, ancho?, alto?, espesor?, codigo?, costo? }` |
| GET | `/planchas/:id/cortes` | → `{ plancha: { id, codigo, ancho, alto, material, espesor }, cortes: [{ id, x, y, w, h, tipo, nota, padreId? }] }` |
| POST | `/planchas/:id/cortes` | Ver la nota abajo. |
| GET | `/planchas/:id/historial` y `/planchas/:id/historial/:hid` | Versiones guardadas, con el JSON completo. |
| GET | `/retazos?material=&sucursal=&minAncho=&minAlto=&todos=1` | Retazos disponibles. |
| PUT | `/retazos/:id` | `{ estado: disponible\|usado }` |
| GET | `/compras?sucursal=` | Lista de compras. Ver la nota abajo. |

- **`POST /movimientos`:** recibe `{ material_id, sucursal_id, tipo: entrada|salida|ajuste, cantidad, costo_unit, referencia, registrar_egreso, fecha? }`.
  - En planchas solo se acepta `entrada`: crea N planchas individuales, cada una con su matriz.
  - En un `ajuste`, la cantidad es el conteo físico real.
  - Si es una entrada con costo, registra el egreso «compras».
- **`POST /planchas/:id/cortes`:** recibe el mismo JSON que devuelve el GET.
  - Se valida con `cargarDatos` de la geometría (sin superposiciones, todo dentro de la plancha, padres válidos). Si algo falla responde 422.
  - Al guardar, sincroniza los retazos con el inventario, cambia el estado de la plancha (`disponible`, `en_corte` o `agotada`), actualiza las existencias y guarda una versión en el historial.
  - Guarda `usuario_id` por corte, que se usa en los reportes de merma por cortador.
- **`GET /compras`:** devuelve `[{ material_id, nombre, unidad, stock, minimo, demandaDiaria, demandaProyectada, diasRestantes, sugerido, urgencia: urgente|pronto, sucursal, costoEstimado }]`. La agrupación es por material para toda la empresa (o solo la sucursal elegida).

## Proyectos, contabilidad y RRHH

| Método | Ruta | Notas |
|---|---|---|
| POST | `/proyectos/calcular` | Mismo cuerpo que `entrada` → resultado de `calcularCostoProyecto`. |
| GET | `/proyectos?estado=&sucursal=` | Lista. |
| GET | `/proyectos/:id` | Con `entrada` y `calculo`. |
| POST, PUT | `/proyectos`, `/proyectos/:id` | `{ nombre, cliente_id?, sucursal_id, material_id?, venta_id?, estado, fecha?, entrada: { largo_m, ancho_m, m2?, costo_m2, desperdicio_pct, area_plancha_m2, insumos: [{ nombre, consumo_m2, presentacion, costo_presentacion }], horas, costo_hora, otros, margen_pct } }` |
| GET | `/produccion?desde=&hasta=&sucursal=` | `{ vendidos (m² de planchas por producto), colocados (m² de proyectos colocados), servicios }` |
| GET | `/egresos?desde=&hasta=&sucursal=&categoria=` | Lista de egresos. |
| POST | `/egresos` | `{ fecha, sucursal_id, categoria, descripcion, monto, proveedor }`. Categorías: compras, planilla, alquiler, servicios, transporte, mantenimiento, impuestos, otros. |
| DELETE | `/egresos/:id` | No borra los egresos que vienen de una planilla cerrada. |
| GET | `/contabilidad/resultado?desde=AAAA-MM&hasta=AAAA-MM&sucursal=` | `{ meses: [{ mes, ingresos, ventas, costoMercaderia, cobrado, egresos, porCategoria, resultado }], porSucursal, totales }`. Ingresos = ventas vigentes del mes. |
| GET | `/contabilidad/cobrar?sucursal=` | `{ total, filas: [{ venta, cliente, saldo… }] }` |
| GET | `/contabilidad/libro.csv?periodo=AAAA-MM` | CSV separado con «;», con BOM (se abre bien en Excel en español). |
| GET | `/trabajadores?sucursal=&activos=1` | Con `antiguedad: { anios, meses, dias, texto }`. |
| POST, PUT | `/trabajadores`, `/trabajadores/:id` | `{ nombre, cargo, sucursal_id, fecha_ingreso, fecha_salida?, sueldo, telefono, activo }` |
| GET | `/planillas` | Planillas guardadas. |
| GET | `/planillas/:periodo` | La guardada, o el cálculo al día: `{ lineas, totales, porSucursal, cerrada, config, sucursales }`. |
| POST | `/planillas/:periodo/cerrar` | Guarda la planilla y crea un egreso «planilla» por sucursal. Solo una vez por mes y nunca para meses futuros. |
| GET | `/planillas/:periodo/csv` | CSV de la planilla. |

## Reportes y paneles

| Método | Ruta | Respuesta |
|---|---|---|
| GET | `/reportes?desde=&hasta=&sucursal=&por=total\|cantidad` | `{ productos: { masVendidos, menosVendidos }, exito: { masExitoso, menosExitoso }, porMes, estacionalidad, porDiaSemana, tendencias, compras, vendedores, mermas: { porMaterial, porCortador }, produccion }` |
| GET | `/panel?sucursal=` | Inicio del ERP: `{ kpis, porMes, ultimas, porVencer, compras }` |
| GET | `/dueno/resumen?mes=AAAA-MM&sucursal=ID` | El panel del dueño. El contrato completo está en `apps/dueno/README.md`. |
