# Estilo: Terminal CLI (Mobile)
> Tipo: Mobile · Origen: Retro-Future 1980s–2020s · Complejidad: Medium · ID: `terminal-cli-mobile`

- **Palabras clave**: terminal, cli, matrix green, monospace, hacker, ascii, command line, developer, web3, crypto, sci-fi, OLED, retro-future, field operative
- **Colores primarios**: Matrix Green #33FF00, OLED Black #050505
- **Colores secundarios**: Amber #FFB000, Muted Green #1A3D1A, Error Red #FF3333, Border Green #33FF00
- **Efectos y animación**: Blinking cursor (500ms opacity loop), typewriter text reveal hook, scanline overlay (repeating lines 0.05 opacity), ASCII art headers, instant color inversion on press (bg-green text-black), haptic on every keystroke, boot sequence splash on launch
- **Ideal para**: Developer tools, Web3/blockchain apps, geek-culture apps, ARG games, sci-fi/noir gaming companions, hacker/security tools, creative studio portfolios
- **No usar en**: Consumer products, health apps, anything requiring approachability or warmth, children's apps, standard enterprise contexts
- **Modo claro**: not-recommended
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✗ Low
- **Palabras para prompt**: Design a Terminal CLI (Mobile) mobile interface using terminal, cli, matrix green, monospace, hacker, ascii, command line, developer. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: borderRadius: 0 (ALL elements), borderWidth: 1, borderColor: '#33FF00', backgroundColor: '#050505', color: '#33FF00', fontFamily: 'SpaceMono-Regular' or JetBrains Mono, fontSize: 12 or 14 or 16 only, lineHeight: 1.2x fontSize, Haptics.impactAsync(Light) on every press, useAnimatedValue blink 500ms, hitSlop: 12px all sides for bracketed buttons
- **Checklist de implementación**: ☐ 0px border-radius everywhere, ☐ ASCII-style borders on cards, ☐ Boot sequence on launch, ☐ Blinking cursor component, ☐ Typewriter hook for new content, ☐ Scanline overlay (0.05 opacity), ☐ Haptic on every button press, ☐ Footer status bar component, ☐ hitSlop on all bracketed buttons (44×44dp), ☐ Reduced motion respected
- **Variables de diseño**: --bg: #050505, --fg-primary: #33FF00, --fg-amber: #FFB000, --fg-muted: #1A3D1A, --fg-error: #FF3333, --border: #33FF00, --radius: 0px, --font: SpaceMono-Regular or JetBrains Mono, --font-sizes: 12 14 16 only, --blink-duration: 500ms, --scanline-opacity: 0.05
- **Estado**: supplemental
