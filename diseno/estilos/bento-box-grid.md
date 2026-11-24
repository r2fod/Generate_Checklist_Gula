# Estilo: Bento Box Grid
> Tipo: General · Origen: 2020s Apple · Complejidad: Low · ID: `bento-box-grid`

- **Palabras clave**: Modular cards, asymmetric grid, varied sizes, Apple-style, dashboard tiles, negative space, clean hierarchy, cards
- **Colores primarios**: Neutral base + brand accent, #FFFFFF, #F5F5F5, brand primary
- **Colores secundarios**: Subtle gradients, shadow variations, accent highlights for interactive cards
- **Efectos y animación**: grid-template with varied spans, rounded-xl (16px), subtle shadows, hover scale (1.02), smooth transitions
- **Ideal para**: Dashboards, product pages, portfolios, Apple-style marketing, feature showcases, SaaS
- **No usar en**: Dense data tables, text-heavy content, real-time monitoring
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a Bento Box grid layout. Use: modular cards with varied sizes (1x1, 2x1, 2x2), Apple-style aesthetic, rounded corners (16-24px), soft shadows, clean hierarchy, asymmetric grid, neutral backgrounds (#F5F5F7), hover effects.
- **Palabras CSS**: display: grid, grid-template-columns: repeat(4, 1fr), grid-auto-rows: 200px, gap: 16px, border-radius: 24px, background: #FFFFFF, box-shadow: 0 4px 6px rgba(0,0,0,0.05)
- **Checklist de implementación**: ☐ Grid responsive (4→2→1 cols), ☐ Card spans varied, ☐ Rounded corners consistent, ☐ Shadows subtle, ☐ Content fits cards, ☐ Hover scale (1.02)
- **Variables de diseño**: --grid-gap: 16px, --card-radius: 24px, --card-bg: #FFFFFF, --page-bg: #F5F5F7, --shadow: 0 4px 6px rgba(0,0,0,0.05), --hover-scale: 1.02
- **Alias**: Bento Grids|Masonry Grid
- **Estado**: active
