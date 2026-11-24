# Sector: comercio-marketplace
> Fuente: UI UX Pro Max (MIT), reordenado por sector. Son **sugerencias**: en Gula mandan `CLAUDE.md` y los tokens de `src/index.css`. Los hex son referencia, no se pegan: se traducen a tokens.

## E-commerce
- **Palabras clave**: buy, commerce, e, ecommerce, products, retail, sell, shop, store
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Aurora UI](../estilos/aurora-ui.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Brand primary + success green
- **Consideraciones**: Engagement & conversions. High visual hierarchy.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#EA580C`, Background `#ECFDF5`, Foreground `#064E3B`, Card `#FFFFFF`, Muted `#E8F1F3`, Border `#A7F3D0`, Destructive `#DC2626`
- **Notas de paleta**: Success green + urgency orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Feature-Rich Showcase
- **Ánimo de color**: Brand primary + Success green
- **Ánimo tipográfico**: Engaging + Clear hierarchy
- **Efectos clave**: Card hover lift (200ms) + Scale effect
- **Reglas de decisión**: {"if_luxury":["style:liquid-glass"],"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Flat design without depth + Text-heavy pages
- **Severidad**: HIGH

## E-commerce Luxury
- **Palabras clave**: buy, commerce, e, ecommerce, elegant, exclusive, high-end, luxury, premium, products, retail, sell, shop, store
- **Estilo principal**: [Liquid Glass](../estilos/liquid-glass.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Estilos secundarios**: [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Premium colors + minimal accent
- **Consideraciones**: Elegance & sophistication. Premium materials.
- **Paleta**: Primary `#1C1917`, Secondary `#44403C`, Accent `#A16207`, Background `#FAFAF9`, Foreground `#0C0A09`, Card `#FFFFFF`, Muted `#E8ECF0`, Border `#D6D3D1`, Destructive `#DC2626`
- **Notas de paleta**: Premium dark + gold accent [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Feature-Rich Showcase
- **Ánimo de color**: Premium colors + Minimal accent
- **Ánimo tipográfico**: Elegant + Refined typography
- **Efectos clave**: Chromatic aberration + Fluid animations (400-600ms)
- **Reglas de decisión**: {"if_checkout":["constraint:emphasize-trust"],"if_hero_needed":["style:3d-and-hyperrealism"]}
- **Anti-patrones**: Vibrant & Block-based + Playful colors
- **Severidad**: HIGH

## Luxury/Premium Brand
- **Palabras clave**: brand, elegant, exclusive, high-end, luxury, premium
- **Estilo principal**: [Liquid Glass](../estilos/liquid-glass.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Patrón de landing**: Storytelling-Driven + Feature-Rich
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Black + Gold (#FFD700) + White + Minimal accent
- **Consideraciones**: Elegance paramount. Premium imagery. Storytelling. High-quality visuals. Exclusive feel.
- **Paleta**: Primary `#1C1917`, Secondary `#44403C`, Accent `#A16207`, Background `#FAFAF9`, Foreground `#0C0A09`, Card `#FFFFFF`, Muted `#E8ECF0`, Border `#D6D3D1`, Destructive `#DC2626`
- **Notas de paleta**: Premium black + gold accent [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Storytelling + Feature-Rich
- **Ánimo de color**: Black + Gold (#FFD700) + White
- **Ánimo tipográfico**: Elegant + Refined typography
- **Efectos clave**: Slow parallax + Premium reveals (400-600ms)
- **Reglas de decisión**: {"must_have":["constraint:high-quality-imagery","constraint:storytelling"]}
- **Anti-patrones**: Cheap visuals + Fast animations
- **Severidad**: HIGH

## Marketplace (P2P)
- **Palabras clave**: buyers, listings, marketplace, p, platform, sellers
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Micro-interactions](../estilos/micro-interactions.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: E-commerce Analytics
- **Enfoque de color**: Trust colors + Category colors + Success green
- **Consideraciones**: Seller/buyer profiles. Listings. Reviews/ratings. Secure payment. Messaging. Search/filter. Trust badges.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#16A34A`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Trust purple + transaction green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Trust colors + Category colors + Success green
- **Ánimo tipográfico**: Modern + Engaging typography
- **Efectos clave**: Review star animations + Listing hover effects
- **Reglas de decisión**: {"must_have":["constraint:seller-profiles","constraint:secure-payment"]}
- **Anti-patrones**: Low trust signals + Confusing layout
- **Severidad**: HIGH

## Agriculture/Farm Tech
- **Palabras clave**: agriculture, farm, tech
- **Estilo principal**: [Organic Biophilic](../estilos/organic-biophilic.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Feature-Rich Showcase + Trust
- **Estilo de dashboard**: IoT Sensor Dashboard
- **Enfoque de color**: Earth Green (#4A7C23) + Brown + Sky Blue
- **Consideraciones**: Crop monitoring. Weather data. IoT sensors. Yield tracking. Market prices. Sustainable imagery.
- **Paleta**: Primary `#15803D`, Secondary `#22C55E`, Accent `#A16207`, Background `#F0FDF4`, Foreground `#14532D`, Card `#FFFFFF`, Muted `#E8F0F1`, Border `#BBF7D0`, Destructive `#DC2626`
- **Notas de paleta**: Earth green + harvest gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Feature-Rich Showcase
- **Ánimo de color**: Earth Green (#4A7C23) + Brown + Sky Blue
- **Ánimo tipográfico**: Clear + Informative typography
- **Efectos clave**: Data visualization + Weather animations
- **Reglas de decisión**: {"must_have":["constraint:sensor-dashboard"],"if_crop_focused":["constraint:add-health-indicators"]}
- **Anti-patrones**: Generic design + Ignored accessibility + AI purple/pink gradients
- **Severidad**: MEDIUM

## Construction/Architecture
- **Palabras clave**: architecture, construction
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Estilos secundarios**: [Brutalism](../estilos/brutalism.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Project Management Dashboard
- **Enfoque de color**: Grey (#4A4A4A) + Orange (safety) + Blueprint Blue
- **Consideraciones**: Project portfolio. 3D renders. Timeline. Material specs. Team collaboration. Blueprint aesthetic.
- **Paleta**: Primary `#64748B`, Secondary `#94A3B8`, Accent `#EA580C`, Background `#F8FAFC`, Foreground `#334155`, Card `#FFFFFF`, Muted `#EBF0F5`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Industrial grey + safety orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Hero-Centric + Feature-Rich
- **Ánimo de color**: Grey (#4A4A4A) + Orange (safety) + Blueprint Blue
- **Ánimo tipográfico**: Professional + Bold typography
- **Efectos clave**: 3D model viewer + Timeline animations
- **Reglas de decisión**: {"must_have":["constraint:project-portfolio"],"if_team_collaboration":["constraint:add-real-time-updates"]}
- **Anti-patrones**: 2D-only layouts + Poor image quality + AI purple/pink gradients
- **Severidad**: HIGH

## Automotive/Car Dealership
- **Palabras clave**: automotive, car, dealership
- **Estilo principal**: [Motion-Driven](../estilos/motion-driven.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Brand colors + Metallic accents + Dark/Light
- **Consideraciones**: Vehicle showcase. 360° views. Comparison tools. Financing calculator. Test drive booking. High-quality imagery.
- **Paleta**: Primary `#1E293B`, Secondary `#334155`, Accent `#DC2626`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#E9EDF1`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Premium dark + action red
- **Patrón recomendado**: Hero-Centric + Feature-Rich
- **Ánimo de color**: Brand colors + Metallic + Dark/Light
- **Ánimo tipográfico**: Bold + Confident typography
- **Efectos clave**: 360 product view + Configurator animations
- **Reglas de decisión**: {"must_have":["constraint:vehicle-comparison","constraint:financing-calculator"]}
- **Anti-patrones**: Static product pages + Poor UX
- **Severidad**: HIGH

## Architecture / Interior
- **Palabras clave**: architecture, design, interior
- **Estilo principal**: [Exaggerated Minimalism](../estilos/exaggerated-minimalism.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Parallax Storytelling](../estilos/parallax-storytelling.md)
- **Patrón de landing**: Portfolio Grid + Visuals
- **Estilo de dashboard**: Project Management + Gallery
- **Enfoque de color**: Monochrome + Gold Accent + High Imagery
- **Consideraciones**: High-res images. Typography. Space.
- **Paleta**: Primary `#171717`, Secondary `#404040`, Accent `#A16207`, Background `#FFFFFF`, Foreground `#171717`, Card `#FFFFFF`, Muted `#E8ECF0`, Border `#E5E5E5`, Destructive `#DC2626`
- **Notas de paleta**: Minimal black + accent gold [Accent adjusted from #D4AF37]
- **Patrón recomendado**: Portfolio + Hero-Centric
- **Ánimo de color**: Monochrome + Gold Accent + High Imagery
- **Ánimo tipográfico**: Architectural + Elegant typography
- **Efectos clave**: Project gallery + Blueprint reveals
- **Reglas de decisión**: {"must_have":["constraint:high-res-images","constraint:project-portfolio"]}
- **Anti-patrones**: Poor imagery + Cluttered layout
- **Severidad**: HIGH

## Wardrobe & Outfit Planner
- **Palabras clave**: wardrobe, outfit, fashion, clothes, closet, style, wear, plan, capsule, ootd, lookbook
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Aurora UI](../estilos/aurora-ui.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Storytelling-Driven + Feature-Rich
- **Estilo de dashboard**: N/A - Wardrobe focused
- **Enfoque de color**: Clean fashion neutral + full clothes color palette + accent
- **Consideraciones**: Photo catalog of clothes. AI outfit suggestions. Calendar integration. Capsule wardrobe. Season filtering.
- **Paleta**: Primary `#BE185D`, Secondary `#EC4899`, Accent `#D97706`, Background `#FDF2F8`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FBF1F5`, Border `#F7E3EB`, Destructive `#DC2626`
- **Notas de paleta**: Fashion rose + gold accent
- **Patrón recomendado**: Storytelling-Driven + Feature-Rich
- **Ánimo de color**: Clean fashion neutral + full clothes color palette + accent
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle hover 200ms + Smooth transitions + Clean
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Plant Care Tracker
- **Palabras clave**: plant, care, water, garden, tracker, reminder, species, photo, grow, health, planta
- **Estilo principal**: [Organic Biophilic](../estilos/organic-biophilic.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Storytelling-Driven + Social Proof
- **Estilo de dashboard**: N/A - Plant collection focused
- **Enfoque de color**: Nature greens + earth brown + sunny yellow reminder + water blue
- **Consideraciones**: Plant database with care guides. Watering reminders. Growth photo timeline. AI health diagnosis. Collection sharing.
- **Paleta**: Primary `#15803D`, Secondary `#059669`, Accent `#D97706`, Background `#F0FDF4`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F0F7F3`, Border `#E2EFE7`, Destructive `#DC2626`
- **Notas de paleta**: Nature green + sun yellow
- **Patrón recomendado**: Storytelling-Driven + Social Proof
- **Ánimo de color**: Nature greens + earth brown + sunny yellow reminder + water blue
- **Ánimo tipográfico**: Warm + Humanist + Natural
- **Efectos clave**: Rounded 16-24px + Natural shadows + Flowing SVG
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Inconsistent styling + Poor contrast ratios
- **Severidad**: HIGH

## Gift & Wishlist
- **Palabras clave**: gift, wishlist, present, birthday, occasion, registry, idea, shop, list, share, surprise
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Minimal & Direct + Conversion
- **Estilo de dashboard**: N/A - List focused
- **Enfoque de color**: Celebration warm pink/gold/red + category colors + surprise accent
- **Consideraciones**: Add from any URL. Price range filter. Reserved-by-others system. Occasion calendar. Collaborative list. Surprise mode.
- **Paleta**: Primary `#DC2626`, Secondary `#D97706`, Accent `#EC4899`, Background `#FFF1F2`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FCF1F1`, Border `#FAE4E4`, Destructive `#DC2626`
- **Notas de paleta**: Gift red + gold + surprise pink
- **Patrón recomendado**: Minimal & Direct + Conversion
- **Ánimo de color**: Celebration warm pink/gold/red + category colors + surprise accent
- **Ánimo tipográfico**: Energetic + Bold + Large
- **Efectos clave**: Large section gaps 48px+ + Color shift hover + Scroll-snap
- **Reglas de decisión**: {"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Home Decoration & Interior Design
- **Palabras clave**: home, interior, decor, design, furniture, room, renovation, ar, plan, inspire, 3d, houzz
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [3D Product Preview](../estilos/3d-product-preview.md)
- **Estilos secundarios**: [Organic Biophilic](../estilos/organic-biophilic.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Storytelling-Driven + Feature-Rich
- **Estilo de dashboard**: N/A - Project focused
- **Enfoque de color**: Neutral interior palette + material texture accent + AR blue
- **Consideraciones**: AR room visualization. Style quiz. Product catalog with purchase links. 3D room planner. Mood board. Before/after.
- **Paleta**: Primary `#78716C`, Secondary `#A8A29E`, Accent `#D97706`, Background `#FAF5F2`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F6F6F6`, Border `#EEEDED`, Destructive `#DC2626`
- **Notas de paleta**: Interior warm grey + gold accent
- **Patrón recomendado**: Storytelling-Driven + Feature-Rich
- **Ánimo de color**: Neutral interior palette + material texture accent + AR blue
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle hover 200ms + Smooth transitions + Clean
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Classifieds / Buy-Sell
- **Palabras clave**: classifieds, buy-sell, craigslist, secondhand, marketplace-listing, for-sale, trade, flea-market, thrift, resell
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Patrón de landing**: Filter-Heavy Grid + Map
- **Estilo de dashboard**: N/A - Listing focused
- **Enfoque de color**: Neutral bg + price green + category chips + verified seller badge
- **Consideraciones**: Category tree. Photo-first listing cards. Price negotiation. Location radius filter. Saved searches. Seller reputation. Flag/report.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#16A34A`, Background `#EFF6FF`, Foreground `#1E40AF`, Card `#FFFFFF`, Muted `#E9EFF8`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Listing blue + price green + seller badge
- **Patrón recomendado**: Marketplace / Directory
- **Ánimo de color**: Neutral bg + price green + category chips + verified seller badge
- **Ánimo tipográfico**: Scan-friendly + Marketplace typography
- **Efectos clave**: Photo-first cards + map/list toggle
- **Reglas de decisión**: {"must_have":["constraint:photo-first-cards","constraint:multi-filter-sidebar","constraint:price-negotiation","constraint:location-radius","constraint:seller-reputation"],"if_discovery_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: No trust cues + text-heavy pages + hidden filters
- **Severidad**: HIGH

