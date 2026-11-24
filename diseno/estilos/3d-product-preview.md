# Estilo: 3D Product Preview
> Tipo: General · Origen: 2025+ E-commerce 3D · Complejidad: High · ID: `3d-product-preview`

- **Palabras clave**: 360 product view, rotatable, zoomable, touch-to-spin, AR preview, product configurator, interactive 3D model
- **Colores primarios**: Product-dependent, neutral backgrounds: Soft Grey #E8E8E8, Pure White #FFFFFF
- **Colores secundarios**: Shadow gradients, reflection planes, environment lighting colors, accent highlights
- **Efectos y animación**: Drag-to-rotate, pinch-to-zoom, spin animation, AR placement, material switching, smooth orbit controls
- **Ideal para**: E-commerce, furniture, fashion, automotive, electronics, jewelry, product configurators
- **No usar en**: Content-heavy sites, blogs, dashboards, low-bandwidth, accessibility-critical
- **Modo claro**: conditional
- **Modo oscuro**: conditional
- **Rendimiento**: cost:high|drivers:animation,large-images
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✓ Very High
- **Palabras para prompt**: Design a 3D product preview interface. Use: 360° rotation, drag-to-spin, pinch-to-zoom, AR preview button, material/color switcher, hotspot annotations, orbit controls, product configurator, smooth rendering.
- **Palabras CSS**: Three.js or model-viewer, OrbitControls, touch events for rotation, WebXR for AR, canvas with WebGL, loading placeholder, LOD for performance, environment lighting
- **Checklist de implementación**: ☐ 3D model loads fast, ☐ Rotation smooth, ☐ Zoom works (pinch/scroll), ☐ AR button functional, ☐ Colors switchable, ☐ Mobile touch works
- **Variables de diseño**: --canvas-bg: #F5F5F5, --hotspot-color: #3B82F6, --loading-spinner: primary, --rotation-speed: 0.5, --zoom-min: 0.5, --zoom-max: 2
- **Estado**: active
