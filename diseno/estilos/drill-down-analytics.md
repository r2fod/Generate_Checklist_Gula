# Estilo: Drill-Down Analytics
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `drill-down-analytics`

- **Palabras clave**: Hierarchical data exploration, expandable sections, interactive drill-down paths, summary-to-detail flow, context preservation
- **Colores primarios**: Primary brand, breadcrumb colors, drill-level indicator colors, hierarchy depth colors
- **Colores secundarios**: Drill-down path indicator colors, level-specific colors, highlight colors for selected level, transition colors
- **Efectos y animación**: Drill-down expand animations, breadcrumb click transitions, smooth detail reveal, level change smooth, data reload animation
- **Ideal para**: Sales analytics, product analytics, funnel analysis, multi-dimensional data exploration, business intelligence
- **No usar en**: Simple linear data, single-metric dashboards, streaming real-time dashboards
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a drill-down analytics dashboard. Use: breadcrumb navigation, expandable sections, summary-to-detail flow, back button prominent, level indicators, context preservation, hierarchical data display.
- **Palabras CSS**: breadcrumb nav with separators, details/summary for expand, transition for drill animation, position: sticky breadcrumb, nested grid layouts, smooth scroll to detail
- **Checklist de implementación**: ☐ Breadcrumbs clear, ☐ Back navigation easy, ☐ Expand animation smooth, ☐ Context preserved, ☐ Mobile drill works, ☐ Deep links supported
- **Variables de diseño**: --breadcrumb-separator: /, --expand-duration: 300ms, --level-indent: 24px, --back-button-size: 40px, --context-bar-height: 48px, --drill-transition: 300ms ease
- **Estado**: supplemental
