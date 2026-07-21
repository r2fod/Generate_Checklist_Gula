// ─── PUERTA DE ACCESO ──────────────────────────────────────────────────────────
// Decide si se muestra la app o la pantalla de login:
//   · Sin acceso configurado (firebaseConfig = null) → la app funciona como siempre.
//   · Link de un evento (?evento=id o ?c=...) → acceso directo a ese evento SIN login
//     (es el link que se manda al móvil del personal).
//   · Resto de casos → hay que iniciar sesión con el correo/contraseña del equipo.
import { useState, useEffect } from "react";
import App from "./App.jsx";
import { accesoActivo, iniciarSesion, cerrarSesion, observarSesion } from "./auth.js";
import logoGula from "./assets/gula-logo.png";

function esLinkDeEvento() {
  const p = new URLSearchParams(window.location.search);
  return !!(p.get("evento") || p.get("c"));
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
  // omitirLogin se fija una sola vez al arrancar: si es un link de evento o no hay
  // acceso configurado, nunca se pide login.
  const [omitirLogin] = useState(() => !accesoActivo() || esLinkDeEvento());
  const [sesion, setSesion] = useState({ cargando: !omitirLogin, usuario: null });

  useEffect(() => {
    if (omitirLogin) return;
    const unsub = observarSesion((usuario) => setSesion({ cargando: false, usuario }));
    return unsub;
  }, [omitirLogin]);

  if (omitirLogin) return <App />;

  if (sesion.cargando) {
    return (
      <div className="login-pantalla">
        <div className="login-cargando">Cargando…</div>
      </div>
    );
  }

  if (!sesion.usuario) return <PantallaLogin />;

  return <App onCerrarSesion={cerrarSesion} />;
}
