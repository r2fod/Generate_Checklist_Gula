# Estilo: Comparative Analysis Dashboard
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `comparative-analysis-dashboard`

- **Palabras clave**: Side-by-side comparisons, period-over-period metrics, A/B test results, regional comparisons, performance benchmarks
- **Colores primarios**: Comparison colors: primary (blue), comparison (orange/purple), delta indicator (green/red)
- **Colores secundarios**: Winning metric color (green), losing metric color (red), neutral comparison (grey), benchmark colors
- **Efectos y animación**: Comparison bar animations (grow to value), delta indicator animations (direction arrows), highlight on compare
- **Ideal para**: Period-over-period reporting, A/B test dashboards, market comparison, competitive analysis, regional performance
- **No usar en**: Single metric dashboards, future projections (use forecasting), real-time only (no historical)
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a comparison dashboard. Use: side-by-side metrics, period selectors (vs last month), delta indicators (+/-), benchmark lines, A/B comparison tables, winning/losing highlights, percentage change badges.
- **Palabras CSS**: display: flex for side-by-side, gap for comparison spacing, color coding (green up, red down), arrow indicators, diff highlighting, comparison table zebra striping
- **Checklist de implementación**: ☐ Period selector works, ☐ Deltas calculated, ☐ Colors meaningful, ☐ Benchmarks shown, ☐ Mobile stacks properly, ☐ Export comparison
- **Variables de diseño**: --positive-color: #22C55E, --negative-color: #EF4444, --neutral-color: #6B7280, --comparison-gap: 2rem, --arrow-size: 16px, --badge-padding: 4px 8px
- **Estado**: supplemental
