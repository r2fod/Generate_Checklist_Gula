# Estilo: Apple Native Experience
> Tipo: Platform/System · Origen: Apple Human Interface Guidelines, 2007-present · Complejidad: Medium · ID: `apple-native-experience`

- **Palabras clave**: apple native experience, native app, iOS, iPadOS, macOS, SwiftUI, UIKit, AppKit, Human Interface Guidelines, platform-aware, adaptive, semantic UI, system typography, native navigation
- **Colores primarios**: Adaptive system backgrounds and grouped surfaces; semantic accent, label, separator, fill, and destructive colors; avoid hard-coded appearance assumptions
- **Colores secundarios**: Secondary and tertiary labels, grouped content surfaces, control fills, accessible accent states, light/dark semantic mapping
- **Efectos y animación**: Content-first hierarchy, system typography roles, 8pt-aligned spacing, restrained borders and shadows, platform-appropriate corner radii, SF Symbols-style consistent icons, adaptive light/dark appearance, purposeful 150-300ms transitions, reduced-motion and reduced-transparency fallbacks
- **Ideal para**: Native-feeling phone, tablet, and desktop apps, productivity tools, settings, forms, lists, media and utility products, responsive web apps adopting platform-aware behavior
- **No usar en**: Liquid Glass as the defining visual treatment, visionOS spatial interfaces, decorative blur or gradients, dense dashboards needing unrelated platform conventions, or web layouts that must behave identically on every platform
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:moderate|drivers:animation
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion,semantic-controls,44px-targets
- **Móvil**: native
- **Conversión**: ◐ Medium
- **Palabras para prompt**: Design an Apple Native Experience interface with system typography, semantic adaptive colors, platform-aware navigation, accessible controls, grouped lists, sheets, popovers, purposeful transitions, and responsive behavior across phone, tablet, desktop, and web. Do not require Liquid Glass, blur, or gradients.
- **Palabras CSS**: system-ui, -apple-system, BlinkMacSystemFont, SF Pro, SF Symbols, semantic color tokens, color-scheme: light dark, env(safe-area-inset-*), :focus-visible, @media (prefers-reduced-motion), @media (prefers-contrast), min-width: 44px, border-radius: 10-16px, transition: 150-300ms ease-out
- **Checklist de implementación**: Use semantic roles for navigation bars, tab bars, sidebars, toolbars, buttons, segmented controls, toggles, text/search fields, sheets, popovers, menus, alerts, lists, and grouped content; preserve safe areas; provide keyboard and screen-reader semantics; verify light/dark contrast; test phone, tablet, desktop, reduced motion, and reduced transparency
- **Variables de diseño**: --color-bg: semantic system background, --color-surface: grouped surface, --color-label-primary: semantic primary label, --color-label-secondary: semantic secondary label, --color-accent: platform accent, --color-separator: semantic separator, --font-body: system-ui, --space-unit: 4px, --radius-control: 10px, --touch-target: 44px, --motion-duration: 150-300ms, --focus-ring: 2px
- **Alias**: Apple Native|Native Apple UI|iOS-inspired interface
- **Estado**: active
