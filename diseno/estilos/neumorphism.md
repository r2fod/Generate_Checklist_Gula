# Estilo: Neumorphism
> Tipo: General · Origen: 2020s Modern · Complejidad: Medium · ID: `neumorphism`

- **Palabras clave**: Soft UI, embossed, debossed, convex, concave, light source, subtle depth, rounded (12-16px), monochromatic
- **Colores primarios**: Light pastels: Soft Blue #C8E0F4, Soft Pink #F5E0E8, Soft Grey #E8E8E8
- **Colores secundarios**: Tints/shades (±30%), gradient subtlety, color harmony
- **Efectos y animación**: Soft box-shadow (multiple: -5px -5px 15px, 5px 5px 15px), smooth press (150ms), inner subtle shadow
- **Ideal para**: Health/wellness apps, meditation platforms, fitness trackers, minimal interaction UIs
- **No usar en**: Complex apps, critical accessibility, data-heavy dashboards, high-contrast required
- **Modo claro**: supported
- **Modo oscuro**: conditional
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ◐ Medium
- **Palabras para prompt**: Create a neumorphic UI with soft 3D effects. Use light pastels, rounded corners (12-16px), subtle soft shadows (multiple layers), no hard lines, monochromatic color scheme with light/dark variations. Embossed/debossed effect on interactive elements.
- **Palabras CSS**: border-radius: 12-16px, box-shadow: -5px -5px 15px rgba(0,0,0,0.1), 5px 5px 15px rgba(255,255,255,0.8), background: linear-gradient(145deg, color1, color2), transform: scale on press
- **Checklist de implementación**: ☐ Rounded corners 12-16px consistent, ☐ Multiple shadow layers (2-3), ☐ Pastel color verified, ☐ Monochromatic palette checked, ☐ Press animation smooth 150ms
- **Variables de diseño**: --border-radius: 14px, --shadow-soft-1: -5px -5px 15px, --shadow-soft-2: 5px 5px 15px, --color-light: #F5F5F5, --color-primary: single pastel
- **Estado**: active
