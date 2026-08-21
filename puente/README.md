# El puente con Claude Code

Hace que el asistente vaya con **tu suscripción de Claude**, sin claves ni saldo.

Es lo mismo que hace OpenHuman: como es una app de escritorio, puede ejecutar el CLI de
Claude Code que tienes instalado. Tu app es una página web, así que hace falta esta pieza
en medio — un servidor pequeñito en tu ordenador que hace de proxy y por dentro llama al
CLI.

## Antes de ilusionarse

| | |
|---|---|
| **Solo en este ordenador** | En el móvil del equipo no hay nada de esto |
| **Solo con la terminal abierta** | Si la cierras, se acabó el asistente por aquí |
| **Solo para ti** | Tu suscripción es de una persona. Si el equipo lo va a usar, va por el Worker con Gemini |
| **Herramientas por texto** | El CLI no acepta un catálogo de fuera, así que se le pide el JSON a mano. Funciona, pero alguna vez contestará algo ilegible — y entonces lo dice, no se inventa nada |

Para el día a día del equipo, **el Worker con Gemini sigue siendo lo bueno**: va en
cualquier móvil, sin que tú tengas nada encendido. Esto es para cuando estás en el
ordenador y quieres una respuesta mejor.

## Ponerlo en marcha

1. **Claude Code instalado y con sesión.** Compruébalo con:
   ```bash
   claude --version
   ```
   Si no está: <https://claude.com/claude-code>

2. **Arranca el puente** desde la carpeta del proyecto:
   ```bash
   node puente/servidor.mjs
   ```
   Tiene que decir `Puente de Claude Code escuchando en http://localhost:8787`.

3. **En la app**: Asistente → engranaje → *Dirección del proxy*:
   ```
   http://localhost:8787
   ```

4. Pregunta lo que quieras. Para volver a Gemini, vuelve a poner la dirección del Worker.

## Cambiar el puerto o los orígenes

```bash
PUERTO=9000 node puente/servidor.mjs
ORIGENES="https://r2fod.github.io,http://localhost:5173" node puente/servidor.mjs
```

## Si algo falla

| Mensaje | Qué pasa |
|---|---|
| `No encuentro el comando 'claude'` | Claude Code no está instalado, o no está en el PATH |
| `El CLI ha contestado algo que no he sabido leer` | Le ha dado por explicarse en vez de contestar JSON. Vuelve a preguntar; si es constante, la pregunta es demasiado abierta |
| La app dice *"El asistente ha fallado"* | El puente no está arrancado, o cerraste la terminal |
| Tarda mucho | Normal: el CLI arranca de cero en cada pregunta. Gemini es bastante más rápido |

Escucha solo en `127.0.0.1` a propósito: abierto a toda la red, cualquiera de la misma
wifi podría gastar tu suscripción sin que te enteres.
