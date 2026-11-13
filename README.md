# Jerusalén S.R.L. - Stone Tech Center & Agroganadera

Aplicación web integral desarrollada para la administración y comercialización de mármol, granito, cuarzo y piedra sinterizada importada de Brasil, junto con el sistema de control de ventas, facturación comercial, logística de importación y módulo de gestión ganadera de alta genética.

---

## Módulos del Sistema

1. **Landing Page Oficial:** Presentación corporativa con identidad de marca, vitrina de piedras importadas de canteras de Brasil (Espírito Santo, Minas Gerais, Paraná), proyectos ejecutados y contacto oficial.
2. **Tienda y Catálogo por Pieza:** Venta de planchas enteras (dimensiones, espesor, acabado, origen), reserva de piezas en tiempo real y cotizaciones directas a WhatsApp.
3. **Sistema Cajero POS:** Ventas rápidas con atribución a cajeros en turno, atajos de teclado (`F2`, `F4`, `F8`, `F9`), métodos de pago (Efectivo, QR, Tarjeta, Transferencia) y generación automática de **Factura Comercial en PDF**.
4. **Administración de Stock & Compras Brasil:**
   - Inventario físico en tiempo real por plancha/pieza.
   - Seguimiento logístico internacional de importaciones (FOB, flete, aduana Corumbá/Puerto Quijarro).
   - Exportación de datos a **Excel (.xlsx)** y reporte para gerencia en **PDF**.
5. **Gestión Ganadera & Pedigrí:**
   - Registro de ejemplares (Nelore, Brahman, Girolando).
   - **Árbol genealógico interactivo** de 3 generaciones (Padres, Abuelos paternos y maternos).
   - Control de compras en subasta con planes de pago por cuotas.
   - Calendario reproductivo (IATF, inseminación, stock de pajuelas de semen criogénico).
   - Calendario de vacunación y sanidad oficial SENASAG.
6. **Linktree Premium:** Landing de enlaces rápidos con estética de mármol y oro, mapa de showrooms y almacenes.
7. **Fondo de Mármol Vectorial Optimizado:** Fondo estático infinito con vetas de oro líquido 24K y grafito negro (0% uso de CPU).

---

## Despliegue con Docker

### Requisitos
- Docker y Docker Compose instalados.

### Iniciar contenedor
```bash
# Construir y levantar el contenedor
docker compose up -d --build
```

La aplicación estará disponible inmediatamente en:
`http://localhost:3030`

### Detener el contenedor
```bash
docker compose down
```

---

## Desarrollo Local (Vite)

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev -- --port 3030

# Compilar para producción
npm run build
```

---

## Tecnologías Utilizadas
- **React 19** + **Vite 5**
- **Lucide React** (Iconografía)
- **jsPDF** & **jspdf-autotable** (Facturas y reportes PDF)
- **XLSX** (Exportación de planillas Excel)
- **NGINX Alpine** (Servidor web en contenedor Docker)
