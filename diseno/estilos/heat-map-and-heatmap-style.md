# Estilo: Heat Map & Heatmap Style
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `heat-map-and-heatmap-style`

- **Palabras clave**: Color-coded grid/matrix, data intensity visualization, geographical heat maps, correlation matrices, cell-based representation, gradient coloring
- **Colores primarios**: Gradient scale: Cool (blue #0080FF) to hot (red #FF0000), neutral middle (white/yellow)
- **Colores secundarios**: Support gradients: Light (cool blue) to dark (warm red), divergent for positive/negative data, monochromatic options
- **Efectos y animación**: Color gradient transitions on data change, cell highlighting on hover, tooltip reveal on click, smooth color animation
- **Ideal para**: Geographical analysis, performance matrices, correlation analysis, user behavior heatmaps, temperature/intensity data
- **No usar en**: Linear data representation, categorical comparisons (use bar charts), small datasets
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a heatmap visualization. Use: color gradient scale (cool to hot), cell-based grid, intensity legend, hover tooltips, geographic or matrix layout, divergent color scheme for +/- values, accessible color alternatives.
- **Palabras CSS**: display: grid, background: linear-gradient for legend, cell hover states, tooltip positioning, color scale (blue→white→red), SVG for geographic, canvas for large datasets
- **Checklist de implementación**: ☐ Color scale clear, ☐ Legend visible, ☐ Tooltips informative, ☐ Colorblind alternatives, ☐ Zoom/pan for geo, ☐ Performance for large data
- **Variables de diseño**: --heatmap-cool: #0080FF, --heatmap-neutral: #FFFFFF, --heatmap-hot: #FF0000, --cell-size: 24px, --legend-width: 200px, --tooltip-bg: rgba(0,0,0,0.9)
- **Alias**: Heat Map|Heat Map & Heatmap
- **Estado**: supplemental
