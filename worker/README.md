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
   que venga de ejemplo, pega entero el contenido de **`worker/pegar.js`** y *Deploy*.

   > **Ojo: se pega `pegar.js`, no `index.js`.** `index.js` es la fuente, la que se lee y
   > se edita; `pegar.js` es esa misma fuente con las reglas de revisión de la app metidas
   > dentro, que es lo que necesita el repaso de la noche. Se genera con
   > `npm run worker:build` y se regenera cada vez que se toque el Worker o la revisión.

4. **Los secretos** — en el Worker: *Settings* → *Variables and Secrets*. Añade:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `GEMINI_API_KEY` | Secret | La clave del paso 1 |
   | `FIREBASE_API_KEY` | Secret | La `apiKey` de la config de Firebase de la app (ya es pública, pero se guarda aquí igual) |
   | `ORIGENES` | Text | `https://TUUSUARIO.github.io,http://localhost:5173` |

   Opcionales, si la cuota gratis de una sola cuenta de Gemini se os queda corta:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `GEMINI_API_KEY_2` | Secret | Clave de una SEGUNDA cuenta de Google, con su propia cuota gratis aparte |
   | `GEMINI_API_KEY_3` | Secret | Clave de una TERCERA cuenta, igual |

   Si `GEMINI_API_KEY` se queda sin cuota (Google contesta 429), el Worker prueba solo
   con estas antes de rendirse — no hace falta tocar nada más. Cada una se saca igual
   que la primera, en <https://aistudio.google.com/apikey>, iniciando sesión con esa
   otra cuenta.

   Opcionales, si algún día quieres otro motor:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Secret | Claude. **Ojo: la suscripción de Claude no vale, la API se paga aparte por token.** |
   | `OPENAI_API_KEY` | Secret | OpenAI |
   | `PROVEEDOR_POR_DEFECTO` | Text | `gemini` (por defecto), `claude`, `openai` o `compatible` |
   | `GEMINI_MODEL` / `ANTHROPIC_MODEL` / `OPENAI_MODEL` | Text | Para fijar otro modelo |

   > **Si sale un 404 diciendo que el modelo "is no longer available"**, Google lo ha
   > retirado. No hay que tocar el código: se añade `GEMINI_MODEL` con el nombre que
   > diga el propio error y se despliega. Pasa cada pocos meses.

   Opcionales, para la voz natural (pestaña Humano — ver más abajo):

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `GEMINI_TTS_MODEL` | Text | Para fijar otro modelo de voz, el día que Google retire el de por defecto (mismo motivo que `GEMINI_MODEL`, arriba) |
   | `GEMINI_TTS_VOZ` | Text | El nombre de la voz de Gemini (`Kore` por defecto). Google tiene varias, todas en español |

## Usar cualquier otro modelo

El proveedor `compatible` es un hueco abierto: casi todo el mundo habla hoy el mismo
dialecto que OpenAI, así que con una dirección y una clave se puede apuntar a lo que sea.

| Nombre | Tipo | Qué es |
|---|---|---|
| `COMPATIBLE_URL` | Text | La dirección base de la API |
| `COMPATIBLE_API_KEY` | Secret | La clave de ese servicio |
| `COMPATIBLE_MODEL` | Text | El modelo exacto |

Ejemplos que funcionan tal cual:

| Servicio | `COMPATIBLE_URL` | Para qué |
|---|---|---|
| **OpenRouter** | `https://openrouter.ai/api/v1` | Cientos de modelos con una sola cuenta y una sola clave. Es la opción si quieres probar varios. |
| **Groq** | `https://api.groq.com/openai/v1` | Muy rápido y con capa gratuita |
| **DeepSeek** | `https://api.deepseek.com/v1` | Barato |
| **Mistral** | `https://api.mistral.ai/v1` | Europeo |
| **Ollama** | `http://TU-IP:11434/v1` | Un modelo en un ordenador tuyo. Necesita que ese ordenador esté encendido y sea accesible desde fuera — no vale `localhost`, porque el Worker no corre en tu máquina. |

Cambiar de modelo es cambiar estas tres variables. No hay que tocar la app.

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

## Voz más natural en la pestaña Humano (automático)

Si ya tienes `GEMINI_API_KEY` puesta (el paso 1), esto funciona solo: la pestaña Humano
intenta primero una voz de Gemini —bastante más natural que la del navegador— y si no
hay conexión, tarda demasiado (más de 4 segundos) o falla por lo que sea, sigue con la
voz del propio navegador sin que se note la espera. No hay que activar nada ni pegar
ningún secreto nuevo; para desactivarlo del todo bastaría con no tener `GEMINI_API_KEY`.

## El repaso de la noche (opcional)

Las reglas de "esto no cuadra" ya existen y ya avisan… pero solo cuando alguien abre la
app. Y el fallo caro de este oficio no es calcular mal: es que un campo se quede sin
poner y nadie lo mire hasta que el camión está cargado. Si nadie abre la app en toda la
semana, nadie lo mira.

Con esto, el Worker lo mira solo cada noche y deja escrito el resultado; la app lo enseña
en *Cerebro* la próxima vez que alguien entre. **No usa el modelo**: son las mismas reglas
de siempre, así que cuesta cero tokens y da igual que fallen los proveedores.

1. **Una cuenta para el robot** — en Firebase: *Authentication* → *Users* → *Add user*.
   Un correo cualquiera (por ejemplo `robot@gula.local`) y una contraseña larga. Es una
   cuenta normal del equipo: las reglas de Firestore ya la aceptan, no hay que tocarlas.

2. **Tres variables más** en el Worker:

   | Nombre | Tipo | Qué es |
   |---|---|---|
   | `FIREBASE_PROJECT_ID` | Text | `gula-checklist` |
   | `ROBOT_EMAIL` | Text | El correo del paso 1 |
   | `ROBOT_PASSWORD` | Secret | Su contraseña |

3. **El cron** — en el Worker: *Settings* → *Triggers* → *Cron Triggers* → *Add*.
   Pon `0 5 * * *` (las 5 de la mañana UTC). Está en el plan gratuito.

4. **Probarlo sin esperar a la noche** — abre `https://TU-WORKER.workers.dev/__repaso`
   desde la app con sesión iniciada. Contesta con lo que ha encontrado, o con el motivo
   exacto si algo falta.

Si falla, no reintenta: se apunta en los logs de Cloudflare y vuelve mañana. Un reintento
en bucle contra una contraseña mal puesta solo gasta cuota.

## Lo que NO puede hacer el asistente

Lo que escribe pasa por un nivel de permiso que se elige en los ajustes: *solo consultar*,
*con permiso* (pide confirmación) o *confianza*. Y hay ocho herramientas que **no se
exponen en ningún nivel**, tampoco en confianza: marcar cargado, marcar preparado, marcar
vuelto, apuntar roturas, renombrar un item, renombrar una categoría, borrar un evento y
borrar un archivo. La identidad de cada item es `categoría::etiqueta`, así que tocar eso
por su cuenta borraría el trabajo de quien está cargando el camión.
