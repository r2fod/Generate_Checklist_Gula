# Estilo: Glassmorphism
> Tipo: General · Origen: 2020s Modern · Complejidad: Medium · ID: `glassmorphism`

- **Palabras clave**: Frosted glass, transparent, blurred background, layered, vibrant background, light source, depth, multi-layer
- **Colores primarios**: Translucent white: rgba(255,255,255,0.1-0.3)
- **Colores secundarios**: Vibrant: Electric Blue #0080FF, Neon Purple #8B00FF, Vivid Pink #FF1493, Teal #20B2AA
- **Efectos y animación**: Backdrop blur (10-20px), subtle border (1px solid rgba white 0.2), light reflection, Z-depth
- **Ideal para**: Modern SaaS, financial dashboards, high-end corporate, lifestyle apps, modal overlays, navigation
- **No usar en**: Low-contrast backgrounds, critical accessibility, performance-limited, dark text on dark
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a glassmorphic interface with frosted glass effect. Use backdrop blur (10-20px), translucent overlays (rgba 10-30% opacity), vibrant background colors, subtle borders, light source reflection, layered depth. Perfect for modern overlays and cards.
- **Palabras CSS**: backdrop-filter: blur(15px), background: rgba(255, 255, 255, 0.15), border: 1px solid rgba(255,255,255,0.2), -webkit-backdrop-filter: blur(15px), z-index layering for depth
- **Checklist de implementación**: ☐ Backdrop-filter blur 10-20px, ☐ Translucent white 15-30% opacity, ☐ Subtle border 1px light, ☐ Vibrant background verified, ☐ Text contrast 4.5:1 checked
- **Variables de diseño**: --blur-amount: 15px, --glass-opacity: 0.15, --border-color: rgba(255,255,255,0.2), --background: vibrant color, --text-color: light/dark based on BG
- **Estado**: active
