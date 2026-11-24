# Estilo: Kinetic Brutalism (Mobile)
> Tipo: Mobile · Origen: 2020s Mobile Brutalism · Complejidad: High · ID: `kinetic-brutalism-mobile`

- **Palabras clave**: kinetic, brutalism, motion, marquee, acid yellow, uppercase, oversized, aggressive typography, street, zine, high contrast, scroll-driven, haptic, reanimated
- **Colores primarios**: Acid Yellow #DFE104, Rich Black #09090B
- **Colores secundarios**: Off-white #FAFAFA, Dark Gray #27272A, Zinc #A1A1AA, Border Zinc #3F3F46
- **Efectos y animación**: Infinite marquee (Reanimated, Linear easing, 5s loop, hard clip), hero parallax (scale 1.0→1.3 + fade), sticky section header push, card flood inversion on press (bg→#DFE104, text→#000000), haptic Medium on every press, scroll-triggered interpolate transforms, 0px radius, 2px borders, 100ms color transitions
- **Ideal para**: Immersive storytelling apps, brand flagship mobile, music/culture platforms, sports apps, underground zines, limited-edition product drops, performance dashboards
- **No usar en**: Calm informational apps, healthcare, finance contexts needing trust, children's, any context where aggressive typography feels inappropriate
- **Modo claro**: supported
- **Modo oscuro**: conditional
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High energy
- **Palabras para prompt**: Design a Kinetic Brutalism (Mobile) mobile interface using kinetic, brutalism, motion, marquee, acid yellow, uppercase, oversized, aggressive typography. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: borderRadius: 0, borderWidth: 2, borderColor: '#3F3F46', backgroundColor: '#09090B', color: '#FAFAFA', fontWeight: '800 or 900', letterSpacing: -1 (large) or 2 (labels), lineHeight: 0.9–1.1 * fontSize, Reanimated withRepeat marquee timing 5000ms Easing.linear, Interpolate scroll→scale + opacity, Haptics.impactAsync(Medium), scale press: 0.95, 100ms color transitions
- **Checklist de implementación**: ☐ Infinite marquee rows (Reanimated, no fade edges), ☐ Hero parallax scroll (scale+opacity Interpolate), ☐ All display text uppercase, ☐ 0px border-radius, ☐ 2px borders, ☐ Acid yellow card flood on press, ☐ Haptic Medium on every interaction, ☐ Font scale helper (windowWidth/375*size), ☐ Safe area for massive headers, ☐ Reduced motion stops marquees
- **Variables de diseño**: --bg: #09090B, --fg: #FAFAFA, --muted: #27272A, --muted-fg: #A1A1AA, --accent: #DFE104, --accent-fg: #000000, --border: #3F3F46, --radius: 0px, --border-width: 2px, --shadow: none, --marquee-speed: 5000ms, --press-duration: 100ms, --font: Space Grotesk or Inter
- **Estado**: supplemental
