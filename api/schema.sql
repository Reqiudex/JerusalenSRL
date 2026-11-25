-- ERP Jerusalén S.R.L. (Santa Cruz, Bolivia) — Esquema SQLite (WAL)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sucursales (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo      TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  tipo        TEXT DEFAULT 'taller',      -- taller | showroom | almacen
  direccion   TEXT DEFAULT '',
  telefono    TEXT DEFAULT '',
  ciudad      TEXT DEFAULT 'Santa Cruz de la Sierra',
  encargado   TEXT DEFAULT '',
  activo      INTEGER DEFAULT 1,
  creado_en   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id               TEXT PRIMARY KEY,
  email            TEXT UNIQUE NOT NULL,
  nombre           TEXT NOT NULL,
  telefono         TEXT DEFAULT '',
  rol              TEXT NOT NULL,         -- dueno | administrador | vendedor | cortador | contador | rrhh
  rol_nombre       TEXT NOT NULL,
  sucursal_id      INTEGER REFERENCES sucursales(id),
  pin              TEXT,                  -- PIN 4-6 dígitos para Don Emiliano (dueno)
  activo           INTEGER DEFAULT 1,
  permisos         TEXT DEFAULT '["*"]',
  password_hash    TEXT,
  creado_en        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sesiones (
  token      TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id),
  creado_en  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trabajadores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id   INTEGER NOT NULL REFERENCES sucursales(id),
  nombre        TEXT NOT NULL,
  ci            TEXT DEFAULT '',
  cargo         TEXT NOT NULL,
  seccion       TEXT DEFAULT 'taller',    -- taller | corte | instalacion | showroom | administracion
  fecha_ingreso TEXT NOT NULL,            -- YYYY-MM-DD
  sueldo_bs     REAL NOT NULL DEFAULT 2500,
  bono_bs       REAL DEFAULT 0,
  coste_hora_bs REAL DEFAULT 25,
  telefono      TEXT DEFAULT '',
  activo        INTEGER DEFAULT 1,
  creado_en     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planillas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  periodo        TEXT NOT NULL,           -- YYYY-MM
  sucursal_id    INTEGER REFERENCES sucursales(id),
  trabajador_id  INTEGER NOT NULL REFERENCES trabajadores(id),
  sueldo_base_bs REAL NOT NULL,
  bono_antiguedad_bs REAL DEFAULT 0,
  otros_bonos_bs REAL DEFAULT 0,
  descuentos_bs  REAL DEFAULT 0,
  liquido_bs     REAL NOT NULL,
  pagado         INTEGER DEFAULT 1,
  fecha_pago     TEXT,
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clientes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL,
  tipo           TEXT DEFAULT 'particular', -- particular | constructora | arquitecto | condominio
  nit_ci         TEXT DEFAULT '',
  telefono       TEXT DEFAULT '',
  email          TEXT DEFAULT '',
  direccion      TEXT DEFAULT '',
  zona           TEXT DEFAULT 'Santa Cruz',
  notas          TEXT DEFAULT '',
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS materiales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT UNIQUE NOT NULL,
  sucursal_id    INTEGER NOT NULL REFERENCES sucursales(id),
  familia        TEXT DEFAULT 'plancha',  -- plancha | retazo | insumo | accesorio
  categoria      TEXT DEFAULT 'marmol',   -- marmol | granito | cuarzo | sinterizado | insumo
  nombre         TEXT NOT NULL,
  acabado        TEXT DEFAULT 'Pulido Espejo',
  grosor_mm      INTEGER DEFAULT 20,
  largo_cm       INTEGER DEFAULT 300,
  ancho_cm       INTEGER DEFAULT 170,
  unidad         TEXT DEFAULT 'm2',       -- m2 | plancha | kg | bolsa | ud
  origen         TEXT DEFAULT 'Espírito Santo, Brasil',
  proveedor      TEXT DEFAULT 'Mineração Capixaba S.A.',
  costo_bs       REAL NOT NULL DEFAULT 0, -- Costo por unidad (m2 o kg)
  precio_m2_bs   REAL NOT NULL DEFAULT 0, -- Precio de venta por m2
  precio_plancha_bs REAL DEFAULT 0,       -- Precio por plancha entera
  stock          REAL NOT NULL DEFAULT 0, -- Stock en unidad (m2 o kg)
  planchas_stock INTEGER DEFAULT 0,       -- Cantidad de planchas físicas
  minimo         REAL NOT NULL DEFAULT 10,
  rendimiento_kg_m2 REAL DEFAULT 0,       -- Para cola/cemento/pegamento
  muestra        TEXT,                    -- JSON {fondo, veta, motas}
  plancha_origen_id INTEGER,              -- Si es retazo, de qué plancha vino
  activo         INTEGER DEFAULT 1,
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proformas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT UNIQUE NOT NULL,
  sucursal_id    INTEGER NOT NULL REFERENCES sucursales(id),
  cliente_id     INTEGER REFERENCES clientes(id),
  cliente_nombre TEXT NOT NULL,
  cliente_nit    TEXT DEFAULT '',
  cliente_telefono TEXT DEFAULT '',
  vendedor_id    TEXT REFERENCES usuarios(id),
  vendedor_nombre TEXT NOT NULL,
  fecha          TEXT NOT NULL,           -- YYYY-MM-DD
  validez_dias   INTEGER DEFAULT 15,
  fecha_vencimiento TEXT,
  estado         TEXT DEFAULT 'enviada',  -- enviada | aceptada | convertida | vencida | rechazada
  subtotal_bs    REAL NOT NULL DEFAULT 0,
  descuento_pct  REAL DEFAULT 0,
  descuento_bs   REAL DEFAULT 0,
  total_bs       REAL NOT NULL DEFAULT 0,
  notas          TEXT DEFAULT '',
  venta_id       INTEGER,
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proforma_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  proforma_id    INTEGER NOT NULL REFERENCES proformas(id) ON DELETE CASCADE,
  material_id    INTEGER REFERENCES materiales(id),
  tipo_item      TEXT DEFAULT 'm2',       -- plancha | m2 | corte_colocacion
  descripcion    TEXT NOT NULL,
  largo_m        REAL DEFAULT 1,
  ancho_m        REAL DEFAULT 1,
  cantidad       REAL NOT NULL DEFAULT 1, -- m2 o unidades
  precio_unit_bs REAL NOT NULL DEFAULT 0,
  costo_unit_bs  REAL DEFAULT 0,
  subtotal_bs    REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ventas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo         TEXT UNIQUE NOT NULL,
  sucursal_id    INTEGER NOT NULL REFERENCES sucursales(id),
  proforma_id    INTEGER REFERENCES proformas(id),
  cliente_id     INTEGER REFERENCES clientes(id),
  cliente_nombre TEXT NOT NULL,
  cliente_nit    TEXT DEFAULT '',
  cliente_telefono TEXT DEFAULT '',
  vendedor_id    TEXT REFERENCES usuarios(id),
  vendedor_nombre TEXT NOT NULL,
  fecha          TEXT NOT NULL,           -- YYYY-MM-DD
  metodo_pago    TEXT DEFAULT 'Efectivo', -- Efectivo | QR | Transferencia | Tarjeta
  total_bs       REAL NOT NULL DEFAULT 0,
  costo_total_bs REAL DEFAULT 0,
  pagado_bs      REAL NOT NULL DEFAULT 0,
  saldo_bs       REAL NOT NULL DEFAULT 0,
  estado_pago    TEXT DEFAULT 'pagado',   -- pagado | parcial | credito
  notas          TEXT DEFAULT '',
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS venta_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id       INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  material_id    INTEGER REFERENCES materiales(id),
  tipo_item      TEXT DEFAULT 'm2',
  descripcion    TEXT NOT NULL,
  cantidad       REAL NOT NULL DEFAULT 1,
  m2             REAL DEFAULT 0,
  precio_unit_bs REAL NOT NULL DEFAULT 0,
  costo_unit_bs  REAL DEFAULT 0,
  subtotal_bs    REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS venta_pagos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id       INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  fecha          TEXT NOT NULL,
  metodo_pago    TEXT NOT NULL,           -- Efectivo | QR | Transferencia | Tarjeta
  monto_bs       REAL NOT NULL,
  referencia     TEXT DEFAULT '',
  usuario_nombre TEXT DEFAULT '',
  creado_en      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS proyectos_produccion (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo              TEXT UNIQUE NOT NULL,
  sucursal_id         INTEGER NOT NULL REFERENCES sucursales(id),
  cliente_id          INTEGER REFERENCES clientes(id),
  cliente_nombre      TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  tipo_trabajo        TEXT DEFAULT 'Cocina / Mesón',
  fecha               TEXT NOT NULL,
  estado              TEXT DEFAULT 'en_taller', -- medicion | en_taller | instalacion | terminado
  largo_m             REAL NOT NULL DEFAULT 7,
  ancho_m             REAL NOT NULL DEFAULT 8,
  area_m2             REAL NOT NULL DEFAULT 56,
  material_id         INTEGER REFERENCES materiales(id),
  material_nombre     TEXT NOT NULL,
  costo_material_m2_bs REAL NOT NULL DEFAULT 0,
  cola_kg_m2          REAL DEFAULT 4.5,
  costo_cola_kg_bs    REAL DEFAULT 12,
  cemento_kg_m2       REAL DEFAULT 6.0,
  costo_cemento_kg_bs REAL DEFAULT 2.5,
  pegamento_kg_m2     REAL DEFAULT 1.8,
  costo_pegamento_kg_bs REAL DEFAULT 28,
  horas_mo            REAL NOT NULL DEFAULT 40,
  costo_hora_mo_bs    REAL NOT NULL DEFAULT 35,
  desperdicio_pct     REAL NOT NULL DEFAULT 10,
  margen_pct          REAL NOT NULL DEFAULT 35,
  costo_piedra_bs     REAL NOT NULL DEFAULT 0,
  costo_insumos_bs    REAL NOT NULL DEFAULT 0,
  costo_mo_bs         REAL NOT NULL DEFAULT 0,
  costo_desperdicio_bs REAL NOT NULL DEFAULT 0,
  costo_total_bs      REAL NOT NULL DEFAULT 0,
  precio_servicio_bs  REAL NOT NULL DEFAULT 0,
  cortador_nombre     TEXT DEFAULT '',
  notas               TEXT DEFAULT '',
  creado_en           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planchas_corte (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT UNIQUE NOT NULL,
  sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
  material_id     INTEGER REFERENCES materiales(id),
  material_nombre TEXT NOT NULL,
  cortador_id     TEXT REFERENCES usuarios(id),
  cortador_nombre TEXT NOT NULL,
  fecha           TEXT NOT NULL,
  ancho_cm        INTEGER NOT NULL DEFAULT 300,
  alto_cm         INTEGER NOT NULL DEFAULT 170,
  area_total_m2   REAL NOT NULL DEFAULT 5.1,
  usado_m2        REAL NOT NULL DEFAULT 0,
  retazo_m2       REAL NOT NULL DEFAULT 0,
  merma_m2        REAL NOT NULL DEFAULT 0,
  sin_asignar_m2  REAL NOT NULL DEFAULT 0,
  usado_pct       REAL NOT NULL DEFAULT 0,
  retazo_pct      REAL NOT NULL DEFAULT 0,
  merma_pct       REAL NOT NULL DEFAULT 0,
  costo_m2_bs     REAL DEFAULT 850,
  costo_merma_bs  REAL DEFAULT 0,
  rectangulos     TEXT NOT NULL DEFAULT '[]', -- JSON [{id, x, y, w, h, tipo: 'usada'|'retazo'|'merma', etiqueta, cliente}]
  plancha_padre_id INTEGER,
  notas           TEXT DEFAULT '',
  creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retazos (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo          TEXT UNIQUE NOT NULL,
  sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
  plancha_corte_id INTEGER REFERENCES planchas_corte(id),
  material_id     INTEGER REFERENCES materiales(id),
  material_nombre TEXT NOT NULL,
  ancho_cm        INTEGER NOT NULL,
  alto_cm         INTEGER NOT NULL,
  area_m2         REAL NOT NULL,
  valor_estimado_bs REAL DEFAULT 0,
  estado          TEXT DEFAULT 'disponible', -- disponible | reutilizado | descartado
  ubicacion       TEXT DEFAULT 'Caballete Retazos',
  creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS movimientos_contables (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  sucursal_id     INTEGER NOT NULL REFERENCES sucursales(id),
  fecha           TEXT NOT NULL,           -- YYYY-MM-DD
  tipo            TEXT NOT NULL,           -- ingreso | egreso
  categoria       TEXT NOT NULL,           -- Ventas | Cobros Crédito | Compra Planchas Brasil | Planilla Sueldos | Insumos y Discos | Transporte y Grúa | Servicios y Alquiler
  concepto        TEXT NOT NULL,
  metodo_pago     TEXT DEFAULT 'Transferencia',
  monto_bs        REAL NOT NULL,
  referencia      TEXT DEFAULT '',
  venta_id        INTEGER,
  usuario_nombre  TEXT DEFAULT '',
  creado_en       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
