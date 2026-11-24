# Estilo: Tactile Digital / Deformable UI
> Tipo: General · Origen: 2025+ Tactile Era · Complejidad: Medium · ID: `tactile-digital-deformable-ui`

- **Palabras clave**: Jelly buttons, chrome, clay, squishy, deformable, bouncy, physical, tactile feedback, press response
- **Colores primarios**: Gradient metallics, Chrome Silver #C0C0C0, Jelly Pink #FF9ECD, Soft Blue #87CEEB
- **Colores secundarios**: Glossy highlights, shadow depth, reflection effects, material-specific colors
- **Efectos y animación**: Press deformation (scale + squish), bounce-back (cubic-bezier), material response, haptic-like feedback, spring physics
- **Ideal para**: Modern mobile apps, playful brands, entertainment, gaming UI, consumer products, interactive demos
- **No usar en**: Enterprise software, data dashboards, accessibility-critical, professional tools
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:conditional|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: adaptable
- **Conversión**: ✓ Very High
- **Palabras para prompt**: Design a tactile deformable interface. Use: jelly/squishy buttons, press deformation effect, bounce-back animations, chrome/clay materials, spring physics, haptic-like feedback, material response, 3D depth on interaction.
- **Palabras CSS**: transform: scale(0.95) on active, animation: bounce (cubic-bezier(0.34, 1.56, 0.64, 1)), box-shadow: inset for press, filter: brightness on press, spring physics (react-spring/framer-motion)
- **Checklist de implementación**: ☐ Press effect visible, ☐ Bounce-back smooth, ☐ Material feels tactile, ☐ Spring physics tuned, ☐ Mobile touch responsive, ☐ Reduced motion option
- **Variables de diseño**: --press-scale: 0.95, --bounce-duration: 400ms, --spring-stiffness: 300, --spring-damping: 20, --material-glossy: linear-gradient(135deg, white 0%, transparent 60%), --depth-shadow: 0 10px 30px rgba(0,0,0,0.2)
- **Estado**: active
