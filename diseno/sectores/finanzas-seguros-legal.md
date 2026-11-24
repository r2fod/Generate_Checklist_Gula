# Sector: finanzas-seguros-legal
> Fuente: UI UX Pro Max (MIT), reordenado por sector. Son **sugerencias**: en Gula mandan `CLAUDE.md` y los tokens de `src/index.css`. Los hex son referencia, no se pegan: se traducen a tokens.

## Financial Dashboard
- **Palabras clave**: portfolio, trading, pnl, budget, revenue, expense, cashflow, balance-sheet, investment, bank, accounting, fintech
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Data-Dense Dashboard](../estilos/data-dense-dashboard.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Patrón de landing**: N/A - Dashboard focused
- **Estilo de dashboard**: Financial Dashboard
- **Enfoque de color**: Dark bg + red/green alerts + trust blue
- **Consideraciones**: High contrast, real-time updates, accuracy paramount.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#22C55E`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#EF4444`
- **Notas de paleta**: Dark bg + green positive indicators
- **Patrón recomendado**: Data-Dense Dashboard
- **Ánimo de color**: Dark bg + Red/Green alerts + Trust blue
- **Ánimo tipográfico**: Clear + Readable typography
- **Efectos clave**: Real-time number animations + Alert pulse
- **Reglas de decisión**: {"must_have":["constraint:real-time-updates","constraint:high-contrast"]}
- **Anti-patrones**: Light mode default + Slow rendering
- **Severidad**: HIGH

## Government/Public Service
- **Palabras clave**: government, civic, municipal, federal, citizen, public, administration, permit, tax, voter, transparency, regulation
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Inclusive Design](../estilos/inclusive-design.md)
- **Patrón de landing**: Minimal & Direct
- **Estilo de dashboard**: Executive Dashboard
- **Enfoque de color**: Professional blue + high contrast
- **Consideraciones**: WCAG AAA mandatory. Trust paramount.
- **Paleta**: Primary `#0F172A`, Secondary `#334155`, Accent `#0369A1`, Background `#F8FAFC`, Foreground `#020617`, Card `#FFFFFF`, Muted `#E8ECF1`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: High contrast navy + blue
- **Patrón recomendado**: Minimal & Direct
- **Ánimo de color**: Professional blue + High contrast
- **Ánimo tipográfico**: Clear + Large typography
- **Efectos clave**: Clear focus rings (3-4px) + Skip links
- **Reglas de decisión**: {"must_have":["constraint:wcag-aaa","constraint:keyboard-navigation"]}
- **Anti-patrones**: Ornate design + Low contrast + Motion effects + AI purple/pink gradients
- **Severidad**: HIGH

## Fintech/Crypto
- **Palabras clave**: banking, blockchain, crypto, defi, finance, fintech, money, nft, payment, web3
- **Estilo principal**: [Glassmorphism](../estilos/glassmorphism.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Retro-Futurism](../estilos/retro-futurism.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Patrón de landing**: Conversion-Optimized
- **Estilo de dashboard**: Real-Time Monitoring + Predictive
- **Enfoque de color**: Dark tech colors + trust + vibrant accents
- **Consideraciones**: Security perception. Real-time data critical.
- **Paleta**: Primary `#F59E0B`, Secondary `#FBBF24`, Accent `#8B5CF6`, Background `#0F172A`, Foreground `#F8FAFC`, Card `#222735`, Muted `#272F42`, Border `#334155`, Destructive `#EF4444`
- **Notas de paleta**: Gold trust + purple tech
- **Patrón recomendado**: Trust & Authority
- **Ánimo de color**: Navy + Trust Blue + Gold
- **Ánimo tipográfico**: Professional + Trustworthy
- **Efectos clave**: Smooth state transitions + Number animations
- **Reglas de decisión**: {"must_have":["constraint:security-first"],"if_dashboard":["mode:dark"]}
- **Anti-patrones**: Playful design + Unclear fees + AI purple/pink gradients
- **Severidad**: HIGH

## Real Estate/Property
- **Palabras clave**: buy, estate, housing, property, real, real-estate, rent
- **Estilo principal**: [Glassmorphism](../estilos/glassmorphism.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Motion-Driven](../estilos/motion-driven.md) + [3D & Hyperrealism](../estilos/3d-and-hyperrealism.md)
- **Patrón de landing**: Hero-Centric Design + Feature-Rich
- **Estilo de dashboard**: Sales Intelligence Dashboard
- **Enfoque de color**: Trust Blue (#0077B6) + Gold accents + White
- **Consideraciones**: Property listings. Virtual tours. Map integration. Agent profiles. Mortgage calculator. High-quality imagery.
- **Paleta**: Primary `#0F766E`, Secondary `#14B8A6`, Accent `#0369A1`, Background `#F0FDFA`, Foreground `#134E4A`, Card `#FFFFFF`, Muted `#E8F0F3`, Border `#99F6E4`, Destructive `#DC2626`
- **Notas de paleta**: Trust teal + professional blue
- **Patrón recomendado**: Hero-Centric + Feature-Rich
- **Ánimo de color**: Trust Blue + Gold + White
- **Ánimo tipográfico**: Professional + Confident
- **Efectos clave**: 3D property tour zoom + Map hover
- **Reglas de decisión**: {"if_luxury":["constraint:add-3d-models"],"must_have":["constraint:map-integration"]}
- **Anti-patrones**: Poor photos + No virtual tours
- **Severidad**: HIGH

## Legal Services
- **Palabras clave**: law, attorney, legal, case, compliance, contract, court, firm, counsel, litigation, practice-area, jurisdiction
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Trust & Authority + Minimal
- **Estilo de dashboard**: Case Management Dashboard
- **Enfoque de color**: Navy Blue (#1E3A5F) + Gold + White
- **Consideraciones**: Credibility paramount. Practice areas. Attorney profiles. Case results. Contact forms. Professional imagery.
- **Paleta**: Primary `#1E3A8A`, Secondary `#1E40AF`, Accent `#B45309`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#CBD5E1`, Destructive `#DC2626`
- **Notas de paleta**: Authority navy + trust gold
- **Patrón recomendado**: Trust & Authority + Minimal
- **Ánimo de color**: Navy Blue (#1E3A5F) + Gold + White
- **Ánimo tipográfico**: Professional + Authoritative typography
- **Efectos clave**: Practice area reveal + Attorney profile animations
- **Reglas de decisión**: {"must_have":["constraint:case-results","constraint:credential-display"]}
- **Anti-patrones**: Outdated design + Hidden credentials + AI purple/pink gradients
- **Severidad**: HIGH

## Insurance Platform
- **Palabras clave**: insurance, platform
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Patrón de landing**: Conversion-Optimized + Trust
- **Estilo de dashboard**: Claims Analytics Dashboard
- **Enfoque de color**: Trust Blue (#0066CC) + Green (security) + Neutral
- **Consideraciones**: Quote calculator. Policy comparison. Claims process. Trust signals. Clear pricing. Security badges.
- **Paleta**: Primary `#0369A1`, Secondary `#0EA5E9`, Accent `#16A34A`, Background `#F0F9FF`, Foreground `#0C4A6E`, Card `#FFFFFF`, Muted `#E7EFF5`, Border `#BAE6FD`, Destructive `#DC2626`
- **Notas de paleta**: Security blue + protected green [Accent adjusted from #22C55E]
- **Patrón recomendado**: Conversion + Trust
- **Ánimo de color**: Trust Blue (#0066CC) + Green + Neutral
- **Ánimo tipográfico**: Clear + Professional typography
- **Efectos clave**: Quote calculator animations + Policy comparison
- **Reglas de decisión**: {"must_have":["constraint:quote-calculator","constraint:policy-comparison"]}
- **Anti-patrones**: Confusing pricing + No trust signals + AI purple/pink gradients
- **Severidad**: HIGH

## Banking/Traditional Finance
- **Palabras clave**: banking, finance, traditional
- **Estilo principal**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Accessible & Ethical](../estilos/accessible-and-ethical.md)
- **Estilos secundarios**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Patrón de landing**: Trust & Authority + Feature-Rich
- **Estilo de dashboard**: Financial Dashboard
- **Enfoque de color**: Navy (#0A1628) + Trust Blue + Gold accents
- **Consideraciones**: Security-first. Account overview. Transaction history. Mobile banking. Accessibility critical. Trust paramount.
- **Paleta**: Primary `#0F172A`, Secondary `#1E3A8A`, Accent `#A16207`, Background `#F8FAFC`, Foreground `#020617`, Card `#FFFFFF`, Muted `#E8ECF1`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Trust navy + premium gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Trust & Authority + Feature
- **Ánimo de color**: Navy (#0A1628) + Trust Blue + Gold
- **Ánimo tipográfico**: Professional + Trustworthy typography
- **Efectos clave**: Smooth number animations + Security indicators
- **Reglas de decisión**: {"must_have":["constraint:security-first","constraint:accessibility"]}
- **Anti-patrones**: Playful design + Poor security UX + AI purple/pink gradients
- **Severidad**: HIGH

## Non-profit/Charity
- **Palabras clave**: charity, non, profit
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Organic Biophilic](../estilos/organic-biophilic.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md)
- **Patrón de landing**: Storytelling-Driven + Trust
- **Estilo de dashboard**: Donation Analytics Dashboard
- **Enfoque de color**: Cause-related colors + Trust + Warm
- **Consideraciones**: Impact stories. Donation flow. Transparency reports. Volunteer signup. Event calendar. Emotional connection.
- **Paleta**: Primary `#0891B2`, Secondary `#22D3EE`, Accent `#EA580C`, Background `#ECFEFF`, Foreground `#164E63`, Card `#FFFFFF`, Muted `#E8F1F6`, Border `#A5F3FC`, Destructive `#DC2626`
- **Notas de paleta**: Compassion blue + action orange [Accent adjusted from #F97316]
- **Patrón recomendado**: Storytelling + Trust
- **Ánimo de color**: Cause-related colors + Trust + Warm
- **Ánimo tipográfico**: Heartfelt + Readable typography
- **Efectos clave**: Impact counter animations + Story reveals
- **Reglas de decisión**: {"must_have":["constraint:impact-stories","constraint:donation-transparency"]}
- **Anti-patrones**: No impact data + Hidden financials
- **Severidad**: HIGH

## Church/Religious Organization
- **Palabras clave**: church, organization, religious
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Soft UI Evolution](../estilos/soft-ui-evolution.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Inclusive Design](../estilos/inclusive-design.md)
- **Patrón de landing**: Hero-Centric Design + Social Proof
- **Estilo de dashboard**: N/A - Community focused
- **Enfoque de color**: Warm Gold + Deep Purple/Blue + White
- **Consideraciones**: Service times. Events. Sermons. Community. Giving. Location. Welcoming imagery.
- **Paleta**: Primary `#7C3AED`, Secondary `#A78BFA`, Accent `#A16207`, Background `#FAF5FF`, Foreground `#4C1D95`, Card `#FFFFFF`, Muted `#ECEEF9`, Border `#DDD6FE`, Destructive `#DC2626`
- **Notas de paleta**: Spiritual purple + warm gold [Accent adjusted from #CA8A04]
- **Patrón recomendado**: Hero-Centric + Social Proof
- **Ánimo de color**: Warm Gold + Deep Purple/Blue + White
- **Ánimo tipográfico**: Welcoming + Clear typography
- **Efectos clave**: Service time highlights + Event calendar
- **Reglas de decisión**: {"must_have":["constraint:service-times","constraint:community-events"]}
- **Anti-patrones**: Outdated design + Hidden info
- **Severidad**: MEDIUM

## Personal Finance Tracker
- **Palabras clave**: budget, expense, money, finance, spending, savings, tracker, personal, wallet
- **Estilo principal**: [Glassmorphism](../estilos/glassmorphism.md) + [Dark Mode (OLED)](../estilos/dark-mode-oled.md)
- **Estilos secundarios**: [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md) + [Flat Design](../estilos/flat-design.md)
- **Patrón de landing**: Interactive Product Demo
- **Estilo de dashboard**: Financial Dashboard
- **Enfoque de color**: Calm blue + success green + alert red + chart accents
- **Consideraciones**: Category pie/donut charts. Monthly trend lines. Budget progress bars. Transaction list with swipe actions. Receipt camera. Currency formatting. Recurring entries.
- **Paleta**: Primary `#1E40AF`, Secondary `#3B82F6`, Accent `#059669`, Background `#0F172A`, Foreground `#FFFFFF`, Card `#192134`, Muted `#101A34`, Border `rgba(255,255,255,0.08)`, Destructive `#DC2626`
- **Notas de paleta**: Trust blue + profit green on dark
- **Patrón recomendado**: Interactive Product Demo
- **Ánimo de color**: Calm blue + success green + alert red + chart accents
- **Ánimo tipográfico**: Modern + Clear hierarchy
- **Efectos clave**: Backdrop blur (10-20px) + Translucent overlays
- **Reglas de decisión**: {"if_light_mode_needed":["constraint:provide-theme-toggle"],"if_low_performance":["style:flat-design"]}
- **Anti-patrones**: Pure white backgrounds
- **Severidad**: HIGH

## Auction Platform
- **Palabras clave**: auction, bid, hammer, lot, live-auction, bidding-war, estate-sale, proxibid, gavel, lot-number, reserve-price
- **Estilo principal**: [Dark Mode (OLED)](../estilos/dark-mode-oled.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Real-Time Monitoring](../estilos/real-time-monitoring.md)
- **Patrón de landing**: Live Auction Feed + Countdown
- **Estilo de dashboard**: N/A - Auction focused
- **Enfoque de color**: Dark bg + bid green + outbid red + countdown amber
- **Consideraciones**: Real-time bid updates. Countdown timer urgency. Auto-bid ceiling. Outbid notifications. Bid history. Reserve price indicator.
- **Paleta**: Primary `#0F172A`, Secondary `#1E293B`, Accent `#16A34A`, Background `#020617`, Foreground `#F8FAFC`, Card `#0E1223`, Muted `#1A1E2F`, Border `#334155`, Destructive `#DC2626`
- **Notas de paleta**: Dark luxury + bid green + outbid red + urgency
- **Patrón recomendado**: Real-Time / Operations Landing
- **Ánimo de color**: Dark bg + bid green + outbid red + countdown amber
- **Ánimo tipográfico**: Bold + Urgent typography
- **Efectos clave**: Countdown timer + live bid updates
- **Reglas de decisión**: {"must_have":["constraint:live-bid-updates","constraint:countdown-timer","constraint:auto-bid-ceiling","constraint:outbid-notifications","constraint:bid-history"],"if_conversion_focused":["constraint:add-urgency-colors"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Static design + No bid state + poor mobile
- **Severidad**: HIGH

## Crowdfunding Platform
- **Palabras clave**: crowdfunding, kickstarter, indiegogo, campaign, backer, pledge, funding-goal, stretch-goal, reward-tier, all-or-nothing
- **Estilo principal**: [Vibrant & Block-based](../estilos/vibrant-and-block-based.md) + [Motion-Driven](../estilos/motion-driven.md)
- **Estilos secundarios**: [Claymorphism](../estilos/claymorphism.md) + [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md)
- **Patrón de landing**: Storytelling-Driven + Social Proof
- **Estilo de dashboard**: Campaign Analytics Dashboard
- **Enfoque de color**: Brand primary + funding progress green + urgency amber + reward tier colors
- **Consideraciones**: Funding progress bar with % goal. Reward tier selector. Backer count. Countdown timer. Updates feed. Creator profile. Risk/disclaimer section.
- **Paleta**: Primary `#D97706`, Secondary `#F59E0B`, Accent `#16A34A`, Background `#FFFBEB`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#FCF6F0`, Border `#FAEEE1`, Destructive `#DC2626`
- **Notas de paleta**: Funding progress amber + goal green + urgency
- **Patrón recomendado**: Scroll-Triggered Storytelling
- **Ánimo de color**: Brand primary + funding progress green + urgency amber + reward tier colors
- **Ánimo tipográfico**: Emotional + High-contrast typography
- **Efectos clave**: Progress bar + reward-tier animations
- **Reglas de decisión**: {"must_have":["constraint:progress-bar","constraint:reward-tier-selector","constraint:backer-count","constraint:countdown-timer","constraint:updates-feed"],"if_conversion_focused":["constraint:add-urgency-colors"],"if_engagement_metric":["constraint:add-progress-animation"]}
- **Anti-patrones**: Static design + no progress bar + weak social proof
- **Severidad**: HIGH

## Government Portal / Civic Services
- **Palabras clave**: government-portal, civic-services, city-hall, permit-application, tax-payment, voter-registration, public-records, municipal-online
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Inclusive Design](../estilos/inclusive-design.md)
- **Estilos secundarios**: [Flat Design](../estilos/flat-design.md) + [Inclusive Design](../estilos/inclusive-design.md)
- **Patrón de landing**: Service Directory + Search
- **Estilo de dashboard**: N/A - Service focused
- **Enfoque de color**: Professional blue + accessibility high contrast + service category colors
- **Consideraciones**: Multilingual toggle. Service A-Z index. Form wizard with save-progress. Document upload. Appointment booking. Status tracker. WCAG AAA. Plain language.
- **Paleta**: Primary `#1E40AF`, Secondary `#3B82F6`, Accent `#16A34A`, Background `#EFF6FF`, Foreground `#1E3A8A`, Card `#FFFFFF`, Muted `#E9EFF5`, Border `#BFDBFE`, Destructive `#DC2626`
- **Notas de paleta**: Professional blue + service green + accessibility
- **Patrón recomendado**: Enterprise Gateway
- **Ánimo de color**: Professional blue + accessibility high contrast + service category colors
- **Ánimo tipográfico**: Clear + Large typography
- **Efectos clave**: Skip-link focus states + save-progress forms
- **Reglas de decisión**: {"must_have":["constraint:plain-language-copy","constraint:service-a-z","constraint:save-progress","constraint:document-upload","constraint:appointment-booking"],"if_trust_needed":["constraint:prioritize-clarity"],"if_mobile":["constraint:optimize-touch-targets"]}
- **Anti-patrones**: Ornate design + low contrast + motion effects + AI purple/pink gradients
- **Severidad**: HIGH

## Grant / Funding Portal
- **Palabras clave**: grant, funding, rfp, proposal, research-grant, foundation, fellowship, award, application-portal, funding-opportunity
- **Estilo principal**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Accessible & Ethical](../estilos/accessible-and-ethical.md) + [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md)
- **Patrón de landing**: Opportunity Grid + Search
- **Estilo de dashboard**: Application Tracking Dashboard
- **Enfoque de color**: Institution navy + funding green + deadline red + neutral white
- **Consideraciones**: Funding opportunity cards. Eligibility checker. Deadline countdown. Application form wizard. Document checklist. Review status tracker. Award announcement feed.
- **Paleta**: Primary `#1E3A5F`, Secondary `#2563EB`, Accent `#16A34A`, Background `#F8FAFC`, Foreground `#0F172A`, Card `#FFFFFF`, Muted `#E9EEF5`, Border `#CBD5E1`, Destructive `#DC2626`
- **Notas de paleta**: Institution navy + funding green + deadline urgency
- **Patrón recomendado**: Marketplace / Directory
- **Ánimo de color**: Institution navy + funding green + deadline red + neutral white
- **Ánimo tipográfico**: Formal + Clear typography
- **Efectos clave**: Deadline countdown + status tracking
- **Reglas de decisión**: {"must_have":["constraint:opportunity-cards","constraint:eligibility-checker","constraint:deadline-countdown","constraint:application-wizard","constraint:status-tracker"],"if_trust_needed":["constraint:prioritize-clarity"],"if_conversion_focused":["constraint:add-urgency-colors"]}
- **Anti-patrones**: No deadlines + no eligibility clarity + buried docs
- **Severidad**: HIGH

## Patent / IP Database
- **Palabras clave**: patent, intellectual-property, trademark, prior-art, uspto, wipo, invention, ip-portfolio, patent-search, claims
- **Estilo principal**: [Swiss Modernism 2.0](../estilos/swiss-modernism-2-0.md) + [Minimalism & Swiss Style](../estilos/minimalism-and-swiss-style.md)
- **Estilos secundarios**: [Editorial Grid / Magazine](../estilos/editorial-grid-magazine.md) + [Data-Dense Dashboard](../estilos/data-dense-dashboard.md)
- **Patrón de landing**: Search-First + Results Grid
- **Estilo de dashboard**: N/A - Search focused
- **Enfoque de color**: Formal neutral + patent type chips + status badges (granted/pending/rejected)
- **Consideraciones**: Full-text patent search. Classification tree. Citation graph. Prior art comparison. Patent family view. PDF download. Legal status tracker.
- **Paleta**: Primary `#475569`, Secondary `#64748B`, Accent `#A16207`, Background `#F8FAFC`, Foreground `#1E293B`, Card `#FFFFFF`, Muted `#EAEFF3`, Border `#E2E8F0`, Destructive `#DC2626`
- **Notas de paleta**: Formal neutral + patent type chips + status badges
- **Patrón recomendado**: Marketplace / Directory
- **Ánimo de color**: Formal neutral + patent type chips + status badges
- **Ánimo tipográfico**: Formal + Search-friendly typography
- **Efectos clave**: Full-text search highlight + citation graph
- **Reglas de decisión**: {"must_have":["constraint:full-text-search","constraint:classification-tree","constraint:citation-graph","constraint:prior-art-comparison","constraint:legal-status-tracker"],"if_data_heavy":["constraint:virtualize-lists"],"if_trust_needed":["constraint:prioritize-clarity"]}
- **Anti-patrones**: No search + no citation graph + visual clutter
- **Severidad**: HIGH

