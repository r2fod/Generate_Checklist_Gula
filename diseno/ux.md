# Guías de UX web
> Sin ejemplos de código (ver fuente). Fuente: UI UX Pro Max (MIT).

| Categoría | Asunto | Plataforma | Hacer | No hacer | Severidad |
|---|---|---|---|---|---|
| Navigation | Smooth Scroll | Web | Use scroll-behavior: smooth on html element | Jump directly without transition | High |
| Navigation | Sticky Navigation | Web | Add padding-top to body equal to nav height | Let nav overlap first section content | Medium |
| Navigation | Active State | All | Highlight active nav item with color/underline | No visual feedback on current location | Medium |
| Navigation | Back Button | Mobile | Preserve navigation history properly | Break browser/app back button behavior | High |
| Navigation | Deep Linking | All | Update URL on state/view changes | Static URLs for dynamic content | Medium |
| Navigation | Breadcrumbs | Web | Use for sites with 3+ levels of depth | Use for flat single-level sites | Low |
| Animation | Excessive Motion | All | Animate 1-2 key elements per view maximum | Animate everything that moves | High |
| Animation | Duration Timing | All | Use shared motion tokens and test that feedback stays responsive | Present 150-300ms or any cutoff as a universal requirement | Medium |
| Animation | Reduced Motion | All | Check prefers-reduced-motion media query | Ignore accessibility motion settings | High |
| Animation | Loading States | All | Use skeleton screens or spinners | Leave UI frozen with no feedback | High |
| Animation | Hover vs Tap | All | Use click/tap for primary interactions | Rely only on hover for important actions | High |
| Animation | Continuous Animation | All | Use for loading indicators only | Use for decorative elements | Medium |
| Animation | Transform Performance | Web | Use transform and opacity for animations | Animate width/height/top/left properties | Medium |
| Animation | Easing Functions | All | Use deceleration when arriving acceleration when leaving and linear for constant-rate progress | Reject linear easing even for steady rotation or progress | Low |
| Layout | Z-Index Management | Web | Define z-index scale system (10 20 30 50) | Use arbitrary large z-index values | High |
| Layout | Overflow Hidden | Web | Test all content fits within containers | Blindly apply overflow-hidden | Medium |
| Layout | Fixed Positioning | Web | Account for safe areas and other fixed elements | Stack multiple fixed elements carelessly | Medium |
| Layout | Stacking Context | Web | Understand what creates new stacking context | Expect z-index to work across contexts | Medium |
| Layout | Content Jumping | Web | Reserve appropriate space or keep async states in a stable content-driven container | Insert compact text or media without a layout strategy | High |
| Layout | Viewport Units | Web | Use dvh or account for mobile browser chrome | Use 100vh for full-screen mobile layouts | Medium |
| Layout | Container Width | Web | Limit max-width for text content (65-75ch) | Let text span full viewport width | Medium |
| Touch | Touch Target Size | Mobile | Use 44pt on iOS and 48dp on Android; for web use the separate WCAG Target Size rule | Treat one unit or minimum as universal across platforms | High |
| Touch | Touch Spacing | Mobile | Minimum 8px gap between touch targets | Tightly packed clickable elements | Medium |
| Touch | Gesture Conflicts | Mobile | Avoid horizontal swipe on main content | Override system gestures | Medium |
| Touch | Tap Delay | Mobile | Use touch-action CSS or fastclick | Default mobile tap handling | Medium |
| Touch | Pull to Refresh | Mobile | Disable where not needed | Enable by default everywhere | Low |
| Touch | Haptic Feedback | Mobile | Use for confirmations and important actions | Overuse vibration feedback | Low |
| Interaction | Focus States | All | Use a visible focus ring on every interactive control, including modal controls | Remove focus outline without replacement | High |
| Interaction | Hover States | Web | Change cursor and add subtle visual change | No hover feedback on clickable elements | Medium |
| Interaction | Active States | All | Add pressed/active state visual change | No feedback during interaction | Medium |
| Interaction | Disabled States | All | Reduce opacity and change cursor | Confuse disabled with normal state | Medium |
| Interaction | Loading Buttons | All | Disable button and show loading state | Allow multiple clicks during processing | High |
| Interaction | Error Feedback | All | Show clear error messages near problem | Silent failures with no feedback | High |
| Interaction | Success Feedback | All | Show success message or visual change | No confirmation of completed action | Medium |
| Interaction | Confirmation Dialogs | All | Confirm before delete/irreversible actions | Delete without confirmation | High |
| Accessibility | Color Contrast | All | Minimum 4.5:1 ratio for normal text | Low contrast text | High |
| Accessibility | Color Only | All | Use icons/text in addition to color | Red/green only for error/success | High |
| Accessibility | Alt Text | All | Descriptive alt text for meaningful images | Empty or missing alt attributes | High |
| Accessibility | Heading Hierarchy | Web | Use sequential heading levels h1-h6 | Skip heading levels or misuse for styling | Medium |
| Accessibility | ARIA Labels | All | Add aria-label for icon-only buttons | Icon buttons without labels | High |
| Accessibility | Keyboard Navigation | Web | Keep tab order aligned with visual order and test every action without a pointer | Keyboard traps or illogical tab order | High |
| Accessibility | Screen Reader | All | Use semantic HTML and ARIA properly | Div soup with no semantics | Medium |
| Accessibility | Form Labels | All | Use label with for attribute or wrap input | Placeholder-only inputs | High |
| Accessibility | Error Messages | All | Use aria-live or role=alert for errors | Visual-only error indication | High |
| Accessibility | Skip Links | Web | Provide skip to main content link | No skip link on nav-heavy pages | Medium |
| Performance | Image Optimization | All | Use appropriate size and format (WebP) | Unoptimized full-size images | High |
| Performance | Lazy Loading | All | Lazy load below-fold images and content | Load everything upfront | Medium |
| Performance | Code Splitting | Web | Split code by route/feature | Single large bundle | Medium |
| Performance | Caching | Web | Set appropriate cache headers | No caching strategy | Medium |
| Performance | Font Loading | Web | Use font-display swap or optional | Invisible text during font load | Medium |
| Performance | Third Party Scripts | Web | Load non-critical scripts async/defer | Synchronous third-party scripts | Medium |
| Performance | Bundle Size | Web | Monitor and minimize bundle size | Ignore bundle size growth | Medium |
| Performance | Render Blocking | Web | Inline critical CSS defer non-critical | Large blocking CSS files | Medium |
| Forms | Input Labels | All | Always show label above or beside input | Placeholder as only label | High |
| Forms | Error Placement | All | Show a specific error below the input and reference it with aria-describedby | Show only a top-level error without identifying each invalid field | High |
| Forms | Inline Validation | All | Validate on blur for most fields | Validate only on submit | Medium |
| Forms | Input Types | All | Use email tel number url etc | Text input for everything | Medium |
| Forms | Autofill Support | Web | Use autocomplete attribute properly | Block or ignore autofill | Medium |
| Forms | Required Indicators | All | Use asterisk or (required) text | No indication of required fields | Medium |
| Forms | Password Visibility | All | Toggle to show/hide password | No visibility toggle | Medium |
| Forms | Submit Feedback | All | Show loading then success/error state | No feedback after submit | High |
| Forms | Input Affordance | All | Use distinct input styling | Inputs that look like plain text | Medium |
| Forms | Mobile Keyboards | Mobile | Use inputmode attribute | Default keyboard for all inputs | Medium |
| Responsive | Mobile First | Web | Start with mobile styles then add breakpoints | Desktop-first causing mobile issues | Medium |
| Responsive | Breakpoint Testing | Web | Test at 320 375 414 768 1024 1440 | Only test on your device | Medium |
| Responsive | Touch Friendly | Web | Increase touch targets on mobile | Same tiny buttons on mobile | High |
| Responsive | Readable Font Size | All | Minimum 16px body text on mobile | Tiny text on mobile | High |
| Responsive | Viewport Meta | Web | Use width=device-width initial-scale=1 | Missing or incorrect viewport | High |
| Responsive | Horizontal Scroll | Web | Ensure content fits viewport width | Content wider than viewport | High |
| Responsive | Image Scaling | Web | Use max-width: 100% on images | Fixed width images overflow | Medium |
| Responsive | Table Handling | Web | Use horizontal scroll or card layout | Wide tables breaking layout | Medium |
| Typography | Line Height | All | Use 1.5-1.75 for body text | Cramped or excessive line height | Medium |
| Typography | Line Length | Web | Limit to 65-75 characters per line | Full-width text on large screens | Medium |
| Typography | Font Size Scale | All | Use consistent modular scale | Random font sizes | Medium |
| Typography | Font Loading | Web | Reserve space with fallback font | Layout shift when fonts load | Medium |
| Typography | Contrast Readability | All | Use darker text on light backgrounds | Gray text on gray background | High |
| Typography | Heading Clarity | All | Clear size/weight difference | Headings similar to body text | Medium |
| Feedback | Loading Indicators | All | Follow platform and component guidance; preserve layout focus and accessible busy status | Apply one timing threshold to every operation or leave long waits unexplained | High |
| Feedback | Empty States | All | Show helpful message and action | Blank empty screens | Medium |
| Feedback | Error Recovery | All | Provide clear next steps | Error without recovery path | Medium |
| Feedback | Progress Indicators | All | Step indicators or progress bar | No indication of progress | Medium |
| Feedback | Toast Notifications | All | Auto-dismiss after 3-5 seconds | Toasts that never disappear | Medium |
| Feedback | Confirmation Messages | All | Brief success message | Silent success | Medium |
| Content | Truncation | All | Truncate with ellipsis and expand option | Overflow or broken layout | Medium |
| Content | Date Formatting | All | Use relative or locale-aware dates | Ambiguous date formats | Low |
| Content | Number Formatting | All | Use thousand separators or abbreviations | Long unformatted numbers | Low |
| Content | Placeholder Content | All | Use realistic sample data | Lorem ipsum everywhere | Low |
| Onboarding | User Freedom | All | Provide Skip and Back buttons | Force linear unskippable tour | Medium |
| Search | Autocomplete | Web | Show predictions as user types | Require full type and enter | Medium |
| Search | No Results | Web | Show 'No results' with suggestions | Blank screen or '0 results' | Medium |
| Data Entry | Bulk Actions | Web | Allow multi-select and bulk edit | Single row actions only | Low |
| AI Interaction | Disclaimer | All | Clearly label AI generated content | Present AI as human | High |
| AI Interaction | Streaming | All | Stream text response token by token | Show loading spinner for 10s+ | Medium |
| Spatial UI | Gaze Hover | VisionOS | Scale/highlight element on look | Static element until pinch | High |
| Spatial UI | Depth Layering | VisionOS | Use glass material and z-offset | Flat opaque panels blocking view | Medium |
| Sustainability | Auto-Play Video | Web | Prefer click-to-play; provide pause and captions; stop off-screen and honor reduced motion | Auto-play high-resolution loops without pause or captions | Medium |
| Sustainability | Asset Weight | Web | Compress and lazy load 3D models | Load 50MB textures | Medium |
| AI Interaction | Feedback Loop | All | Thumps up/down or 'Regenerate' | Static output only | Low |
| Accessibility | Motion Sensitivity | All | Honor prefers-reduced-motion and present the final readable state without parallax or scroll-jacking | Force scroll effects | High |
| Accessibility | Focus Not Obscured (Minimum) | Web | Offset sticky UI with scroll-padding and dismiss or move persistent overlays | Let headers footers banners or chat widgets fully cover focus | High |
| Accessibility | Focus Not Obscured (Enhanced) | Web | Keep the entire focused component unobscured by author-created content | Present this enhanced AAA criterion as an AA requirement or allow persistent UI to hide any part of focus | Medium |
| Accessibility | Focus Appearance | Web | Use an indicator at least as large as a 2 CSS px perimeter with 3:1 state contrast | Present this enhanced AAA criterion as an AA requirement or use a thin low-contrast outline | Medium |
| Accessibility | Dragging Movements | All | Add buttons menus or tap-to-move controls and retain keyboard operation | Make dragging the only way to reorder resize or select | High |
| Accessibility | Target Size (Minimum) | Web | Use at least 24 by 24 CSS px or verify spacing equivalent inline user-agent or essential exceptions | Assume native 44pt or 48dp guidance defines web conformance | High |
| Accessibility | Consistent Help | All | Keep contact self-help and automated help in consistent locations | Move help controls to different locations on each page | Medium |
| Forms | Redundant Entry | All | Auto-populate prior values or let users select previously entered information | Ask users to retype the same address or account data without necessity | Medium |
| Security / Accessibility | Accessible Authentication (Minimum) | All | Allow password managers and paste; offer passkeys OAuth or another non-cognitive method | Block paste or require manual OTP transcription with no alternative | Critical |
| Animation | Auto-Rotating Content Controls | All | Provide previous next and play/pause; stop on focus or hover and when reduced motion is requested | Auto-advance slides without a stop control | High |
| Forms / Accessibility | Focusable Error Summary | Web | Place it at the top of the form; move focus to its heading or container after failed submit; link each item to its invalid field; retain inline errors | Replace inline errors with a visual-only summary or move focus on every blur | High |
| Typography | Heading Line Balance | Web | Bound the measure and test natural-wrap fallback across widths fonts and locales | Promise an exact final line or insert blanket nonbreaking spaces or hardcoded br tags | Medium |
| Layout | Long Token Wrapping | Web | Use overflow-wrap anywhere and let flex or grid text children shrink | Apply word-break break-all to all prose | High |
| Accessibility | Text Reflow and Spacing | Web | Use fluid sizes content-driven height and unitless line height | Clip text in fixed-width or fixed-height boxes | Critical |
| Content | Essential Text Truncation | All | Wrap stack resize or provide a visible full-detail path | Clamp essential meaning only to make cards uniform | Critical |
| Content | Compact Label Semantics | All | Choose static or interactive markup from the label's meaning and ownership | Make every pill clickable or encode status with color alone | High |
| Layout | Chip Collection Reflow | All | Wrap the collection or use an operable +n disclosure for hidden overflow values | Force all chips into one clipped row or hide overflow values | High |
| Content | Compact Label Overflow | All | Bound only unpredictable values; use nowrap with a shrinkable label; expose full text to keyboard pointer and touch users | Let one compact label wrap to a second line or use a hover-only tooltip | High |
| Accessibility | Compact Control Semantics | Web | Prefer a button and expose pressed or selected state that matches the visible label | Use a clickable div or reveal the only action on hover | Critical |
| Accessibility | Contextual Live Badge Updates | Web | Use one appropriate atomic status message such as 3 items in cart | Announce a bare number or make every badge a competing live region | High |
| Animation | Cancellable State Transitions | Web | Cancel or replace prior motion; set the final semantic state directly and handle cancellation cleanup | Depend on animationend or transitionend for required state correctness | High |
| Forms | IME Composition Enter | Web | Cancel the default action of handled Enter before guarding isComposing or legacy keyCode 229; preserve Shift+Enter and modifier policy; ignore repeats; retain a submit button for virtual keyboards | Send or clear text on every Enter keydown or submit from compositionend | High |
| Maps | Map Attribution Visible | Web | Keep the map library attribution control visible on load; it may collapse after interaction to an (i) button that stays findable; keep the Mapbox logo with Mapbox tiles; add third-party tile attribution yourself in Leaflet or OpenLayers | Disable the attribution control, hide it behind a click on load, or hide the logo or credits with CSS | Critical |
| Maps | Map Text Alternative | Web | Label the map container as a region, add a short text summary of the map's key insight, and offer a feature list or table that follows the active filters | Leave the map as an unlabeled canvas or a div with no text equivalent | Critical |
| Maps | Map Keyboard and Non-Drag Navigation | Web | Keep the map keyboard handler on (arrow keys pan, +/- zoom), make markers focusable with Enter opening details, show zoom buttons, and offer search or coordinate input to reach a place without dragging | Disable map keyboard handling or make dragging the only way to pan, swipe a compare view or scrub a map time slider | High |
| Maps | Map Symbology Not Color Alone | Web | Pair color with an icon, shape, pattern or label per category; use colorblind-safe map schemes such as ColorBrewer YlGnBu, Blues or RdBu, or Viridis; check the map legend in a deuteranopia simulation | Encode alert versus normal or map categories only with red and green fills or circle colors | High |
| Maps | Normalized Choropleth Map | Web | Fill regions by rates, densities or percentages (per capita, per km2, share of total); show raw totals as proportional symbols scaled by the square root of the value | Fill choropleth regions by raw totals such as case counts or population | High |
| Maps | Perceptual Map Color Ramps | Web | Use single-hue sequential or perceptually uniform ramps (Viridis, ColorBrewer sequential) and diverging ramps only around a meaningful midpoint; darker means more on a light basemap and brighter means more on a dark basemap; mute basemap saturation so the data layer stays strongest | Use rainbow or jet ramps, which add false boundaries and uneven lightness, or saturated data colors on a busy saturated basemap | High |
| Maps | Safe Map Popup Content | Web | Render feature attribute values as text through DOM text nodes with setDOMContent or setText; use setHTML only for trusted templates or sanitized output | Interpolate feature properties into strings passed to setHTML, Leaflet bindPopup or innerHTML | High |
| Maps | Cluster Dense Map Points | Web | Cluster points at low zoom with a count label, set clusterMaxZoom, and zoom into a cluster on click or Enter | Draw tens of thousands of individual or DOM markers at every zoom level | Medium |
| Maps | Large Geodata as Vector Tiles | Web | Serve large map datasets as vector tiles (MVT or PMTiles) and keep GeoJSON slim: drop unused properties, round coordinates and simplify geometry | Load a multi-megabyte GeoJSON file with every attribute into the browser | Medium |
| Maps | Map Camera Reduced Motion | Web | Keep MapLibre and Mapbox camera moves non-essential so the library skips them under prefers-reduced-motion; check prefers-reduced-motion yourself for custom loops (globe spin, Leaflet flyTo, deck.gl or Cesium flights) and jump instead of fly; give continuous map animation a pause control | Mark decorative flights essential: true or start a requestAnimationFrame camera loop regardless of the motion setting | Medium |
| Forms | Clear Errors After Correction | All | Once a field shows an error re-check it on input (at the latest on blur) and remove the message, error styling and aria-invalid the moment it passes; re-check dependent fields such as a password confirmation; on resubmit revalidate every field and drop stale error summary items | Leave a corrected error on screen until the next submit or until focus leaves the field | High |
| Forms | Premature Validation | All | Validate a field after the user has entered something and leaves it; report empty required fields on submit; keep as-you-type feedback for rules people need while typing such as password requirements or character limits | Validate on focus, on the first keystrokes of a new entry, or when an untouched empty field loses focus | Medium |
| Forms | Preserve Input After Failed Submit | All | Show the form again with every value as the user entered it, both passing and failing (secret fields such as passwords may be left empty); mark only the fields that need changes | Call form.reset(), clear the failing fields, or reload an empty form after a validation or server error | High |
| Forms | Submit Button Not Pre-Disabled | All | Keep submit enabled and validate on click so the errors show what to fix; disable it only while the request is in flight, with a spinner, and send an idempotency key so a double click creates one record | Disable submit until every field passes, or leave it clickable with no in-flight guard | Medium |
| Forms | Unsaved Changes Warning | All | Track a dirty state; while it is set ask before leaving through a router guard, beforeunload for tab close, or the dialog close handler, with clear choices such as Discard changes and Keep editing; skip the prompt when nothing changed or after a successful save | Drop edits without warning, or prompt on every navigation even when nothing changed | High |
| Forms | Forgiving Input Formats | All | Normalize before validating: trim leading and trailing whitespace, ignore spaces, hyphens and brackets in numbers and codes, and accept names with accents, hyphens and apostrophes; reject only values that are wrong or ambiguous | Restrict names to A-Z, reject a phone number typed with spaces, or fail a pasted value because of a trailing space | Medium |
| Forms | Never Block Paste | All | Allow paste in every input and textarea, including password, email confirmation and verification code fields; validate the pasted value instead | Cancel paste or drop events to force manual typing | Medium |
| Feedback | Persistent Error Messages | All | Keep each error visible until its cause is resolved or the user dismisses it; show form and action errors inline or in a dismissible alert; auto-dismiss only non-critical confirmations that can also be found elsewhere | Report a failed save, payment or validation only in a toast that closes after a few seconds | High |
| Feedback | Actionable Error Messages | All | State what went wrong and how to fix it; reuse the wording of the field label and give the expected format; use the same text inline and in the error summary | Show raw error codes, stack traces or server messages, blame the user, or use vague text such as 'Invalid' or 'This field is required' | Medium |
| Interaction | Undo for Reversible Actions | All | Apply routine reversible actions such as archive, move or remove at once and offer Undo; keep confirmation for actions that cannot be undone and make it specific with the item name and buttons such as Delete file and Keep file | Ask 'Are you sure?' with Yes and No before every routine action, or delete permanently with neither confirmation nor Undo | Medium |
| Accessibility | Modal Dialog Focus | Web | Move focus into the dialog when it opens; keep Tab and Shift+Tab inside while it is open; close it with Escape; on close return focus to the control that opened it, or to the next logical element if that control is gone | Leave focus on the page behind the dialog, let Tab reach background content, or reset focus to the top of the page after closing | High |
