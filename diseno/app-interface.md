# Guías de interfaz de app
> Fuente: UI UX Pro Max (MIT).

| Categoría | Asunto | Plataforma | Hacer | No hacer | Severidad |
|---|---|---|---|---|---|
| Accessibility | Icon Button Labels | iOS/Android/React Native | Set accessibilityLabel or label prop on icon buttons | Icon buttons without accessible names | Critical |
| Accessibility | Form Control Labels | iOS/Android/React Native | Pair Text label with input and set accessibilityLabel | Inputs with placeholder only | Critical |
| Accessibility | Role & Traits | iOS/Android/React Native | Use accessibilityRole/button/link/checkbox etc. | Rely on generic views with no roles | High |
| Accessibility | Dynamic Updates | iOS/Android/React Native | Use accessibilityLiveRegion or announceForAccessibility | Update text silently with no announcement | Medium |
| Accessibility | Decorative Icons | iOS/Android/React Native | Mark decorative icons as not accessible | Have screen reader read every icon | Medium |
| Touch | Touch Target Size | iOS/Android/React Native | Select 44pt for iOS and 48dp for Android at runtime; evaluate web targets separately against WCAG 2.5.8 and its exceptions | Collapse iOS 44pt, Android 48dp, and web 24 CSS px into one cross-platform number | Critical |
| Touch | Touch Spacing | iOS/Android/React Native | Keep at least 8dp spacing between touchables | Cluster many buttons with no gap | Medium |
| Touch | Gesture Conflicts | iOS/Android/React Native | Reserve horizontal swipes for carousels | Full-screen custom swipe conflicting with back | High |
| Navigation | Back Behavior | iOS/Android/React Native | Use navigation.goBack and keep screen state | Reset stack or exit app unexpectedly | Critical |
| Navigation | Bottom Tabs | iOS/Android/React Native | Use 3–5 tabs and move extras to More/Settings | Overloaded tab bar with many icons | Medium |
| Navigation | Modal Escape | iOS/Android/React Native | Provide close button and swipe-down where platform expects | Trapping users in modal with no obvious exit | High |
| State | Preserve Screen State | iOS/Android/React Native | Keep components mounted or persist state | Reset list scroll and form inputs on every visit | Medium |
| Feedback | Loading Indicators | iOS/Android/React Native | Use ActivityIndicator or skeleton for >300ms operations | Leave button and screen frozen | High |
| Feedback | Success Feedback | iOS/Android/React Native | Show toast/checkmark or banner | Complete actions silently with no confirmation | Medium |
| Feedback | Error Feedback | iOS/Android/React Native | input-level error + summary banner | Only change border color with no explanation | High |
| Forms | Inline Validation | iOS/Android/React Native | Validate onBlur and onSubmit | Validate on every keystroke causing jank | Medium |
| Forms | Keyboard Type | iOS/Android/React Native | Match email/tel/number/search types | Use default keyboard for all inputs | Medium |
| Forms | Auto Focus & Next | iOS/Android/React Native | Use onSubmitEditing to focus next input | Force users to tap each field manually | Low |
| Forms | Password Visibility | iOS/Android/React Native | Provide Show/Hide icon toggling secureTextEntry | Force users to type blind with no option | Medium |
| Performance | Virtualize Long Lists | iOS/Android/React Native | Use keyExtractor and initialNumToRender appropriately | Render hundreds of items with ScrollView | High |
| Performance | Image Size & Cache | iOS/Android/React Native | Use Image component with proper resizeMode and caching | Load full-resolution images everywhere | Medium |
| Performance | Debounce High-Freq Events | iOS/Android/React Native | Wrap handlers with debounce/throttle | Run heavy logic on every event | Medium |
| Animation | Duration & Easing | iOS/Android/React Native | Use ease-out for enter/ease-in for exit | Use long or linear animations for core UI | Medium |
| Animation | Respect Reduced Motion | iOS/Android/React Native | Check reduceMotionEnabled and simplify animations | Ignore user motion preferences | Critical |
| Animation | Limited Continuous Motion | iOS/Android/React Native | Use looping only where necessary | Keep decorative elements looping forever | Medium |
| Typography | Base Font Size | iOS/Android/React Native | Use platform fontScale and at least 14–16pt base | Render critical text below 12pt | High |
| Typography | Dynamic Type Support | iOS/Android/React Native | Set allowFontScaling and test large text | Disable scaling on all text globally | High |
| Safe Areas | Safe Area Insets | iOS/Android/React Native | Wrap screens in SafeAreaView or apply insets | Place tappable content under system bars | High |
| Theming | Light/Dark Contrast | iOS/Android/React Native | Use semantic tokens and test both themes | Reuse light-theme grays directly in dark mode | High |
| Anti-Pattern | No Gesture-Only Actions | iOS/Android/React Native | Provide visible buttons in addition to gestures | Rely on swipe/shake only with no UI affordance | Critical |
| Accessibility | Dragging Alternatives | iOS/Android/React Native | Provide named Move up/down buttons or a position menu beside drag handles; route iOS and Android behavior through the runtime platform adapter | Make drag, swipe, or a web-only pointer handler the only way to reorder native content | High |
| Forms | Authentication Reuse | iOS/Android/React Native | Support password managers passkeys paste and prefilled confirmed values | Force users to retype credentials or the same data in one flow | Critical |
