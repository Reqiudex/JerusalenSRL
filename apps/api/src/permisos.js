// Permisos por rol y módulo: 'l' = leer, 'e' = leer y escribir.
export const ROLES = {
  dueno: 'Dueño',
  administrador: 'Administrador',
  vendedor: 'Vendedor',
  cortador: 'Cortador / Arquitecto',
  contador: 'Contador',
  rrhh: 'Recursos humanos',
}

export const PERMISOS = {
  // El panel general y los reportes muestran totales y márgenes de toda la empresa: solo administración y contabilidad
  panel:        { administrador: 'e', contador: 'l' },
  clientes:     { administrador: 'e', vendedor: 'e', contador: 'l' },
  proformas:    { administrador: 'e', vendedor: 'e', contador: 'l' },
  ventas:       { administrador: 'e', vendedor: 'e', contador: 'l' },
  proyectos:    { administrador: 'e', cortador: 'e', vendedor: 'l' },
  planchas:     { administrador: 'e', cortador: 'e', vendedor: 'l' },
  inventario:   { administrador: 'e', cortador: 'l', vendedor: 'l', contador: 'l' },
  contabilidad: { administrador: 'e', contador: 'e' },
  rrhh:         { administrador: 'e', rrhh: 'e', contador: 'l' },
  sucursales:   { administrador: 'e', rrhh: 'e', vendedor: 'l', cortador: 'l', contador: 'l' },
  reportes:     { administrador: 'e', contador: 'l' },
  usuarios:     { administrador: 'e' },
  ajustes:      { administrador: 'e', vendedor: 'l', cortador: 'l', contador: 'l', rrhh: 'l' },
  dueno:        { dueno: 'l', administrador: 'l' },
}

export function puede(rol, modulo, accion = 'leer') {
  const nivel = PERMISOS[modulo]?.[rol]
  if (!nivel) return false
  return accion === 'leer' ? true : nivel === 'e'
}

/** Mapa de permisos del rol (para el front). */
export function permisosDeRol(rol) {
  const salida = {}
  for (const [modulo, roles] of Object.entries(PERMISOS)) if (roles[rol]) salida[modulo] = roles[rol] === 'e' ? 'escribir' : 'leer'
  return salida
}
