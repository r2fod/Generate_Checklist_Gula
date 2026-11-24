# Estilo: Predictive Analytics
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `predictive-analytics`

- **Palabras clave**: Forecast lines, confidence intervals, trend projections, scenario modeling, AI-driven insights, anomaly detection visualization
- **Colores primarios**: Forecast line color (distinct from actual), confidence interval shading, anomaly highlight (red alert), trend colors
- **Colores secundarios**: High confidence (dark color), low confidence (light color), anomaly colors (red/orange), normal trend (green/blue)
- **Efectos y animación**: Forecast line animation on draw, confidence band fade-in, anomaly pulse alert, smoothing function animations
- **Ideal para**: Forecasting dashboards, anomaly detection systems, trend prediction dashboards, AI-powered analytics, budget planning
- **No usar en**: Historical-only dashboards, simple reporting, real-time operational dashboards
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a predictive analytics dashboard. Use: forecast lines (dashed), confidence intervals (shaded bands), trend projections, anomaly highlights, scenario toggles, AI insight cards, probability indicators.
- **Palabras CSS**: stroke-dasharray for forecast lines, fill-opacity for confidence bands, anomaly markers (circles), tooltip for predictions, toggle switches for scenarios, gradient for probability
- **Checklist de implementación**: ☐ Forecast line distinct, ☐ Confidence bands visible, ☐ Anomalies highlighted, ☐ Scenarios switchable, ☐ Predictions dated, ☐ Accuracy shown
- **Variables de diseño**: --forecast-dash: 5 5, --confidence-opacity: 0.2, --anomaly-color: #F59E0B, --prediction-color: #8B5CF6, --scenario-toggle-width: 48px, --ai-accent: #6366F1
- **Estado**: supplemental
