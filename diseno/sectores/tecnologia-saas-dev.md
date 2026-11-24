# Sector: tecnologia-saas-dev
> Fuente: UI UX Pro Max (MIT), reordenado por sector. Son **sugerencias**: en Gula mandan `CLAUDE.md` y los tokens de `src/index.css`. Los hex son referencia, no se pegan: se traducen a tokens.

## SaaS (General)
- **Palabras clave**: app, b2b, cloud, general, saas, software, subscription
- **Estilo principal**: [Glassmorphism](../estilos/glassmorphism.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Soft UI Evolution](../estilos/soft-ui-evolution.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Patrón de landing**: Hero + Features + CTA
- **Estilo de dashboard**: Data-Dense + Real-Time Monitoring
- **Enfoque de color**: Trust blue + accent contrast
- **Consideraciones**: Balance modern feel with clarity. Focus on CTAs.
- **Paleta**: Primary `#2563EB`, Secondary `#3B82F6`, Accent `#EA580C`, Background `#F8FAFC`, Foreground `#1E293B`, Card `#FFFFFF`, Muted `#E9EFF8`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Trust blue + orange CTA contrast [Accent adjusted from #F97316]
- **Patrón recomendado**: Hero + Features + CTA
- **Ánimo de color**: Trust blue + Accent contrast
- **Ánimo tipográfico**: Professional + Hierarchy
- **Efectos clave**: Subtle hover (200-250ms) + Smooth transitions
- **Reglas de decisión**: {"if_ux_focused":["style:minimalism-and-swiss-style"],"if_data_heavy":["style:glassmorphism"]}
- **Anti-patrones**: Excessive animation + Dark mode by default
- **Severidad**: HIGH

## Micro SaaS
- **Palabras clave**: indie, micro-saas, niche, solo, bootstrap, micro, side-project, solopreneur, small-team, indie-hacker, product-hunt
- **Estilo principal**: [Flat Design](../estilos/flat-design.md) + [Vibrant & Block-based](../estilos/vibrant-and-block-based.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Micro-interactions](../estilos/micro-interactions.md)
- **Patrón de landing**: Minimal & Direct + Demo
- **Estilo de dashboard**: Executive Dashboard
- **Enfoque de color**: Vibrant primary + white space
- **Consideraciones**: Keep simple, show product quickly. Speed is key.
- **Paleta**: Primary `#6366F1`, Secondary `#818CF8`, Accent `#059669`, Background `#F5F3FF`, Foreground `#1E1B4B`, Card `#FFFFFF`, Muted `#EBEFF9`, Border `#E0E7FF`, Destructive `#DC2626`
- **Notas de paleta**: Indigo primary + emerald CTA [Accent adjusted from #10B981]
- **Patrón recomendado**: Hero-Centric + Trust
- **Ánimo de color**: Bold primaries + Accent contrast
- **Ánimo tipográfico**: Modern + Energetic typography
- **Efectos clave**: Scroll-triggered animations + Parallax
- **Reglas de decisión**: {"if_pre_launch":["pattern:Waitlist/Coming Soon"],"if_video_ready":["constraint:add-hero-video"]}
- **Anti-patrones**: Static design + No video + Poor mobile
- **Severidad**: HIGH

## Design System/Component Library
- **Palabras clave**: component, design, library, system
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Zero Interface](../estilos/zero-interface.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: N/A - Dev focused
- **Enfoque de color**: Clear hierarchy + code-like structure
- **Consideraciones**: Consistency. Developer-first approach.
- **Paleta**: Primary `#4F46E5`, Secondary `#6366F1`, Accent `#EA580C`, Background `#EEF2FF`, Foreground `#312E81`, Card `#FFFFFF`, Muted `#EBEEF8`, Border `#C7D2FE`, Destructive `#DC2626`
- **Notas de paleta**: Indigo brand + doc hierarchy [Accent adjusted from #F97316]
- **Patrón recomendado**: Feature-Rich + Documentation
- **Ánimo de color**: Clear hierarchy + Code-like structure
- **Ánimo tipográfico**: Monospace + Clear typography
- **Efectos clave**: Code copy animations + Component previews
- **Reglas de decisión**: {"must_have":["constraint:search","constraint:code-examples"]}
- **Anti-patrones**: Poor documentation + No live preview
- **Severidad**: HIGH

## AI/Chatbot Platform
- **Palabras clave**: ai, artificial-intelligence, automation, chatbot, machine-learning, ml, platform
- **Estilo principal**: [AI-Native UI](../estilos/ai-native-ui.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Zero Interface](../estilos/zero-interface.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: AI/ML Analytics Dashboard
- **Enfoque de color**: Neutral + AI Purple (#6366F1)
- **Consideraciones**: Conversational UI. Streaming text. Context awareness. Minimal chrome.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#0891B2`, Background `#FAF5FF`, Foreground `#1E1B4B`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: AI purple + cyan interactions [Accent adjusted from #06B6D4]
- **Patrón recomendado**: Interactive Demo + Minimal
- **Ánimo de color**: Neutral + AI Purple (#6366F1)
- **Ánimo tipográfico**: Modern + Clear typography
- **Efectos clave**: Streaming text + Typing indicators + Fade-in
- **Reglas de decisión**: {"must_have":["constraint:conversational-ui","constraint:context-awareness"]}
- **Anti-patrones**: Heavy chrome + Slow response feedback
- **Severidad**: HIGH

## NFT/Web3 Platform
- **Palabras clave**: nft, platform, web
- **Estilo principal**: [Cyberpunk UI](../estilos/cyberpunk-ui.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Estilos secundarios**: [Aurora UI](../estilos/aurora-ui.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Patrón de landing**: Feature-Rich Showcase
- **Estilo de dashboard**: Crypto/Blockchain Dashboard
- **Enfoque de color**: Dark + Neon + Gold (#FFD700)
- **Consideraciones**: Wallet integration. Transaction feedback. Gas fees display. Dark mode essential.
- **Paleta**: Primary `#8B5CF6`, Secondary `#A78BFA`, Accent `#FBBF24`, Background `#0F0F23`, Foreground `#F8FAFC`, Card `#1E1D35`, Muted `#27273B`, Border `#4C1D95`, Destructive `#EF4444`
- **Notas de paleta**: Purple tech + gold value
- **Patrón recomendado**: Feature-Rich Showcase
- **Ánimo de color**: Dark + Neon + Gold (#FFD700)
- **Ánimo tipográfico**: Bold + Modern typography
- **Efectos clave**: Wallet connect animations + Transaction feedback
- **Reglas de decisión**: {"must_have":["constraint:wallet-integration","constraint:gas-fees-display"]}
- **Anti-patrones**: Light mode default + No transaction status
- **Severidad**: HIGH

## Creator Economy Platform
- **Palabras clave**: creator, economy, platform
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Patrón de landing**: Social Proof-Focused
- **Estilo de dashboard**: User Behavior Analytics
- **Enfoque de color**: Vibrant + Brand colors
- **Consideraciones**: Creator profiles. Monetization display. Engagement metrics. Social proof.
- **Paleta**: Primary `#EC4899`, Secondary `#F472B6`, Accent `#EA580C`, Background `#FDF2F8`, Foreground `#831843`, Card `#FFFFFF`, Muted `#F1EEF5`, Border `#FBCFE8`, Destructive `#DC2626`
- **Notas de paleta**: Creator pink + engagement orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Social Proof + Feature-Rich
- **Ánimo de color**: Vibrant + Brand colors
- **Ánimo tipográfico**: Modern + Bold typography
- **Efectos clave**: Engagement counter animations + Profile reveals
- **Reglas de decisión**: {"must_have":["constraint:creator-profiles","constraint:monetization-display"]}
- **Anti-patrones**: Generic layout + Hidden earnings
- **Severidad**: MEDIUM

## EV/Charging Ecosystem
- **Palabras clave**: charging, ecosystem, ev
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Organic Biophilic](../estilos/organic-biophilic.md)
- **Patrón de landing**: Hero-Centric Design
- **Estilo de dashboard**: Energy/Utilities Dashboard
- **Enfoque de color**: Electric Blue (#009CD1) + Green
- **Consideraciones**: Charging station maps. Range estimation. Cost calculation. Environmental impact.
- **Paleta**: Primary `#0891B2`, Secondary `#22D3EE`, Accent `#16A34A`, Background `#ECFEFF`, Foreground `#164E63`, Card `#FFFFFF`, Muted `#E8F1F6`, Border `#A5F3FC`, Destructive `#DC2626`
- **Notas de paleta**: Electric cyan + eco green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Hero-Centric + Feature-Rich
- **Ánimo de color**: Electric Blue (#009CD1) + Green
- **Ánimo tipográfico**: Modern + Clear typography
- **Efectos clave**: Range estimation animations + Map interactions
- **Reglas de decisión**: {"must_have":["constraint:charging-map","constraint:range-calculator"]}
- **Anti-patrones**: Poor map UX + Hidden costs
- **Severidad**: HIGH

## Knowledge Base/Documentation
- **Palabras clave**: base, documentation, knowledge
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: FAQ/Documentation
- **Estilo de dashboard**: N/A - Documentation focused
- **Enfoque de color**: Clean hierarchy + minimal color
- **Consideraciones**: Search-first. Clear navigation. Code highlighting. Version switching. Feedback system.
- **Paleta**: Primary `#475569`, Secondary `#64748B`, Accent `#2563EB`, Background `#F8FAFC`, Foreground `#1E293B`, Card `#FFFFFF`, Muted `#EAEFF3`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Neutral grey + link blue
- **Patrón recomendado**: FAQ + Minimal
- **Ánimo de color**: Clean hierarchy + Minimal color
- **Ánimo tipográfico**: Clear + Readable typography
- **Efectos clave**: Search highlight + Smooth scrolling
- **Reglas de decisión**: {"must_have":["constraint:search-first","constraint:version-switching"]}
- **Anti-patrones**: Poor navigation + No search
- **Severidad**: HIGH

## Digital Products/Downloads
- **Palabras clave**: digital, downloads, products
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Patrón de landing**: Feature-Rich Showcase + Conversion
- **Estilo de dashboard**: E-commerce Analytics
- **Enfoque de color**: Product category colors + Brand + Success green
- **Consideraciones**: Product showcase. Preview. Pricing. Instant delivery. License management. Customer reviews.
- **Paleta**: Primary `#6366F1`, Secondary `#818CF8`, Accent `#16A34A`, Background `#EEF2FF`, Foreground `#312E81`, Card `#FFFFFF`, Muted `#EBEFF9`, Border `#C7D2FE`, Destructive `#DC2626`
- **Notas de paleta**: Digital indigo + buy green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Feature-Rich + Conversion
- **Ánimo de color**: Product colors + Brand + Success green
- **Ánimo tipográfico**: Modern + Clear typography
- **Efectos clave**: Product preview + Instant delivery animations
- **Reglas de decisión**: {"must_have":["constraint:product-preview","constraint:instant-delivery"]}
- **Anti-patrones**: No preview + Slow delivery
- **Severidad**: HIGH

## Coding Bootcamp
- **Palabras clave**: bootcamp, coding
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Cyberpunk UI](../estilos/cyberpunk-ui.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: Student Analytics
- **Enfoque de color**: Code editor colors + Brand + Success green
- **Consideraciones**: Curriculum. Projects. Career outcomes. Alumni. Pricing. Application. Terminal aesthetic.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#22C55E`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#EF4444`
- **Notas de paleta**: Terminal dark + success green
- **Patrón recomendado**: Feature-Rich + Social Proof
- **Ánimo de color**: Code editor colors + Brand + Success
- **Ánimo tipográfico**: Technical + Clear typography
- **Efectos clave**: Terminal animations + Career outcome reveals
- **Reglas de decisión**: {"must_have":["constraint:curriculum","constraint:career-outcomes"]}
- **Anti-patrones**: Light mode only + Hidden results
- **Severidad**: HIGH

## Cybersecurity Platform
- **Palabras clave**: cyber, security, platform
- **Estilo principal**: [Cyberpunk UI](../estilos/cyberpunk-ui.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Neubrutalism](../estilos/neubrutalism.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Patrón de landing**: Trust & Authority + Real-Time
- **Estilo de dashboard**: Real-Time Monitoring + Heat Map
- **Enfoque de color**: Matrix Green + Deep Black + Terminal feel
- **Consideraciones**: Data density. Threat visualization. Dark mode default.
- **Paleta**: Primary `#00FF41`, Secondary `#0D0D0D`, Accent `#FF3333`, Background `#000000`, Foreground `#E0E0E0`, Card `#0C130E`, Muted `#181818`, Border `#1F1F1F`, Destructive `#EF4444`
- **Notas de paleta**: Matrix green + alert red
- **Patrón recomendado**: Trust & Authority + Real-Time
- **Ánimo de color**: Matrix Green (#00FF00) + Deep Black
- **Ánimo tipográfico**: Technical + Clear typography
- **Efectos clave**: Threat visualization + Alert animations
- **Reglas de decisión**: {"must_have":["constraint:real-time-monitoring","constraint:threat-display"]}
- **Anti-patrones**: Light mode + Poor data viz
- **Severidad**: HIGH

## Developer Tool / IDE
- **Palabras clave**: dev, developer, tool, ide
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Patrón de landing**: Minimal & Direct + Documentation
- **Estilo de dashboard**: Real-Time Monitor + Terminal
- **Enfoque de color**: Dark syntax theme colors + Blue focus
- **Consideraciones**: Keyboard shortcuts. Syntax highlighting. Fast performance.
- **Paleta**: Primary `#1E293B`, Secondary `#334155`, Accent `#22C55E`, Background `#0F172A`, Foreground `#F8FAFC`, Card `#1B2336`, Muted `#272F42`, Border `#475569`, Destructive `#EF4444`
- **Notas de paleta**: Code dark + run green
- **Patrón recomendado**: Minimal + Documentation
- **Ánimo de color**: Dark syntax theme + Blue focus
- **Ánimo tipográfico**: Monospace + Functional typography
- **Efectos clave**: Syntax highlighting + Command palette
- **Reglas de decisión**: {"must_have":["constraint:keyboard-shortcuts","constraint:documentation"]}
- **Anti-patrones**: Light mode default + Slow performance
- **Severidad**: HIGH

## Space Tech / Aerospace
- **Palabras clave**: aerospace, space, tech
- **Estilo principal**: [HUD / Sci-Fi FUI](../estilos/hud-sci-fi-fui.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Patrón de landing**: Immersive Experience + Hero
- **Estilo de dashboard**: Real-Time Monitoring + 3D
- **Enfoque de color**: Deep Space Black + Star White + Metallic
- **Consideraciones**: High-tech feel. Precision. Telemetry data.
- **Paleta**: Primary `#F8FAFC`, Secondary `#94A3B8`, Accent `#3B82F6`, Background `#0B0B10`, Foreground `#F8FAFC`, Card `#1E1E23`, Muted `#232328`, Border `#1E293B`, Destructive `#EF4444`
- **Notas de paleta**: Star white + launch blue
- **Patrón recomendado**: Immersive + Feature-Rich
- **Ánimo de color**: Deep Space Black + Star White + Metallic
- **Ánimo tipográfico**: Futuristic + Precise typography
- **Efectos clave**: Telemetry animations + 3D renders
- **Reglas de decisión**: {"must_have":["constraint:high-tech-feel","constraint:precision-data"]}
- **Anti-patrones**: Generic design + No immersion
- **Severidad**: HIGH

## Quantum Computing Interface
- **Palabras clave**: quantum, computing, physics, qubit, future, science
- **Estilo principal**: [HUD / Sci-Fi FUI](../estilos/hud-sci-fi-fui.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Spatial UI (VisionOS)](../estilos/spatial-ui-visionos.md)
- **Patrón de landing**: Immersive/Interactive Experience
- **Estilo de dashboard**: 3D Spatial Data + Real-Time Monitor
- **Enfoque de color**: Quantum Blue #00FFFF + Deep Black + Interference patterns
- **Consideraciones**: Visualize complexity. Qubit states. Probability clouds. High-tech trust.
- **Paleta**: Primary `#00FFFF`, Secondary `#7B61FF`, Accent `#FF00FF`, Background `#050510`, Foreground `#E0E0FF`, Card `#101823`, Muted `#1D1D28`, Border `#333344`, Destructive `#EF4444`
- **Notas de paleta**: Quantum cyan + interference purple
- **Patrón recomendado**: Immersive + Interactive
- **Ánimo de color**: Quantum Blue (#00FFFF) + Deep Black
- **Ánimo tipográfico**: Futuristic + Scientific typography
- **Efectos clave**: Probability visualizations + Qubit state animations
- **Reglas de decisión**: {"must_have":["constraint:complexity-visualization","constraint:scientific-credibility"]}
- **Anti-patrones**: Generic tech design + No viz
- **Severidad**: HIGH

## Autonomous Drone Fleet Manager
- **Palabras clave**: drone, autonomous, fleet, aerial, logistics, robotics
- **Estilo principal**: [HUD / Sci-Fi FUI](../estilos/hud-sci-fi-fui.md)
- **Estilos secundarios**: [Real-Time Monitoring](../estilos/real-time-monitoring.md) + [Spatial UI (VisionOS)](../estilos/spatial-ui-visionos.md)
- **Patrón de landing**: Real-Time Monitor
- **Estilo de dashboard**: Geographic + Real-Time
- **Enfoque de color**: Tactical Green #00FF00 + Alert Red + Map Dark
- **Consideraciones**: Real-time telemetry. 3D spatial awareness. Latency indicators. Safety alerts.
- **Paleta**: Primary `#00FF41`, Secondary `#008F11`, Accent `#FF3333`, Background `#0D1117`, Foreground `#E6EDF3`, Card `#182424`, Muted `#25292F`, Border `#30363D`, Destructive `#EF4444`
- **Notas de paleta**: Terminal green + alert red
- **Patrón recomendado**: Real-Time + Feature-Rich
- **Ánimo de color**: Tactical Green + Alert Red + Map Dark
- **Ánimo tipográfico**: Technical + Functional typography
- **Efectos clave**: Telemetry animations + 3D spatial awareness
- **Reglas de decisión**: {"must_have":["constraint:real-time-telemetry","constraint:safety-alerts"]}
- **Anti-patrones**: Slow updates + Poor spatial viz
- **Severidad**: HIGH

## Generative Art Platform
- **Palabras clave**: art, generative, ai, creative, platform, gallery
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Gen Z Chaos / Maximalism](../estilos/gen-z-chaos-maximalism.md)
- **Estilos secundarios**: [Bento Box Grid](../estilos/bento-box-grid.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Bento Grid Showcase
- **Estilo de dashboard**: Gallery / Portfolio
- **Enfoque de color**: Neutral #F5F5F5 (Canvas) + User Content
- **Consideraciones**: Content is king. Fast loading. Creator attribution. Minting flow.
- **Paleta**: Primary `#18181B`, Secondary `#3F3F46`, Accent `#EC4899`, Background `#FAFAFA`, Foreground `#09090B`, Card `#FFFFFF`, Muted `#E8ECF0`, Border `#E4E4E7`, Destructive `#DC2626`
- **Notas de paleta**: Canvas neutral + creative pink
- **Patrón recomendado**: Showcase + Feature-Rich
- **Ánimo de color**: Neutral (#F5F5F5) + User Content
- **Ánimo tipográfico**: Minimal + Content-focused typography
- **Efectos clave**: Gallery masonry + Minting animations
- **Reglas de decisión**: {"must_have":["constraint:fast-loading","constraint:creator-attribution"]}
- **Anti-patrones**: Heavy chrome + Slow loading
- **Severidad**: HIGH

## Spatial Computing OS / App
- **Palabras clave**: spatial, vr, ar, vision, os, immersive, mixed-reality
- **Estilo principal**: [Spatial UI (VisionOS)](../estilos/spatial-ui-visionos.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Patrón de landing**: Immersive/Interactive Experience
- **Estilo de dashboard**: Spatial Dashboard
- **Enfoque de color**: Frosted Glass + System Colors + Depth
- **Consideraciones**: Gaze/Pinch interaction. Depth hierarchy. Environment awareness.
- **Paleta**: Primary `#FFFFFF`, Secondary `#E5E5E5`, Accent `#FFFFFF`, Background `#888888`, Foreground `#000000`, Card `#999999`, Muted `#E5E7EB`, Border `#CCCCCC`, Destructive `#FF3B30`
- **Notas de paleta**: Glass white + system blue [Accent adjusted from #007AFF]
- **Patrón recomendado**: Immersive + Interactive
- **Ánimo de color**: Frosted Glass + System Colors + Depth
- **Ánimo tipográfico**: Spatial + Readable typography
- **Efectos clave**: Depth hierarchy + Gaze interactions
- **Reglas de decisión**: {"must_have":["constraint:depth-hierarchy","constraint:environment-awareness"]}
- **Anti-patrones**: 2D design + No spatial depth
- **Severidad**: HIGH

## Sustainable Energy / Climate Tech
- **Palabras clave**: climate, energy, sustainable, green, tech, carbon
- **Estilo principal**: [Organic Biophilic](../estilos/organic-biophilic.md) + [E-Ink / Paper](../estilos/e-ink-paper.md)
- **Estilos secundarios**: [Data-Dense Dashboard](../estilos/data-dense-dashboard.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Interactive Demo + Data
- **Estilo de dashboard**: Energy/Utilities Dashboard
- **Enfoque de color**: Earth Green + Sky Blue + Solar Yellow
- **Consideraciones**: Data transparency. Impact visualization. Low-carbon web design.
- **Paleta**: Primary `#059669`, Secondary `#10B981`, Accent `#059669`, Background `#ECFDF5`, Foreground `#064E3B`, Card `#FFFFFF`, Muted `#E8F1F3`, Border `#A7F3D0`, Destructive `#DC2626`
- **Notas de paleta**: Nature green + solar gold [Accent adjusted from #FBBF24]
- **Patrón recomendado**: Data + Trust
- **Ánimo de color**: Earth Green + Sky Blue + Solar Yellow
- **Ánimo tipográfico**: Clear + Informative typography
- **Efectos clave**: Impact viz + Progress animations
- **Reglas de decisión**: {"must_have":["constraint:data-transparency","constraint:impact-visualization"]}
- **Anti-patrones**: Greenwashing + No real data
- **Severidad**: HIGH

## Password Manager
- **Palabras clave**: password, security, vault, credentials, login, secure, encrypt, keychain, 2fa, biometric
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Trust & Authority + Feature-Rich
- **Estilo de dashboard**: N/A - Vault focused
- **Enfoque de color**: Trust blue + security green + dark neutral
- **Consideraciones**: Security-first. Zero-knowledge architecture. Biometric unlock. Breach alert dashboard. Password generator.
- **Paleta**: Primary `#1E3A5F`, Secondary `#334155`, Accent `#059669`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#10192E`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Vault dark blue + secure green
- **Patrón recomendado**: Trust & Authority + Feature-Rich
- **Ánimo de color**: Trust blue + security green + dark neutral
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle hover 200ms + Smooth transitions + Clean
- **Reglas de decisión**: {"if_ux_focused":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Excessive decoration + Color-only indicators
- **Severidad**: HIGH

## AI Photo & Avatar Generator
- **Palabras clave**: ai, photo, avatar, lensa, portrait, generate, selfie, style, filter, prisma, art
- **Estilo principal**: [AI-Native UI](../estilos/ai-native-ui.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: N/A - Generation focused
- **Enfoque de color**: AI purple + aurora gradients + before/after neutral
- **Consideraciones**: Style selection. Multiple output variations. Privacy policy prominent. Fast generation. Credits/subscription system.
- **Paleta**: Primary `#7C3AED`, Secondary `#6366F1`, Accent `#EC4899`, Background `#FAF5FF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F7F3FD`, Border `#EFE7FC`, Destructive `#DC2626`
- **Notas de paleta**: AI purple + generation pink
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: AI purple + aurora gradients + before/after neutral
- **Ánimo tipográfico**: Elegant + Gradient-friendly
- **Efectos clave**: Flowing gradients 8-12s + Color morphing
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Inconsistent styling + Poor contrast ratios
- **Severidad**: HIGH

## Link-in-Bio Page Builder
- **Palabras clave**: bio, link, linktree, personal, page, creator, social, portfolio, profile, landing, custom
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Conversion-Optimized + Social Proof
- **Estilo de dashboard**: Analytics (click tracking)
- **Enfoque de color**: Brand-customizable + accent link color + clean white canvas
- **Consideraciones**: Drag-drop builder. Theme templates. Click analytics. Custom domain. Social icon integration. QR code export.
- **Paleta**: Primary `#2563EB`, Secondary `#7C3AED`, Accent `#EC4899`, Background `#FFFFFF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5FD`, Border `#E4ECFC`, Destructive `#DC2626`
- **Notas de paleta**: Brand blue + creator purple
- **Patrón recomendado**: Conversion-Optimized + Social Proof
- **Ánimo de color**: Brand-customizable + accent link color + clean white canvas
- **Ánimo tipográfico**: Energetic + Bold + Large
- **Efectos clave**: Large section gaps 48px+ + Color shift hover + Scroll-snap
- **Reglas de decisión**: {"if_conversion_focused":["constraint:add-urgency-colors"],"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## Coding Challenge & Practice
- **Palabras clave**: coding, leetcode, challenge, algorithm, practice, programming, competitive, skill, interview, problem
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Cyberpunk UI](../estilos/cyberpunk-ui.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: Student Analytics
- **Enfoque de color**: Code editor dark + success green + difficulty gradient (easy green / medium amber / hard red)
- **Consideraciones**: Code editor with syntax highlight. Multiple languages. Hint system. Solution explanation. Company tags. Contest mode.
- **Paleta**: Primary `#22C55E`, Secondary `#059669`, Accent `#D97706`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#10242E`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Code green + difficulty amber on dark
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Code editor dark + success green + difficulty gradient (easy green / medium amber / hard red)
- **Ánimo tipográfico**: High contrast + Light on dark
- **Efectos clave**: Subtle glow + Neon accents + High contrast
- **Reglas de decisión**: {"if_light_mode_needed":["constraint:provide-theme-toggle"],"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Pure white backgrounds
- **Severidad**: HIGH

## VPN & Privacy Tool
- **Palabras clave**: vpn, privacy, secure, anonymous, encrypt, proxy, ip, protect, shield, network, nordvpn
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Cyberpunk UI](../estilos/cyberpunk-ui.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Trust & Authority + Conversion-Optimized
- **Estilo de dashboard**: N/A - Connection focused
- **Enfoque de color**: Dark shield blue + connected green + disconnected red + trust accent
- **Consideraciones**: One-tap connect. Server selection by country. No-log policy prominent. Speed indicator. Kill switch. Protocol choice.
- **Paleta**: Primary `#1E3A5F`, Secondary `#334155`, Accent `#22C55E`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#10192E`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Shield dark + connected green
- **Patrón recomendado**: Trust & Authority + Conversion-Optimized
- **Ánimo de color**: Dark shield blue + connected green + disconnected red + trust accent
- **Ánimo tipográfico**: Professional + Clean hierarchy
- **Efectos clave**: Subtle glow + Neon accents + High contrast
- **Reglas de decisión**: {"if_light_mode_needed":["constraint:provide-theme-toggle"],"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: Excessive decoration + Pure white backgrounds
- **Severidad**: HIGH

## Wallpaper & Theme App
- **Palabras clave**: wallpaper, theme, background, customize, aesthetic, home-screen, lock-screen, widget, design, zedge
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Aurora UI](../estilos/aurora-ui.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Feature-Rich Showcase + Social Proof
- **Estilo de dashboard**: N/A - Gallery focused
- **Enfoque de color**: Content-driven + trending aesthetic palettes + download accent
- **Consideraciones**: Category browsing. Preview on device. Daily wallpaper auto-set. Widget matching. Creator uploads. Resolution auto-fit.
- **Paleta**: Primary `#7C3AED`, Secondary `#EC4899`, Accent `#2563EB`, Background `#FAF5FF`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F7F3FD`, Border `#EFE7FC`, Destructive `#DC2626`
- **Notas de paleta**: Aesthetic purple + trending pink
- **Patrón recomendado**: Feature-Rich Showcase + Social Proof
- **Ánimo de color**: Content-driven + trending aesthetic palettes + download accent
- **Ánimo tipográfico**: Energetic + Bold + Large
- **Efectos clave**: Large section gaps 48px+ + Color shift hover + Scroll-snap
- **Reglas de decisión**: {"if_trust_needed":["constraint:add-testimonials"]}
- **Anti-patrones**: Muted colors + Low energy
- **Severidad**: HIGH

## API Developer Portal
- **Palabras clave**: api, developer, documentation, sdk, endpoint, integration, rest, graphql, webhook, reference, getting-started, auth
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Glassmorphism](../estilos/glassmorphism.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Quick Start + Interactive Docs
- **Estilo de dashboard**: N/A - Documentation focused
- **Enfoque de color**: Dark code theme + Brand accent + Syntax colors
- **Consideraciones**: Endpoint discoverability. Copy-paste code samples. Auth flow clarity. Version switching. Interactive playground. Rate limit visibility.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#22C55E`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#EF4444`
- **Notas de paleta**: Code dark + endpoint green + syntax colors
- **Patrón recomendado**: FAQ/Documentation Landing
- **Ánimo de color**: Dark code theme + Brand accent + Syntax colors
- **Ánimo tipográfico**: Monospace + Clear typography
- **Efectos clave**: Syntax highlighting + Copy-to-clipboard samples
- **Reglas de decisión**: {"must_have":["constraint:endpoint-discoverability","constraint:code-samples","constraint:auth-flow-clarity","constraint:version-switching","constraint:rate-limit-visibility"],"if_trust_needed":["constraint:prioritize-clarity"],"if_ux_focused":["style:flat-design"]}
- **Anti-patrones**: Buried endpoints + Broken version switching + missing rate-limit state
- **Severidad**: HIGH

## Status Page / Incident Management
- **Palabras clave**: status, incident, outage, uptime, downtime, statuspage, monitoring, sla, maintenance, sev1, postmortem
- **Estilo principal**: [Data-Dense Dashboard](../estilos/data-dense-dashboard.md) + [Real-Time Monitoring](../estilos/real-time-monitoring.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Timeline + Severity Indicators
- **Estilo de dashboard**: Real-Time Monitoring + Timeline
- **Enfoque de color**: Status green + incident red + maintenance amber + neutral dark
- **Consideraciones**: Service status matrix. Incident timeline. Severity badges. Maintenance schedule. SLA uptime history. Email/SMS subscribe.
- **Paleta**: Primary `#16A34A`, Secondary `#22C55E`, Accent `#DC2626`, Background `#F0FDF4`, Foreground `#14532D`, Card `#FFFFFF`, Muted `#E8F0F1`, Border `#BBF7D0`, Destructive `#DC2626`
- **Notas de paleta**: Operational green + incident red + maintenance amber
- **Patrón recomendado**: Real-Time / Operations Landing
- **Ánimo de color**: Status green + incident red + maintenance amber + neutral dark
- **Ánimo tipográfico**: Functional + Status typography
- **Efectos clave**: Status matrix + incident timeline transitions
- **Reglas de decisión**: {"must_have":["constraint:service-status-matrix","constraint:incident-timeline","constraint:severity-badges","constraint:maintenance-schedule","constraint:uptime-history"],"if_trust_needed":["constraint:prioritize-clarity"],"if_dashboard":["constraint:red-alert-colors"]}
- **Anti-patrones**: Slow dashboards + decorative charts + hidden error states
- **Severidad**: HIGH

## Wiki / Encyclopedia
- **Palabras clave**: wiki, encyclopedia, knowledge, article, reference, wikipedia, documentation, collaborative, edit, version, citation
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Search-First + Hierarchical Navigation
- **Estilo de dashboard**: N/A - Reference focused
- **Enfoque de color**: Clean white + link blue + heading hierarchy + citation grey
- **Consideraciones**: Full-text search bar. Table of contents sidebar. Edit history. Inter-page linking. Mobile responsive. Print-friendly.
- **Paleta**: Primary `#1E3A8A`, Secondary `#3B82F6`, Accent `#7C3AED`, Background `#F8FAFC`, Foreground `#1E40AF`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Knowledge blue + link purple + clean white
- **Patrón recomendado**: FAQ/Documentation Landing
- **Ánimo de color**: Clean white + link blue + heading hierarchy + citation grey
- **Ánimo tipográfico**: Clear + Hierarchical typography
- **Efectos clave**: Table of contents sticky nav + search highlight
- **Reglas de decisión**: {"must_have":["constraint:full-text-search","constraint:toc-sidebar","constraint:edit-history","constraint:interpage-linking","constraint:print-friendly"],"if_content_focused":["constraint:prioritize-clarity"],"if_ux_focused":["constraint:virtualize-lists"]}
- **Anti-patrones**: No search + flat hierarchy + noisy page chrome
- **Severidad**: MEDIUM

## Feature Flag / Config Management
- **Palabras clave**: feature-flag, config, launchdarkly, feature-toggle, experiment, rollout, kill-switch, a-b-test-config, percentage-rollout
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Data-Dense Dashboard](../estilos/data-dense-dashboard.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Feature List + Toggle Panel
- **Estilo de dashboard**: N/A - Config focused
- **Enfoque de color**: Dark bg + enabled green + disabled grey + experimental amber + kill-switch red
- **Consideraciones**: Feature list with on/off toggles. Percentage rollout slider. Environment selector (prod/staging). User targeting rules. Kill switch. Audit log.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#16A34A`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#DC2626`
- **Notas de paleta**: Enabled green + disabled grey + experimental amber
- **Patrón recomendado**: Product Demo + Features
- **Ánimo de color**: Dark bg + enabled green + disabled grey + experimental amber + kill-switch red
- **Ánimo tipográfico**: Functional + Technical typography
- **Efectos clave**: Toggle state transitions + rollout sliders
- **Reglas de decisión**: {"must_have":["constraint:feature-toggle-list","constraint:rollout-slider","constraint:environment-switcher","constraint:targeting-rules","constraint:kill-switch"],"if_dashboard":["constraint:virtualize-lists"],"if_trust_needed":["constraint:prioritize-clarity"]}
- **Anti-patrones**: Decorative visuals + ambiguous toggle states + slow performance
- **Severidad**: HIGH

## No-code / Low-code Builder
- **Palabras clave**: no-code, low-code, builder, bubble, webflow, drag-drop, visual-builder, app-builder, workflow-builder, logic-blocks
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Bento Box Grid](../estilos/bento-box-grid.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Glassmorphism](../estilos/glassmorphism.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: App Builder Workspace
- **Enfoque de color**: Brand primary + component palette colors + canvas neutral + connect blue
- **Consideraciones**: Drag-drop canvas. Component library sidebar. Logic flow visual editor. Preview pane. Template gallery. Publish button. Version history.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#EC4899`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Builder purple + component pink + canvas neutral
- **Patrón recomendado**: Product Demo + Features
- **Ánimo de color**: Brand primary + component palette colors + canvas neutral + connect blue
- **Ánimo tipográfico**: Functional + UI-focused typography
- **Efectos clave**: Drag-drop canvas + live preview sync
- **Reglas de decisión**: {"must_have":["constraint:drag-drop-canvas","constraint:component-sidebar","constraint:logic-flow-editor","constraint:live-preview","constraint:template-gallery"],"if_dashboard":["constraint:virtualize-lists"],"if_ux_focused":["constraint:add-progress-animation"]}
- **Anti-patrones**: No live preview + hidden logic + sluggish canvas
- **Severidad**: HIGH

## Open Source Project Landing
- **Palabras clave**: open-source, github-project, oss, contributor, star, fork, pull-request, maintainer, sponsoring, readme, repository
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Hero + Install + Contribute
- **Estilo de dashboard**: Contributor Analytics Dashboard
- **Enfoque de color**: Dark bg + language color bar + star gold + fork silver + sponsor purple
- **Consideraciones**: Star/fork count badges. Install command (copy-paste). Language breakdown bar. Top contributors grid. Sponsor CTA. Documentation link. Issue/pr status.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#A16207`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#DC2626`
- **Notas de paleta**: Dark code + star gold + fork silver + sponsor purple
- **Patrón recomendado**: Hero + Features + CTA
- **Ánimo de color**: Dark bg + language color bar + star gold + fork silver + sponsor purple
- **Ánimo tipográfico**: Technical + Clear typography
- **Efectos clave**: Install-command copy + contributor stats
- **Reglas de decisión**: {"must_have":["constraint:install-command","constraint:contributor-stats","constraint:language-bar","constraint:issue-pr-status","constraint:sponsor-cta"],"if_trust_needed":["constraint:prioritize-clarity"],"if_content_focused":["style:flat-design"]}
- **Anti-patrones**: No install command + weak contributor proof + marketing fluff
- **Severidad**: MEDIUM

## RPA / Automation Dashboard
- **Palabras clave**: rpa, robotic-process-automation, uipath, automation-anywhere, bot-orchestrator, process-discovery, attended-bot, unattended-bot
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Data-Dense Dashboard](../estilos/data-dense-dashboard.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: Bot Fleet Dashboard
- **Estilo de dashboard**: Real-Time Monitoring + Process Analytics
- **Enfoque de color**: Dark bg + running green + failed red + queued amber + completed blue
- **Consideraciones**: Bot status grid (running/idle/failed). Queue depth. Process flow visualization. Exception handling alert. ROI metrics. Bot scheduling calendar. Audit trail.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#16A34A`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#DC2626`
- **Notas de paleta**: Dark terminal + running green + failed red + queued amber
- **Patrón recomendado**: Real-Time / Operations Landing
- **Ánimo de color**: Dark bg + running green + failed red + queued amber + completed blue
- **Ánimo tipográfico**: Functional + Operational typography
- **Efectos clave**: Status matrix + alert transitions
- **Reglas de decisión**: {"must_have":["constraint:bot-status-grid","constraint:queue-depth","constraint:process-flow","constraint:exception-alerts","constraint:roi-metrics"],"if_dashboard":["constraint:virtualize-lists"],"if_trust_needed":["constraint:red-alert-colors"]}
- **Anti-patrones**: Slow dashboards + decorative charts + hidden error states
- **Severidad**: HIGH

## Testimonial & Social Proof Widget
- **Palabras clave**: testimonial, social-proof, wall-of-love, customer-quote, case-study, review-widget, trust-signal, user-story
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Patrón de landing**: Wall-of-Love Grid
- **Estilo de dashboard**: Engagement Analytics Dashboard
- **Enfoque de color**: Brand primary + quote accent + star gold + verified blue
- **Consideraciones**: Testimonial cards with photo. Star ratings. Video testimonials. Case study summaries. Filter by industry/product. Embeddable widget code. Auto-rotate carousel.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#F59E0B`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Trust purple + quote gold + verified blue
- **Patrón recomendado**: Hero + Testimonials + CTA
- **Ánimo de color**: Brand primary + quote accent + star gold + verified blue
- **Ánimo tipográfico**: Readable + Social-proof typography
- **Efectos clave**: Card carousel + photo/video cards
- **Reglas de decisión**: {"must_have":["constraint:testimonial-cards","constraint:star-ratings","constraint:video-testimonials","constraint:case-study-summaries","constraint:embed-code"],"if_trust_needed":["constraint:add-testimonials"],"if_conversion_focused":["constraint:increase-playfulness"]}
- **Anti-patrones**: No evidence badges + static layout + tiny media
- **Severidad**: MEDIUM

## GIS / Web Map Dashboard
- **Palabras clave**: gis, webgis, web-map, geospatial, geospatial-platform, mapping-platform, spatial-analytics, map-dashboard, choropleth, map-layers, basemap, maplibre, leaflet, openlayers, mapbox, arcgis
- **Estilo principal**: [Data-Dense Dashboard](../estilos/data-dense-dashboard.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: N/A - Map-first tool
- **Estilo de dashboard**: Map-First + Layer Panel + Linked List
- **Enfoque de color**: Muted basemap + one UI accent + colorblind-safe data ramps
- **Consideraciones**: Map is the main region with a side panel for layers, legend and filters. Attribution always visible. Normalized choropleths. Map and list selection stay in sync. Keyboard and non-drag map controls. Text summary or table for the map. Bottom sheet on mobile.
- **Paleta**: Primary `#0F766E`, Secondary `#334155`, Accent `#EA580C`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#F1F5F9`, Border `#CBD5E1`, Destructive `#DC2626`
- **Notas de paleta**: Teal chrome + orange selection accent; data layers use colorblind-safe ramps and keep these UI hues out of them
- **Patrón recomendado**: Real-Time Monitoring
- **Ánimo de color**: Muted basemap + one UI accent + colorblind-safe data ramps
- **Ánimo tipográfico**: Clear + Functional typography
- **Efectos clave**: Hover highlight + click for details + linked map and list selection + camera moves skipped under reduced motion
- **Reglas de decisión**: {"must_have":["constraint:map-attribution","constraint:map-legend","constraint:map-text-alternative","constraint:colorblind-safe-ramps"],"if_large_dataset":["constraint:cluster-points","constraint:vector-tiles"],"if_mobile":["constraint:map-bottom-sheet"],"if_ux_focused":["constraint:keyboard-map-controls"]}
- **Anti-patrones**: Glass panels over the map + rainbow ramps + hidden attribution + raw-count choropleths + color-only status
- **Severidad**: HIGH

## Earth Observation / Satellite Imagery Viewer
- **Palabras clave**: earth-observation, satellite, satellite-imagery, remote-sensing, sentinel, landsat, raster, ndvi, sar, change-detection, before-after, imagery-viewer, stac
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Data-Dense Dashboard](../estilos/data-dense-dashboard.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: N/A - Imagery exploration tool
- **Estilo de dashboard**: Imagery-First + Timeline + Compare
- **Enfoque de color**: Neutral dark-grey chrome + perceptual index ramps (no rainbow)
- **Consideraciones**: Imagery fills the screen with neutral chrome so image colors read true. Date timeline with cloud-cover filter. Before/after swipe or side by side with both dates labeled. Band composites named by purpose. Fixed index value ranges with a legend. Scene date, sensor and source attribution visible.
- **Paleta**: Primary `#38BDF8`, Secondary `#94A3B8`, Accent `#FBBF24`, Background `#111318`, Foreground `#E5E7EB`, Card `#1A1D24`, Muted `#23272F`, Border `#2E333D`, Destructive `#F87171`
- **Notas de paleta**: Neutral dark-grey chrome (not pure black) so imagery colors read true + amber AOI and selection accent
- **Patrón recomendado**: Immersive + Interactive
- **Ánimo de color**: Neutral dark-grey chrome + perceptual index ramps
- **Ánimo tipográfico**: Technical + Functional typography
- **Efectos clave**: Before/after swipe + timeline scrubbing + crossfade between dates
- **Reglas de decisión**: {"must_have":["constraint:map-attribution","constraint:date-timeline","constraint:before-after-compare","constraint:index-legend"],"if_large_dataset":["constraint:cloud-cover-filter"],"if_mobile":["constraint:map-bottom-sheet"]}
- **Anti-patrones**: Saturated or tinted chrome around imagery + rainbow index ramps + unlabeled compare dates + unnamed band composites
- **Severidad**: HIGH

