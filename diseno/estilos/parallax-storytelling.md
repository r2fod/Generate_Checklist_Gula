# Estilo: Parallax Storytelling
> Tipo: General · Origen: 2020s Modern · Complejidad: High · ID: `parallax-storytelling`

- **Palabras clave**: Scroll-driven, narrative, layered scrolling, immersive, progressive disclosure, cinematic, scroll-triggered
- **Colores primarios**: Story-dependent, often gradients and natural colors, section-specific palettes
- **Colores secundarios**: Section transition colors, depth layer colors, narrative mood colors
- **Efectos y animación**: transform: translateY(scroll), position: fixed/sticky, perspective: 1px, scroll-triggered animations
- **Ideal para**: Brand storytelling, product launches, case studies, portfolios, annual reports, marketing campaigns
- **No usar en**: E-commerce, dashboards, mobile-first, SEO-critical, accessibility-required
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:high|drivers:animation,large-images
- **Accesibilidad**: risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: not-recommended
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a parallax storytelling page. Use: scroll-driven narrative, layered backgrounds (3-5 layers), fixed/sticky sections, cinematic transitions, progressive disclosure, full-screen chapters, depth perception.
- **Palabras CSS**: position: fixed/sticky, transform: translateY(calc()), perspective: 1px, z-index layering, scroll-snap-type, Intersection Observer for triggers, will-change: transform
- **Checklist de implementación**: ☐ Layers parallax smoothly, ☐ Story flows naturally, ☐ Mobile alternative provided, ☐ Performance optimized, ☐ Skip option available, ☐ Reduced motion fallback
- **Variables de diseño**: --parallax-speed-bg: 0.3, --parallax-speed-mid: 0.6, --parallax-speed-fg: 1, --section-height: 100vh, --transition-duration: 600ms, --perspective: 1px
- **Alias**: Parallax
- **Estado**: active
