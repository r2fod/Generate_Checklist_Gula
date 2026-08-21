# El proxy del asistente

La app es un sitio estático en GitHub Pages y este repositorio es público: **una clave de
API metida en el código la lee cualquiera y la gasta cualquiera**. Este Worker existe
para que las claves vivan fuera del repositorio.

No ejecuta ninguna herramienta. Devuelve "el modelo quiere llamar a esto" y es la app la
que lo ejecuta en el navegador con sus propios datos, así que el modelo nunca ve
Firestore.

## Montarlo (una vez, ~10 minutos)

1. **Clave de Gemini** — <https://aistudio.google.com/apikey>. Es gratis y no hace falta
   tarjeta. Guárdala, no la pegues en ningún fichero del repositorio.

2. **Cuenta de Cloudflare** — <https://dash.cloudflare.com/sign-up>. El plan gratuito da
   100.000 peticiones al día, de sobra.

3. **Crear el Worker** — en el panel: *Workers & Pages* → *Create* → *Worker*. Ponle un
   nombre (por ejemplo `asistente-gula`) y dale a *Deploy*. Luego *Edit code*, borra lo
   que venga de ejemplo, pega entero el contenido de `worker/index.js` y *Deploy*.

4. **Los secretos** — en el Worker: *Settings* → *Variables and Secrets*. Añade:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `GEMINI_API_KEY` | Secret | La clave del paso 1 |
   | `FIREBASE_API_KEY` | Secret | La `apiKey` de la config de Firebase de la app (ya es pública, pero se guarda aquí igual) |
   | `ORIGENES` | Text | `https://TUUSUARIO.github.io,http://localhost:5173` |

   Opcionales, si algún día quieres otro motor:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Secret | Claude. **Ojo: la suscripción de Claude no vale, la API se paga aparte por token.** |
   | `OPENAI_API_KEY` | Secret | OpenAI |
   | `PROVEEDOR_POR_DEFECTO` | Text | `gemini` (por defecto), `claude` u `openai` |
   | `GEMINI_MODEL` / `ANTHROPIC_MODEL` / `OPENAI_MODEL` | Text | Para fijar otro modelo |

5. **Decirle a la app dónde está** — copia la URL del Worker
   (`https://asistente-gula.TUCUENTA.workers.dev`) y pégala en el ajuste del asistente
   dentro de la app.

## Lo que protege

- **Sesión obligatoria.** El Worker comprueba contra Firebase que quien pregunta tiene
  sesión del equipo. Sin eso, quien descubra la URL se come la cuota.
- **Origen cerrado.** Solo contesta a los sitios que pongas en `ORIGENES`.
- **OpenAI no ve datos de clientes.** Sus tokens gratuitos se pagan compartiendo lo que
  le llega para entrenar, así que la app solo le ofrece las herramientas de calcular
  —hielo, bebida, personal—, nunca las que devuelven nombres, fechas o sitios. Y si aun
  así pidiera una, el cliente la rechaza.

## Lo que NO puede hacer el asistente

Ninguna herramienta escribe nada: de momento solo consulta. Y cuando se añadan las de
escribir, cuatro no se expondrán nunca —marcar cargado, marcar preparado, marcar vuelto
y apuntar roturas— porque la identidad de cada item es `categoría::etiqueta` y tocar eso
por su cuenta borraría el trabajo de quien está cargando el camión.
