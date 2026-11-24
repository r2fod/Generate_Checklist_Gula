# Estilo: Spatial UI (VisionOS)
> Tipo: General · Origen: 2024 Spatial Era · Complejidad: High · ID: `spatial-ui-visionos`

- **Palabras clave**: Glass, depth, immersion, spatial, translucent, gaze, gesture, apple, vision-pro
- **Colores primarios**: Frosted Glass #FFFFFF (15-30% opacity), System White
- **Colores secundarios**: Vibrant system colors for active states, deep shadows for depth
- **Efectos y animación**: Parallax depth, dynamic lighting response, gaze-hover effects, smooth scale on focus
- **Ideal para**: Spatial computing apps, VR/AR interfaces, immersive media, futuristic dashboards
- **No usar en**: Text-heavy documents, high-contrast requirements, non-3D capable devices
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a VisionOS-style spatial interface. Use: frosted glass panels, depth layers, translucent backgrounds (15-30% opacity), vibrant colors for active states, gaze-hover effects, floating windows, immersive feel.
- **Palabras CSS**: backdrop-filter: blur(40px) saturate(180%), background: rgba(255,255,255,0.2), border-radius: 24px, box-shadow: 0 8px 32px rgba(0,0,0,0.1), transform: scale on focus, depth via shadows
- **Checklist de implementación**: ☐ Glass effect visible, ☐ Depth layers clear, ☐ Hover states defined, ☐ Colors vibrant on active, ☐ Floating feel achieved, ☐ Contrast maintained
- **Variables de diseño**: --glass-bg: rgba(255,255,255,0.2), --glass-blur: 40px, --glass-saturate: 180%, --window-radius: 24px, --depth-shadow: 0 8px 32px rgba(0,0,0,0.1), --focus-scale: 1.02
- **Alias**: Spatial UI
- **Estado**: active
