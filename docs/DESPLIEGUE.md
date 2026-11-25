# Despliegue

Una sola aplicación Node sirve la API y las dos webs:

- `erpj.cerice360.com`: la API entrega el ERP (`apps/erp/dist`).
- `adminj.cerice360.com`: cuando el dominio empieza con `adminj`, la API entrega el panel del dueño (`apps/dueno/dist`).
- En cualquier dominio, `/dueno/` también abre el panel del dueño (útil para probar).
- `jerusalen2.cerice360.com`: es la demo de referencia (`jerusalen-sistema`). Va tal cual, en su propio contenedor, y **no es parte de este repo**.

Los datos viven en una sola base SQLite (modo WAL), en `DATA_DIR` (en el servidor: `/mnt/disco-lento/jerusalen/jerusalen-erp.sqlite`).

## Opción A: Docker (recomendada)

```bash
cp .env.example .env            # ajustar claves; borrar FECHA_HOY con datos reales
sudo mkdir -p /mnt/disco-lento/jerusalen && sudo chown 1000:1000 /mnt/disco-lento/jerusalen
docker compose up -d --build    # escucha en 127.0.0.1:3100
curl http://127.0.0.1:3100/api/salud
```

- **Puerto:** `docker-compose.yml` publica solo en `127.0.0.1:3100`; la publicación hacia afuera la hace nginx o el túnel.
- **Demo:** `FECHA_HOY=2026-11-25` hace que la demo se vea «al día». Para producción, quitar esa variable.
- **Datos reales:** con la base vacía, usar `SEMBRAR_DEMO=0` más `ADMIN_EMAIL` y `ADMIN_CLAVE`. El servidor crea solo la sucursal y el administrador.
- **Reiniciar la demo:** `docker compose exec erp-jerusalen node apps/api/src/semilla.js --reiniciar`. Luego reiniciar el contenedor.

## Opción B: Node directo (pm2 o systemd)

```bash
npm ci && npm run build
DATA_DIR=/mnt/disco-lento/jerusalen PORT=3100 COOKIE_SEGURA=1 node apps/api/src/servidor.js
```

Ejemplo de unidad de systemd:

```ini
[Service]
WorkingDirectory=/opt/jerusalen-erp
Environment=PORT=3100 DATA_DIR=/mnt/disco-lento/jerusalen COOKIE_SEGURA=1
ExecStart=/usr/bin/node apps/api/src/servidor.js
Restart=always
User=jerusalen
```

## Dominios

- **Con nginx:** el ejemplo está en `despliegue/nginx-jerusalen.conf`. `erpj` y `adminj` van a `127.0.0.1:3100`, y `jerusalen2` a `127.0.0.1:3000`. Hay que pasar el encabezado `Host` (la API lo usa para saber qué app entregar).
- **Con un túnel** (lo maneja la sesión de infraestructura): apuntar `erpj` y `adminj` a `http://127.0.0.1:3100`, y `jerusalen2` al contenedor de la referencia.
- **Detrás de HTTPS:** poner `COOKIE_SEGURA=1`.

## jerusalen2 (demo de referencia, para comparar)

En la carpeta `jerusalen-sistema` (no incluida aquí):

```bash
cp .env.example .env    # ADMIN_PASSWORD con una clave de demo propia; FECHA_HOY=2026-11-25
docker compose up -d --build   # usa su propio puerto 3000 y su propia base
```

Ese sitio usa sus **propios** usuarios demo y su base, separada de la del ERP.

## Copias de seguridad

Con la API en marcha es seguro copiar en caliente, gracias al modo WAL:

```bash
sqlite3 /mnt/disco-lento/jerusalen/jerusalen-erp.sqlite ".backup '/mnt/disco-lento/jerusalen/respaldo-$(date +%F).sqlite'"
```

Se recomienda una copia diaria por cron, guardando las últimas 30.

## Lista de control antes de abrir al público

- [ ] Cambiar las claves y el PIN de la demo, o arrancar en limpio con `SEMBRAR_DEMO=0`.
- [ ] Quitar `FECHA_HOY`.
- [ ] Poner `COOKIE_SEGURA=1` con HTTPS.
- [ ] Revisar los parámetros de la planilla (salario mínimo y aporte) en Ajustes, junto con la contadora.
- [ ] Cargar los datos reales de la empresa (NIT, teléfono, WhatsApp) en Ajustes, para que salgan en el PDF.
- [ ] Programar las copias de seguridad.
