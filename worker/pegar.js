import webpush from "web-push";
import { createECDH } from "node:crypto";
//#region src/texto.js
/** @param {unknown} t @returns {string} */
const sinTildes = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
//#endregion
//#region src/menus-especiales.js
const FAMILIAS = [
	{
		clave: "gluten",
		label: "Menú sin gluten",
		palabras: [
			"celiac",
			"celíac",
			"sin gluten",
			"gluten"
		]
	},
	{
		clave: "vegano",
		label: "Menú vegano",
		palabras: [
			"vegano",
			"vegana",
			"veganos",
			"veganas"
		]
	},
	{
		clave: "vegetar",
		label: "Menú vegetariano",
		palabras: ["vegetarian"]
	},
	{
		clave: "lactosa",
		label: "Menú sin lactosa",
		palabras: [
			"lactosa",
			"lácteo",
			"lacteo",
			"leche"
		]
	},
	{
		clave: "marisco",
		label: "Menú sin marisco",
		palabras: [
			"marisco",
			"crustáceo",
			"crustaceo",
			"gamba",
			"langostino"
		]
	},
	{
		clave: "pescado",
		label: "Menú sin pescado",
		palabras: ["pescado", "anisakis"]
	},
	{
		clave: "secos",
		label: "Menú sin frutos secos",
		palabras: [
			"fruto seco",
			"frutos secos",
			"nuez",
			"nueces",
			"almendra",
			"cacahuete",
			"avellana",
			"pistacho"
		]
	},
	{
		clave: "huevo",
		label: "Menú sin huevo",
		palabras: ["huevo"]
	},
	{
		clave: "soja",
		label: "Menú sin soja",
		palabras: ["soja"]
	},
	{
		clave: "cerdo",
		label: "Menú sin cerdo",
		palabras: [
			"cerdo",
			"halal",
			"kosher"
		]
	},
	{
		clave: "picante",
		label: "Menú sin picante",
		palabras: ["picante"]
	}
];
const MARCAS = [
	"sin ",
	"alergi",
	"alérgi",
	"alergen",
	"alérgen",
	"intoleran",
	"celiac",
	"celíac",
	"vegano",
	"vegana",
	"vegetarian",
	"no come",
	"no puede",
	"no toma",
	"evitar",
	"halal",
	"kosher"
];
const NADA = /^\s*(-+|no|no hay|ninguna?|ningunos?|nada|sin alergias?|sin ninguna|n\/a|ok)\s*\.?\s*$/i;
const NUMEROS = {
	un: 1,
	uno: 1,
	una: 1,
	dos: 2,
	tres: 3,
	cuatro: 4,
	cinco: 5,
	seis: 6,
	siete: 7,
	ocho: 8,
	nueve: 9,
	diez: 10,
	once: 11,
	doce: 12
};
const normaliza = sinTildes;
function alergiasDeLasNotas(notas) {
	const t = String(notas || "");
	const i = t.search(/alergias?\s*:/i);
	return i === -1 ? t : t.slice(t.indexOf(":", i) + 1);
}
function cuantos(fragmento) {
	const conCifra = fragmento.match(/(\d{1,3})/);
	if (conCifra) {
		const n = parseInt(conCifra[1], 10);
		if (!/mesa\s*\d/.test(fragmento) || /^\s*\d/.test(fragmento)) return n >= 1 && n <= 300 ? n : 1;
	}
	const palabra = Object.keys(NUMEROS).find((p) => new RegExp(`(^|\\s)${p}\\s`).test(fragmento));
	return palabra ? NUMEROS[palabra] : 1;
}
function menusEspeciales(texto) {
	const crudo = String(texto || "").trim();
	if (!crudo || NADA.test(crudo)) return [];
	const fragmentos = crudo.split(/[,;.\n]|\sy\s|\s\+\s/).map((f) => f.trim()).filter(Boolean);
	const cuenta = {};
	const sinReconocer = [];
	fragmentos.forEach((frag) => {
		const n = normaliza(frag);
		if (!MARCAS.some((m) => n.includes(normaliza(m)))) return;
		const familia = FAMILIAS.find((f) => f.palabras.some((p) => n.includes(normaliza(p))));
		if (!familia) {
			sinReconocer.push(frag);
			return;
		}
		cuenta[familia.clave] = (cuenta[familia.clave] || 0) + cuantos(n);
	});
	const salida = FAMILIAS.filter((f) => cuenta[f.clave]).map((f) => ({
		clave: f.clave,
		label: f.label,
		n: cuenta[f.clave]
	}));
	if (sinReconocer.length) salida.push({
		clave: "revisar",
		label: "Menú especial (revisar en notas)",
		n: sinReconocer.reduce((a, f) => a + cuantos(normaliza(f)), 0),
		textos: sinReconocer
	});
	return salida;
}
//#endregion
//#region src/personal.js
const PAX_POR_CAMARERO = {
	boda: 9,
	comunion: 9,
	corporativo: 10,
	cumpleanos: 20,
	produccion: 20
};
let ratios = { ...PAX_POR_CAMARERO };
function leerRatios() {
	return { ...ratios };
}
//#endregion
//#region src/mesas.js
/** @type {Record<string, { porMesa: number, alquiler: boolean, etiqueta: string }>} */
const TIPOS_MESA = {
	"Rectangular 1,8m": {
		porMesa: 6,
		alquiler: false,
		etiqueta: "Mesas de 1,8m"
	},
	"Redonda 1,5m": {
		porMesa: 8,
		alquiler: true,
		etiqueta: "Mesas redondas 1,5m (alquiler)"
	},
	"Redonda 1,8m": {
		porMesa: 10,
		alquiler: true,
		etiqueta: "Mesas redondas 1,8m (alquiler)"
	},
	"Redonda 2m": {
		porMesa: 12,
		alquiler: true,
		etiqueta: "Mesas redondas 2m (alquiler)"
	}
};
//#endregion
//#region src/fecha.js
/** El día de calendario de una fecha, tal y como lo ve este dispositivo.
* @param {Date} f @returns {string} */
const aISO = (f) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
/** Hoy. La única. @param {Date} [ahora] @returns {string} */
const hoyISO = (ahora = /* @__PURE__ */ new Date()) => aISO(ahora);
/** Dentro de N días (o hace N, con negativo). Suma por días de CALENDARIO —no 86.400.000
* milisegundos— para que los cambios de hora de marzo y octubre no descuadren la ventana
* en un día: esos dos días tienen 23 y 25 horas.
* @param {number} n @param {Date} [ahora] @returns {string} */
function enDiasISO(n, ahora = /* @__PURE__ */ new Date()) {
	const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
	d.setDate(d.getDate() + Math.round(n));
	return aISO(d);
}
//#endregion
//#region src/asistente/revision.js
const hoy = hoyISO;
const dias = (fecha) => Math.round((/* @__PURE__ */ new Date(`${fecha}T00:00:00`) - /* @__PURE__ */ new Date(`${hoy()}T00:00:00`)) / 864e5);
const MES_CALIDO = [
	5,
	6,
	7,
	8,
	9
];
function revisarEvento(nombre, e = {}) {
	const avisos = [];
	const pon = (tono, texto, comoSeArregla = "") => avisos.push({
		tono,
		texto,
		comoSeArregla
	});
	if (!e || !e.evento) return {
		evento: nombre,
		avisos: [{
			tono: "falta",
			texto: "Ese evento no tiene ni tipo. Está vacío."
		}]
	};
	const adultos = Number(e.pax) || 0;
	const ninos = Number(e.ninos) || 0;
	const total = adultos + ninos;
	if (!adultos) pon("falta", "No tiene comensales adultos, así que no se puede calcular ni bebida ni personal ni cristalería.", "Pon el pax en la ficha del evento.");
	if (!e.fechaEvento) pon("falta", "No tiene fecha.", "Ponla en la ficha del evento.");
	if (!e.horaInicio) pon("falta", "No tiene hora de inicio, así que no hay escaleta: no se sabe a qué hora hay que salir del obrador.", "Pon la hora en la ficha.");
	if (!e.ubicacion) pon("falta", "No tiene sitio.", "Ponlo en la ficha, aunque sea aproximado.");
	if (e.sinConfigurar) pon("falta", "Lo creó el calendario y todavía no lo ha configurado nadie: lo que salga en la checklist son valores por defecto, no los de este evento.", "Pásale los datos del formulario.");
	if (e.fechaEvento) {
		const d = dias(e.fechaEvento);
		if (d < 0) pon("raro", `La fecha ya pasó (hace ${Math.abs(d)} días) y sigue en la lista de próximos.`, "Si ya se hizo, no hay nada que preparar.");
		else if (d <= 14 && e.sinConfigurar) pon("raro", `Faltan ${d} días y todavía está sin configurar.`, "Es el momento de cerrar proveedores y alquileres.");
	}
	if (ninos > adultos && adultos > 0) pon("raro", `Hay más niños (${ninos}) que adultos (${adultos}).`, "Comprueba que no se hayan cambiado las dos casillas.");
	if (e.barraCoctel && !(Number(e.horasCoctel) > 0)) pon("raro", "La barra de cóctel está marcada pero con cero horas: no va a salir nada de bebida por ella.", "Pon las horas, o desmárcala.");
	if (e.barraCopas && !(Number(e.horasCopas) > 0)) pon("raro", "La barra de copas está marcada pero con cero horas: no van a salir ni destilados ni tónica.", "Pon las horas, o desmárcala.");
	if (!e.barraCoctel && Number(e.horasCoctel) > 0) pon("raro", `Hay ${e.horasCoctel}h de cóctel puestas pero la barra está desmarcada: esas horas no cuentan.`, "Marca la barra si va a haberla.");
	if (!e.barraCopas && Number(e.horasCopas) > 0) pon("raro", `Hay ${e.horasCopas}h de copas puestas pero la barra está desmarcada: esas horas no cuentan.`, "Marca la barra si va a haberla.");
	if (Number(e.horasCopas) > 8) pon("raro", `${e.horasCopas} horas de barra de copas es mucho.`, "Comprueba que no sean minutos o un cero de más.");
	const camareros = Number(e.numCamareros) || 0;
	if (camareros > 0 && total > 0) {
		const ratio = total / camareros;
		const medido = leerRatios()[e.evento] || PAX_POR_CAMARERO[e.evento] || 10;
		if (ratio > medido * 1.6) pon("raro", `Van ${camareros} camareros para ${total} comensales (1 cada ${Math.round(ratio)}), y lo medido aquí es 1 cada ${medido}.`, "Si es un almuerzo ligero puede estar bien; si no, van a ir cortos.");
	}
	const textoAlergias = alergiasDeLasNotas(e.notasEvento || "").trim();
	const menus = menusEspeciales(textoAlergias);
	if (textoAlergias && !menus.length) pon("raro", `Hay algo escrito en alergias que no he sabido contar: "${textoAlergias.slice(0, 90)}".`, "Escríbelo como '2 celíacos, 1 vegano' y saldrá solo en la checklist.");
	const paraRevisar = menus.find((m) => m.clave === "revisar");
	if (paraRevisar) pon("raro", `Hay ${paraRevisar.n} menú(s) especial(es) que no he sabido clasificar: ${(paraRevisar.textos || []).join("; ")}.`, "Cocina tiene que mirarlo a mano.");
	if (menus.length) pon("acuerdate", `Lleva ${menus.reduce((a, m) => a + m.n, 0)} menús especiales: ${menus.map((m) => `${m.n} ${m.label.replace(/^Menú /, "")}`).join(", ")}.`, "Confírmalo con cocina antes del día.");
	if (e.fechaEvento && MES_CALIDO.includes((/* @__PURE__ */ new Date(`${e.fechaEvento}T00:00:00`)).getMonth())) {
		if (e.tipoCongelador === "No lleva") pon("acuerdate", "Es un evento de mes cálido y el sitio no tiene congelador: el hielo va con merma y hay que llevar bastante más.", "Comprueba que las neveras portátiles dan de sí.");
	}
	const tipoMesa = e.tipoMesa || "";
	if (tipoMesa && TIPOS_MESA[tipoMesa] && TIPOS_MESA[tipoMesa].alquiler) pon("acuerdate", `Lleva ${TIPOS_MESA[tipoMesa].etiqueta}, que son de alquiler.`, "Hay que pedirlas y cuadrar la recogida.");
	if (e.origenSillas && e.origenSillas !== "Nuestras") pon("acuerdate", `Las sillas son de alquiler (${e.origenSillas}).`, "Pídelas y apunta la devolución.");
	if (e.llevaGenerador) pon("acuerdate", "Lleva generador.", "Va con garrafa de gasolina llena; comprueba que está.");
	if (e.llevaPaella && !(Number(e.numPaellas) > 0)) pon("raro", "Está marcado que lleva paella pero sin número de paelleras.", "Pon cuántas.");
	const logistica = (e.logisticaEquipo || []).filter((p) => p && p.nombre && String(p.nombre).trim());
	if (!logistica.length) pon("falta", "No hay nadie asignado a logística, así que la escaleta se calcula con una persona y va a salir todo larguísimo.", "Asigna el equipo en la ficha.");
	else if (total > 150 && logistica.length < 2) pon("raro", `${total} comensales con ${logistica.length} de logística.`, "Con un evento así, una persona sola no carga el camión a tiempo.");
	const orden = {
		falta: 0,
		raro: 1,
		acuerdate: 2
	};
	avisos.sort((a, b) => orden[a.tono] - orden[b.tono]);
	return {
		evento: nombre,
		avisos,
		todoEnOrden: avisos.length === 0
	};
}
function revisarProximos(eventosGuardados = {}, diasVista = 30) {
	const desde = hoy();
	const hasta = enDiasISO(Math.max(1, diasVista));
	return Object.entries(eventosGuardados).filter(([, e]) => (e.fechaEvento || "") >= desde && (e.fechaEvento || "") <= hasta).sort((a, b) => (a[1].fechaEvento || "").localeCompare(b[1].fechaEvento || "")).map(([nombre, e]) => ({
		fecha: e.fechaEvento || "",
		...revisarEvento(nombre, e)
	})).filter((r) => r.avisos.length);
}
//#endregion
//#region worker/repaso.js
const FIRESTORE = "https://firestore.googleapis.com/v1";
const PREFIJO_EVENTO = "evt_";
const TECHO_DOCUMENTO = 1048576;
const AVISA_DESDE = .75;
const URGE_DESDE = .9;
const kB = (bytes) => `${Math.round(bytes / 1024)} kB`;
function avisoDePeso(nombre, bytes) {
	const parte = bytes / TECHO_DOCUMENTO;
	if (parte < AVISA_DESDE) return null;
	return {
		documento: nombre,
		bytes,
		porcentaje: Math.round(parte * 100),
		tono: parte >= URGE_DESDE ? "falta" : "raro",
		texto: `El documento ${nombre} va por ${kB(bytes)} de los ${kB(TECHO_DOCUMENTO)} que caben (${Math.round(parte * 100)} %).`,
		comoSeArregla: nombre.includes("calendario") ? "Saca del calendario los apuntes de años cerrados (Traer/exportar guarda una copia antes)." : "Es el archivo antiguo y solo se lee: se puede vaciar cuando se confirme que todo está en indice/evt_*."
	};
}
async function entrar(env) {
	const clave = String(env.FIREBASE_API_KEY || "").trim();
	const correo = String(env.ROBOT_EMAIL || "").trim();
	const pass = String(env.ROBOT_PASSWORD || "");
	if (!clave) throw new Error("Falta FIREBASE_API_KEY.");
	if (!correo || !pass) throw new Error("Faltan ROBOT_EMAIL y ROBOT_PASSWORD: sin ellos el repaso no puede leer Firestore.");
	const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(clave)}`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			email: correo,
			password: pass,
			returnSecureToken: true
		})
	});
	const d = await r.json().catch(() => ({}));
	if (!r.ok || !d.idToken) throw new Error(`El robot no puede entrar en Firebase (${d.error && d.error.message || r.status}).`);
	return d.idToken;
}
const valor = (v) => {
	if (!v || typeof v !== "object") return void 0;
	if ("stringValue" in v) return v.stringValue;
	if ("integerValue" in v) return Number(v.integerValue);
	if ("doubleValue" in v) return v.doubleValue;
	if ("booleanValue" in v) return v.booleanValue;
};
const campos = (doc) => {
	const salida = {};
	Object.entries(doc && doc.fields || {}).forEach(([k, v]) => {
		salida[k] = valor(v);
	});
	return salida;
};
const proyecto = (env) => String(env.FIREBASE_PROJECT_ID || "").trim();
async function leerEventos(env, token) {
	const base = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice`;
	const mapa = {};
	let pagina = "";
	for (let vuelta = 0; vuelta < 20; vuelta++) {
		const url = `${base}?pageSize=300${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ""}`;
		const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
		const d = await r.json().catch(() => ({}));
		if (!r.ok) throw new Error(`Firestore no deja leer los eventos (${d.error && d.error.message || r.status}).`);
		(d.documents || []).forEach((doc) => {
			if (!String(doc.name || "").split("/").pop().startsWith(PREFIJO_EVENTO)) return;
			const c = campos(doc);
			if (!c.nombre || !c.estado) return;
			try {
				mapa[c.nombre] = JSON.parse(c.estado);
			} catch (e) {}
		});
		if (!d.nextPageToken) break;
		pagina = d.nextPageToken;
	}
	return mapa;
}
async function pesoDe(env, token, ruta) {
	const url = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/${ruta}`;
	const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
	if (!r.ok) return null;
	const texto = await r.text();
	return new TextEncoder().encode(texto).length;
}
async function guardarAvisos(env, token, contenido) {
	const url = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice/avisos`;
	const r = await fetch(url, {
		method: "PATCH",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({ fields: {
			avisos: { stringValue: JSON.stringify(contenido) },
			actualizado: { integerValue: String(Date.now()) }
		} })
	});
	if (!r.ok) {
		const d = await r.json().catch(() => ({}));
		throw new Error(`Firestore no deja escribir el repaso (${d.error && d.error.message || r.status}).`);
	}
}
async function repasar(env) {
	if (!proyecto(env)) throw new Error("Falta FIREBASE_PROJECT_ID: sin él no se sabe qué base de datos mirar.");
	const token = await entrar(env);
	const eventos = await leerEventos(env, token);
	const revisados = revisarProximos(eventos, 30);
	const pesos = [];
	for (const ruta of ["indice/calendario", "indice/eventosGuardados"]) {
		const bytes = await pesoDe(env, token, ruta).catch(() => null);
		if (bytes === null) continue;
		const aviso = avisoDePeso(ruta, bytes);
		if (aviso) pesos.push(aviso);
	}
	const contenido = {
		cuando: Date.now(),
		dias: 30,
		mirados: Object.keys(eventos).length,
		documentos: pesos,
		eventos: revisados.map((r) => ({
			evento: r.evento,
			fecha: r.fecha,
			avisos: (r.avisos || []).map((a) => ({
				tono: a.tono,
				texto: a.texto,
				comoSeArregla: a.comoSeArregla || ""
			}))
		}))
	};
	await guardarAvisos(env, token, contenido);
	return contenido;
}
const CLAVES_VOZ_GEMINI = [
	{
		id: "Kore",
		nombre: "Kore",
		tono: "Firme y con seguridad (la de por defecto hasta ahora)"
	},
	{
		id: "Charon",
		nombre: "Charon",
		tono: "Clara y explicativa — la más parecida a un asistente tipo Jarvis"
	},
	{
		id: "Sadaltager",
		nombre: "Sadaltager",
		tono: "Con aire de autoridad, como quien sabe de lo que habla"
	},
	{
		id: "Umbriel",
		nombre: "Umbriel",
		tono: "Tranquila, sin prisa"
	},
	{
		id: "Puck",
		nombre: "Puck",
		tono: "Animada y con energía"
	},
	{
		id: "Aoede",
		nombre: "Aoede",
		tono: "Fresca y natural"
	},
	{
		id: "Achird",
		nombre: "Achird",
		tono: "Cercana, como un compañero más"
	},
	{
		id: "Leda",
		nombre: "Leda",
		tono: "Joven y con vida"
	}
].map((v) => v.id);
//#endregion
//#region worker/index.js
const CORS = (origen) => ({
	"Access-Control-Allow-Origin": origen,
	"Access-Control-Allow-Headers": "content-type, authorization",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Max-Age": "86400"
});
const json = (datos, estado, origen) => new Response(JSON.stringify(datos), {
	status: estado,
	headers: {
		"content-type": "application/json",
		...CORS(origen)
	}
});
function origenPermitido(req, env) {
	const permitidos = (env.ORIGENES || "").split(",").map((s) => s.trim()).filter(Boolean);
	const origen = req.headers.get("Origin") || "";
	if (!permitidos.length) return origen || "*";
	return permitidos.includes(origen) ? origen : "";
}
async function quienEs(idToken, env) {
	if (!idToken) return { fallo: "No ha llegado ninguna sesión. Entra con el usuario del equipo en la app; si ya has entrado, cierra sesión y vuelve a entrar." };
	const clave = String(env.FIREBASE_API_KEY || "").trim();
	if (!clave) return { fallo: "Este Worker no tiene FIREBASE_API_KEY configurada." };
	let r;
	try {
		r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(clave)}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ idToken: String(idToken).trim() })
		});
	} catch (e) {
		return { fallo: `No se ha podido comprobar la sesión con Firebase: ${e && e.message ? e.message : e}` };
	}
	if (!r.ok) {
		const motivo = ((await r.text().catch(() => "")).match(/"message"\s*:\s*"([^"]+)"/) || [])[1] || `HTTP ${r.status}`;
		if (/api[ _-]?key|referer|referrer|permission/i.test(motivo)) return { fallo: `Firebase rechaza la clave del Worker (${motivo}). Revisa FIREBASE_API_KEY en Settings → Variables: tiene que ser la apiKey de Firebase, no la de Gemini — las dos empiezan por AIza y se confunden con una facilidad pasmosa.` };
		return { fallo: `Firebase no acepta la sesión (${motivo}). Suele arreglarse cerrando sesión en la app y volviendo a entrar.` };
	}
	const d = await r.json().catch(() => null);
	const u = d && d.users && d.users[0];
	return u ? { usuario: {
		uid: u.localId,
		email: u.email || ""
	} } : { fallo: "Firebase no reconoce a ese usuario." };
}
function clavesGemini(env) {
	return [
		env.GEMINI_API_KEY,
		env.GEMINI_API_KEY_2,
		env.GEMINI_API_KEY_3
	].filter(Boolean);
}
async function gemini(cuerpo, env) {
	const modelo = env.GEMINI_MODEL || "gemini-3.6-flash";
	const contenidos = cuerpo.mensajes.map((m) => {
		if (m.rol === "herramienta") return {
			role: "user",
			parts: [{ functionResponse: {
				name: m.nombre,
				response: { resultado: m.contenido }
			} }]
		};
		if (m.rol === "asistente" && m.llamadas && m.llamadas.length) return {
			role: "model",
			parts: m.llamadas.map((l) => ({
				functionCall: {
					name: l.nombre,
					args: l.argumentos
				},
				...l.firma ? { thoughtSignature: l.firma } : {}
			}))
		};
		return {
			role: m.rol === "asistente" ? "model" : "user",
			parts: [{ text: String(m.contenido || "") }]
		};
	});
	const cuerpoGemini = JSON.stringify({
		contents: contenidos,
		systemInstruction: { parts: [{ text: cuerpo.sistema }] },
		tools: [{ functionDeclarations: cuerpo.herramientas }]
	});
	const claves = clavesGemini(env);
	let ultimoFallo;
	for (let i = 0; i < claves.length; i++) {
		const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${claves[i]}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: cuerpoGemini
		});
		if (r.ok) {
			const d = await r.json();
			const partes = (((d.candidates || [])[0] || {}).content || {}).parts || [];
			const u = d.usageMetadata || {};
			return {
				uso: {
					entrada: u.promptTokenCount || 0,
					salida: u.candidatesTokenCount || 0
				},
				texto: partes.filter((p) => p.text).map((p) => p.text).join("").trim(),
				llamadas: partes.filter((p) => p.functionCall).map((p, i2) => ({
					id: `g${i2}`,
					nombre: String(p.functionCall.name || "").split(":").pop(),
					argumentos: p.functionCall.args || {},
					firma: p.thoughtSignature || ""
				}))
			};
		}
		ultimoFallo = /* @__PURE__ */ new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
		if (r.status !== 429) throw ultimoFallo;
	}
	throw ultimoFallo;
}
function vozElegida(vozCliente, env) {
	return (CLAVES_VOZ_GEMINI.includes(vozCliente) ? vozCliente : null) || env.GEMINI_TTS_VOZ || "Kore";
}
async function vozDeGemini(texto, env, vozCliente) {
	const modelo = env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
	const voz = vozElegida(vozCliente, env);
	const claves = clavesGemini(env);
	let ultimoFallo;
	for (let i = 0; i < claves.length; i++) {
		const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${claves[i]}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: texto }] }],
				generationConfig: {
					responseModalities: ["AUDIO"],
					speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voz } } }
				}
			})
		});
		if (r.ok) {
			const parte = (((((await r.json()).candidates || [])[0] || {}).content || {}).parts || [])[0];
			const datos = parte && parte.inlineData;
			if (!datos || !datos.data) throw new Error("Gemini no ha devuelto ningún audio.");
			const frecuencia = Number((String(datos.mimeType || "").match(/rate=(\d+)/) || [])[1]) || 24e3;
			return {
				audio: datos.data,
				frecuencia
			};
		}
		ultimoFallo = /* @__PURE__ */ new Error(`Gemini TTS ${r.status}: ${(await r.text()).slice(0, 300)}`);
		if (r.status !== 429) throw ultimoFallo;
	}
	throw ultimoFallo;
}
async function claude(cuerpo, env) {
	const mensajes = [];
	cuerpo.mensajes.forEach((m) => {
		if (m.rol === "herramienta") mensajes.push({
			role: "user",
			content: [{
				type: "tool_result",
				tool_use_id: m.id,
				content: JSON.stringify(m.contenido)
			}]
		});
		else if (m.rol === "asistente" && m.llamadas && m.llamadas.length) mensajes.push({
			role: "assistant",
			content: [...m.contenido ? [{
				type: "text",
				text: m.contenido
			}] : [], ...m.llamadas.map((l) => ({
				type: "tool_use",
				id: l.id,
				name: l.nombre,
				input: l.argumentos
			}))]
		});
		else mensajes.push({
			role: m.rol === "asistente" ? "assistant" : "user",
			content: String(m.contenido || "")
		});
	});
	const r = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-api-key": env.ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01"
		},
		body: JSON.stringify({
			model: env.ANTHROPIC_MODEL || "claude-opus-5",
			max_tokens: 2048,
			system: cuerpo.sistema,
			messages: mensajes,
			tools: cuerpo.herramientas.map((h) => ({
				name: h.name,
				description: h.description,
				input_schema: h.parameters || {
					type: "object",
					properties: {}
				}
			}))
		})
	});
	if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 300)}`);
	const d = await r.json();
	const bloques = d.content || [];
	const u = d.usage || {};
	return {
		uso: {
			entrada: u.input_tokens || 0,
			salida: u.output_tokens || 0
		},
		texto: bloques.filter((b) => b.type === "text").map((b) => b.text).join("").trim(),
		llamadas: bloques.filter((b) => b.type === "tool_use").map((b) => ({
			id: b.id,
			nombre: b.name,
			argumentos: b.input || {}
		}))
	};
}
function dialectoOpenAI({ base, clave, modelo }) {
	return async (cuerpo) => {
		const mensajes = [{
			role: "system",
			content: cuerpo.sistema
		}];
		cuerpo.mensajes.forEach((m) => {
			if (m.rol === "herramienta") mensajes.push({
				role: "tool",
				tool_call_id: m.id,
				content: JSON.stringify(m.contenido)
			});
			else if (m.rol === "asistente" && m.llamadas && m.llamadas.length) mensajes.push({
				role: "assistant",
				content: m.contenido || null,
				tool_calls: m.llamadas.map((l) => ({
					id: l.id,
					type: "function",
					function: {
						name: l.nombre,
						arguments: JSON.stringify(l.argumentos)
					}
				}))
			});
			else mensajes.push({
				role: m.rol === "asistente" ? "assistant" : "user",
				content: String(m.contenido || "")
			});
		});
		const r = await fetch(`${String(base).replace(/\/+$/, "")}/chat/completions`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${clave}`
			},
			body: JSON.stringify({
				model: modelo,
				messages: mensajes,
				tools: cuerpo.herramientas.map((h) => ({
					type: "function",
					function: {
						name: h.name,
						description: h.description,
						parameters: h.parameters || {
							type: "object",
							properties: {}
						}
					}
				}))
			})
		});
		if (!r.ok) throw new Error(`${modelo} ${r.status}: ${(await r.text()).slice(0, 300)}`);
		const d = await r.json();
		const m = ((d.choices || [])[0] || {}).message || {};
		const u = d.usage || {};
		return {
			uso: {
				entrada: u.prompt_tokens || 0,
				salida: u.completion_tokens || 0
			},
			texto: (m.content || "").trim(),
			llamadas: (m.tool_calls || []).map((t) => ({
				id: t.id,
				nombre: t.function.name,
				argumentos: (() => {
					try {
						return JSON.parse(t.function.arguments || "{}");
					} catch (e) {
						return {};
					}
				})()
			}))
		};
	};
}
const PROVEEDORES = {
	gemini: {
		clave: "GEMINI_API_KEY",
		habla: (env) => (cuerpo) => gemini(cuerpo, env)
	},
	claude: {
		clave: "ANTHROPIC_API_KEY",
		habla: (env) => (cuerpo) => claude(cuerpo, env)
	},
	openai: {
		clave: "OPENAI_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://api.openai.com/v1",
			clave: env.OPENAI_API_KEY,
			modelo: env.OPENAI_MODEL || "gpt-4o-mini"
		})
	},
	compatible: {
		clave: "COMPATIBLE_API_KEY",
		ademas: "COMPATIBLE_URL",
		habla: (env) => dialectoOpenAI({
			base: env.COMPATIBLE_URL,
			clave: env.COMPATIBLE_API_KEY,
			modelo: env.COMPATIBLE_MODEL || ""
		})
	},
	groq: {
		clave: "GROQ_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://api.groq.com/openai/v1",
			clave: env.GROQ_API_KEY,
			modelo: env.GROQ_MODEL || "llama-3.3-70b-versatile"
		})
	},
	cerebras: {
		clave: "CEREBRAS_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://api.cerebras.ai/v1",
			clave: env.CEREBRAS_API_KEY,
			modelo: env.CEREBRAS_MODEL || "llama-3.3-70b"
		})
	},
	zai: {
		clave: "ZAI_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://api.z.ai/api/paas/v4",
			clave: env.ZAI_API_KEY,
			modelo: env.ZAI_MODEL || "glm-4.5-flash"
		})
	},
	mistral: {
		clave: "MISTRAL_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://api.mistral.ai/v1",
			clave: env.MISTRAL_API_KEY,
			modelo: env.MISTRAL_MODEL || "mistral-small-latest"
		})
	},
	openrouter: {
		clave: "OPENROUTER_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://openrouter.ai/api/v1",
			clave: env.OPENROUTER_API_KEY,
			modelo: env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free"
		})
	},
	nvidia: {
		clave: "NVIDIA_API_KEY",
		habla: (env) => dialectoOpenAI({
			base: "https://integrate.api.nvidia.com/v1",
			clave: env.NVIDIA_API_KEY,
			modelo: env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct"
		})
	},
	cloudflare: {
		clave: "CLOUDFLARE_API_TOKEN",
		ademas: "CLOUDFLARE_ACCOUNT_ID",
		habla: (env) => dialectoOpenAI({
			base: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1`,
			clave: env.CLOUDFLARE_API_TOKEN,
			modelo: env.CLOUDFLARE_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
		})
	}
};
async function estado(env) {
	const claves = [
		"GEMINI_API_KEY",
		"GEMINI_API_KEY_2",
		"GEMINI_API_KEY_3",
		"FIREBASE_API_KEY",
		"ANTHROPIC_API_KEY",
		"OPENAI_API_KEY",
		"COMPATIBLE_API_KEY",
		"GROQ_API_KEY",
		"CEREBRAS_API_KEY",
		"ZAI_API_KEY",
		"MISTRAL_API_KEY",
		"OPENROUTER_API_KEY",
		"NVIDIA_API_KEY",
		"CLOUDFLARE_API_TOKEN",
		"CLOUDFLARE_ACCOUNT_ID"
	];
	const puestas = {};
	claves.forEach((k) => {
		const v = String(env[k] || "");
		puestas[k] = v ? `puesta, ${v.length} caracteres${v !== v.trim() ? " ⚠️ CON ESPACIOS O SALTOS DE LÍNEA" : ""}` : "NO puesta";
	});
	let huella = "sin clave";
	const bruta = String(env.FIREBASE_API_KEY || "");
	if (bruta) {
		const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bruta.trim()));
		huella = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
	}
	let firebase = "no se ha podido comprobar";
	const fk = String(env.FIREBASE_API_KEY || "").trim();
	if (fk) try {
		const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(fk)}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ idToken: "prueba" })
		});
		const motivo = ((await r.text()).match(/"message"\s*:\s*"([^"]+)"/) || [])[1] || `HTTP ${r.status}`;
		firebase = /INVALID_ID_TOKEN/i.test(motivo) ? "✅ LA CLAVE DE FIREBASE ES CORRECTA (Google solo rechaza el token de prueba, que es lo esperado)" : `❌ LA CLAVE DE FIREBASE NO VALE → Google dice: ${motivo}`;
	} catch (e) {
		firebase = `no se ha podido preguntar a Google: ${e && e.message ? e.message : e}`;
	}
	return {
		origenes: env.ORIGENES ? env.ORIGENES.split(",").map((x) => x.trim()) : "NO puesto (se aceptará cualquier origen)",
		proveedorPorDefecto: env.PROVEEDOR_POR_DEFECTO || "gemini",
		disponibles: disponiblesEn(env),
		claves: puestas,
		firebase,
		huellaDeLaClaveDeFirebase: huella,
		huellaQueDeberiaSalir: "353f1b0dd087",
		coincide: huella === "353f1b0dd087" ? "✅ SÍ, es la clave correcta" : "❌ NO, la guardada es OTRA clave (¿la de Gemini?)"
	};
}
async function salud(env) {
	const pings = [];
	for (const [nombre, p] of Object.entries(PROVEEDORES)) {
		const falta = [p.clave, p.ademas].filter(Boolean).filter((k) => !env[k]);
		if (falta.length) {
			pings.push({
				nombre,
				estado: "sin configurar",
				falta: falta.join(" y ")
			});
			continue;
		}
		try {
			const r = await p.habla(env)({
				mensajes: [{
					rol: "usuario",
					contenido: "Di solo: ok"
				}],
				sistema: "",
				herramientas: []
			});
			pings.push({
				nombre,
				estado: "ok",
				contesta: String(r.texto || "").slice(0, 40)
			});
		} catch (e) {
			pings.push({
				nombre,
				estado: "error",
				motivo: String(e && e.message ? e.message : e)
			});
		}
	}
	return { pings };
}
function ipv4Privada(a, b, c, d) {
	return a === 127 || a === 0 || a === 10 || a === 192 && b === 168 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31;
}
function hostBloqueado(hostnameBruto) {
	const h = String(hostnameBruto || "").toLowerCase();
	if (h === "localhost" || h.endsWith(".localhost")) return true;
	const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (v4) return ipv4Privada(+v4[1], +v4[2], +v4[3], +v4[4]);
	const v6 = h.replace(/^\[|\]$/g, "");
	if (v6 === "::1" || v6 === "::") return true;
	if (/^fe80:/.test(v6)) return true;
	if (/^f[cd][0-9a-f]{2}:/.test(v6)) return true;
	const mapeadaDecimal = v6.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (mapeadaDecimal) return ipv4Privada(+mapeadaDecimal[1], +mapeadaDecimal[2], +mapeadaDecimal[3], +mapeadaDecimal[4]);
	const mapeadaHex = v6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
	if (mapeadaHex) {
		const alto = parseInt(mapeadaHex[1], 16), bajo = parseInt(mapeadaHex[2], 16);
		return ipv4Privada(alto >> 8, alto & 255, bajo >> 8, bajo & 255);
	}
	return false;
}
/** @param {unknown} url @returns {{ ok: boolean, url?: string, motivo?: string }} */
function urlAnalizable(url) {
	try {
		const u = new URL(String(url || ""));
		if (u.protocol !== "http:" && u.protocol !== "https:") return {
			ok: false,
			motivo: "Solo se analizan direcciones http o https."
		};
		if (hostBloqueado(u.hostname)) return {
			ok: false,
			motivo: "Esa dirección no se analiza: es de red privada."
		};
		return {
			ok: true,
			url: u.toString()
		};
	} catch (e) {
		return {
			ok: false,
			motivo: "Esa no parece una dirección completa (falta el https://)."
		};
	}
}
async function fetchValidando(urlInicial, opciones, maxSaltos = 5) {
	let actual = urlInicial;
	for (let salto = 0; salto <= maxSaltos; salto++) {
		const r = await fetch(actual, {
			...opciones,
			redirect: "manual"
		});
		if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
			const chequeo = urlAnalizable(new URL(r.headers.get("location"), actual).toString());
			if (!chequeo.ok) throw new Error(`Redirige a una dirección que no se analiza: ${chequeo.motivo}`);
			actual = chequeo.url;
			continue;
		}
		return r;
	}
	throw new Error("Demasiados redirects seguidos (más de 5): no se sigue.");
}
function extraerWeb(html, url) {
	const texto = String(html);
	const limpio = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
	const titulo = limpio(texto.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 120);
	const descripcion = limpio(texto.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)?.[1] || texto.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i)?.[1]);
	const encabezados = (tag) => [...texto.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((m) => limpio(m[1])).filter(Boolean);
	const enlaces = [...texto.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({
		href: String(m[1]),
		texto: limpio(m[2])
	})).filter((l) => l.texto).slice(0, 60);
	const palabraCTA = /^(reserv|contact|presupuest|pedir|pedido|cotiz|solicita|informa|llamen|llama|escríben|escriben|visít|visita|booking|book|agenda|whatsapp|telegram|menu|menú)/i;
	const ctas = enlaces.filter((l) => palabraCTA.test(l.texto) || palabraCTA.test(l.href.replace(/^https?:\/\//, "").split(/[?#]/)[0])).slice(0, 10).map((l) => ({
		texto: l.texto.slice(0, 60),
		href: l.href.slice(0, 120)
	}));
	const whatsapp = (enlaces.find((l) => /wa\.me|api\.whatsapp|whatsapp/i.test(l.href)) || {}).href || null;
	return {
		url,
		titulo: titulo || "(sin título)",
		descripcion: descripcion.slice(0, 300) || "(sin meta description)",
		secciones: encabezados("h2").slice(0, 12),
		tituloPrincipal: encabezados("h1").slice(0, 3),
		movilAdaptado: /<meta[^>]+name=["']viewport["']/i.test(texto),
		imagenesSinAlt: (texto.match(/<img(?![^>]*\balt=)[^>]*>/gi) || []).length,
		nEnlaces: enlaces.length,
		ctas,
		whatsapp: whatsapp ? whatsapp.slice(0, 120) : null,
		telefonos: (texto.match(/(?:\+34[\s.-]?)?[69]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g) || []).slice(0, 5),
		preciosVisibles: (texto.match(/[0-9]{1,5}(?:[.,][0-9]{1,2})?\s*€|€\s*[0-9]{1,5}(?:[.,][0-9]{1,2})?/g) || []).slice(0, 10)
	};
}
const PROMPT_OJO = `Eres el ojo del asistente de una empresa de catering. Describe esta captura para una estrategia de captación de clientes: de quién es el perfil o la página, cuántos seguidores si se llega a leer, qué tipo de contenido hay (platos, eventos, equipo, clientes, detrás de cámaras), qué se repite y qué falta para que alguien te pida presupuesto (forma de contactarse, reseñas, precios orientativos, llamada a la acción). En frases cortas y al grano, en español, y sin inventar lo que no se ve: si algo no se distingue, dilo.`;
async function visionGemini(pregunta, imagenBase64, mime, env) {
	const claves = clavesGemini(env);
	if (!claves.length) throw new Error("Sin GEMINI_API_KEY puesta no hay visión: la captura no tiene quién la mire.");
	const modelo = env.GEMINI_MODEL || "gemini-3.6-flash";
	const texto = pregunta ? `${PROMPT_OJO}\n\nLo que el usuario quiere saber de ella: ${pregunta}` : PROMPT_OJO;
	let ultimoFallo;
	for (const clave of claves) {
		const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${clave}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ contents: [{
				role: "user",
				parts: [{ text: texto }, { inline_data: {
					mime_type: mime || "image/jpeg",
					data: imagenBase64
				} }]
			}] })
		});
		if (r.ok) {
			const analisis = (((((await r.json()).candidates || [])[0] || {}).content || {}).parts || []).filter((p) => p.text).map((p) => p.text).join(" ").trim();
			if (!analisis) throw new Error("Gemini no ha devuelto nada que leer de la imagen.");
			return analisis;
		}
		ultimoFallo = /* @__PURE__ */ new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 300)}`);
		if (r.status !== 429) throw ultimoFallo;
	}
	throw ultimoFallo;
}
const disponiblesEn = (env) => Object.entries(PROVEEDORES).filter(([, p]) => [p.clave, p.ademas].filter(Boolean).every((k) => env[k])).map(([nombre]) => nombre);
function tareasParaPush(tareas = [], hoy) {
	return (Array.isArray(tareas) ? tareas : []).filter((t) => t && t.fecha === hoy && !t.hecho).slice(0, 20);
}
function payloadDeRecordatorio(tarea) {
	const cuerpo = tarea.evento ? `${tarea.texto} (${tarea.evento})` : tarea.texto;
	return {
		titulo: "Gula · recordatorio",
		cuerpo: String(cuerpo).slice(0, 200),
		url: "./checklist/"
	};
}
function vapidClaves(env) {
	const clave = String(env.VAPID_CLAVE || "").trim();
	const asunto = String(env.VAPID_MAILTO || "").trim();
	if (!clave) return { fallo: "Falta VAPID_CLAVE en el Worker: generad el par con npx web-push generate-vapid-keys y ponedlo en Settings → Variables." };
	if (!/^mailto:/i.test(asunto)) return { fallo: "Falta VAPID_MAILTO (una dirección mailto:) en el Worker: es el 'de' del aviso, y Web Push lo pide." };
	let publico;
	try {
		const bytes = Buffer.from(clave, "base64url");
		if (bytes.length !== 32) throw new Error("tamaño");
		const ecdh = createECDH("prime256v1");
		ecdh.setPrivateKey(bytes);
		publico = ecdh.getPublicKey().toString("base64url");
	} catch (e) {
		return { fallo: "VAPID_CLAVE no parece una clave privada VAPID válida (P-256 en base64url, 43 caracteres). Volved a copiarla entera de npx web-push generate-vapid-keys." };
	}
	return {
		publico,
		clave,
		asunto
	};
}
async function leerSuscripciones(env, token) {
	const base = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice`;
	const lista = [];
	let pagina = "";
	for (let vuelta = 0; vuelta < 20; vuelta++) {
		const url = `${base}?pageSize=300${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ""}`;
		const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
		const d = await r.json().catch(() => ({}));
		if (!r.ok) throw new Error(`Firestore no deja leer las suscripciones (${d.error && d.error.message || r.status}).`);
		(d.documents || []).forEach((doc) => {
			if (!String(doc.name || "").split("/").pop().startsWith("push-")) return;
			const c = campos(doc);
			try {
				const s = JSON.parse(c.suscripcion || "null");
				if (s && s.endpoint && s.keys) lista.push(s);
			} catch (e) {}
		});
		if (!d.nextPageToken) break;
		pagina = d.nextPageToken;
	}
	return lista;
}
async function leerTareas(env, token) {
	const url = `${FIRESTORE}/projects/${proyecto(env)}/databases/(default)/documents/indice/tareas`;
	const r = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
	if (!r.ok) return [];
	const c = campos(await r.json().catch(() => ({})));
	try {
		return JSON.parse(c.tareas || "[]");
	} catch (e) {
		return [];
	}
}
async function avisosDelDia(env) {
	const token = await entrar(env);
	const claves = vapidClaves(env);
	if (claves.fallo) return {
		enviados: 0,
		fallos: [claves.fallo]
	};
	const hoy = hoyISO();
	const paraHoy = tareasParaPush(await leerTareas(env, token), hoy);
	if (!paraHoy.length) return {
		enviados: 0,
		fallos: []
	};
	const aparatos = await leerSuscripciones(env, token);
	if (!aparatos.length) return {
		enviados: 0,
		fallos: []
	};
	let enviados = 0;
	const fallos = [];
	for (const tarea of paraHoy) {
		const payload = JSON.stringify(payloadDeRecordatorio(tarea));
		for (const sus of aparatos) try {
			const det = webpush.generateRequestDetails(sus, payload, {
				TTL: 60,
				vapidDetails: {
					subject: claves.asunto,
					publicKey: claves.publico,
					privateKey: claves.clave
				}
			});
			const r = await fetch(det.endpoint, {
				method: det.method,
				headers: det.headers,
				body: det.body
			});
			if (r.ok) enviados++;
			else fallos.push(`${String(tarea.texto).slice(0, 30)} → HTTP ${r.status}`);
		} catch (e) {
			fallos.push(`${String(tarea.texto).slice(0, 30)} → ${e && e.message || "fallo sin detalle"}`);
		}
	}
	if (fallos.length) console.warn(`Avisos: ${fallos.length} sin entregar: ${fallos.slice(0, 5).join(" | ")}`);
	return {
		enviados,
		aparatos: aparatos.length,
		fallos
	};
}
var worker_default = {
	async scheduled(evento, env, ctx) {
		ctx.waitUntil(repasar(env).then((r) => console.log(`Repaso: ${r.eventos.length} eventos con avisos de ${r.mirados} mirados.`)).catch((e) => console.error(`El repaso ha fallado: ${e && e.message ? e.message : e}`)));
		ctx.waitUntil(avisosDelDia(env).then((r) => console.log(`Avisos del día: ${r.enviados} avisos entregados${r.fallos && r.fallos.length ? `; ${r.fallos.length} sin entregar` : ""}.`)).catch((e) => console.error(`Los avisos del día han fallado: ${e && e.message ? e.message : e}`)));
	},
	async fetch(req, env) {
		if (new URL(req.url).pathname === "/__estado") return new Response(JSON.stringify(await estado(env), null, 2), { headers: { "content-type": "application/json; charset=utf-8" } });
		const origen = origenPermitido(req, env);
		if (req.method === "OPTIONS") return new Response(null, {
			status: 204,
			headers: CORS(origen || "null")
		});
		if (!origen) return new Response("Origen no permitido", { status: 403 });
		if (new URL(req.url).pathname === "/__repaso") {
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			try {
				return json({
					...await repasar(env),
					dias: 30
				}, 200, origen);
			} catch (e) {
				return json({ error: String(e && e.message ? e.message : e) }, 500, origen);
			}
		}
		if (new URL(req.url).pathname === "/__salud") {
			if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			try {
				return json(await salud(env), 200, origen);
			} catch (e) {
				return json({ error: String(e && e.message ? e.message : e) }, 500, origen);
			}
		}
		if (new URL(req.url).pathname === "/__analizar") {
			if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			let cuerpo;
			try {
				cuerpo = JSON.parse(await req.text());
			} catch (e) {
				return json({ error: "Cuerpo ilegible" }, 400, origen);
			}
			const chequeo = urlAnalizable(cuerpo.url);
			if (!chequeo.ok) return json({ error: chequeo.motivo }, 400, origen);
			try {
				const r = await fetchValidando(chequeo.url, {
					signal: AbortSignal.timeout(8e3),
					headers: { "user-agent": "Mozilla/5.0 (compatible; GulaChecklist/1.0)" }
				});
				if (!r.ok) return json({ error: `La web contestó ${r.status}: no se ha podido analizar.` }, 502, origen);
				const html = await r.text();
				if (html.length > 2e6) return json({ error: "La página pesa demasiado para analizarla (más de 2 MB)." }, 413, origen);
				return json(extraerWeb(html, chequeo.url), 200, origen);
			} catch (e) {
				return json({ error: `No se ha podido llegar a la web: ${String(e && e.message ? e.message : e).slice(0, 120)}` }, 502, origen);
			}
		}
		if (new URL(req.url).pathname === "/__vision") {
			if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			let cuerpo;
			try {
				cuerpo = JSON.parse(await req.text());
			} catch (e) {
				return json({ error: "Cuerpo ilegible" }, 400, origen);
			}
			const b64 = String(cuerpo.imagen || "").replace(/^data:image\/\w+;base64,/, "");
			if (!b64) return json({ error: "No hay ninguna imagen que analizar." }, 400, origen);
			if (b64.length > 8e6) return json({ error: "La imagen pesa demasiado (más de ~6 MB): hazla en una o dos pantallas." }, 413, origen);
			try {
				return json({ analisis: await visionGemini(String(cuerpo.pregunta || ""), b64, String(cuerpo.mime || "image/jpeg"), env) }, 200, origen);
			} catch (e) {
				return json({ error: String(e && e.message ? e.message : e) }, 502, origen);
			}
		}
		if (new URL(req.url).pathname === "/__vapid") {
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			const claves = vapidClaves(env);
			if (claves.fallo) return json({ error: claves.fallo }, 501, origen);
			return json({ vapidPublico: claves.publico }, 200, origen);
		}
		if (new URL(req.url).pathname === "/__voz") {
			if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
			const quienPide = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
			if (quienPide.fallo) return json({ error: quienPide.fallo }, 401, origen);
			if (!clavesGemini(env).length) return json({ error: "Sin GEMINI_API_KEY puesta no hay voz en la nube." }, 501, origen);
			let cuerpoVoz;
			try {
				cuerpoVoz = JSON.parse(await req.text());
			} catch (e) {
				return json({ error: "Cuerpo ilegible" }, 400, origen);
			}
			const texto = String(cuerpoVoz.texto || "").trim();
			if (!texto) return json({ error: "Nada que decir." }, 400, origen);
			try {
				return json(await vozDeGemini(texto, env, String(cuerpoVoz.voz || "")), 200, origen);
			} catch (e) {
				return json({ error: String(e && e.message ? e.message : e) }, 502, origen);
			}
		}
		if (req.method !== "POST") return json({ error: "Solo POST" }, 405, origen);
		const crudo = await req.text();
		if (crudo.length > 2e5) return json({ error: "La conversación es demasiado larga." }, 413, origen);
		let cuerpo;
		try {
			cuerpo = JSON.parse(crudo);
		} catch (e) {
			return json({ error: "Cuerpo ilegible" }, 400, origen);
		}
		const quien = await quienEs((req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), env);
		if (quien.fallo) return json({ error: quien.fallo }, 401, origen);
		const nombre = PROVEEDORES[cuerpo.proveedor] ? cuerpo.proveedor : env.PROVEEDOR_POR_DEFECTO || "gemini";
		const p = PROVEEDORES[nombre];
		const faltan = [p.clave, p.ademas].filter((k) => k && !env[k]);
		if (faltan.length) return json({
			error: `Este Worker no tiene ${nombre} configurado: falta ${faltan.join(" y ")}.`,
			disponibles: disponiblesEn(env)
		}, 501, origen);
		if (!Array.isArray(cuerpo.mensajes) || !cuerpo.mensajes.length) return json({ error: "No hay conversación que mandar." }, 400, origen);
		try {
			const salida = await p.habla(env)({
				sistema: String(cuerpo.sistema || ""),
				mensajes: cuerpo.mensajes,
				herramientas: Array.isArray(cuerpo.herramientas) ? cuerpo.herramientas : []
			});
			return json({
				...salida,
				proveedor: nombre,
				disponibles: disponiblesEn(env)
			}, 200, origen);
		} catch (e) {
			return json({
				error: String(e && e.message ? e.message : e),
				disponibles: disponiblesEn(env)
			}, 502, origen);
		}
	}
};
//#endregion
export { avisosDelDia, clavesGemini, worker_default as default, extraerWeb, fetchValidando, payloadDeRecordatorio, salud, tareasParaPush, urlAnalizable, vapidClaves, visionGemini, vozElegida };
