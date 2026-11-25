-- ERP Jerusalén S.R.L. — esquema SQLite
-- Montos en Bs, áreas en m², medidas de planchas en cm (1 cuadro = 1 cm).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sucursales (
  id          INTEGER PRIMARY KEY,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'mixta' CHECK (tipo IN ('showroom','fabrica','mixta')),
  direccion   TEXT NOT NULL DEFAULT '',
  ciudad      TEXT NOT NULL DEFAULT 'Santa Cruz de la Sierra',
  telefono    TEXT NOT NULL DEFAULT '',
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,
  pin_hash      TEXT,
  rol           TEXT NOT NULL CHECK (rol IN ('dueno','administrador','vendedor','cortador','contador','rrhh')),
  sucursal_id   INTEGER REFERENCES sucursales(id),
  telefono      TEXT NOT NULL DEFAULT '',
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token       TEXT PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL DEFAULT 'clave',      -- clave | pin
  expira_en   TEXT NOT NULL,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trabajadores (
  id            INTEGER PRIMARY KEY,
  nombre        TEXT NOT NULL,
  cargo         TEXT NOT NULL DEFAULT '',
  sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id),
  fecha_ingreso TEXT NOT NULL,
  fecha_salida  TEXT,
  sueldo        REAL NOT NULL DEFAULT 0,
  telefono      TEXT NOT NULL DEFAULT '',
  usuario_id    INTEGER REFERENCES usuarios(id),
  activo        INTEGER NOT NULL DEFAULT 1,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id         INTEGER PRIMARY KEY,
  nombre     TEXT NOT NULL,
  telefono   TEXT NOT NULL DEFAULT '',
  nit        TEXT NOT NULL DEFAULT '',
  direccion  TEXT NOT NULL DEFAULT '',
  ciudad     TEXT NOT NULL DEFAULT 'Santa Cruz de la Sierra',
  notas      TEXT NOT NULL DEFAULT '',
  creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Materiales: planchas (granito, mármol, cuarzo, sinterizada), insumos y servicios
CREATE TABLE IF NOT EXISTS materiales (
  id          INTEGER PRIMARY KEY,
  codigo      TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  categoria   TEXT NOT NULL CHECK (categoria IN ('plancha','insumo','servicio')),
  tipo        TEXT NOT NULL DEFAULT '',          -- granito | marmol | cuarzo | sinterizada | pegamento | cemento | ...
  unidad      TEXT NOT NULL DEFAULT 'm2',        -- m2 | plancha | bolsa | kg | unidad | ml | servicio
  espesor_cm  REAL,
  ancho_cm    INTEGER,                           -- tamaño estándar de la plancha
  alto_cm     INTEGER,
  origen      TEXT NOT NULL DEFAULT '',
  costo       REAL NOT NULL DEFAULT 0,           -- costo por unidad (por m² en planchas)
  precio      REAL NOT NULL DEFAULT 0,           -- precio de venta por unidad
  rendimiento REAL,                              -- insumos: consumo por m² (kg/m²)
  presentacion REAL,                             -- insumos: kg por bolsa/envase
  activo      INTEGER NOT NULL DEFAULT 1,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Existencias por sucursal. En planchas, `cantidad` = planchas enteras disponibles (se sincroniza).
CREATE TABLE IF NOT EXISTS existencias (
  material_id INTEGER NOT NULL REFERENCES materiales(id),
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  cantidad    REAL NOT NULL DEFAULT 0,
  minimo      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (material_id, sucursal_id)
);

CREATE TABLE IF NOT EXISTS movimientos (
  id          INTEGER PRIMARY KEY,
  fecha       TEXT NOT NULL,
  material_id INTEGER NOT NULL REFERENCES materiales(id),
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','venta')),
  cantidad    REAL NOT NULL,                     -- positivo entra, negativo sale
  costo_unit  REAL NOT NULL DEFAULT 0,
  referencia  TEXT NOT NULL DEFAULT '',
  usuario_id  INTEGER REFERENCES usuarios(id),
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planchas (
  id            INTEGER PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  material_id   INTEGER NOT NULL REFERENCES materiales(id),
  sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id),
  ancho         INTEGER NOT NULL DEFAULT 300,
  alto          INTEGER NOT NULL DEFAULT 170,
  espesor       REAL NOT NULL DEFAULT 2,
  estado        TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','en_corte','agotada')),
  fecha_ingreso TEXT NOT NULL,
  costo         REAL NOT NULL DEFAULT 0,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plancha_cortes (
  id          TEXT NOT NULL,
  plancha_id  INTEGER NOT NULL REFERENCES planchas(id) ON DELETE CASCADE,
  x INTEGER NOT NULL, y INTEGER NOT NULL, w INTEGER NOT NULL, h INTEGER NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('vendido','retazo','merma')),
  nota        TEXT NOT NULL DEFAULT '',
  padre_id    TEXT,
  usuario_id  INTEGER REFERENCES usuarios(id),
  fecha       TEXT NOT NULL,
  PRIMARY KEY (plancha_id, id)
);

CREATE TABLE IF NOT EXISTS plancha_historial (
  id          INTEGER PRIMARY KEY,
  plancha_id  INTEGER NOT NULL REFERENCES planchas(id) ON DELETE CASCADE,
  usuario_id  INTEGER REFERENCES usuarios(id),
  fecha       TEXT NOT NULL DEFAULT (datetime('now')),
  resumen     TEXT NOT NULL DEFAULT '',
  datos       TEXT NOT NULL                      -- JSON { plancha, cortes }
);

-- Retazos útiles (vienen de la matriz de corte)
CREATE TABLE IF NOT EXISTS retazos (
  id          INTEGER PRIMARY KEY,
  plancha_id  INTEGER NOT NULL REFERENCES planchas(id) ON DELETE CASCADE,
  corte_id    TEXT NOT NULL,
  material_id INTEGER NOT NULL REFERENCES materiales(id),
  sucursal_id INTEGER NOT NULL REFERENCES sucursales(id),
  ancho       INTEGER NOT NULL,
  alto        INTEGER NOT NULL,
  m2          REAL NOT NULL,
  libre_m2    REAL NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible','recortado','usado')),
  UNIQUE (plancha_id, corte_id)
);

CREATE TABLE IF NOT EXISTS proformas (
  id            INTEGER PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  cliente_id    INTEGER NOT NULL REFERENCES clientes(id),
  vendedor_id   INTEGER NOT NULL REFERENCES usuarios(id),
  sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id),
  fecha         TEXT NOT NULL,
  validez_dias  INTEGER NOT NULL DEFAULT 15,
  estado        TEXT NOT NULL DEFAULT 'borrador'
                CHECK (estado IN ('borrador','enviada','aceptada','convertida','vencida','rechazada')),
  descuento_pct REAL NOT NULL DEFAULT 0,
  subtotal      REAL NOT NULL DEFAULT 0,
  total         REAL NOT NULL DEFAULT 0,
  notas         TEXT NOT NULL DEFAULT '',
  motivo        TEXT NOT NULL DEFAULT '',          -- motivo de rechazo
  venta_id      INTEGER,
  enviada_en    TEXT,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proforma_items (
  id           INTEGER PRIMARY KEY,
  proforma_id  INTEGER NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL DEFAULT 0,
  tipo         TEXT NOT NULL CHECK (tipo IN ('plancha','pieza','servicio','insumo')),
  material_id  INTEGER REFERENCES materiales(id),
  descripcion  TEXT NOT NULL,
  ancho_cm     REAL,
  alto_cm      REAL,
  piezas       INTEGER,
  cantidad     REAL NOT NULL,
  unidad       TEXT NOT NULL DEFAULT 'm2',
  precio_unit  REAL NOT NULL,
  total        REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS ventas (
  id           INTEGER PRIMARY KEY,
  codigo       TEXT NOT NULL UNIQUE,
  fecha        TEXT NOT NULL,
  cliente_id   INTEGER NOT NULL REFERENCES clientes(id),
  vendedor_id  INTEGER NOT NULL REFERENCES usuarios(id),
  sucursal_id  INTEGER NOT NULL REFERENCES sucursales(id),
  proforma_id  INTEGER REFERENCES proformas(id),
  descuento_pct REAL NOT NULL DEFAULT 0,
  subtotal     REAL NOT NULL DEFAULT 0,
  total        REAL NOT NULL DEFAULT 0,
  costo        REAL NOT NULL DEFAULT 0,
  estado       TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','anulada')),
  notas        TEXT NOT NULL DEFAULT '',
  creado_en    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venta_items (
  id           INTEGER PRIMARY KEY,
  venta_id     INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL DEFAULT 0,
  tipo         TEXT NOT NULL,
  material_id  INTEGER REFERENCES materiales(id),
  descripcion  TEXT NOT NULL,
  ancho_cm     REAL, alto_cm REAL, piezas INTEGER,
  cantidad     REAL NOT NULL,
  unidad       TEXT NOT NULL DEFAULT 'm2',
  precio_unit  REAL NOT NULL,
  costo_unit   REAL NOT NULL DEFAULT 0,
  total        REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pagos (
  id          INTEGER PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  fecha       TEXT NOT NULL,
  monto       REAL NOT NULL CHECK (monto > 0),
  metodo      TEXT NOT NULL CHECK (metodo IN ('efectivo','qr','transferencia','tarjeta')),
  referencia  TEXT NOT NULL DEFAULT '',
  usuario_id  INTEGER REFERENCES usuarios(id),
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Proyectos / trabajos con cálculo de costos
CREATE TABLE IF NOT EXISTS proyectos (
  id            INTEGER PRIMARY KEY,
  codigo        TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  cliente_id    INTEGER REFERENCES clientes(id),
  sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id),
  material_id   INTEGER REFERENCES materiales(id),
  venta_id      INTEGER REFERENCES ventas(id),
  estado        TEXT NOT NULL DEFAULT 'cotizado' CHECK (estado IN ('cotizado','en_produccion','colocado','cancelado')),
  fecha         TEXT NOT NULL,
  fecha_fin     TEXT,
  entrada       TEXT NOT NULL,                    -- JSON con los datos del cálculo
  m2            REAL NOT NULL DEFAULT 0,
  costo_total   REAL NOT NULL DEFAULT 0,
  precio        REAL NOT NULL DEFAULT 0,
  creado_por    INTEGER REFERENCES usuarios(id),
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS egresos (
  id           INTEGER PRIMARY KEY,
  fecha        TEXT NOT NULL,
  sucursal_id  INTEGER NOT NULL REFERENCES sucursales(id),
  categoria    TEXT NOT NULL CHECK (categoria IN ('compras','planilla','alquiler','servicios','transporte','mantenimiento','impuestos','otros')),
  descripcion  TEXT NOT NULL DEFAULT '',
  monto        REAL NOT NULL CHECK (monto > 0),
  proveedor    TEXT NOT NULL DEFAULT '',
  planilla_id  INTEGER,
  usuario_id   INTEGER REFERENCES usuarios(id),
  creado_en    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planillas (
  id          INTEGER PRIMARY KEY,
  periodo     TEXT NOT NULL UNIQUE,              -- AAAA-MM
  datos       TEXT NOT NULL,                     -- JSON resultado de calcularPlanilla
  total       REAL NOT NULL,
  cerrada     INTEGER NOT NULL DEFAULT 0,
  creado_en   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ajustes (
  clave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL                           -- JSON
);

CREATE TABLE IF NOT EXISTS bitacora (
  id          INTEGER PRIMARY KEY,
  fecha       TEXT NOT NULL DEFAULT (datetime('now')),
  usuario_id  INTEGER,
  accion      TEXT NOT NULL,
  detalle     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS ix_ventas_fecha ON ventas(fecha);
CREATE INDEX IF NOT EXISTS ix_ventas_suc ON ventas(sucursal_id, fecha);
CREATE INDEX IF NOT EXISTS ix_vitems_venta ON venta_items(venta_id);
CREATE INDEX IF NOT EXISTS ix_vitems_mat ON venta_items(material_id);
CREATE INDEX IF NOT EXISTS ix_pagos_venta ON pagos(venta_id);
CREATE INDEX IF NOT EXISTS ix_pagos_fecha ON pagos(fecha);
CREATE INDEX IF NOT EXISTS ix_prof_estado ON proformas(estado, fecha);
CREATE INDEX IF NOT EXISTS ix_prof_vend ON proformas(vendedor_id);
CREATE INDEX IF NOT EXISTS ix_egresos_fecha ON egresos(fecha, sucursal_id);
CREATE INDEX IF NOT EXISTS ix_cortes_plancha ON plancha_cortes(plancha_id);
CREATE INDEX IF NOT EXISTS ix_mov_mat ON movimientos(material_id, sucursal_id);
