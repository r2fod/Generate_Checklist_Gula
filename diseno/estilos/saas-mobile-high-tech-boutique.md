# Estilo: SaaS Mobile (High-Tech Boutique)
> Tipo: Mobile · Origen: 2020s SaaS Mobile · Complejidad: Medium · ID: `saas-mobile-high-tech-boutique`

- **Palabras clave**: saas, electric blue, gradient, fintech, spring animation, dual font, glassmorphism, boutique, premium, calistoga, inter, mono, tactile, haptic, bento
- **Colores primarios**: Electric Blue #0052FF, Gradient End #4D7CFF
- **Colores secundarios**: Background #FAFAFA, Foreground #0F172A, Muted #F1F5F9, Card #FFFFFF, Border #E2E8F0
- **Efectos y animación**: Spring animations (mass:1 damping:15 stiffness:120); gradient buttons (0052FF→4D7CFF); scale press 0.96→1.0 with haptics; floating FAB with gentle bobbing (Reanimated); glassmorphism BlurView navigation bars; staggered fade-in entrance (Y:20→0 + opacity:0→1); pulsing status dot on section badges; layout transitions (LayoutAnimation or Reanimated entering)
- **Ideal para**: B2B SaaS mobile dashboards, fintech apps, developer tool mobile companions, marketing analytics apps, HR/operations apps, modern business productivity
- **No usar en**: Pure consumer entertainment, children's apps, highly decorative lifestyle apps, contexts where Electric Blue feels too corporate
- **Modo claro**: supported
- **Modo oscuro**: conditional
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a SaaS Mobile (High-Tech Boutique) mobile interface using saas, electric blue, gradient, fintech, spring animation, dual font, glassmorphism, boutique. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: borderRadius: 16 (buttons/cards), LinearGradient colors={['#0052FF','#4D7CFF']}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4, Haptics.impactAsync(ImpactFeedbackStyle.Light) on press, withSpring({mass:1, damping:15, stiffness:120}), withTiming Y:20→0 opacity:0→1 staggered entrance, LayoutAnimation.configureNext for list updates, BlurView on nav bars
- **Checklist de implementación**: ☐ SafeAreaView wraps all screens, ☐ All touch targets ≥ 44×44px, ☐ Spring config used for all transitions, ☐ Gradient buttons (not flat), ☐ Haptic on every Pressable, ☐ Section badges with PulseDot, ☐ Staggered entrance animation on screen mount, ☐ JetBrains Mono for data labels, ☐ Calistoga for hero headlines, ☐ Elevation/shadow on cards
- **Variables de diseño**: --bg: #FAFAFA, --fg: #0F172A, --muted: #F1F5F9, --accent: #0052FF, --accent-sec: #4D7CFF, --card: #FFFFFF, --border: #E2E8F0, --radius: 16px, --shadow: shadowOpacity 0.1 shadowRadius 10, --spring: mass 1 damping 15 stiffness 120, --font-display: Calistoga, --font-body: Inter, --font-mono: JetBrains Mono
- **Estado**: supplemental
