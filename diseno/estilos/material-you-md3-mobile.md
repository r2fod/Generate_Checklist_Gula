# Estilo: Material 3 Expressive (Mobile)
> Tipo: Mobile · Origen: Google Material Design 3 · Complejidad: Medium · ID: `material-you-md3-mobile`

- **Palabras clave**: material 3 expressive, vibrant color, spring motion, adaptive components, flexible typography, contrasting shapes, android
- **Colores primarios**: Primary Violet #6750A4, Secondary Container #E8DEF8, Tertiary #7D5260
- **Colores secundarios**: Surface #FFFBFE, On Surface #1C1B1F, Surface Container #F3EDF7, Outline #79747E
- **Efectos y animación**: Tonal elevation (overlay colors instead of strong shadows), pill-shaped buttons and chips (borderRadius 999), emphasized easing Easing.bezier(0.2,0,0,1), state layers (pressed overlays 10–15% opacity), Reanimated-filled label float for inputs, HapticFeedback on FAB/toggles
- **Ideal para**: Android, Wear OS, and Pixel-aligned products using Material 3 components
- **No usar en**: Ultra-minimal brutalist brands, terminal/hacker aesthetics, monochrome editorial apps
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a Material 3 Expressive mobile interface with vibrant semantic color, contrasting shapes, flexible typography, adaptive components, spring motion, and reduced-motion alternatives.
- **Palabras CSS**: borderRadius: 999 (buttons/chips), containerRadius: 16–28, backgroundColor: '#FFFBFE', colorPrimary: '#6750A4', colorSecondaryContainer: '#E8DEF8', colorSurfaceContainer: '#F3EDF7', outlineColor: '#79747E', Pressable state-layer overlay (opacity 0.1–0.15), Easing.bezier(0.2,0,0,1), HapticFeedback.impactMedium on FAB, floating label using Reanimated translateY/scale
- **Checklist de implementación**: ☐ MD3 color tokens applied (background/surface/container), ☐ All CTAs are pill-shaped, ☐ State-layer overlays instead of opacity 0.5 hacks, ☐ Emphasized easing used for all animations, ☐ Floating label inputs implemented, ☐ FAB uses tertiary color with correct elevation, ☐ Safe areas respected for organic shapes, ☐ No pure white background, ☐ No harsh box-shadows (ambient only)
- **Variables de diseño**: --md3-bg: #FFFBFE, --md3-on-surface: #1C1B1F, --md3-primary: #6750A4, --md3-on-primary: #FFFFFF, --md3-secondary-container: #E8DEF8, --md3-on-secondary-container: #1D192B, --md3-tertiary: #7D5260, --md3-surface-container: #F3EDF7, --md3-outline: #79747E, --radius-pill: 999px, --easing-emphasized: cubic-bezier(0.2,0,0,1)
- **Alias**: Material You|Material You (MD3 Mobile)|MD3 Mobile|M3 Expressive|Material Design 3 Expressive
- **Estado**: active
