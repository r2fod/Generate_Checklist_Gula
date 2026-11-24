# Estilo: Inclusive Design
> Tipo: General · Origen: Universal · Complejidad: Low · ID: `inclusive-design`

- **Palabras clave**: Accessible, color-blind friendly, high contrast, haptic feedback, voice interaction, screen reader, enhanced contrast targets, universal
- **Colores primarios**: Measured contrast pairs targeting 7:1 for normal text, avoid red-green only, symbol-based indicators, high contrast primary
- **Colores secundarios**: Supporting patterns (stripes, dots, hatch), symbols, combinations, clear non-color indicators
- **Efectos y animación**: Haptic feedback (vibration), voice guidance, focus indicators (4px+ ring), motion options, alt content, semantic
- **Ideal para**: Public services, education, healthcare, finance, government, accessible consumer, inclusive
- **No usar en**: None - accessibility universal
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ High
- **Palabras para prompt**: Design for universal accessibility: high contrast (7:1+), large text (16px+), keyboard-only navigation, screen reader optimization, enhanced accessibility criteria with complete-page verification, symbol-based color indicators (not color-only), haptic feedback, voice interaction support, reduced motion options.
- **Palabras CSS**: aria-* attributes complete, role attributes semantic, focus-visible: 3-4px ring, color-contrast: 7:1+, @media (prefers-reduced-motion), alt text on all images, form labels properly associated
- **Checklist de implementación**: ☐ complete-page conformance tested against the chosen target, ☐ 7:1+ contrast all text, ☐ Keyboard accessible (Tab/Enter), ☐ Screen reader tested, ☐ Focus visible 3-4px, ☐ No color-only indicators, ☐ Haptic fallback
- **Variables de diseño**: --contrast-ratio: 7:1, --font-size: 16px+, --keyboard-accessible: true, --sr-test-required: true, --wcag-target: enhanced, --color-symbols: true, --haptic: enabled
- **Estado**: active
