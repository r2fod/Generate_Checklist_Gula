# Generate Checklist Gula

Checklist de material por evento para **Gula Catering**: qué hay que cargar en el
camión para cada evento (bodas, comuniones, corporativos, cumpleaños, rodajes).

> Si vas a trabajar en este código, lee antes [`CONTEXTO.md`](CONTEXTO.md) —cómo
> funciona, qué está pendiente y qué no se toca— y [`CLAUDE.md`](CLAUDE.md), las
> reglas de la casa.

## Las tres apps

Tres PWAs instalables, cada una en su carpeta (con ámbitos por separado: una app
no se puede anidar dentro de otra en el navegador):

| Ruta | Qué es | Acceso |
|---|---|---|
| `/checklist/` | La checklist por evento (la app principal) | Login del equipo |
| `/calendario/` | El calendario del equipo | Login (o enlace de solo-lectura por código) |
| `/formulario/` | El formulario de la oficina (menú, barra, equipamiento) | Sin login, por código |

Las tres comparten los cálculos (`src/calculos.js`, `src/checklist-generadores.js`,
…) y una única puerta a la nube (`src/nube.js`).

## El asistente

La checklist y el calendario llevan un asistente de IA generativa (`src/asistente/`):
un modelo por un **Cloudflare Worker** que hace de proxy —las claves API son
secretos del Worker, nunca viven en el bundle—, con herramientas, permisos
graduados (consultar / permiso / confianza), memoria propia, auditoría de negocio
y calibración de ratios con los eventos reales. Cómo se monta el Worker:
`worker/README.md`.

## Comandos

```
npm install
npm run dev            # desarrollo
npm run test:rapido    # tipos + cálculos + asistente + build + sincronización (~1 min)
npm run test           # lo anterior + batería de navegador (~45 min)
npm run lint           # oxlint
npm run tipos          # tsc --checkJs sobre los módulos tipados
npm run medir          # rendimiento: cuentas puras (+ navegador si hay chromium)
npm run worker:build   # regenera worker/pegar.js (el CI falla si difiere de la fuente)
```

## La nube (Firestore)

Un único proyecto. Las reglas viven en `firestore.rules` y se despliegan con
`npm run reglas:deploy` —no se pegan a mano. Qué colección vive dónde y por qué:
`CONTEXTO.md`.

## Las pruebas

Cuatro baterías en `src/__tests__/`, y casi todas existen porque pasó un fallo:
cálculos (con husos horarios incómodos para cazar bugs de fechas), asistente
(herramientas, permisos, enrutado de proveedores, salud), sincronización (Firestore
con las mismas reglas simuladas) y un barrido de navegador a 9 anchos × 2 temas ×
10 pantallas. Una prueba por comportamiento, con el porqué en su texto.
