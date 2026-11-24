# Estilo: Modern Dark (Cinema Mobile)
> Tipo: Mobile · Origen: 2020s Cinematic Mobile · Complejidad: High · ID: `modern-dark-cinema-mobile`

- **Palabras clave**: dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur, atmospheric, reanimated, haptic, premium, layered, frosted glass, linear gradient
- **Colores primarios**: Deep #020203, Base #050506, Elevated #0a0a0c, Accent #5E6AD2
- **Colores secundarios**: Foreground #EDEDEF, Muted #8A8F98, Accent Glow rgba(94 106 210/0.2), Border rgba(255 255 255/0.08), Surface rgba(255 255 255/0.05)
- **Efectos y animación**: Expo.out Bezier(0.16,1,0.3,1) easing; spring modals (damping:20 stiffness:90); haptic-linked press (Impact Light/Medium); animated ambient light blobs (Reanimated translateX/Y slow oscillation); BlurView glassmorphism headers/nav (intensity 20); scale press 0.97 → 1.0; avoid pure #000000 (OLED smear)
- **Ideal para**: Developer tools, pro productivity apps, fintech/trading dashboards, media/streaming platforms, AI tool interfaces, high-end gaming companion apps
- **No usar en**: Consumer apps needing warmth, children's apps, health/medical contexts where dark feels harsh, high-accessibility contexts needing maximum contrast
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ◐ Medium
- **Palabras para prompt**: Design a Modern Dark (Cinema Mobile) mobile interface using dark mode, cinematic, ambient light, glassmorphism, deep black, indigo, glow, blur. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: borderRadius: 16 (cards/buttons), background: LinearGradient #0a0a0f→#020203, border: StyleSheet.hairlineWidth rgba(255,255,255,0.08), BlurView intensity={20} tint='dark', useAnimatedStyle + withRepeat (blob oscillation), Easing.bezier(0.16,1,0.3,1), withSpring damping:20 stiffness:90, Haptics.impactAsync(ImpactFeedbackStyle.Light), scale: 0.97 press
- **Checklist de implementación**: ☐ No pure #000000 backgrounds, ☐ LinearGradient base screen, ☐ Animated ambient blobs (Reanimated, native driver), ☐ BlurView on tab bar and headers, ☐ borderRadius 16 on all cards, ☐ Haptic feedback on every Pressable, ☐ Bezier(0.16,1,0.3,1) easing used, ☐ Accent glow behind primary button, ☐ No solid grey borders (rgba only), ☐ Bottom sheets replace all modals
- **Variables de diseño**: --bg-deep: #020203, --bg-base: #050506, --bg-elevated: #0a0a0c, --surface: rgba(255 255 255/0.05), --foreground: #EDEDEF, --foreground-muted: #8A8F98, --accent: #5E6AD2, --accent-glow: rgba(94 106 210/0.2), --border: rgba(255 255 255/0.08), --radius: 16px, --easing: cubic-bezier(0.16 1 0.3 1), --font: Inter
- **Estado**: supplemental
