# Estilo: Micro-interactions
> Tipo: General · Origen: 2020s Modern · Complejidad: Medium · ID: `micro-interactions`

- **Palabras clave**: Small animations, gesture-based, tactile feedback, subtle animations, contextual interactions, responsive
- **Colores primarios**: Subtle color shifts (10-20%), feedback: Green #22C55E, Red #EF4444, Amber #F59E0B
- **Colores secundarios**: Accent feedback, neutral supporting, clear action indicators
- **Efectos y animación**: Small hover (50-100ms), loading spinners, success/error state anim, gesture-triggered (swipe/pinch), haptic
- **Ideal para**: Mobile apps, touchscreen UIs, productivity tools, user-friendly, consumer apps, interactive components
- **No usar en**: Desktop-only, critical performance, accessibility-first (alternatives needed)
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design with delightful micro-interactions: small 50-100ms animations, gesture-based responses, tactile feedback, loading spinners, success/error states, subtle hover effects, haptic feedback triggers for mobile. Focus on responsive, contextual interactions.
- **Palabras CSS**: animation: short 50-100ms, transition: hover states, @media (hover: hover) for desktop, :active for press, haptic-feedback CSS/API, loading animation smooth loop
- **Checklist de implementación**: ☐ Micro-animations 50-100ms, ☐ Gesture-responsive, ☐ Tactile feedback visual/haptic, ☐ Loading spinners smooth, ☐ Success/error states clear, ☐ Hover effects subtle
- **Variables de diseño**: --micro-animation-duration: 50-100ms, --gesture-responsive: true, --haptic-feedback: true, --loading-animation: smooth, --state-feedback: success+error
- **Estado**: active
