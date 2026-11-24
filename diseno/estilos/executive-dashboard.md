# Estilo: Executive Dashboard
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `executive-dashboard`

- **Palabras clave**: High-level KPIs, large key metrics, minimal detail, summary view, trend indicators, at-a-glance insights, executive summary
- **Colores primarios**: Brand colors, professional palette (blue/grey/white), accent for KPIs, red for alerts/concerns
- **Colores secundarios**: KPI highlight colors: positive (green), negative (red), neutral (grey), trend arrow colors
- **Efectos y animación**: KPI value animations (count-up), trend arrow direction animations, metric card hover lift, alert pulse effect
- **Ideal para**: C-suite dashboards, business summary reports, decision-maker dashboards, strategic planning views
- **No usar en**: Detailed analyst dashboards, technical deep-dives, operational monitoring
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: not-recommended
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design an executive dashboard. Use: large KPI cards (4-6 max), trend sparklines, high-level summary only, clean layout with white space, traffic light indicators (red/yellow/green), at-a-glance insights, minimal detail.
- **Palabras CSS**: display: flex for KPI row, large font-size (24-48px) for metrics, sparkline SVG inline, status indicators (border-left color), card shadows for hierarchy, responsive breakpoints
- **Checklist de implementación**: ☐ KPIs 4-6 maximum, ☐ Trends visible, ☐ Status colors clear, ☐ One-page view, ☐ Mobile simplified, ☐ Print-friendly layout
- **Variables de diseño**: --kpi-font-size: 48px, --sparkline-height: 32px, --status-green: #22C55E, --status-yellow: #F59E0B, --status-red: #EF4444, --card-min-width: 280px
- **Estado**: supplemental
