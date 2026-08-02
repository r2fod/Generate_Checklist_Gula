// ─── PUERTA DE ACCESO ──────────────────────────────────────────────────────────
// Decide si se muestra la app o la pantalla de login:
//   · Sin acceso configurado (firebaseConfig = null) → la app funciona como siempre.
//   · Link de un evento (?evento=id o ?c=...) → acceso directo a ese evento SIN login
//     (es el link que se manda al móvil del personal).
//   · Resto de casos → hay que iniciar sesión con el correo/contraseña del equipo.
import { useState, useEffect } from "react";
import App from "./App.jsx";
import Formulario from "./formulario/Formulario.jsx";
import { accesoActivo, iniciarSesion, cerrarSesion, observarSesion } from "./auth.js";
import logoGula from "./assets/gula-logo.png";

function esLinkDeEvento() {
  const p = new URLSearchParams(window.location.search);
  return !!(p.get("evento") || p.get("c"));
}

// El link que se le pasa a la oficina: ?enviar=<código>. Abre SOLO el formulario —
// desde ahí no se llega a la checklist, ni a la configuración, ni a los eventos.
//
// El código se recuerda en ESTE navegador porque si no, instalar la app desde el
// formulario no serviría de nada: el icono abre la dirección de siempre (sin
// ?enviar=) y quien lo instaló se encontraría la pantalla de login del equipo en
// vez de su formulario. Con el código guardado, el icono abre lo que instaló.
const CLAVE_CODIGO = "gula_formulario_codigo";

function codigoEnLaUrl() {
  const dela = new URLSearchParams(window.location.search).get("enviar") || "";
  if (dela) {
    try { localStorage.setItem(CLAVE_CODIGO, dela); } catch (e) { /* en privado no se guarda, da igual */ }
  }
  return dela;
}

function codigoGuardado() {
  try { return localStorage.getItem(CLAVE_CODIGO) || ""; } catch (e) { return ""; }
}

// ¿Se está abriendo desde el icono instalado y no desde el navegador? Es la única
// situación en la que el código guardado manda: el icono abre la dirección de siempre
// (sin ?enviar=) y quien lo instaló espera SU formulario, no el login del equipo.
// En una pestaña normal el código guardado se ignora, así que abrir el enlace una vez
// para probarlo no deja el navegador atrapado en el formulario.
function abiertaComoApp() {
  try {
    if (window.navigator.standalone) return true;
    return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
  } catch (e) { return false; }
}

// Traduce los códigos de error de Firebase a un mensaje claro en español
function mensajeError(codigo) {
  switch (codigo) {
    case "auth/invalid-email":
      return "El correo no tiene un formato válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

function PantallaLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await iniciarSesion(email.trim(), password);
      // El cambio de sesión lo detecta observarSesion (abajo) y monta la app sola:
      // no hace falta hacer nada más aquí.
    } catch (err) {
      setError(mensajeError(err && err.code));
      setCargando(false);
    }
  };

  return (
    <div className="login-pantalla">
      <div className="login-fondo" aria-hidden="true">
        <span className="login-blob login-blob-1" />
        <span className="login-blob login-blob-2" />
      </div>

      <form className="login-tarjeta" onSubmit={entrar}>
        <div className="login-logo-wrap">
          <img src={logoGula} alt="Gula" className="login-logo" />
        </div>
        <p className="login-sub">Generador de checklist · Acceso del equipo</p>

        <label className="login-campo">
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="equipo@gula.com"
            required
          />
        </label>

        <label className="login-campo">
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-boton" type="submit" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function Acceso() {
  // El formulario de oficina va por su cuenta: ni login ni app.
  //   · Con ?enviar= en la dirección manda siempre, tengas sesión o no: es como se
  //     abre el enlace, y también como lo compruebas tú desde la app.
  //   · Sin él, vale el código guardado de la última vez, pero SOLO si se ha abierto
  //     desde el icono instalado: es lo que hace que la app que instaló la oficina
  //     abra su formulario. En una pestaña normal se ignora, así que abrir el enlace
  //     para probarlo no deja el navegador atrapado.
  const [codigoUrl] = useState(codigoEnLaUrl);
  const [codigoRecordado] = useState(() => ((esLinkDeEvento() || !abiertaComoApp()) ? "" : codigoGuardado()));
  // omitirLogin se fija una sola vez al arrancar: si es un link de evento o no hay
  // acceso configurado, nunca se pide login.
  const [omitirLogin] = useState(() => !accesoActivo() || esLinkDeEvento());
  const [sesion, setSesion] = useState({ cargando: !omitirLogin, usuario: null });

  useEffect(() => {
    if (omitirLogin) return;
    const unsub = observarSesion((usuario) => setSesion({ cargando: false, usuario }));
    return unsub;
  }, [omitirLogin]);

  if (codigoUrl) return <Formulario codigo={codigoUrl} />;

  if (omitirLogin) return <App />;

  if (sesion.cargando) {
    return (
      <div className="login-pantalla">
        <div className="login-cargando">Cargando…</div>
      </div>
    );
  }

  // Sin sesión: si este navegador es el de la oficina (instaló el formulario), se
  // abre su formulario en vez de un login que no le sirve de nada.
  if (!sesion.usuario && codigoRecordado) {
    return <Formulario codigo={codigoRecordado} />;
  }

  if (!sesion.usuario) return <PantallaLogin />;

  return <App onCerrarSesion={cerrarSesion} />;
}
