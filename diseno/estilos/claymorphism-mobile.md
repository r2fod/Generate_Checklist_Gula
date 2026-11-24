# Estilo: Claymorphism (Mobile)
> Tipo: Mobile · Origen: Consumer/Education · Complejidad: High · ID: `claymorphism-mobile`

- **Palabras clave**: claymorphism, clay, 3d, soft, bubbly, candy, playful, rounded, squish, tactile, inflate, silicone, haptic, spring
- **Colores primarios**: Vivid Violet #7C3AED, Hot Pink #DB2777
- **Colores secundarios**: Canvas #F4F1FA, Soft Charcoal #332F3A, Emerald #10B981, Amber #F59E0B, Lavender-Gray #635F69
- **Efectos y animación**: Multi-layer shadow stacks (nested View) to simulate clay depth, LinearGradient #A78BFA→#7C3AED buttons, borderRadius 40–50 outer / 32 cards / 20 buttons, Reanimated spring squish (scale 0.92 on press), BlurView glass-clay hybrid cards, floating blobs with slow ±20px drift, Haptics Light on every press
- **Ideal para**: Children education apps, teen social products, crypto gamification, creative tools, brand mascot-led apps
- **No usar en**: Serious enterprise, high-density data, editorial reading apps, fintech trust signals
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:high|drivers:animation,large-images
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a Claymorphism (Mobile) mobile interface using claymorphism, clay, 3d, soft, bubbly, candy, playful, rounded. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: backgroundColor: '#F4F1FA', cardBg: 'rgba(255,255,255,0.7)', textPrimary: '#332F3A', textMuted: '#635F69', accentPrimary: '#7C3AED', accentSecondary: '#DB2777', success: '#10B981', warning: '#F59E0B', radiusOuter: 50, radiusCard: 32, radiusButton: 20, shadowStack: 'nested View', gradientButton: ['#A78BFA', '#7C3AED'], springDamping: 10
- **Checklist de implementación**: ☐ Background uses #F4F1FA (no pure white), ☐ Multi-layer clay shadow stack applied, ☐ Cards use blurred glass-clay hybrid, ☐ Buttons squish to scale 0.92 on press, ☐ Spring physics on all interactions, ☐ Nunito Black for headings, ☐ Background blobs drifting, ☐ Haptics on every press, ☐ Nested border radius (card 32, inner 24), ☐ Bento layout with hero span
- **Variables de diseño**: --bg: #F4F1FA, --card-bg: rgba(255,255,255,0.7), --text: #332F3A, --muted: #635F69, --accent: #7C3AED, --accent2: #DB2777, --success: #10B981, --warning: #F59E0B, --radius-outer: 50px, --radius-card: 32px, --radius-button: 20px, --font-heading: Nunito Black, --font-body: DM Sans
- **Estado**: supplemental
