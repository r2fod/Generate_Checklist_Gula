# Estilo: Neo Brutalism (Mobile)
> Tipo: Mobile · Origen: 2020s Neo-Brutalism · Complejidad: High · ID: `neo-brutalism-mobile`

- **Palabras clave**: neo brutalism, pop art, stickers, thick borders, cream background, hot red, vivid yellow, soft violet, hard offset shadow, mechanical press, collage
- **Colores primarios**: Cream #FFFDF5, Hot Red #FF6B6B, Vivid Yellow #FFD93D
- **Colores secundarios**: Soft Violet #C4B5FD, Pure Black #000000, White #FFFFFF
- **Efectos y animación**: Thick 4px black borders on all major elements, hard offset shadows (4–8px, no blur), mechanical press: translateX/Y equal to shadow offset, slightly rotated cards/badges (-2deg/2deg), high-saturation color blocking, spring/linear animations only
- **Ideal para**: Creative tools, collab platforms, Gen Z marketing & e-commerce, portfolio sites, sticker-book style content apps
- **No usar en**: Serious enterprise apps, conservative industries, sober fintech, accessibility-first contexts (must tune contrast)
- **Modo claro**: supported
- **Modo oscuro**: not-recommended
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a Neo Brutalism (Mobile) mobile interface using neo brutalism, pop art, stickers, thick borders, cream background, hot red, vivid yellow, soft violet. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: borderWidth: 4 (primary), 2 (secondary), borderRadius: 0 or 999 (badges only), backgroundColor: '#FFFDF5', shadow implemented as offset View, transform: [{translateX:4},{translateY:4}] on PressIn, fontFamily: 'SpaceGrotesk-Bold', fontWeight: '700/900', transform: [{ rotate: '-1deg' }] on cards, padding: 20
- **Checklist de implementación**: ☐ 4px borders on major elements, ☐ Hard offset shadow implemented via extra View, ☐ Mechanical press hides shadow, ☐ Cream canvas background, ☐ Pop-art color palette used, ☐ Cards/badges slightly rotated, ☐ No gradients or soft shadows, ☐ Only bold/black type weights, ☐ Badges slapped with absolute positioning, ☐ Anti-patterns (no subtle gray, no blur) avoided
- **Variables de diseño**: --bg: #FFFDF5, --ink: #000000, --accent-primary: #FF6B6B, --accent-secondary: #FFD93D, --accent-muted: #C4B5FD, --white: #FFFFFF, --border-primary: 4px solid #000000, --shadow-offset-small: 4px, --shadow-offset-medium: 8px, --radius: 0px, --radius-pill: 999px, --font: Space Grotesk
- **Estado**: supplemental
