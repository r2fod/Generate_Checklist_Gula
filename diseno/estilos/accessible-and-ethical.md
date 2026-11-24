# Estilo: Accessible & Ethical
> Tipo: General · Origen: Universal · Complejidad: Low · ID: `accessible-and-ethical`

- **Palabras clave**: Accessible, inclusive interface, high contrast, large text (16px+), keyboard navigation, screen reader friendly, accessibility standards aware, focus state, semantic
- **Colores primarios**: Measured high-contrast pairs (4.5:1 normal-text baseline; 7:1 enhanced target), simple primary, clear secondary, high luminosity (7:1+)
- **Colores secundarios**: Symbol-based colors (not color-only), supporting patterns, inclusive combinations
- **Efectos y animación**: Clear focus rings (3-4px), ARIA labels, skip links, responsive design, reduced motion, 44x44px touch targets
- **Ideal para**: Government, healthcare, education, inclusive products, large audience, legal compliance, public
- **No usar en**: None - accessibility universal
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design toward enhanced accessibility criteria; verify complete-page conformance. Include: high contrast (7:1+), large text (16px+), keyboard navigation, screen reader compatibility, focus states visible (3-4px ring), semantic HTML, ARIA labels, skip links, reduced motion support (prefers-reduced-motion), 44x44px touch targets.
- **Palabras CSS**: color-contrast: 7:1+, font-size: 16px+, outline: 3-4px on :focus-visible, aria-label, role attributes, @media (prefers-reduced-motion), touch-target: 44x44px, cursor: pointer
- **Checklist de implementación**: ☐ complete-page conformance tested against the chosen target, ☐ 7:1+ contrast checked, ☐ Keyboard navigation tested, ☐ Screen reader tested, ☐ Focus visible 3-4px, ☐ Semantic HTML used, ☐ Touch targets 44x44px
- **Variables de diseño**: --contrast-ratio: 7:1, --font-size-min: 16px, --focus-ring: 3-4px, --touch-target: 44x44px, --wcag-target: enhanced, --keyboard-accessible: true, --sr-test-required: true
- **Estado**: active
