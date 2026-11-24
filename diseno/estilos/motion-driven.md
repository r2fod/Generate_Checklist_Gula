# Estilo: Motion-Driven
> Tipo: General · Origen: 2020s Modern · Complejidad: High · ID: `motion-driven`

- **Palabras clave**: Animation-heavy, microinteractions, smooth transitions, scroll effects, parallax, entrance anim, page transitions
- **Colores primarios**: Bold colors emphasize movement, high contrast animated, dynamic gradients, accent action colors
- **Colores secundarios**: Transitional states, success (Green #22C55E), error (Red #EF4444), neutral feedback
- **Efectos y animación**: Scroll anim (Intersection Observer), hover (300-400ms), entrance, parallax (3-5 layers), page transitions
- **Ideal para**: Portfolio sites, storytelling platforms, interactive experiences, entertainment apps, creative, SaaS
- **No usar en**: Data dashboards, critical accessibility, low-power devices, content-heavy, motion-sensitive
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Build an animation-heavy interface with scroll-triggered animations, microinteractions, parallax scrolling (3-5 layers), smooth transitions (300-400ms), entrance animations, page transitions. Use Intersection Observer for scroll effects, transform for performance, GPU acceleration.
- **Palabras CSS**: animation: @keyframes scroll-reveal, transform: translateY/X, Intersection Observer API, will-change: transform, scroll-behavior: smooth, animation-duration: 300-400ms
- **Checklist de implementación**: ☐ Scroll animations active, ☐ Parallax 3-5 layers, ☐ Entrance animations smooth, ☐ Page transitions fluid, ☐ GPU accelerated, ☐ Prefers-reduced-motion respected
- **Variables de diseño**: --animation-duration: 300-400ms, --parallax-layers: 5, --scroll-behavior: smooth, --gpu-accelerated: true, --entrance-animation: true, --page-transition: smooth
- **Estado**: active
