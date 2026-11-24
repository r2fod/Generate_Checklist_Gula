# Estilo: Flat Design Mobile (Touch-First)
> Tipo: Mobile · Origen: 2010s–2020s Flat Mobile · Complejidad: Low · ID: `flat-design-mobile-touch-first`

- **Palabras clave**: flat, 2D, no shadow, color blocking, geometric, bold, poster, icon, touch-first, minimal, clean, tailored, cross-platform
- **Colores primarios**: Blue #3B82F6, Emerald #10B981
- **Colores secundarios**: Background #FFFFFF, Surface #F3F4F6, Text #111827, Amber #F59E0B, Border #E5E7EB
- **Efectos y animación**: Immediate press feedback (scale 0.97, no delay), color section blocking (full-width contrasting View), zero elevation/shadow, solid icon containers (colored squares/circles), geometric low-opacity shape overlays, bottom tabs solid fill (no floating)
- **Ideal para**: Cross-platform apps (iOS+Android parity), information-dense dashboards, system UI, brand illustration, onboarding flows, marketing pages, icon design
- **No usar en**: Ultra-premium contexts needing depth/shadow, dark-mode-first products, contexts where flat design reads as unfinished or sterile
- **Modo claro**: supported
- **Modo oscuro**: conditional
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: native
- **Conversión**: ✓ High
- **Palabras para prompt**: Design a Flat Design Mobile (Touch-First) mobile interface using flat, 2D, no shadow, color blocking, geometric, bold, poster, icon. Prioritize clear hierarchy, safe areas, touch targets, visible focus, and reduced-motion alternatives.
- **Palabras CSS**: shadowOpacity: 0, elevation: 0, borderRadius: 6/12/999, height: 48 minimum touch targets, spacing: 4/8/16/24/32/48 system, backgroundColor (section blocking), Pressable scale: pressed ? 0.97 : 1, fontWeight: '800' heads / '600' sub / '400' body, letterSpacing: -0.5 heads / 1 labels, textTransform: 'uppercase' labels, strokeWidth={2.5} icons, borderWidth: 3/4 for featured CTAs
- **Checklist de implementación**: ☐ Zero elevation AND shadowOpacity on all elements, ☐ Color-blocking sections (not borders), ☐ All touch targets ≥ 48×48, ☐ No gradients on flat elements, ☐ Icons inside solid colored containers, ☐ Pressable scale feedback, ☐ Geometric shapes as bg decoration, ☐ Bold flat bottom tabs (no floating), ☐ Primary headlines much larger than body, ☐ 4pt spacing system throughout
- **Variables de diseño**: --bg: #FFFFFF, --surface: #F3F4F6, --fg: #111827, --primary: #3B82F6, --secondary: #10B981, --accent: #F59E0B, --border: #E5E7EB, --radius-sm: 6px, --radius-md: 12px, --radius-pill: 999px, --shadow: none, --elevation: 0, --touch-target: 48px, --spacing: 4 8 16 24 32 48
- **Estado**: supplemental
