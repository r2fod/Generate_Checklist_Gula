# Estilo: Real-Time Monitoring
> Tipo: BI/Analytics · Origen: 2020s Modern · Complejidad: Medium · ID: `real-time-monitoring`

- **Palabras clave**: Live data updates, status indicators, alert notifications, streaming data visualization, active monitoring, streaming charts
- **Colores primarios**: Alert colors: critical (red #FF0000), warning (orange #FFA500), normal (green #22C55E), updating (blue animation)
- **Colores secundarios**: Status indicator colors, chart line colors varying by metric, streaming data highlight colors
- **Efectos y animación**: Real-time chart animations, alert pulse/glow, status indicator blink animation, smooth data stream updates, loading effect
- **Ideal para**: System monitoring dashboards, DevOps dashboards, real-time analytics, stock market dashboards, live event tracking
- **No usar en**: Historical analysis, long-term trend reports, archived data dashboards
- **Modo claro**: supported
- **Modo oscuro**: supported
- **Rendimiento**: cost:low|drivers:none
- **Accesibilidad**: risk:low|requires:contrast-text-4.5,keyboard,visible-focus,reduced-motion
- **Móvil**: conditional
- **Conversión**: ✗ Not applicable
- **Palabras para prompt**: Design a real-time monitoring dashboard. Use: live status indicators (pulsing), streaming charts, alert notifications, connection status, auto-refresh indicators, critical alerts prominent, system health overview.
- **Palabras CSS**: animation: pulse for live, WebSocket for streaming, position: fixed for alerts, status-dot with animation, chart real-time updates, notification toast, connection indicator
- **Checklist de implementación**: ☐ Live updates working, ☐ Alert sounds optional, ☐ Connection status shown, ☐ Auto-refresh indicated, ☐ Critical alerts prominent, ☐ Offline fallback
- **Variables de diseño**: --pulse-animation: pulse 2s infinite, --alert-z-index: 1000, --live-indicator: #22C55E, --critical-color: #DC2626, --update-interval: 5s, --toast-duration: 5s
- **Alias**: Real-Time|Real-Time Monitor
- **Estado**: supplemental
