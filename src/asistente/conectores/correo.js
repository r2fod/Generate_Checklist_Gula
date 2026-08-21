// ─── CONECTOR: CORREO ─────────────────────────────────────────────────────────
// Está aquí a medias A PROPÓSITO, y es lo más útil de todo el fichero: es la plantilla.
// Cuando quieras conectar el correo de verdad —para que el asistente lea los mensajes de
// los clientes y saque de ahí los datos del evento— lo que hay que rellenar es esto, y
// nada más. El resto de la app ya está preparado.
//
// Qué falta para encenderlo, sin adornos:
//
//   1. OAuth de Google. El permiso para leer un buzón no se puede pedir desde una página
//      estática: hace falta un servidor que guarde el "refresh token" y lo cambie por
//      uno de acceso. Ese servidor ya existe —el mismo Worker del asistente— y ahí es
//      donde irían dos rutas más: /correo/entrar y /correo/leer.
//
//   2. Decidir qué se lee. Leer el buzón entero es a la vez caro e imprudente. Lo
//      sensato es una etiqueta ("Eventos") o un remitente concreto, y solo lo nuevo.
//
//   3. Confirmación en pantalla para todo lo que SALGA. Leer puede ser automático;
//      mandar un correo en nombre de la empresa, nunca. Por eso escribeFuera va marcado.
//
// Mientras "necesita" no esté configurado, este conector NO existe para el asistente:
// no sale en el catálogo, el modelo no lo llama y no falla en cada pregunta. Se enciende
// solo cuando hay con qué.
import { registrarConector } from "../conectores.js";

export default registrarConector({
  id: "correo",
  nombre: "Correo",
  descripcion: "Leer los correos de clientes para sacar de ahí los datos de un evento. Sin configurar todavía.",
  escribeFuera: true,
  // Sin estos dos, apagado. La cuenta dice de quién es el buzón; la etiqueta, qué parte
  // de él se mira (leerlo entero sería caro e imprudente).
  necesita: ["cuenta", "etiqueta"],
  herramientas: {
    buscar_correos: {
      datos: true,
      esquema: {
        description: "Busca correos recientes de clientes sobre eventos: quién escribe, cuándo y qué pide.",
        parameters: {
          type: "object",
          properties: {
            texto: { type: "string", description: "Qué buscar: un nombre, un sitio, una fecha." },
            desde: { type: "string", description: "AAAA-MM-DD." },
          },
        },
      },
      // El día que se implemente, esto llama al Worker con el token del conector y
      // devuelve los correos ya recortados. Hoy dice la verdad: que no está.
      corre: () => ({
        error: "El correo todavía no está conectado. Hace falta dar permiso a la cuenta desde los ajustes del asistente.",
      }),
    },
  },
});
