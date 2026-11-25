# ESTADO — ERP Jerusalén S.R.L. (erpj / adminj)

## Etapa 1: Limpieza del repo + estructura apps/api + diseño base — COMPLETADA
- **Qué se hizo:**
  - Se eliminaron del repositorio la tienda online (`StoreCatalog`), catálogo público (`LandingPage`, `LinktreeSection`), carrito/POS antiguo (`PosCashier`, `AdminStockDashboard`), módulo de ganadería (`CattleManagement`, `dataCattle.js`), `data.js` y `xlsx`.
  - Se creó la estructura de monorepo liviano:
    - `apps/erp/src/ErpApp.jsx`: Interfaz del ERP completo (`erpj.cerice360.com`).
    - `apps/dueno/src/DuenoApp.jsx`: Panel ultra-simplificado para Don Emiliano Acero (`adminj.cerice360.com`), letra >= 20px, alto contraste, botones enormes y lectura en voz alta (Web Speech API).
    - `packages/ui/src/index.jsx`: Componentes y utilidades compartidas (`MarbleBackground` SVG liviano 0% CPU, `MuestraPiedra`, `EtiquetaEstado`, formateadores `fmtBs` y `fmtNum`).
    - `src/index.css`: Tema estética mármol/oro inspirado en la referencia, fuentes `Cinzel` (logo), `Cormorant Garamond` (títulos), `Inter` (interfaz), `IBM Plex Mono` (números), soporte completo de modo claro y modo noche (`[data-theme="dark"]`), adaptable a celular y tablet.
  - Se agregó `.env.example` sin secretos en el repositorio.
- **Cómo probar:**
  - `npm run build` compila el bundle de producción.
  - `npm run dev` levanta Vite; por defecto abre `apps/erp` (o `/?app=dueno` para ver `apps/dueno`).
- **Qué falta:**
  - Etapa 2: API + BD SQLite (WAL) + auth/roles + sucursales + seed realista boliviano (Santa Cruz, Bs).
  - Etapa 3: Proformas + ventas + PDF con marca y envío por WhatsApp.
  - Etapa 4: Producción/costos por proyecto + matriz de corte + inventario/retazos/mermas.
  - Etapa 5: Contabilidad simple + RRHH/planilla mensual.
  - Etapa 6: Reportes/gráficas + integración completa del panel del dueño (`adminj`).
  - Etapa 7: Pruebas automatizadas y `Dockerfile` / `docker-compose.yml` listos para producción.
