# Estilo: Kinetic Typography
> Tipo: General · Origen: 2020s Modern · Complejidad: High · ID: `kinetic-typography`

- **Palabras clave**: Motion text, animated type, moving letters, dynamic, typing effect, morphing, scroll-triggered text
- **Colores primarios**: Flexible - high contrast recommended, bold colors for emphasis, animation-friendly palette
- **Colores secundarios**: Accent colors for emphasis, transition colors, gradient text fills
- **Efectos y animación**: @keyframes text animation, typing effect, background-clip: text, GSAP ScrollTrigger, split text
- **Ideal para**: Hero sections, marketing sites, video platforms, storytelling, creative portfolios, landing pages
- **No usar en**: Long-form content, accessibility-critical, data interfaces, forms, elderly users
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation,blur
- **Accesibilidad**: risk:high|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ Very High
- **Palabras para prompt**: Design with kinetic typography. Use: animated text, scroll-triggered reveals, typing effects, letter-by-letter animations, morphing text, gradient text fills, oversized hero text, text as the main visual element.
- **Palabras CSS**: @keyframes for text animation, background-clip: text, GSAP SplitText, typing effect (steps()), transform on letters, scroll-triggered (Intersection Observer), variable fonts for morphing
- **Checklist de implementación**: ☐ Text animations smooth, ☐ Prefers-reduced-motion respected, ☐ Fallback for no-JS, ☐ Mobile performance ok, ☐ Typing effect timed, ☐ Scroll triggers work
- **Variables de diseño**: --text-animation-duration: 1s, --letter-delay: 0.05s, --typing-speed: 100ms, --gradient-text: linear-gradient(90deg, #color1, #color2), --morph-duration: 0.5s
- **Estado**: active
