# Estilo: Dimensional Layering
> Tipo: General · Origen: 2020s Modern · Complejidad: Medium · ID: `dimensional-layering`

- **Palabras clave**: Depth, overlapping, z-index, layers, 3D, shadows, elevation, floating, cards, spatial hierarchy
- **Colores primarios**: Neutral base (#FFFFFF, #F5F5F5, #E0E0E0) + brand accent for elevated elements
- **Colores secundarios**: Shadow variations (sm/md/lg/xl), elevation colors, highlight colors for top layers
- **Efectos y animación**: z-index stacking, box-shadow elevation (4 levels), transform: translateZ(), backdrop-filter, parallax
- **Ideal para**: Dashboards, card layouts, modals, navigation, product showcases, SaaS interfaces
- **No usar en**: Print-style layouts, simple blogs, low-end devices, flat design requirements
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design with dimensional layering. Use: z-index depth (multiple layers), overlapping cards, elevation shadows (4 levels), floating elements, parallax depth, backdrop blur for hierarchy, spatial UI feel.
- **Palabras CSS**: z-index: 1-4 levels, box-shadow: elevation scale (sm/md/lg/xl), transform: translateZ(), backdrop-filter: blur(), position: relative for stacking, parallax on scroll
- **Checklist de implementación**: ☐ Layers clearly defined, ☐ Shadows show depth, ☐ Overlaps intentional, ☐ Hierarchy clear, ☐ Performance optimized, ☐ Mobile depth maintained
- **Variables de diseño**: --elevation-1: 0 1px 3px rgba(0,0,0,0.1), --elevation-2: 0 4px 6px rgba(0,0,0,0.1), --elevation-3: 0 10px 20px rgba(0,0,0,0.1), --elevation-4: 0 20px 40px rgba(0,0,0,0.15), --blur-amount: 8px
- **Estado**: active
