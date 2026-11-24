# Estilo: Liquid Glass
> Tipo: Platform/Material · Origen: Apple platforms, 2025 · Complejidad: High · ID: `liquid-glass`

- **Palabras clave**: dynamic material, optical glass, translucency, lensing, refraction, fluid morphing, system navigation
- **Colores primarios**: Adaptive translucent material derived from surrounding content; use color judiciously
- **Colores secundarios**: Semantic content and system tint colors; preserve legibility and hierarchy
- **Efectos y animación**: Lensing and refraction, adaptive translucency, and fluid morph transitions aligned to Apple platform behavior
- **Ideal para**: Apple-platform navigation, controls, and system-aligned app chrome
- **No usar en**: content layers, dense reading surfaces, or custom effects without accessibility fallbacks
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ◐ Medium
- **Palabras para prompt**: Apply Apple Liquid Glass sparingly to navigation and controls. Use dynamic translucent material, lensing, and fluid transitions while keeping content clear. Respect reduced transparency and reduced motion settings.
- **Palabras CSS**: platform material, adaptive translucency, lensing, refraction, reduced transparency, reduced motion
- **Checklist de implementación**: ☐ Use for navigation and controls, ☐ Keep content on a separate layer, ☐ Apply color judiciously, ☐ Test reduced transparency, ☐ Test reduced motion, ☐ Verify text and control contrast
- **Variables de diseño**: --material-role: navigation-controls, --translucency: adaptive, --tint: semantic, --reduced-transparency-fallback: opaque, --motion: platform-aligned
- **Alias**: Apple Liquid Glass
- **Estado**: active
