# Estilo: Data-Dense Dashboard
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `data-dense-dashboard`

- **Palabras clave**: Multiple charts/widgets, data tables, KPI cards, minimal padding, grid layout, space-efficient, maximum data visibility
- **Colores primarios**: Neutral primary (light grey/white #F5F5F5), data colors (blue/green/red), dark text #333333
- **Colores secundarios**: Chart colors: success (green #22C55E), warning (amber #F59E0B), alert (red #EF4444), neutral (grey)
- **Efectos y animación**: Hover tooltips, chart zoom on click, row highlighting on hover, smooth filter animations, data loading spinners
- **Ideal para**: Business intelligence dashboards, financial analytics, enterprise reporting, operational dashboards, data warehousing
- **No usar en**: Marketing dashboards, consumer-facing analytics, simple reporting
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a data-dense dashboard. Use: multiple chart widgets, KPI cards row, data tables with sorting, minimal padding (8-12px), efficient grid layout, filter sidebar, dense but readable typography, maximum information density.
- **Palabras CSS**: display: grid, grid-template-columns: repeat(12, 1fr), gap: 8px, padding: 12px, font-size: 12-14px, overflow: auto for tables, compact card design, sticky headers
- **Checklist de implementación**: ☐ Grid layout 12 columns, ☐ KPI cards responsive, ☐ Tables sortable, ☐ Filters functional, ☐ Loading states for data, ☐ Export functionality
- **Variables de diseño**: --grid-gap: 8px, --card-padding: 12px, --font-size-small: 12px, --table-row-height: 36px, --sidebar-width: 240px, --header-height: 56px
- **Alias**: Data-Dense
- **Estado**: active
