# Estilo: Neumorphism (Mobile)
> Tipo: Mobile · Origen: Tools/Lifestyle · Complejidad: Medium · ID: `neumorphism-mobile`

- **Palabras clave**: neumorphism, soft ui, dual shadow, extruded, inset, clay surface, monochromatic, cool grey, haptic, ceramic, physical, depth
- **Colores primarios**: Accent Violet #6C63FF, Clay Base #E0E5EC
- **Colores secundarios**: Text Dark #3D4852, Text Muted #6B7280, Shadow Light rgba(255,255,255,0.6), Shadow Dark rgba(163,177,198,0.7), Inset Background #D1D9E6
- **Efectos y animación**: Full-screen #E0E5EC base, dual-layer shadow via nested View (light top-left + dark bottom-right), extruded convex resting state, inset concave pressed/input state, Reanimated scale 0.97 on press, shadow opacity interpolates 1→0.4 on press, Haptics Light on every interaction, 8pt grid, no blur shadows (no shadowRadius blend), nested depth (extruded card contains inset icon slot)
- **Ideal para**: Minimal hardware controls, smart home apps, aesthetic utility tools, health monitors, brand showcase pages
- **No usar en**: High-density data, bright multi-color apps, apps needing strong visual hierarchy via color, dark-mode-only products
- **Modo claro**: supported
- **Modo oscuro**: not-recommended
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✗ Low-Conversion
- **Palabras para prompt**: Design a Neumorphism (Mobile) mobile interface using neumorphism, soft ui, dual shadow, extruded, inset, clay surface, monochromatic, cool grey. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: backgroundColor: '#E0E5EC', textPrimary: '#3D4852', textMuted: '#6B7280', accent: '#6C63FF', shadowLight: 'rgba(255,255,255,0.6)', shadowDark: 'rgba(163,177,198,0.7)', insetBg: '#D1D9E6', radiusCard: 32, radiusButton: 16, radiusPill: 999, shadowOffset: 6, shadowRadius: 10
- **Checklist de implementación**: ☐ Single #E0E5EC base applied across all screens, ☐ Dual shadow (light+dark) implemented via nested View, ☐ Extruded resting state on cards/buttons, ☐ Inset concave state on inputs, ☐ Scale 0.97 press + shadow opacity interpolation, ☐ Haptics Light on all presses, ☐ No black shadows or white backgrounds, ☐ Nested depth pattern (extruded→inset), ☐ Accent #6C63FF on active/focus only, ☐ 8pt grid spacing
- **Variables de diseño**: --bg: #E0E5EC, --text: #3D4852, --muted: #6B7280, --accent: #6C63FF, --shadow-light: rgba(255,255,255,0.6), --shadow-dark: rgba(163,177,198,0.7), --inset-bg: #D1D9E6, --radius-card: 32px, --radius-button: 16px, --font: Plus Jakarta Sans or System
- **Estado**: supplemental
