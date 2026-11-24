# Sector: gestion-herramientas
> Fuente: UI UX Pro Max (MIT), reordenado por sector. Son **sugerencias**: en Gula mandan `CLAUDE.md` y los tokens de `src/index.css`. Los hex son referencia, no se pegan: se traducen a tokens.

## B2B Service
- **Palabras clave**: b2b, enterprise, consulting, professional, solution, contract, corporate, strategy, advisory, roi, deliverable, whitepaper
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Bento Box Grid](../estilos/bento-box-grid.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Professional blue + neutral grey
- **Consideraciones**: Credibility essential. Clear ROI messaging.
- **Paleta**: Primary `#0F172A`, Secondary `#334155`, Accent `#0369A1`, Background `#F8FAFC`, Foreground `#020617`, Card `#FFFFFF`, Muted `#E8ECF1`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Professional navy + blue CTA
- **Patrón recomendado**: Feature-Rich Showcase + Trust
- **Ánimo de color**: Professional blue + Neutral grey
- **Ánimo tipográfico**: Formal + Clear typography
- **Efectos clave**: Section transitions + Feature reveals
- **Reglas de decisión**: {"must_have":["constraint:case-studies","constraint:roi-messaging"]}
- **Anti-patrones**: Playful design + Hidden credentials + AI purple/pink gradients
- **Severidad**: HIGH

## Analytics Dashboard
- **Palabras clave**: kpi, metric, funnel, conversion, cohort, retention, segment, attribution, ab-test, dashboard-data, business-intelligence
- **Estilo principal**: [Data-Dense Dashboard](../estilos/data-dense-dashboard.md) + [Heat Map & Heatmap Style](../estilos/heat-map-and-heatmap-style.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: N/A - Analytics focused
- **Estilo de dashboard**: Drill-Down Analytics + Comparative
- **Enfoque de color**: Cool→Hot gradients + neutral grey
- **Consideraciones**: Clarity > aesthetics. Color-coded data priority.
- **Paleta**: Primary `#1E40AF`, Secondary `#3B82F6`, Accent `#D97706`, Background `#F8FAFC`, Foreground `#1E3A8A`, Card `#FFFFFF`, Muted `#E9EEF6`, Border `#DBEAFE`, Destructive `#DC2626`
- **Notas de paleta**: Blue data + amber highlights [Accent adjusted from #F59E0B]
- **Patrón recomendado**: Data-Dense + Drill-Down
- **Ánimo de color**: Cool→Hot gradients + Neutral grey
- **Ánimo tipográfico**: Clear + Functional typography
- **Efectos clave**: Hover tooltips + Chart zoom + Filter animations
- **Reglas de decisión**: {"must_have":["constraint:data-export"],"if_large_dataset":["constraint:virtualize-lists"]}
- **Anti-patrones**: Ornate design + No filtering
- **Severidad**: HIGH

## Productivity Tool
- **Palabras clave**: collaboration, productivity, project, task, tool, workflow
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: Drill-Down Analytics
- **Enfoque de color**: Clear hierarchy + functional colors
- **Consideraciones**: Ease of use. Speed & efficiency focus.
- **Paleta**: Primary `#0D9488`, Secondary `#14B8A6`, Accent `#EA580C`, Background `#F0FDFA`, Foreground `#134E4A`, Card `#FFFFFF`, Muted `#E8F1F4`, Border `#99F6E4`, Destructive `#DC2626`
- **Notas de paleta**: Teal focus + action orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Interactive Demo + Feature-Rich
- **Ánimo de color**: Clear hierarchy + Functional colors
- **Ánimo tipográfico**: Clean + Efficient typography
- **Efectos clave**: Quick actions (150ms) + Task animations
- **Reglas de decisión**: {"must_have":["constraint:keyboard-shortcuts"],"if_collaboration":["constraint:add-real-time-cursors"]}
- **Anti-patrones**: Complex onboarding + Slow performance
- **Severidad**: HIGH

## Remote Work/Collaboration Tool
- **Palabras clave**: collaboration, remote, tool, work
- **Estilo principal**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Drill-Down Analytics
- **Enfoque de color**: Calm Blue + Neutral grey
- **Consideraciones**: Real-time collaboration. Status indicators. Video integration. Notification management.
- **Paleta**: Primary `#6366F1`, Secondary `#818CF8`, Accent `#059669`, Background `#F5F3FF`, Foreground `#312E81`, Card `#FFFFFF`, Muted `#EBEFF9`, Border `#E0E7FF`, Destructive `#DC2626`
- **Notas de paleta**: Calm indigo + success green [Accent adjusted from #10B981]
- **Patrón recomendado**: Feature-Rich + Real-Time
- **Ánimo de color**: Calm Blue + Neutral grey
- **Ánimo tipográfico**: Clean + Readable typography
- **Efectos clave**: Real-time presence indicators + Notification badges
- **Reglas de decisión**: {"must_have":["constraint:status-indicators","constraint:video-integration"]}
- **Anti-patrones**: Cluttered interface + No presence
- **Severidad**: HIGH

## Smart Home/IoT Dashboard
- **Palabras clave**: admin, analytics, dashboard, data, home, iot, panel, smart
- **Estilo principal**: [Glassmorphism](../estilos/glassmorphism.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [AI-Native UI](../estilos/ai-native-ui.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: Real-Time Monitoring
- **Enfoque de color**: Dark + Status indicator colors
- **Consideraciones**: Device status. Real-time controls. Energy monitoring. Automation rules. Quick actions.
- **Paleta**: Primary `#1E293B`, Secondary `#334155`, Accent `#22C55E`, Background `#0F172A`, Foreground `#F8FAFC`, Card `#1B2336`, Muted `#272F42`, Border `#475569`, Destructive `#EF4444`
- **Notas de paleta**: Dark tech + status green
- **Patrón recomendado**: Real-Time Monitoring
- **Ánimo de color**: Dark + Status indicator colors
- **Ánimo tipográfico**: Clear + Functional typography
- **Efectos clave**: Device status pulse + Quick action animations
- **Reglas de decisión**: {"must_have":["constraint:real-time-controls","constraint:energy-monitoring"]}
- **Anti-patrones**: Slow updates + No automation
- **Severidad**: HIGH

## Logistics/Delivery
- **Palabras clave**: delivery, logistics
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase + Conversion
- **Estilo de dashboard**: Real-Time Monitoring + Route Analytics
- **Enfoque de color**: Blue (#2563EB) + Orange (tracking) + Green (delivered)
- **Consideraciones**: Real-time tracking. Delivery scheduling. Route optimization. Driver management. Status updates. Map integration.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#EA580C`, Background `#EFF6FF`, Foreground `#1E40AF`, Card `#FFFFFF`, Muted `#E9EFF8`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Tracking blue + delivery orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Feature-Rich Showcase + Real-Time
- **Ánimo de color**: Blue (#2563EB) + Orange (tracking) + Green
- **Ánimo tipográfico**: Clear + Functional typography
- **Efectos clave**: Real-time tracking animation + Status pulse
- **Reglas de decisión**: {"must_have":["constraint:tracking-map","constraint:delivery-updates"]}
- **Anti-patrones**: Static tracking + No map integration + AI purple/pink gradients
- **Severidad**: HIGH

## Home Services (Plumber/Electrician)
- **Palabras clave**: plumber, electrician, hvac, handyman, repair, maintenance, home, emergency, leak, wiring, inspection, licensed
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Conversion-Optimized + Trust
- **Estilo de dashboard**: Service Analytics
- **Enfoque de color**: Trust Blue + Safety Orange + Professional grey
- **Consideraciones**: Service list. Emergency contact. Booking. Price transparency. Certifications. Local trust signals.
- **Paleta**: Primary `#1E40AF`, Secondary `#3B82F6`, Accent `#EA580C`, Background `#EFF6FF`, Foreground `#1E3A8A`, Card `#FFFFFF`, Muted `#E9EEF6`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Professional blue + urgent orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Conversion-Optimized + Trust
- **Ánimo de color**: Trust Blue + Safety Orange + Grey
- **Ánimo tipográfico**: Professional + Clear typography
- **Efectos clave**: Emergency contact highlight + Service menu animations
- **Reglas de decisión**: {"must_have":["constraint:emergency-contact","constraint:certifications-display"]}
- **Anti-patrones**: Hidden contact info + No certifications
- **Severidad**: HIGH

## Freelancer Platform
- **Palabras clave**: freelancer, platform
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase + Conversion
- **Estilo de dashboard**: Marketplace Analytics
- **Enfoque de color**: Professional Blue + Success Green + Neutral
- **Consideraciones**: Profile creation. Portfolio. Skill matching. Messaging. Payment. Reviews. Project management.
- **Paleta**: Primary `#6366F1`, Secondary `#818CF8`, Accent `#16A34A`, Background `#EEF2FF`, Foreground `#312E81`, Card `#FFFFFF`, Muted `#EBEFF9`, Border `#C7D2FE`, Destructive `#DC2626`
- **Notas de paleta**: Creative indigo + hire green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Feature-Rich + Conversion
- **Ánimo de color**: Professional Blue + Success Green
- **Ánimo tipográfico**: Clear + Professional typography
- **Efectos clave**: Skill match animations + Review reveals
- **Reglas de decisión**: {"must_have":["constraint:portfolio-display","constraint:skill-matching"]}
- **Anti-patrones**: Poor profiles + No reviews
- **Severidad**: HIGH

## Marketing Agency
- **Palabras clave**: campaign, ads, growth, roi, seo, sem, ppc, social-media, conversion-funnel, ab-test, attribution, performance-marketing
- **Estilo principal**: [Brutalism](../estilos/brutalism.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Storytelling-Driven + Feature-Rich
- **Estilo de dashboard**: Campaign Analytics
- **Enfoque de color**: Bold brand colors + Creative freedom
- **Consideraciones**: Portfolio. Case studies. Services. Team. Creative showcase. Results-focused. Bold aesthetic.
- **Paleta**: Primary `#EC4899`, Secondary `#F472B6`, Accent `#0891B2`, Background `#FDF2F8`, Foreground `#831843`, Card `#FFFFFF`, Muted `#F1EEF5`, Border `#FBCFE8`, Destructive `#DC2626`
- **Notas de paleta**: Bold pink + creative cyan [Accent adjusted from #06B6D4]
- **Patrón recomendado**: Storytelling + Feature-Rich
- **Ánimo de color**: Bold brand colors + Creative freedom
- **Ánimo tipográfico**: Bold + Expressive typography
- **Efectos clave**: Portfolio reveals + Results animations
- **Reglas de decisión**: {"must_have":["constraint:portfolio","constraint:results-metrics"]}
- **Anti-patrones**: Boring design + Hidden work
- **Severidad**: HIGH

## Membership/Community
- **Palabras clave**: community, membership
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Estilos secundarios**: [Bento Box Grid](../estilos/bento-box-grid.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Social Proof-Focused + Conversion
- **Estilo de dashboard**: Community Analytics
- **Enfoque de color**: Community brand colors + Engagement accents
- **Consideraciones**: Member benefits. Pricing tiers. Community showcase. Events. Member directory. Exclusive content.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#16A34A`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Community purple + join green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Social Proof + Conversion
- **Ánimo de color**: Community brand colors + Engagement
- **Ánimo tipográfico**: Friendly + Engaging typography
- **Efectos clave**: Member counter + Benefit reveals
- **Reglas de decisión**: {"must_have":["constraint:member-benefits","constraint:pricing-tiers"]}
- **Anti-patrones**: Hidden benefits + No community proof
- **Severidad**: HIGH

## Notes & Writing App
- **Palabras clave**: notes, memo, writing, editor, notebook, markdown, journal, notion, obsidian
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Minimal & Direct
- **Estilo de dashboard**: N/A - Editor focused
- **Enfoque de color**: Clean white/cream + minimal accent + editor syntax colors
- **Consideraciones**: WYSIWYG or Markdown toggle. Folder/tag organization. Full-text search. Cloud sync. Typography-first. Distraction-free zen mode. Slash-command palette.
- **Paleta**: Primary `#78716C`, Secondary `#A8A29E`, Accent `#D97706`, Background `#FFFBEB`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F6F6F6`, Border `#EEEDED`, Destructive `#DC2626`
- **Notas de paleta**: Warm ink + amber accent on cream
- **Patrón recomendado**: Minimal & Direct
- **Ánimo de color**: Clean white/cream + minimal accent + editor syntax colors
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Habit Tracker
- **Palabras clave**: habit, streak, routine, daily, tracker, goals, consistency, discipline
- **Estilo principal**: [Claymorphism](../estilos/claymorphism.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Micro-interactions](../estilos/micro-interactions.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Social Proof-Focused + Demo
- **Estilo de dashboard**: User Behavior Analytics
- **Enfoque de color**: Streak warm (amber/orange) + progress green + motivational accents
- **Consideraciones**: Streak calendar heatmap. Daily check-in interaction. Gamification (badges/levels/fire). Reminder push. Progress ring charts. Weekly/monthly stats. Motivational micro-copy.
- **Paleta**: Primary `#D97706`, Secondary `#F59E0B`, Accent `#059669`, Background `#FFFBEB`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FCF6F0`, Border `#FAEEE1`, Destructive `#DC2626`
- **Notas de paleta**: Streak amber + habit green
- **Patrón recomendado**: Social Proof-Focused + Demo
- **Ánimo de color**: Streak warm (amber/orange) + progress green + motivational accents
- **Ánimo tipográfico**: Playful + Rounded + Friendly
- **Efectos clave**: Multi-layer shadows + Spring bounce + Soft press 200ms
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## CRM & Client Management
- **Palabras clave**: crm, client, customer, sales, pipeline, contact, lead, deal, hubspot
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase + Demo
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Professional blue + pipeline stage colors + closed-won green
- **Consideraciones**: Contact card list with avatar. Pipeline kanban board. Activity timeline. Quick-log (call/email/meeting). Deal amount + probability. Tag/segment filter. Mobile quick-actions.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#059669`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Professional blue + deal green
- **Patrón recomendado**: Feature-Rich Showcase + Demo
- **Ánimo de color**: Professional blue + pipeline stage colors + closed-won green
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Inventory & Stock Management
- **Palabras clave**: inventory, stock, warehouse, product, barcode, supply, sku, management
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Real-Time Monitoring + Data-Dense
- **Enfoque de color**: Functional neutral + status traffic-light (green/amber/red) + scanner accent
- **Consideraciones**: Product list/grid with thumbnails. Barcode/QR scanner. Stock level badges. Low-stock alert banner. Category/location filter. Batch edit. Reorder trigger. Audit log.
- **Paleta**: Primary `#334155`, Secondary `#475569`, Accent `#059669`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F2F3F4`, Border `#E6E8EA`, Destructive `#DC2626`
- **Notas de paleta**: Industrial slate + stock green
- **Patrón recomendado**: Feature-Rich Showcase
- **Ánimo de color**: Functional neutral + status traffic-light (green/amber/red) + scanner accent
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Invoice & Billing Tool
- **Palabras clave**: invoice, billing, payment, receipt, freelance, estimate, quote, accounting
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Conversion-Optimized + Trust
- **Estilo de dashboard**: Financial Dashboard
- **Enfoque de color**: Professional navy + paid green + overdue red + neutral grey
- **Consideraciones**: Invoice template with line items. Tax/discount calculation. Status badges (Draft/Sent/Paid/Overdue). PDF export + share. Payment link generation. Client address book. Recurring invoices.
- **Paleta**: Primary `#1E3A5F`, Secondary `#2563EB`, Accent `#059669`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F3F5`, Border `#E4E7EB`, Destructive `#DC2626`
- **Notas de paleta**: Navy professional + paid green
- **Patrón recomendado**: Conversion-Optimized + Trust
- **Ánimo de color**: Professional navy + paid green + overdue red + neutral grey
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Timer & Pomodoro
- **Palabras clave**: timer, pomodoro, countdown, stopwatch, focus, clock, productivity, interval
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Neumorphism](../estilos/neumorphism.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Minimal & Direct
- **Estilo de dashboard**: N/A - Utility focused
- **Enfoque de color**: High-contrast on dark + focus red/amber + break green
- **Consideraciones**: Large centered countdown digits. Circular progress ring. Session/break auto-switch. Session history log. Custom interval settings. Sound + haptic alerts. Focus stats chart.
- **Paleta**: Primary `#DC2626`, Secondary `#EF4444`, Accent `#059669`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#1F1829`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Focus red on dark + break green
- **Patrón recomendado**: Minimal & Direct
- **Ánimo de color**: High-contrast on dark + focus red/amber + break green
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Dual shadows (light+dark) + Soft press 150ms
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Scanner & Document Manager
- **Palabras clave**: scanner, document, ocr, pdf, scan, camera, file, archive, digitize
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Feature-Rich Showcase + Demo
- **Estilo de dashboard**: N/A - Tool focused
- **Enfoque de color**: Clean white + camera viewfinder accent + file-type color coding
- **Consideraciones**: Camera capture with auto-edge detection. Crop/rotate/enhance. OCR text extraction overlay. PDF multi-page creation. Folder tree organization. Cloud sync. Share/export. Batch scan mode.
- **Paleta**: Primary `#1E293B`, Secondary `#334155`, Accent `#2563EB`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F2F3`, Border `#E4E5E7`, Destructive `#DC2626`
- **Notas de paleta**: Document grey + scan blue
- **Patrón recomendado**: Feature-Rich Showcase + Demo
- **Ánimo de color**: Clean white + camera viewfinder accent + file-type color coding
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Calendar & Scheduling App
- **Palabras clave**: calendar, scheduling, planner, agenda, events, reminder, appointment, organize, date, sync
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Feature-Rich Showcase + Demo
- **Estilo de dashboard**: N/A - Calendar focused
- **Enfoque de color**: Clean blue + event category accent colors + success green
- **Consideraciones**: Event color coding. Week/month/day views. Recurring events. Conflict detection. Multi-calendar sync.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#059669`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Calendar blue + event green
- **Patrón recomendado**: Feature-Rich Showcase + Demo
- **Ánimo de color**: Clean blue + event category accent colors + success green
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Complex shadows + 3D effects
- **Severidad**: HIGH

## Expense Splitter / Bill Split
- **Palabras clave**: split, expense, bill, aa, share, friends, group, settle, debt, payment, owe
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Minimal & Direct + Demo
- **Estilo de dashboard**: N/A - Balance focused
- **Enfoque de color**: Success green + alert red + neutral grey + avatar accent colors
- **Consideraciones**: Group expense tracking. Debt simplification algorithm. Payment reminders. Multi-currency. Receipt photo import.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#DC2626`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F0F8F6`, Border `#E1F2ED`, Destructive `#DC2626`
- **Notas de paleta**: Balance green + owe red
- **Patrón recomendado**: Minimal & Direct + Demo
- **Ánimo de color**: Success green + alert red + neutral grey + avatar accent colors
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Complex shadows + 3D effects + Muted colors + Low energy
- **Severidad**: HIGH

## Voice Recorder & Memo
- **Palabras clave**: voice, recorder, memo, audio, transcription, dictate, recording, microphone, note, otter
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [AI-Native UI](../estilos/ai-native-ui.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Interactive Product Demo + Minimal
- **Estilo de dashboard**: N/A - Recording focused
- **Enfoque de color**: Clean white + recording red + waveform accent
- **Consideraciones**: Waveform display. Background recording. Auto-transcription (AI). Tag/organize. Cloud sync.
- **Paleta**: Primary `#DC2626`, Secondary `#EF4444`, Accent `#2563EB`, Background `#FFFFFF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FCF1F1`, Border `#FAE4E4`, Destructive `#DC2626`
- **Notas de paleta**: Recording red + waveform blue
- **Patrón recomendado**: Interactive Product Demo + Minimal
- **Ánimo de color**: Clean white + recording red + waveform accent
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle hover 200ms + Smooth transitions + Clean
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Bookmark & Read-Later
- **Palabras clave**: bookmark, read-later, save, article, pocket, link, reading, archive, collection, raindrop
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Minimal & Direct + Demo
- **Estilo de dashboard**: N/A - List focused
- **Enfoque de color**: Paper warm white + ink neutral + minimal accent + tag colors
- **Consideraciones**: Fast save via share sheet. Article distraction-free view. Tags and collections. Offline sync. Reading progress.
- **Paleta**: Primary `#D97706`, Secondary `#F59E0B`, Accent `#2563EB`, Background `#FFFBEB`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FCF6F0`, Border `#FAEEE1`, Destructive `#DC2626`
- **Notas de paleta**: Warm amber + link blue
- **Patrón recomendado**: Minimal & Direct + Demo
- **Ánimo de color**: Paper warm white + ink neutral + minimal accent + tag colors
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Translator App
- **Palabras clave**: translate, language, text, voice, ocr, dictionary, multilingual, real-time, detect, deepl
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [AI-Native UI](../estilos/ai-native-ui.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Feature-Rich Showcase + Interactive Demo
- **Estilo de dashboard**: N/A - Utility focused
- **Enfoque de color**: Global blue + neutral grey + language flag accent
- **Consideraciones**: Real-time camera translation (OCR). Voice input and output. Offline mode. Conversation mode. Phrasebook.
- **Paleta**: Primary `#2563EB`, Secondary `#0891B2`, Accent `#EA580C`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Global blue + teal + accent orange
- **Patrón recomendado**: Feature-Rich Showcase + Interactive Demo
- **Ánimo de color**: Global blue + neutral grey + language flag accent
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Complex shadows + 3D effects
- **Severidad**: HIGH

## Calculator & Unit Converter
- **Palabras clave**: calculator, converter, unit, math, currency, measurement, scientific, formula, percentage
- **Estilo principal**: [Neumorphism](../estilos/neumorphism.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Minimal & Direct
- **Estilo de dashboard**: N/A - Utility focused
- **Enfoque de color**: Dark functional + orange operation keys + clear button hierarchy
- **Consideraciones**: Scientific mode toggle. Live currency rates. Calculation history. Widget support. Gesture input.
- **Paleta**: Primary `#EA580C`, Secondary `#F97316`, Accent `#2563EB`, Background `#1C1917`, Foreground `#FFFFFF`, Card `#262321`, Muted `#2C1E16`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Operation orange on dark
- **Patrón recomendado**: Minimal & Direct
- **Ánimo de color**: Dark functional + orange operation keys + clear button hierarchy
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Dual shadows (light+dark) + Soft press 150ms
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Alarm & World Clock
- **Palabras clave**: alarm, clock, world, timezone, timer, wake, sleep, schedule, reminder, bedtime
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Neumorphism](../estilos/neumorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Minimal & Direct
- **Estilo de dashboard**: N/A - Utility focused
- **Enfoque de color**: Deep dark + ambient glow accent + timezone gradient
- **Consideraciones**: Gentle wake (gradual volume). Timezone visualizer. Sleep tracking integration. Smart alarm skip. Bedtime mode.
- **Paleta**: Primary `#D97706`, Secondary `#F59E0B`, Accent `#6366F1`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#1F1E27`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Time amber + night indigo on dark
- **Patrón recomendado**: Minimal & Direct
- **Ánimo de color**: Deep dark + ambient glow accent + timezone gradient
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle glow + Neon accents + High contrast
- **Reglas de decisión**: {"if_light_mode_needed":["constraint:provide-theme-toggle"]}
- **Anti-patrones**: Excessive decoration + Pure white backgrounds
- **Severidad**: HIGH

## File Manager & Transfer
- **Palabras clave**: file, manager, transfer, folder, document, storage, cloud, share, organize, compress
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Feature-Rich Showcase + Demo
- **Estilo de dashboard**: N/A - File tree focused
- **Enfoque de color**: Functional neutral + file type color coding (PDF orange, doc blue, image purple)
- **Consideraciones**: Folder tree navigation. File type preview. Wireless P2P transfer. Cloud integration. Compress and extract.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#D97706`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Folder blue + file amber
- **Patrón recomendado**: Feature-Rich Showcase + Demo
- **Ánimo de color**: Functional neutral + file type color coding (PDF orange, doc blue, image purple)
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Email Client
- **Palabras clave**: email, mail, inbox, compose, thread, newsletter, filter, reply, gmail, spark, superhuman
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Micro-interactions](../estilos/micro-interactions.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Patrón de landing**: Feature-Rich Showcase + Demo
- **Estilo de dashboard**: N/A - Inbox focused
- **Enfoque de color**: Clean white + brand primary + priority red + snooze amber
- **Consideraciones**: Unified inbox. Swipe actions (archive/delete/snooze). Priority sorting. Smart reply. Unsubscribe tool.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#DC2626`, Background `#FFFFFF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Inbox blue + priority red
- **Patrón recomendado**: Feature-Rich Showcase + Demo
- **Ánimo de color**: Clean white + brand primary + priority red + snooze amber
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Complex shadows + 3D effects
- **Severidad**: HIGH

## Family Calendar & Chores
- **Palabras clave**: family, calendar, chores, tasks, household, shared, kids, schedule, cozi, organize, member
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Claymorphism](../estilos/claymorphism.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: N/A - Family hub focused
- **Enfoque de color**: Warm playful + member color coding + chore completion green
- **Consideraciones**: Member color coding. Chore assignment rotation. Recurring events. Shared shopping list. Allowance tracking.
- **Paleta**: Primary `#2563EB`, Secondary `#059669`, Accent `#D97706`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Family blue + chore green
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Warm playful + member color coding + chore completion green
- **Ánimo tipográfico**: Playful + Rounded + Friendly
- **Efectos clave**: Multi-layer shadows + Spring bounce + Soft press 200ms
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Complex shadows + 3D effects
- **Severidad**: HIGH

## Parking Finder
- **Palabras clave**: parking, spot, finder, map, pay, meter, garage, location, car, reserve, spothero
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Conversion-Optimized + Feature-Rich
- **Estilo de dashboard**: Real-Time Monitoring + Map
- **Enfoque de color**: Trust blue + available green + occupied red + map neutral
- **Consideraciones**: Real-time availability. In-app navigation. Payment integration. Parking timer alert. Favorite spots. Street vs garage.
- **Paleta**: Primary `#2563EB`, Secondary `#059669`, Accent `#DC2626`, Background `#F0F9FF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Available blue/green + occupied red
- **Patrón recomendado**: Conversion-Optimized + Feature-Rich
- **Ánimo de color**: Trust blue + available green + occupied red + map neutral
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Backdrop blur (10-20px) + Translucent overlays
- **Reglas de decisión**: {"if_low_performance":["style:flat-design"],"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Excessive decoration
- **Severidad**: HIGH

## Public Transit Guide
- **Palabras clave**: transit, bus, metro, subway, train, route, schedule, map, city, commute, trip, citymapper
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Feature-Rich Showcase + Interactive Demo
- **Estilo de dashboard**: Real-Time Monitoring + Map
- **Enfoque de color**: Transit brand line colors + real-time indicator green/red + map neutral
- **Consideraciones**: Real-time arrivals. Offline maps. Disruption alerts. Multi-modal routing. Fare calculation. Accessibility features.
- **Paleta**: Primary `#2563EB`, Secondary `#0891B2`, Accent `#EA580C`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Transit blue + line colors
- **Patrón recomendado**: Feature-Rich Showcase + Interactive Demo
- **Ánimo de color**: Transit brand line colors + real-time indicator green/red + map neutral
- **Ánimo tipográfico**: Bold + Clean + Sans-serif
- **Efectos clave**: Color shift hover + Fast 150ms transitions + No shadows
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Complex shadows + 3D effects + Color-only indicators
- **Severidad**: HIGH

## Road Trip Planner
- **Palabras clave**: road, trip, drive, route, planner, travel, stop, map, adventure, scenic, car, wanderlog
- **Estilo principal**: [Aurora UI](../estilos/aurora-ui.md) + [Organic Biophilic](../estilos/organic-biophilic.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Patrón de landing**: Storytelling-Driven + Hero-Centric
- **Estilo de dashboard**: N/A - Trip focused
- **Enfoque de color**: Adventure warm sunset orange + map teal + stop markers + road neutral
- **Consideraciones**: Route planning with stops. Point-of-interest discovery. Gas/food/hotel along route. Offline maps. Trip sharing.
- **Paleta**: Primary `#EA580C`, Secondary `#0891B2`, Accent `#D97706`, Background `#FFF7ED`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FDF4F0`, Border `#FCEAE1`, Destructive `#DC2626`
- **Notas de paleta**: Adventure orange + map teal
- **Patrón recomendado**: Storytelling-Driven + Hero-Centric
- **Ánimo de color**: Adventure warm sunset orange + map teal + stop markers + road neutral
- **Ánimo tipográfico**: Elegant + Gradient-friendly
- **Efectos clave**: Flowing gradients 8-12s + Color morphing
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Inconsistent styling + Poor contrast ratios
- **Severidad**: HIGH

## Directory / Listing Site
- **Palabras clave**: directory, listing, classifieds, catalogue, business-directory, yellow-pages, venue, find, search, filter, map
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Patrón de landing**: Filter-Heavy Grid + Map
- **Estilo de dashboard**: N/A - Listing focused
- **Enfoque de color**: Neutral bg + category color chips + map accent + verified badge
- **Consideraciones**: Category tree. Multi-filter sidebar. Map/list toggle. Verified badges. Reviews. Claim listing flow.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#D97706`, Background `#ECFDF5`, Foreground `#064E3B`, Card `#FFFFFF`, Muted `#E8F1F3`, Border `#A7F3D0`, Destructive `#DC2626`
- **Notas de paleta**: Category green + verified badge + map accent
- **Patrón recomendado**: Marketplace / Directory
- **Ánimo de color**: Neutral bg + category color chips + map accent + verified badge
- **Ánimo tipográfico**: Scan-friendly + Neutral typography
- **Efectos clave**: Filter chips + Map/list toggle
- **Reglas de decisión**: {"must_have":["constraint:category-tree","constraint:multi-filter-sidebar","constraint:map-list-toggle","constraint:verified-badges","constraint:claim-listing"],"if_discovery_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: No trust cues + Text-heavy cards + hidden filters
- **Severidad**: HIGH

## Changelog / Release Notes
- **Palabras clave**: changelog, release-notes, version-history, whats-new, product-updates, semver, patch-notes, release-tracker
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md)
- **Patrón de landing**: Timeline + Version List
- **Estilo de dashboard**: N/A - Documentation focused
- **Enfoque de color**: Neutral bg + version badge colors (feat=green, fix=blue, breaking=red) + date grey
- **Consideraciones**: Chronological release feed. Semver badges. Breaking change warnings. Copy-paste install commands. Subscribe to feed. Search by version.
- **Paleta**: Primary `#475569`, Secondary `#64748B`, Accent `#059669`, Background `#F8FAFC`, Foreground `#1E293B`, Card `#FFFFFF`, Muted `#EAEFF3`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Feature green + fix blue + breaking red badges
- **Patrón recomendado**: Newsletter / Content First
- **Ánimo de color**: Neutral bg + version badge colors + date grey
- **Ánimo tipográfico**: Neutral + Versioned hierarchy
- **Efectos clave**: Timeline transitions + version badges
- **Reglas de decisión**: {"must_have":["constraint:chronological-feed","constraint:semver-badges","constraint:breaking-change-warnings","constraint:copy-paste-install","constraint:version-search"],"if_content_focused":["constraint:prioritize-clarity"],"if_low_performance":["constraint:reduce-motion"]}
- **Anti-patrones**: No chronological order + no version tags + noisy marketing copy
- **Severidad**: MEDIUM

## Digital Signage / Kiosk
- **Palabras clave**: digital-signage, kiosk, interactive-display, touchscreen, wayfinding, lobby-display, menu-board, point-of-sale-display
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Full-Screen Immersive
- **Estilo de dashboard**: N/A - Display focused
- **Enfoque de color**: High contrast + brand accent + touch target emphasis (56px min)
- **Consideraciones**: Full-screen single-purpose layout. Touch targets ≥56px. Auto-rotate content. Offline fallback. Brightness-aware color palette. No scroll.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#EF4444`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#EF4444`
- **Notas de paleta**: High contrast dark + brand accent + large touch targets
- **Patrón recomendado**: Immersive/Interactive Experience
- **Ánimo de color**: High contrast + brand accent + touch target emphasis
- **Ánimo tipográfico**: Large + Immediate typography
- **Efectos clave**: Auto-rotate transitions + large touch feedback
- **Reglas de decisión**: {"must_have":["constraint:single-purpose-layout","constraint:touch-targets","constraint:auto-rotate-content","constraint:offline-fallback","constraint:brightness-aware-palette"],"if_mobile":["constraint:optimize-touch-targets"],"if_low_performance":["constraint:reduce-motion"]}
- **Anti-patrones**: Tiny tap targets + scroll-heavy layout + flashy motion
- **Severidad**: MEDIUM

## E-signature / Document Workflow
- **Palabras clave**: esignature, e-sign, docusign, digital-signature, document-workflow, approval-chain, contract-signing, signing-ceremony
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Feature-Rich Showcase + Conversion
- **Estilo de dashboard**: Document Pipeline Dashboard
- **Enfoque de color**: Trust navy + signature green + pending amber + neutral grey
- **Consideraciones**: Document preview with annotation. Signature placement UI. Multi-signer workflow. Audit trail. Compliance badges. Mobile signing. Expiry reminders.
- **Paleta**: Primary `#1E3A5F`, Secondary `#2563EB`, Accent `#16A34A`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#CBD5E1`, Destructive `#DC2626`
- **Notas de paleta**: Trust navy + signature green + audit trail
- **Patrón recomendado**: Enterprise Gateway
- **Ánimo de color**: Trust navy + signature green + pending amber + neutral grey
- **Ánimo tipográfico**: Professional + Document-readable typography
- **Efectos clave**: Signature placement highlights + audit trail states
- **Reglas de decisión**: {"must_have":["constraint:document-preview","constraint:signature-placement","constraint:multi-signer-flow","constraint:audit-trail","constraint:compliance-badges"],"if_trust_needed":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Confusing signing flow + weak audit trail + hidden consent
- **Severidad**: HIGH

## Survey / Form Builder
- **Palabras clave**: survey, form-builder, questionnaire, typeform, survey-monkey, poll, feedback-form, multi-step-form, nps-survey, logic-jump
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: Response Analytics Dashboard
- **Enfoque de color**: Clean white + question accent + progress green + submit blue
- **Consideraciones**: Drag-drop form builder. Question type library. Conditional logic visualizer. Theme picker. Response dashboard with charts. Export CSV. Share link/QR/embed.
- **Paleta**: Primary `#0D9488`, Secondary `#2DD4BF`, Accent `#D97706`, Background `#F0FDFA`, Foreground `#134E4A`, Card `#FFFFFF`, Muted `#E8F1F4`, Border `#5EEAD4`, Destructive `#DC2626`
- **Notas de paleta**: Question teal + progress green + submit blue
- **Patrón recomendado**: Product Demo + Features
- **Ánimo de color**: Clean white + question accent + progress green + submit blue
- **Ánimo tipográfico**: Clear + Form-first typography
- **Efectos clave**: Conditional-logic flow + progress animation
- **Reglas de decisión**: {"must_have":["constraint:drag-drop-builder","constraint:question-library","constraint:conditional-logic","constraint:theme-picker","constraint:response-dashboard"],"if_ux_focused":["constraint:add-progress-animation"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Static forms + hidden conditional logic + weak progress cues
- **Severidad**: HIGH

