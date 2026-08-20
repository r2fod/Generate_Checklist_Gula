# Generate_Checklist_Gula — contexto para retomar

App interna de **Gula Catering** para montar la checklist de material de cada evento.
React 19 + Vite + Firebase Firestore, publicada en GitHub Pages.

- Rama `main` · Firebase: `gula-checklist`

## Reglas del dueño (no negociables)

1. **Todo en español**, código y comentarios.
2. **Sin romper nada.** Está en producción y se usa cargando camiones.
3. **Que no se quiten los checks hechos de los eventos.**
4. **Responsive, sobre todo móvil** (320/360/390/412/480/768/1024/1280/1920).
5. **El repositorio es público.** Nada que identifique a una persona en el código: ni
   clientes, ni personal, ni teléfonos, ni €/pax. Eso vive en Firestore. En pruebas,
   nombres inventados.
6. Respuestas **breves**.

## Comandos

```
npm run lint    # oxlint (warnings viejos de catch (e): estilo de la casa)
npm run test    # calculos → build → sincronizacion → app (navegador)
npm run deploy  # predeploy = test, no publica en rojo
```

Estado: **224 comprobaciones unitarias + 693 de navegador, 0 fallos.**

### Proceso (costó dos deploys rotos y una pérdida de trabajo)

- **No editar archivos mientras corre `test` o `deploy`**: `deploy` publica lo que haya
  en `dist/` AL TERMINAR, así que reconstruir por medio publica código sin probar.
- **Una sola cosa a la vez**: los dos usan el puerto 4178.
- **Commit y push de cada pieza en cuanto está verde.** El contenedor se recicla y lo no
  subido se pierde (ya pasó).
- Matar procesos por PID; `pkill -f` se mata a sí mismo.

## Arquitectura

Tres apps, cada una en SU carpeta (los ámbitos de PWA no pueden anidarse):
`checklist/` (login) · `formulario/` (sin login, entra por código) · `calendario/`
(login salvo enlace compartido).

### Firestore

```
indice/evt_<slug>-<hash>  archivo de checklists (un doc por evento)
indice/eventosGuardados   doc antiguo: SOLO se lee, foto congelada de la migración
indice/calendario         apuntes originales intactos + los dos códigos del calendario
indice/precios            precios corregidos (solo lo cambiado)
indice/ratios             pax por camarero por tipo (solo lo cambiado)
calendario/<codigo>       el calendario real     — enlace "?cal="
calendario/<ver>          copia de solo lectura  — enlace "?ver=" (OTRO documento)
publico/<codigo>          próximos eventos que ve la oficina
envios/<id>               lo que manda la oficina
```

`firestore.rules` **se pega a mano en la consola**: no hay `firebase.json` y no se
despliega solo. Hoy consola y repo coinciden.

### Conceptos que hay que respetar

- Identidad de un item = `${categoría}::${labelOriginal}`. Cambiar un label
  **destruye los checks del usuario**.
- Identidad de un apunte = `${fecha}_${slug}`.
- El estado se lee con `estadoInicial.X ?? por-defecto`: un estado **parcial** es válido.
- Abrir un evento = escribir `gula_checklist_estado` y recargar la página.

### La cadena de datos

```
CALENDARIO          →  CHECKLIST (archivo)  →  FORMULARIO      →  CHECKLIST
nombre, tipo, día,     creada sola a 14 días   menú, barra,       material
hora, sitio, pax       marcada "sinConfigurar" equipamiento…
```

**La lista de eventos que ve la oficina sale del ARCHIVO DE CHECKLISTS, no del
calendario.** Por eso la checklist se crea pronto: si no existe, la oficina la escribe a
mano y llega duplicada.

## Lo hecho

- Calendario en colección propia con **dos enlaces**. El de mirar es otro documento y no
  se lee de vuelta, así que no puede tocar el real. Los códigos viven en `indice/`, que
  pide sesión: del enlace de ver no se pasa al de editar.
- **Checklists creadas solas** a 14 días al abrir la app, marcadas `sinConfigurar`, con
  aviso en pantalla y etiqueta en el archivo. Se apaga al aplicar el envío del formulario.
- Enlaces rotos que se curan: al borrar una checklist su apunte vuelve a contar como
  pendiente. Lo pasado no se resucita.
- Precios y ratios en Firestore, subiendo **solo lo cambiado**. El aviso "ratio sin
  comprobar" se apaga cuando alguien pone el suyo.
- Responsive medido a 9 anchos con el helper `revisaCaja()` de la batería.
- Logo 67 → 11 kB (WebP 450px q80).

### Tres guardias que NO se pueden tocar (las cazaron las pruebas)

1. **Esperar a `archivoListo`** antes de crear checklists. Mientras el archivo baja de la
   nube un evento no consta, y se crearía una encima pisando la buena con sus checks.
2. **Un apunte sin `id` no genera enlace**: `undefined` casa con todos los que tampoco lo
   tengan y marca media lista con el nombre equivocado.
3. **Marcar los apuntes en UNA sola escritura**: tres seguidas parten de la misma foto y
   solo sobrevive la última.

## Pendiente

1. **Del dueño, en la app** (necesita su sesión): un apunte a **250 pax**; otro del **9 al
   10 de octubre** con el campo *Hasta*, porque aún no se sabe cuál de los dos días.
2. **Ratios de cumpleaños y producción**: el panel existe, falta medir un evento real.
3. Nada más en la lista.

## Decidido NO hacer (y por qué)

- **Partir `App.jsx` (3.979 líneas) e `index.css` (5.806).** Mucho riesgo, ganancia que no
  ve nadie. Ahí vive el estado entero de la checklist.
- **Optimizar React** (0 `useCallback`, `ModalModoCarga` sin `useMemo`): **nada medido**.
  Solo con un caso real de lentitud delante.
- **Partir el CSS**: son 18 kB comprimidos, y las clases del tramo final están compartidas
  con la checklist (`btn`, `form-input`, `link-roto`, `envio-*`…). Partirlo rompe el diseño.
- **Firebase**: ya carga con `import()` dinámico en los tres sitios. No hay nada que ganar.

## Rendimiento real (4G, CPU ×4, con gzip como sirve GitHub Pages)

| App | Red | Primer pintado |
|---|---|---|
| Checklist | 167 kB | 0,76 s |
| Calendario | 150 kB | 0,66 s |
| Formulario | 101 kB | 0,65 s |

## Cómo probar lo que está detrás del login

`pruebas/calendario.html` monta los mismos componentes con datos inventados y sin nube:
`?vacio=1`, `?pantalla=1`, `?solover=1`, `?promover=1`.

Lo que vive dentro de `App.jsx` se prueba **simulando el arranque** en
`sincronizacion.test.mjs`, contra un Firestore en memoria con las mismas reglas.

## Recomendación actual

**Parar de añadir y usarlo una semana.** Lo nuevo está probado contra datos inventados,
no contra un septiembre con tres bodas el mismo día.
