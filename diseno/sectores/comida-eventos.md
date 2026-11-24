# Sector: comida-eventos
> Fuente: UI UX Pro Max (MIT), reordenado por sector. Son **sugerencias**: en Gula mandan `CLAUDE.md` y los tokens de `src/index.css`. Los hex son referencia, no se pegan: se traducen a tokens.

## Subscription Box Service
- **Palabras clave**: subscription, box, recurring, membership, unboxing, curated, plan, monthly, surprise, product-box
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: E-commerce Analytics
- **Enfoque de color**: Brand + Excitement colors
- **Consideraciones**: Unboxing experience. Personalization quiz. Subscription management. Product reveals.
- **Paleta**: Primary `#D946EF`, Secondary `#E879F9`, Accent `#EA580C`, Background `#FDF4FF`, Foreground `#86198F`, Card `#FFFFFF`, Muted `#F0EEF9`, Border `#F5D0FE`, Destructive `#DC2626`
- **Notas de paleta**: Excitement purple + urgency orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Feature-Rich + Conversion
- **Ánimo de color**: Brand + Excitement colors
- **Ánimo tipográfico**: Engaging + Clear typography
- **Efectos clave**: Unboxing reveal animations + Product carousel
- **Reglas de decisión**: {"must_have":["constraint:personalization-quiz","constraint:subscription-management"]}
- **Anti-patrones**: Confusing pricing + No unboxing preview
- **Severidad**: HIGH

## Hyperlocal Services
- **Palabras clave**: hyperlocal, local, neighborhood, nearby, community, nearby, zip, map, local-business, geo-target, city
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Micro-interactions](../estilos/micro-interactions.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Conversion-Optimized
- **Estilo de dashboard**: Drill-Down Analytics + Map
- **Enfoque de color**: Location markers + Trust colors
- **Consideraciones**: Map integration. Service categories. Provider profiles. Booking system. Reviews.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#EA580C`, Background `#ECFDF5`, Foreground `#064E3B`, Card `#FFFFFF`, Muted `#E8F1F3`, Border `#A7F3D0`, Destructive `#DC2626`
- **Notas de paleta**: Location green + action orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Conversion + Feature-Rich
- **Ánimo de color**: Location markers + Trust colors
- **Ánimo tipográfico**: Clear + Functional typography
- **Efectos clave**: Map hover + Provider card reveals
- **Reglas de decisión**: {"must_have":["constraint:map-integration","constraint:booking-system"]}
- **Anti-patrones**: No map + Hidden reviews
- **Severidad**: HIGH

## Restaurant/Food Service
- **Palabras clave**: restaurant, menu, order, food, dining, reservation, delivery, cuisine, chef, table, takeaway, eatery
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Hero-Centric Design + Conversion
- **Estilo de dashboard**: N/A - Booking focused
- **Enfoque de color**: Warm colors (Orange Red Brown) + appetizing imagery
- **Consideraciones**: Menu display. Online ordering. Reservation system. Food photography. Location/hours prominent.
- **Paleta**: Primary `#DC2626`, Secondary `#F87171`, Accent `#A16207`, Background `#FEF2F2`, Foreground `#450A0A`, Card `#FFFFFF`, Muted `#F0EDF1`, Border `#FECACA`, Destructive `#DC2626`
- **Notas de paleta**: Appetizing red + warm gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Hero-Centric + Conversion
- **Ánimo de color**: Warm colors (Orange Red Brown)
- **Ánimo tipográfico**: Appetizing + Clear typography
- **Efectos clave**: Food image reveal + Menu hover effects
- **Reglas de decisión**: {"must_have":["constraint:high-quality-images"],"if_delivery":["constraint:emphasize-speed"]}
- **Anti-patrones**: Low-quality imagery + Outdated hours
- **Severidad**: HIGH

## Travel/Tourism Agency
- **Palabras clave**: travel, tourism, vacation, flight, hotel, destination, adventure, cruise, safari, backpacking, guided-tour, holiday-package
- **Estilo principal**: [Aurora UI](../estilos/aurora-ui.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Storytelling-Driven + Hero-Centric
- **Estilo de dashboard**: Booking Analytics
- **Enfoque de color**: Vibrant destination colors + Sky Blue + Warm accents
- **Consideraciones**: Destination showcase. Booking system. Itinerary builder. Reviews. Inspiration galleries. Mobile-first.
- **Paleta**: Primary `#0EA5E9`, Secondary `#38BDF8`, Accent `#EA580C`, Background `#F0F9FF`, Foreground `#0C4A6E`, Card `#FFFFFF`, Muted `#E8F2F8`, Border `#BAE6FD`, Destructive `#DC2626`
- **Notas de paleta**: Sky blue + adventure orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Storytelling-Driven + Hero
- **Ánimo de color**: Vibrant destination + Sky Blue
- **Ánimo tipográfico**: Inspirational + Engaging
- **Efectos clave**: Destination parallax + Itinerary animations
- **Reglas de decisión**: {"if_experience_focused":["style:parallax-storytelling"],"must_have":["constraint:mobile-booking"]}
- **Anti-patrones**: Generic photos + Complex booking
- **Severidad**: HIGH

## Hotel/Hospitality
- **Palabras clave**: hospitality, hotel
- **Estilo principal**: [Liquid Glass](../estilos/liquid-glass.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Hero-Centric Design + Social Proof
- **Estilo de dashboard**: Revenue Management Dashboard
- **Enfoque de color**: Warm neutrals + Gold (#D4AF37) + Brand accent
- **Consideraciones**: Room booking. Amenities showcase. Location maps. Guest reviews. Seasonal pricing. Luxury imagery.
- **Paleta**: Primary `#1E3A8A`, Secondary `#3B82F6`, Accent `#A16207`, Background `#F8FAFC`, Foreground `#1E40AF`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Luxury navy + gold service [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Hero-Centric + Social Proof
- **Ánimo de color**: Warm neutrals + Gold (#D4AF37)
- **Ánimo tipográfico**: Elegant + Welcoming typography
- **Efectos clave**: Room gallery + Amenity reveals
- **Reglas de decisión**: {"must_have":["constraint:room-booking","constraint:virtual-tour"]}
- **Anti-patrones**: Poor photos + Complex booking
- **Severidad**: HIGH

## Wedding/Event Planning
- **Palabras clave**: conference, event, meetup, planning, registration, ticket, wedding
- **Estilo principal**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Storytelling-Driven + Social Proof
- **Estilo de dashboard**: N/A - Planning focused
- **Enfoque de color**: Soft Pink (#FFD6E0) + Gold + Cream + Sage
- **Consideraciones**: Portfolio gallery. Vendor directory. Planning tools. Timeline. Budget tracker. Romantic aesthetic.
- **Paleta**: Primary `#DB2777`, Secondary `#F472B6`, Accent `#A16207`, Background `#FDF2F8`, Foreground `#831843`, Card `#FFFFFF`, Muted `#F0EDF4`, Border `#FBCFE8`, Destructive `#DC2626`
- **Notas de paleta**: Romantic pink + elegant gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Storytelling + Social Proof
- **Ánimo de color**: Soft Pink (#FFD6E0) + Gold + Cream
- **Ánimo tipográfico**: Elegant + Romantic typography
- **Efectos clave**: Gallery reveals + Timeline animations
- **Reglas de decisión**: {"must_have":["constraint:portfolio-gallery","constraint:planning-tools"]}
- **Anti-patrones**: Generic templates + No portfolio
- **Severidad**: HIGH

## Florist/Plant Shop
- **Palabras clave**: florist, plant, shop
- **Estilo principal**: [Organic Biophilic](../estilos/organic-biophilic.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Aurora UI](../estilos/aurora-ui.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Hero-Centric Design + Conversion
- **Estilo de dashboard**: E-commerce Analytics
- **Enfoque de color**: Natural Green + Floral pinks/purples + Earth tones
- **Consideraciones**: Product catalog. Occasion categories. Delivery scheduling. Care guides. Seasonal collections. Beautiful imagery.
- **Paleta**: Primary `#15803D`, Secondary `#22C55E`, Accent `#EC4899`, Background `#F0FDF4`, Foreground `#14532D`, Card `#FFFFFF`, Muted `#E8F0F1`, Border `#BBF7D0`, Destructive `#DC2626`
- **Notas de paleta**: Natural green + floral pink
- **Patrón recomendado**: Hero-Centric + Conversion
- **Ánimo de color**: Natural Green + Floral pinks/purples
- **Ánimo tipográfico**: Elegant + Natural typography
- **Efectos clave**: Product reveal + Seasonal transitions
- **Reglas de decisión**: {"must_have":["constraint:delivery-scheduling","constraint:care-guides"]}
- **Anti-patrones**: Poor imagery + No seasonal content
- **Severidad**: MEDIUM

## Bakery/Cafe
- **Palabras clave**: bakery, cafe
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Hero-Centric Design + Conversion
- **Estilo de dashboard**: N/A - Order focused
- **Enfoque de color**: Warm Brown + Cream + Appetizing accents
- **Consideraciones**: Menu display. Online ordering. Location/hours. Catering. Seasonal specials. Appetizing photography.
- **Paleta**: Primary `#92400E`, Secondary `#B45309`, Accent `#92400E`, Background `#FEF3C7`, Foreground `#78350F`, Card `#FFFFFF`, Muted `#EDEEF0`, Border `#FDE68A`, Destructive `#DC2626`
- **Notas de paleta**: Warm brown + cream white [Accent adjusted from #F8FAFC]
- **Patrón recomendado**: Hero-Centric + Conversion
- **Ánimo de color**: Warm Brown + Cream + Appetizing accents
- **Ánimo tipográfico**: Warm + Inviting typography
- **Efectos clave**: Menu hover + Order animations
- **Reglas de decisión**: {"must_have":["constraint:menu-display","constraint:online-ordering"]}
- **Anti-patrones**: Poor food photos + Hidden hours
- **Severidad**: HIGH

## Brewery/Winery
- **Palabras clave**: brewery, winery
- **Estilo principal**: [Motion-Driven](../estilos/motion-driven.md) + [Vintage Analog / Retro Film](../estilos/vintage-analog-retro-film.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Organic Biophilic](../estilos/organic-biophilic.md)
- **Patrón de landing**: Storytelling-Driven + Hero-Centric
- **Estilo de dashboard**: N/A - E-commerce focused
- **Enfoque de color**: Deep amber/burgundy + Gold + Craft aesthetic
- **Consideraciones**: Product showcase. Story/heritage. Tasting notes. Events. Club membership. Artisanal imagery.
- **Paleta**: Primary `#7C2D12`, Secondary `#B91C1C`, Accent `#A16207`, Background `#FEF2F2`, Foreground `#450A0A`, Card `#FFFFFF`, Muted `#ECEDF0`, Border `#FECACA`, Destructive `#DC2626`
- **Notas de paleta**: Deep burgundy + craft gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Storytelling + Hero-Centric
- **Ánimo de color**: Deep amber/burgundy + Gold + Craft
- **Ánimo tipográfico**: Artisanal + Heritage typography
- **Efectos clave**: Tasting note reveals + Heritage timeline
- **Reglas de decisión**: {"must_have":["constraint:product-showcase","constraint:story-heritage"]}
- **Anti-patrones**: Generic product pages + No story
- **Severidad**: HIGH

## Airline
- **Palabras clave**: airline, aviation, flight, travel, booking, airport, flying
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Conversion-Optimized + Feature-Rich
- **Estilo de dashboard**: Operations Dashboard
- **Enfoque de color**: Sky Blue + Brand colors + Trust accents
- **Consideraciones**: Flight search. Booking. Check-in. Boarding pass. Loyalty program. Route maps. Mobile-first.
- **Paleta**: Primary `#1E3A8A`, Secondary `#3B82F6`, Accent `#EA580C`, Background `#EFF6FF`, Foreground `#1E40AF`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Sky blue + booking orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Conversion + Feature-Rich
- **Ánimo de color**: Sky Blue + Brand colors + Trust
- **Ánimo tipográfico**: Clear + Professional typography
- **Efectos clave**: Flight search animations + Boarding pass reveals
- **Reglas de decisión**: {"must_have":["constraint:flight-search","constraint:mobile-first"]}
- **Anti-patrones**: Complex booking + Poor mobile
- **Severidad**: HIGH

## Event Management
- **Palabras clave**: conference, event, management, meetup, registration, ticket
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Event Analytics
- **Enfoque de color**: Event theme colors + Excitement accents
- **Consideraciones**: Event showcase. Registration. Agenda. Speakers. Sponsors. Ticket sales. Countdown timer.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#EA580C`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Excitement purple + action orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Hero-Centric + Feature-Rich
- **Ánimo de color**: Event theme colors + Excitement accents
- **Ánimo tipográfico**: Bold + Engaging typography
- **Efectos clave**: Countdown timer + Registration flow
- **Reglas de decisión**: {"must_have":["constraint:registration","constraint:agenda-display"]}
- **Anti-patrones**: Confusing registration + No countdown
- **Severidad**: HIGH

## Food Delivery / On-Demand
- **Palabras clave**: delivery, food, order, uber-eats, doordash, takeout, on-demand, courier
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Real-Time Monitoring + Map
- **Enfoque de color**: Appetizing warm (orange/red) + trust blue + map accent
- **Consideraciones**: Restaurant cards with ratings. Menu category horizontal scroll. Cart bottom sheet. Real-time map tracking + driver ETA. Order status stepper. Rating post-delivery.
- **Paleta**: Primary `#EA580C`, Secondary `#F97316`, Accent `#2563EB`, Background `#FFF7ED`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FDF4F0`, Border `#FCEAE1`, Destructive `#DC2626`
- **Notas de paleta**: Appetizing orange + trust blue
- **Patrón recomendado**: Hero-Centric Design + Feature-Rich
- **Ánimo de color**: Appetizing warm (orange/red) + trust blue + map accent
- **Ánimo tipográfico**: Energetic + Bold + Large
- **Efectos clave**: Scroll animations + Parallax + Page transitions
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Recipe & Cooking App
- **Palabras clave**: recipe, cooking, food, kitchen, cookbook, meal, ingredient, chef
- **Estilo principal**: [Claymorphism](../estilos/claymorphism.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Organic Biophilic](../estilos/organic-biophilic.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: N/A - Content focused
- **Enfoque de color**: Warm food tones (terracotta/sage/cream) + appetizing imagery
- **Consideraciones**: Step-by-step with checkable instructions. Ingredient list with serving adjuster. Built-in timer per step. Cooking mode (screen-awake + large text). Save/bookmark. Share.
- **Paleta**: Primary `#9A3412`, Secondary `#C2410C`, Accent `#059669`, Background `#FFFBEB`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F8F2F0`, Border `#F2E6E2`, Destructive `#DC2626`
- **Notas de paleta**: Warm terracotta + fresh green
- **Patrón recomendado**: Hero-Centric Design + Feature-Rich
- **Ánimo de color**: Warm food tones (terracotta/sage/cream) + appetizing imagery
- **Ánimo tipográfico**: Playful + Rounded + Friendly
- **Efectos clave**: Multi-layer shadows + Spring bounce + Soft press 200ms
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Booking & Appointment App
- **Palabras clave**: booking, appointment, schedule, calendar, reservation, slot, service
- **Estilo principal**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Conversion-Optimized
- **Estilo de dashboard**: Drill-Down Analytics
- **Enfoque de color**: Trust blue + available green + booked grey + confirm accent
- **Consideraciones**: Calendar strip or month picker. Available time-slot grid. Service + staff selector. Confirmation summary. Reminder push. Reschedule/cancel flow. Two-sided (provider ↔ client).
- **Paleta**: Primary `#0284C7`, Secondary `#0EA5E9`, Accent `#059669`, Background `#F0F9FF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#EFF7FB`, Border `#E0F0F8`, Destructive `#DC2626`
- **Notas de paleta**: Calendar blue + available green
- **Patrón recomendado**: Conversion-Optimized
- **Ánimo de color**: Trust blue + available green + booked grey + confirm accent
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Complex shadows + 3D effects
- **Severidad**: HIGH

## Grocery & Shopping List
- **Palabras clave**: grocery, shopping, list, supermarket, checklist, pantry, meal-plan, buy
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Minimal & Direct + Demo
- **Estilo de dashboard**: N/A - List focused
- **Enfoque de color**: Fresh green + food-category colors + checkmark accent
- **Consideraciones**: Category-grouped list. Tap-to-check interaction (with strikethrough). Quantity stepper. Share list with family. Store aisle sorting. Barcode scan to add. Frequently bought suggestions.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#D97706`, Background `#ECFDF5`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F0F8F6`, Border `#E1F2ED`, Destructive `#DC2626`
- **Notas de paleta**: Fresh green + food amber
- **Patrón recomendado**: Minimal & Direct + Demo
- **Ánimo de color**: Fresh green + food-category colors + checkmark accent
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Complex shadows + 3D effects + Muted colors + Low energy
- **Severidad**: HIGH

## Calorie & Nutrition Counter
- **Palabras clave**: calorie, nutrition, food, diet, macro, protein, carb, fat, log, fitness, myfitnesspal
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Claymorphism](../estilos/claymorphism.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: Healthcare Analytics
- **Enfoque de color**: Healthy green + macro colors (protein blue, carb orange, fat yellow) + progress circle
- **Consideraciones**: Barcode scanner food log. Large database. Macro goals. Restaurant lookup. Recipe builder. AI photo food logging.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#EA580C`, Background `#ECFDF5`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F0F8F6`, Border `#E1F2ED`, Destructive `#DC2626`
- **Notas de paleta**: Healthy green + macro orange
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Healthy green + macro colors (protein blue, carb orange, fat yellow) + progress circle
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Complex shadows + 3D effects + Muted colors + Low energy
- **Severidad**: HIGH

## Water & Hydration Reminder
- **Palabras clave**: water, hydration, drink, reminder, daily, tracker, glasses, intake, health, cup, aqua
- **Estilo principal**: [Claymorphism](../estilos/claymorphism.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Minimal & Direct + Demo
- **Estilo de dashboard**: N/A - Daily goal focused
- **Enfoque de color**: Refreshing blue + water wave animation + goal progress accent
- **Consideraciones**: Tap to log quickly. Animated fill visualization. Custom reminders. Goal by weight/weather. Streak system. Widget.
- **Paleta**: Primary `#0284C7`, Secondary `#06B6D4`, Accent `#0891B2`, Background `#F0F9FF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#EFF7FB`, Border `#E0F0F8`, Destructive `#DC2626`
- **Notas de paleta**: Refreshing blue + water cyan
- **Patrón recomendado**: Minimal & Direct + Demo
- **Ánimo de color**: Refreshing blue + water wave animation + goal progress accent
- **Ánimo tipográfico**: Playful + Rounded + Friendly
- **Efectos clave**: Multi-layer shadows + Spring bounce + Soft press 200ms
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Fasting & Intermittent Timer
- **Palabras clave**: fasting, intermittent, 16:8, timer, fast, eating, window, keto, diet, zero, weight, protocol
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Neumorphism](../estilos/neumorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: N/A - Timer focused
- **Enfoque de color**: Fasting deep blue/purple + eating window green + timeline neutral
- **Consideraciones**: Protocol selector (16:8, 18:6, OMAD). Circular countdown timer. Fasting history log. Tips during fast. Electrolytes.
- **Paleta**: Primary `#6366F1`, Secondary `#4338CA`, Accent `#059669`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#151D39`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Fasting indigo on dark + eating green
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Fasting deep blue/purple + eating window green + timeline neutral
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle glow + Neon accents + High contrast
- **Reglas de decisión**: {"if_light_mode_needed":["constraint:provide-theme-toggle"],"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Excessive decoration + Pure white backgrounds
- **Severidad**: HIGH

## Local Events & Discovery
- **Palabras clave**: local, events, discovery, meetup, nearby, social, city, activities, calendar, community, explore
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Event Analytics
- **Enfoque de color**: City vibrant + event category colors + map accent + date highlight
- **Consideraciones**: Location-based discovery. Category filters. RSVP flow. Map view. Friend attendance. Organizer tools. Reminders.
- **Paleta**: Primary `#EA580C`, Secondary `#F97316`, Accent `#2563EB`, Background `#FFF7ED`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FDF4F0`, Border `#FCEAE1`, Destructive `#DC2626`
- **Notas de paleta**: Event orange + map blue
- **Patrón recomendado**: Hero-Centric Design + Feature-Rich
- **Ánimo de color**: City vibrant + event category colors + map accent + date highlight
- **Ánimo tipográfico**: Energetic + Bold + Large
- **Efectos clave**: Scroll animations + Parallax + Page transitions
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Conference / Symposium Landing Page
- **Palabras clave**: conference, symposium, summit, cfp, call-for-papers, speaker-lineup, registration, venue, proceedings, keynote, track
- **Estilo principal**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Hero + Agenda + CFP
- **Estilo de dashboard**: N/A - Event focused
- **Enfoque de color**: Academic navy + track color chips + gold keynote + neutral white
- **Consideraciones**: Speaker grid. Multi-track agenda. CFP deadline countdown. Venue map. Sponsor tiers. Early-bird pricing. Proceedings download.
- **Paleta**: Primary `#1E3A5F`, Secondary `#2563EB`, Accent `#A16207`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#CBD5E1`, Destructive `#DC2626`
- **Notas de paleta**: Academic navy + gold keynote + track chips
- **Patrón recomendado**: Event/Conference Landing
- **Ánimo de color**: Academic navy + track color chips + gold keynote + neutral white
- **Ánimo tipográfico**: Academic + Hierarchical typography
- **Efectos clave**: Speaker grid + agenda reveal
- **Reglas de decisión**: {"must_have":["constraint:speaker-grid","constraint:multi-track-agenda","constraint:cfp-countdown","constraint:venue-map","constraint:sponsor-tiers"],"if_trust_needed":["constraint:prioritize-clarity"],"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Ornate design + unclear schedule + hidden speaker info
- **Severidad**: MEDIUM

## Ticketing / Box Office
- **Palabras clave**: ticketing, box-office, eventbrite, ticket-sales, seat-selection, will-call, qr-ticket, venue-capacity, will-call-pickup
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Event Grid + Seat Map
- **Estilo de dashboard**: Sales Analytics Dashboard
- **Enfoque de color**: Event theme colors + available green + sold-out red + seat map neutral
- **Consideraciones**: Event cards with date/venue. Interactive seat map. Cart with countdown. QR code ticket. Will-call pickup. Group discounts. Refund policy.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#16A34A`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#DC2626`
- **Notas de paleta**: Event theme colors + available green + sold-out red
- **Patrón recomendado**: Event/Conference Landing
- **Ánimo de color**: Event theme colors + available green + sold-out red + seat map neutral
- **Ánimo tipográfico**: Bold + Event typography
- **Efectos clave**: Seat-map hover states + countdown urgency
- **Reglas de decisión**: {"must_have":["constraint:event-cards","constraint:seat-map","constraint:cart-countdown","constraint:qr-ticket","constraint:refund-policy"],"if_conversion_focused":["constraint:add-urgency-colors"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: No seat-map feedback + hidden fees + weak mobile
- **Severidad**: HIGH

