const regiones   = ["Kanto","Johto","Hoenn","Sinnoh","Unova","Kalos","Alola","Galar","Paldea"];
const coloresGen = ["#3b5bdb","#3b5bdb","#7c3aed","#7c3aed","#db2777","#db2777","#db2777","#dc2626","#dc2626"];

// Color y etiqueta por tipo de Pokémon — paleta canónica de tipo (la que
// cualquier fan reconoce), usada en la ficha de detalle a modo de "carta
// física": el tipo primario define el color del marco.
const tiposInfo = {
    normal:   { color:'#9CA88C', label:'Normal',   emoji:'⚪' },
    fire:     { color:'#EE7B2C', label:'Fuego',    emoji:'🔥' },
    water:    { color:'#4F8EF7', label:'Agua',     emoji:'💧' },
    grass:    { color:'#5FBB4E', label:'Planta',   emoji:'🌿' },
    electric: { color:'#F4C623', label:'Eléctrico',emoji:'⚡' },
    ice:      { color:'#78D6D1', label:'Hielo',    emoji:'❄️' },
    fighting: { color:'#C0392B', label:'Lucha',    emoji:'🥊' },
    poison:   { color:'#9B4F96', label:'Veneno',   emoji:'☠️' },
    ground:   { color:'#D4A85A', label:'Tierra',   emoji:'🌎' },
    flying:   { color:'#94A6E8', label:'Volador',  emoji:'🪽' },
    psychic:  { color:'#F0568C', label:'Psíquico', emoji:'🔮' },
    bug:      { color:'#9DB82C', label:'Bicho',    emoji:'🐛' },
    rock:     { color:'#B7A03C', label:'Roca',     emoji:'🪨' },
    ghost:    { color:'#6C5B9E', label:'Fantasma', emoji:'👻' },
    dragon:   { color:'#6F4CDB', label:'Dragón',   emoji:'🐉' },
    dark:     { color:'#5E4B3C', label:'Oscuro',   emoji:'🌙' },
    steel:    { color:'#9AA3B0', label:'Acero',    emoji:'⚙️' },
    fairy:    { color:'#E893AE', label:'Hada',     emoji:'✨' },
};
function infoTipo(t) { return tiposInfo[t] || tiposInfo.normal; }
const coloresBg  = ["rgba(59,91,219,0.16)","rgba(59,91,219,0.16)","rgba(124,58,237,0.16)","rgba(124,58,237,0.16)",
                    "rgba(219,39,119,0.16)","rgba(219,39,119,0.16)","rgba(219,39,119,0.16)",
                    "rgba(220,38,38,0.16)","rgba(220,38,38,0.16)"];
// Las carpetas se configuran desde el servidor (Ajustes → Configurar
// carpetas — wizard), para que todos los dispositivos vean la misma
// agrupación. Acá solo completamos `bg` y `rango`, que el servidor no
// guarda (solo nombre/color/gens, o nombre/color/desde/hasta).
let carpetas = [];
let modoCarpetasConfig = 'separadas'; // 'separadas' | 'seguidas'

function formatearRango(gens) {
    const ordenados = [...gens].sort((a, b) => a - b);
    const bloques = [];
    let inicio = ordenados[0], anterior = ordenados[0];
    for (let i = 1; i <= ordenados.length; i++) {
        const actual = ordenados[i];
        if (actual === anterior + 1) { anterior = actual; continue; }
        bloques.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
        inicio = anterior = actual;
    }
    return `Gens ${bloques.join(', ')}`;
}

function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

async function cargarCarpetasConfig() {
    try {
        const res = await fetch('/api/carpetas-config');
        if (!res.ok) throw new Error('respuesta no válida');
        const datos = await res.json();
        modoCarpetasConfig = datos.modo;
        carpetas = datos.carpetas.map(c => modoCarpetasConfig === 'seguidas'
            ? { nombre: c.nombre, color: c.color, bg: hexToRgba(c.color, 0.16), desde: c.desde, hasta: c.hasta, rango: `#${c.desde}–${c.hasta}`, espacios: c.espacios }
            : { nombre: c.nombre, color: c.color, bg: hexToRgba(c.color, 0.16), gens: c.gens, rango: formatearRango(c.gens), espacios: c.espacios }
        );
    } catch (err) {
        console.error('No se pudo cargar la configuración de carpetas:', err.message);
    }
}

// Ancla de una entrada a un id 1–1025: el suyo propio si es especie base, o
// el de su especie base si es una variante (mismo criterio que anclaId() en
// server.js, pero acá sobre las entradas que ya llegaron filtradas del server).
function anclaIdCliente(p) {
    return p.categoria ? p.especieBase : p.id;
}

const CATEGORIA_INFO = {
    regional:    { label: 'Regional',   color: '#0891b2' },
    mega:        { label: 'Mega',       color: '#7c3aed' },
    primigenia:  { label: 'Primigenia', color: '#dc2626' },
    gigamax:     { label: 'Gigamax',    color: '#db2777' },
    alternativa: { label: 'Alt.',       color: '#d97706' },
};

// Devuelve la carpeta a la que pertenece un Pokémon, según generación
// (modo separadas) o según su nº de Pokédex nacional (modo seguidas).
function carpetaDe(p) {
    if (modoCarpetasConfig === 'seguidas') {
        const ancla = anclaIdCliente(p);
        return carpetas.find(c => ancla >= c.desde && ancla <= c.hasta) || null;
    }
    return carpetas.find(c => c.gens.includes(p.gen)) || null;
}

// ── TEMA: claro / oscuro / auto (según el sistema) ─────────────────
// 'auto' no guarda atributo (respeta prefers-color-scheme); 'light'/'dark'
// fuerzan el tema sin importar lo que diga el sistema operativo.
let temaActual = localStorage.getItem('temaPreferido') || 'auto';

function aplicarTema() {
    if (temaActual === 'auto') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', temaActual);
    }
    const etiquetas = { auto: 'Auto (según el sistema)', light: '☀️ Claro', dark: '🌙 Oscuro' };
    const sub = document.getElementById('btn-tema-ajustes-sub');
    if (sub) sub.textContent = etiquetas[temaActual];
}

function toggleTema() {
    temaActual = temaActual === 'auto' ? 'light' : temaActual === 'light' ? 'dark' : 'auto';
    localStorage.setItem('temaPreferido', temaActual);
    aplicarTema();
}

// ── SESIÓN: solo hace falta para MODIFICAR, ver la colección es libre ──
// El servidor maneja la sesión real vía cookie httpOnly (el JS nunca la lee
// directamente). `sesionActiva` es solo para pintar la UI correctamente;
// la autorización real siempre la valida el servidor en cada escritura.
let sesionActiva = false;
let accionPendienteTrasLogin = null; // función a reintentar automáticamente si el login tiene éxito

async function revisarSesion() {
    try {
        const res = await fetch('/api/sesion');
        const data = await res.json();
        sesionActiva = !!data.activa;
    } catch (err) {
        sesionActiva = false;
    }
    actualizarBotonSesion();
}

function actualizarBotonSesion() {
    const texto = sesionActiva ? '🔓 Cerrar sesión' : '🔒 Iniciar sesión';
    const titulo = document.getElementById('btn-sesion-ajustes-titulo');
    if (titulo) titulo.textContent = sesionActiva ? 'Cerrar sesión' : 'Iniciar sesión';
    const icono = document.querySelector('#btn-sesion-ajustes .ajustes-item-icon');
    if (icono) icono.textContent = sesionActiva ? '🔓' : '🔒';
    const chev = document.querySelector('#btn-sesion-ajustes .ajustes-item-chev');
    if (chev) chev.style.display = sesionActiva ? 'none' : '';
}

function abrirLoginOLogout() {
    cerrarAjustes();
    if (sesionActiva) { cerrarSesion(); return; }
    abrirLoginModal();
}

function abrirLoginModal(accionPendiente) {
    cerrarAjustes();
    accionPendienteTrasLogin = accionPendiente || null;
    document.getElementById('login-error').classList.remove('visible');
    document.getElementById('login-password').value = '';
    document.getElementById('login-modal').classList.add('open');
    setTimeout(() => document.getElementById('login-password').focus(), 50);
}
function cerrarLoginModal() {
    document.getElementById('login-modal').classList.remove('open');
    accionPendienteTrasLogin = null;
}

async function intentarLogin() {
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('visible');
    try {
        const res = await fetch('/api/login', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            errBox.textContent = body.error || 'Contraseña incorrecta.';
            errBox.classList.add('visible');
            return;
        }
        sesionActiva = true;
        actualizarBotonSesion();
        cerrarLoginModal();
        mostrarToastInfo('Sesión iniciada.');
        if (accionPendienteTrasLogin) {
            const accion = accionPendienteTrasLogin;
            accionPendienteTrasLogin = null;
            accion();
        }
    } catch (err) {
        errBox.textContent = 'No se pudo conectar con el servidor.';
        errBox.classList.add('visible');
    }
}

async function cerrarSesion() {
    try { await fetch('/api/logout', { method:'POST' }); } catch (err) { /* no es grave si falla */ }
    sesionActiva = false;
    actualizarBotonSesion();
    mostrarToastInfo('Sesión cerrada.');
}

// Helper: si no hay sesión, abre el login y guarda `accion` para reintentarla
// automáticamente al iniciar sesión. Si ya hay sesión, corre `accion` directo.
// Devuelve true si la acción se ejecutó (o se puso en cola), false si no hizo nada.
function requiereSesion(accion) {
    if (sesionActiva) { accion(); return true; }
    abrirLoginModal(accion);
    return false;
}

// ── MODO: bulk vs carpetas — dos inventarios 100% independientes ──────
// La elección de modo es una preferencia local del dispositivo (como una pestaña
// abierta), no algo que se sincroniza; lo que sí sincroniza es el contenido de
// cada inventario por separado a través del backend.
let modoActual = localStorage.getItem('modoActivo') === 'bulk' ? 'bulk' : 'carpetas';

// Namespacing de localStorage por modo, para que "bulk" y "carpetas" nunca se pisen
// entre sí en el mismo dispositivo.
function claveLS(id)      { return `pk_${modoActual}_${id}`; }
function claveFechaLS(id) { return `pk_fecha_${modoActual}_${id}`; }
function tieneEnLS(id)    { return localStorage.getItem(claveLS(id)) === 'true'; }

function actualizarBotonesModo() {
    document.querySelectorAll('[data-modo-btn]').forEach(b => {
        b.classList.toggle('active', b.dataset.modoBtn === modoActual);
    });
    // Ámbar para Bulk (cartas sueltas), índigo para Carpetas (organizadas) —
    // este color se propaga a header/sidebar/tarjeta de progreso/badge, para
    // que siempre sea obvio en qué modo estás sin tener que leer nada.
    // rgba(var(--x-rgb),alpha) en vez de un rgba() fijo: así el fondo sigue al
    // color real de --accent/--accent2 del tema activo (antes quedaba anclado
    // al valor del tema claro y desentonaba en oscuro, sobre todo en Bulk
    // donde el acento pasa de ámbar a azul).
    const color = modoActual === 'carpetas' ? 'var(--accent2)' : 'var(--accent)';
    const bg    = modoActual === 'carpetas' ? 'rgba(var(--accent2-rgb),0.08)' : 'rgba(var(--accent-rgb),0.08)';
    document.documentElement.style.setProperty('--modo-color', color);
    document.documentElement.style.setProperty('--modo-bg', bg);

    const desplazado = modoActual === 'carpetas' ? 'translateX(100%)' : 'translateX(0)';
    document.querySelectorAll('.mode-switch-thumb').forEach(thumb => {
        thumb.style.background  = color;
        thumb.style.transform   = desplazado;
    });

    const textoBadge = modoActual === 'carpetas' ? '📁 Carpetas' : '📦 Bulk';
    document.querySelectorAll('.modo-badge').forEach(b => { b.textContent = textoBadge; });
}

async function cambiarModo(nuevo) {
    if (nuevo === modoActual) return;
    modoActual = nuevo;
    localStorage.setItem('modoActivo', nuevo);
    actualizarBotonesModo();
    cerrarGaleriaYVolver();
    if (streamCamara) toggleCamaraOCR();
    Object.keys(cachePokemon).forEach(k => delete cachePokemon[k]); // el estado tenemos/falta cambia con el modo
    await cargarEstadisticas();
    if (esDesktop()) verPokedexCompleta();
}

let pkSeleccionado   = null;
let streamCamara     = null;
let workerOCR        = null;
let genActualAbierta = null;
let scanActivo       = false;
let dataGlobalCache  = null;
let filtroActual     = 'todos';
let modoVista = localStorage.getItem('vistaGaleriaPreferida') || 'normal'; // 'chico' | 'normal' | 'grande'
let pkmsActuales     = [];
let historialOCR     = [];
let pendientesActuales    = []; // Pokémon en Bulk que aún no están en Carpetas
let fichaOrigenPendientes = false; // ¿la ficha abierta viene de la vista "Por acomodar"?

const cortesGen    = [0,0,151,251,386,493,649,721,809,905];
const cachePokemon = {};

// Debe coincidir con el breakpoint del layout de dos paneles en styles.css
// (@media min-width:768px) — si se desalinean, el CSS muestra el shell de
// escritorio pero el JS sigue pensando que es mobile (o viceversa) y la
// galería queda en blanco.
const esDesktop = () => window.innerWidth >= 768;

// ── TOASTS (error / info) ──────────────────────────────────────────
let errorToastTimer = null;
function mostrarToastError(msg) {
    let toast = document.getElementById('error-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'error-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--danger);border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;color:#fff;box-shadow:0 4px 16px var(--shadow);z-index:800;max-width:calc(100vw - 32px);text-align:center;opacity:0;transition:opacity .2s ease;';
        document.body.appendChild(toast);
    }
    toast.textContent = `⚠️ ${msg}`;
    toast.style.opacity = '1';
    clearTimeout(errorToastTimer);
    errorToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
let infoToastTimer = null;
function mostrarToastInfo(msg) {
    let toast = document.getElementById('info-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'info-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--accent2);border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;color:#fff;box-shadow:0 4px 16px var(--shadow);z-index:800;max-width:calc(100vw - 32px);text-align:center;opacity:0;transition:opacity .2s ease;';
        document.body.appendChild(toast);
    }
    toast.textContent = `ℹ️ ${msg}`;
    toast.style.opacity = '1';
    clearTimeout(infoToastTimer);
    infoToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// Toast con botón de acción: aparece al desmarcar una carta, para revertir
// el cambio sin tener que buscarla de nuevo. Conserva la fecha original
// (la que ya tenía guardada) en vez de ponerle la fecha de "ahora".
let deshacerToastTimer = null;
function mostrarToastDeshacer(idPk, fechaPreservada, nombrePk) {
    let toast = document.getElementById('deshacer-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'deshacer-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 8px 8px 16px;font-size:12px;font-weight:600;color:var(--text);box-shadow:0 4px 16px var(--shadow);z-index:800;white-space:nowrap;opacity:0;transition:opacity .2s ease;display:flex;align-items:center;gap:10px;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>Quitaste a ${(nombrePk || '').toLowerCase()}</span>
        <button id="btn-deshacer-toast" style="background:var(--accent2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-weight:700;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;letter-spacing:.04em;">DESHACER</button>`;
    toast.style.opacity = '1';

    document.getElementById('btn-deshacer-toast').onclick = async () => {
        clearTimeout(deshacerToastTimer);
        toast.style.opacity = '0';
        try {
            const res = await fetch('/api/inventario', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ id: idPk, estado: true, fecha: fechaPreservada || new Date().toISOString(), modo: modoActual })
            });
            if (!res.ok) throw new Error('respuesta no válida');
            localStorage.setItem(claveLS(idPk), 'true');
            if (fechaPreservada) guardarFechaRegistro(idPk, fechaPreservada);
            await cargarEstadisticasSinMoverScroll();
            actualizarBadgePendientes();
        } catch (err) {
            mostrarToastError('No se pudo deshacer. Márcalo manualmente de nuevo.');
        }
    };

    clearTimeout(deshacerToastTimer);
    deshacerToastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 6000);
}

// Toast con acción: avisa que activar una categoría de variantes dejó la
// capacidad de las carpetas ya configuradas por debajo de lo necesario. No
// bloquea nada — la config vieja sigue funcionando, esto es solo un aviso
// con un atajo directo a re-abrir el wizard y ajustar.
let avisoCapacidadTimer = null;
function mostrarToastAvisoCapacidad(msg) {
    let toast = document.getElementById('aviso-capacidad-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aviso-capacidad-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 8px 8px 16px;font-size:12px;font-weight:600;color:var(--text);box-shadow:0 4px 16px var(--shadow);z-index:800;max-width:calc(100vw - 32px);opacity:0;transition:opacity .2s ease;display:flex;align-items:center;gap:10px;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${msg}</span>
        <button id="btn-ajustar-capacidad" style="background:var(--accent2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-weight:700;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;letter-spacing:.04em;white-space:nowrap;">AJUSTAR</button>`;
    toast.style.opacity = '1';
    clearTimeout(avisoCapacidadTimer);
    avisoCapacidadTimer = setTimeout(() => { toast.style.opacity = '0'; }, 6000);
    document.getElementById('btn-ajustar-capacidad').onclick = () => {
        toast.style.opacity = '0';
        cerrarPanelVariantes();
        abrirWizardCarpetas();
    };
}

// Revisa, después de guardar variantes-config, si la capacidad de carpetas ya
// configurada alcanza para la colección efectiva actual — si no, avisa (no
// bloquea nada: la config vieja sigue funcionando mientras tanto).
async function revisarCapacidadCarpetas() {
    if (!carpetas.length) return; // todavía no se configuraron carpetas
    if (modoCarpetasConfig === 'separadas') {
        for (const c of carpetas) {
            const necesario = c.gens.reduce((acc, gen) => acc + (dataGlobalCache.generaciones[gen]?.total || 0), 0);
            if (necesario > c.espacios) {
                mostrarToastAvisoCapacidad(`"${c.nombre}" necesita ${necesario} espacios y tiene ${c.espacios} — ajustá tus carpetas cuando puedas.`);
                return;
            }
        }
        return;
    }
    for (const c of carpetas) {
        try {
            const res = await fetch(`/api/buscar?desde=${c.desde}&hasta=${c.hasta}`);
            if (!res.ok) continue;
            const lista = await res.json();
            if (lista.length > c.espacios) {
                mostrarToastAvisoCapacidad(`"${c.nombre}" necesita ${lista.length} espacios y tiene ${c.espacios} — ajustá tus carpetas cuando puedas.`);
                return;
            }
        } catch { /* no bloquea el flujo si falla la revisión */ }
    }
}

// Fetch con manejo de error: devuelve null y avisa al usuario si algo falla.
async function fetchGenSegura(g) {
    try {
        const res = await fetch(`/api/buscar?gen=${g}`);
        if (!res.ok) throw new Error('respuesta no válida');
        return await res.json();
    } catch (err) {
        mostrarToastError(`No se pudo cargar la generación ${g}. Reintenta.`);
        return null;
    }
}

async function fetchRangoSegura(desde, hasta) {
    try {
        const res = await fetch(`/api/buscar?desde=${desde}&hasta=${hasta}`);
        if (!res.ok) throw new Error('respuesta no válida');
        return await res.json();
    } catch (err) {
        mostrarToastError(`No se pudo cargar el rango #${desde}-${hasta}. Reintenta.`);
        return null;
    }
}

function guardarFechaRegistro(id, isoDelServidor) {
    if (!localStorage.getItem(claveFechaLS(id)) || isoDelServidor) {
        localStorage.setItem(claveFechaLS(id), isoDelServidor || new Date().toISOString());
    }
}
function getFechaRegistro(id) {
    const iso = localStorage.getItem(claveFechaLS(id));
    if (!iso) return null;
    return new Date(iso).toLocaleDateString('es', { day:'numeric', month:'short', year:'numeric' });
}
function getFechaISO(id) {
    return localStorage.getItem(claveFechaLS(id)) || null;
}

function calcularJalon(conseguidos, total) {
    if (total <= 0) return null;
    const faltan = total - conseguidos;
    if (faltan === 0) return '🎉 ¡Completado!';
    if (faltan <= 5)  return `🔥 Solo te faltan ${faltan} para completar esta generación`;
    if (faltan <= 10) return `⚡ ¡Casi! Faltan ${faltan} Pokémon`;
    const pct = Math.round((conseguidos / total) * 100);
    if (pct >= 90)    return `💪 Al ${pct}% — ¡casi lo logras!`;
    return null;
}

// Progreso de una carpeta, sin importar el modo: en "separadas" se suma por
// generación (ya lo tenemos agregado en dataGlobalCache.generaciones); en
// "seguidas" se cuenta directo sobre el rango de ids, usando el mapa de
// poseídos que ya viaja en dataGlobalCache.listaIds — sin pedir nada nuevo
// al servidor.
function progresoCarpeta(c, d = dataGlobalCache) {
    if (c.gens) {
        const conseguidos = c.gens.reduce((a, g) => a + (d.generaciones[g]?.conseguidos || 0), 0);
        const total       = c.gens.reduce((a, g) => a + (d.generaciones[g]?.total || 0), 0);
        return { conseguidos, total };
    }
    let conseguidos = 0;
    for (let id = c.desde; id <= c.hasta; id++) {
        if (d.listaIds && d.listaIds[id]) conseguidos++;
    }
    return { conseguidos, total: c.hasta - c.desde + 1 };
}

// ── SIDEBAR ──────────────────────────────────────────────────────
function renderSidebar() {
    if (!dataGlobalCache) return;
    const d = dataGlobalCache;

    const cons  = d.global.conseguidos || 0;
    const total = d.global.total || 1025;
    const pct   = Math.round((cons / total) * 100);
    const sbBar = document.getElementById('sb-bar');
    const sbPct = document.getElementById('sb-pct');
    const sbCnt = document.getElementById('sb-count');
    if (sbBar) sbBar.style.width = pct + '%';
    if (sbPct) sbPct.textContent = pct + '%';
    if (sbCnt) sbCnt.textContent = cons;

    const wrap = document.getElementById('sb-carpetas');
    if (!wrap) return;
    wrap.innerHTML = '';

    carpetas.forEach(c => {
        const { conseguidos: cCons, total: cTotal } = progresoCarpeta(c, d);
        const cPct = cTotal > 0 ? Math.round((cCons / cTotal) * 100) : 0;

        const div = document.createElement('div');
        div.className = 'sb-carpeta';
        const isActiveCarpeta = genActualAbierta?.esCarpeta && genActualAbierta?.carpeta?.nombre === c.nombre;

        div.innerHTML = `
            <div class="sb-carpeta-header${isActiveCarpeta ? ' active' : ''}">
                <div class="sb-carpeta-left">
                    <div class="sb-carpeta-dot" style="background:${c.color}"></div>
                    <span class="sb-carpeta-name">${c.nombre}</span>
                    <span class="sb-carpeta-range">${c.rango}</span>
                </div>
                <span class="sb-carpeta-count" style="color:${c.color}">${cCons}/${cTotal}</span>
            </div>
            <div class="sb-carpeta-bar">
                <div class="sb-carpeta-bar-fill" style="width:${cPct}%;background:${c.color}"></div>
            </div>`;
        div.querySelector('.sb-carpeta-header').onclick = () => verCarpeta(c);

        // La sublista de generaciones solo tiene sentido en modo "separadas"
        // (cada carpeta ES un conjunto de generaciones); en "seguidas" una
        // carpeta puede cortar una generación al medio, así que no se listan.
        if (c.gens) {
            const gensDiv = document.createElement('div');
            gensDiv.className = 'sb-gens';
            c.gens.forEach(g => {
                const gd       = d.generaciones[g];
                const isActive = !genActualAbierta?.esCarpeta && !genActualAbierta?.esCompleta && genActualAbierta?.gen === g;
                const item     = document.createElement('div');
                item.className = `sb-gen-item${isActive ? ' active' : ''}`;
                item.onclick   = () => verListadoGeneracion(g, regiones[g-1]);
                item.innerHTML = `<span class="sb-gen-name">${regiones[g-1]}</span><span class="sb-gen-count" style="color:${c.color}">${gd.conseguidos}/${gd.total}</span>`;
                gensDiv.appendChild(item);
            });
            div.appendChild(gensDiv);
        }
        wrap.appendChild(div);
    });
}

// ── BARRA CARPETAS (mobile progress card) ────────────────────────
function renderBinderBar() {
    const bar    = document.getElementById('binder-bar');
    const legend = document.getElementById('binder-legend');
    if (!bar || !legend || !dataGlobalCache) return;
    bar.innerHTML = ''; legend.innerHTML = '';
    carpetas.forEach(c => {
        const { total: t } = progresoCarpeta(c);
        const seg = document.createElement('button');
        seg.className = 'binder-bar-segment';
        seg.style.flex = t || 1;
        seg.style.background = c.color;
        seg.title = `Carpeta ${c.nombre} — ${c.rango}`;
        seg.onclick = (e) => { e.stopPropagation(); verCarpeta(c); };
        bar.appendChild(seg);
        const item = document.createElement('button');
        item.className = 'binder-legend-item';
        item.onclick = (e) => { e.stopPropagation(); verCarpeta(c); };
        item.innerHTML = `<span class="binder-legend-dot" style="background:${c.color}"></span><span class="binder-legend-name">${c.nombre}</span><span class="binder-legend-range">${c.rango}</span>`;
        legend.appendChild(item);
    });
}

// ── ESTADÍSTICAS (siempre contra el modo activo) ─────────────────
// Reconstruye las tarjetas "Gen N · conseguidos/total" de la pantalla de
// inicio (mobile). En escritorio no hace falta: ahí los totales por
// generación se muestran vía renderSidebar(), que lee dataGlobalCache en
// vivo en cada llamada.
function renderGridGeneraciones(data) {
    const grid = document.getElementById('grid-generaciones');
    grid.innerHTML = '';
    for (let g = 1; g <= 9; g++) {
        const gd     = data.generaciones[g];
        const pct    = gd.total > 0 ? ((gd.conseguidos / gd.total) * 100).toFixed(0) : 0;
        const faltan = gd.total - gd.conseguidos;
        const ok     = faltan === 0 && gd.total > 0;
        const card   = document.createElement('div');
        card.className = 'gen-card';
        card.onclick = () => verListadoGeneracion(g, regiones[g-1]);
        card.innerHTML = `
            <div class="gen-card-bar" style="background:${coloresGen[g-1]};"></div>
            <div class="gen-num" style="color:${coloresGen[g-1]};background:${coloresBg[g-1]};">Gen ${g}</div>
            <div class="gen-region">${regiones[g-1]}</div>
            <div class="gen-progress-text">${gd.conseguidos}/${gd.total}</div>
            <div class="gen-missing" style="color:${ok ? 'var(--found)' : coloresGen[g-1]};">${ok ? '✓ completo' : `faltan ${faltan}`}</div>
            <div class="gen-bar-bg"><div class="gen-bar-fill" style="width:${pct}%;background:${coloresGen[g-1]};"></div></div>`;
        grid.appendChild(card);
    }
}

async function cargarEstadisticas() {
    let data;
    try {
        const res = await fetch(`/api/estadisticas?modo=${modoActual}&nocache=${Date.now()}`);
        if (!res.ok) throw new Error('respuesta no válida');
        data = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo cargar la colección. Revisa tu conexión.');
        return;
    }
    dataGlobalCache = data;
    sincronizarLocalStorageDesde(data);
    actualizarTarjetaProgreso();
    renderBinderBar();
    renderSidebar();
    const total = Object.keys(data.listaIds || {}).length;
    document.getElementById('brand-count').textContent = `${total} / ${data.global.total || 1025}`;
    renderGridGeneraciones(data);
    if (genActualAbierta) RefrescarGaleria(false);
}

async function cargarEstadisticasSinMoverScroll() {
    let data;
    try {
        const res = await fetch(`/api/estadisticas?modo=${modoActual}&nocache=${Date.now()}`);
        if (!res.ok) throw new Error('respuesta no válida');
        data = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo sincronizar. Revisa tu conexión.');
        return;
    }
    dataGlobalCache = data;
    sincronizarLocalStorageDesde(data);
    actualizarTarjetaProgreso();
    renderBinderBar();
    renderSidebar();
    const total = Object.keys(data.listaIds || {}).length;
    document.getElementById('brand-count').textContent = `${total} / ${data.global.total || 1025}`;
    renderGridGeneraciones(data);
    if (genActualAbierta) RefrescarGaleria(true);
}

// Reconstruye el espejo local (localStorage) del inventario del modo activo,
// a partir de lo que diga el servidor. Nunca toca las claves del OTRO modo.
function sincronizarLocalStorageDesde(data) {
    const prefijo = `pk_${modoActual}_`;
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith(prefijo) && !key.startsWith(`pk_fecha_${modoActual}_`)) {
            localStorage.removeItem(key);
        }
    });
    if (data.listaIds) {
        Object.keys(data.listaIds).forEach(id => localStorage.setItem(claveLS(id), 'true'));
    }
    if (data.fechas) {
        Object.entries(data.fechas).forEach(([id, fecha]) => guardarFechaRegistro(id, fecha));
    }
}

function actualizarTarjetaProgreso() {
    if (!dataGlobalCache) return;
    if (genActualAbierta?.esPendientes) return; // esta vista actualiza su propia tarjeta (ver actualizarTarjetaProgresoPendientes)
    document.getElementById('circle-wrap').style.display = ''; // por si veníamos de "Por acomodar", que lo oculta
    document.getElementById('global-count-de').style.display = ''; // idem para el "de"
    let conseguidos, total;
    if (genActualAbierta && !genActualAbierta.esCarpeta && !genActualAbierta.esCompleta) {
        const gd = dataGlobalCache.generaciones[genActualAbierta.gen];
        conseguidos = gd.conseguidos; total = gd.total;
    } else if (genActualAbierta?.esCarpeta) {
        ({ conseguidos, total } = progresoCarpeta(genActualAbierta.carpeta));
    } else {
        conseguidos = dataGlobalCache.global.conseguidos || 0;
        total       = dataGlobalCache.global.total || 1025;
    }
    const pct = Math.round((conseguidos / total) * 100);
    document.getElementById('global-count-num').textContent   = conseguidos;
    document.getElementById('global-count-total').textContent = total;
    document.getElementById('global-percentage').textContent  = pct + '%';
    document.getElementById('global-circle').setAttribute('stroke-dasharray', `${pct},100`);
    const label = genActualAbierta ? `${genActualAbierta.region} · Progreso` : 'Progreso de la colección';
    document.getElementById('stat-card-title').textContent = label;
    const jEl = document.getElementById('jalon-global');
    const j   = calcularJalon(conseguidos, total);
    if (j) { jEl.textContent = j; jEl.classList.add('visible'); }
    else    { jEl.classList.remove('visible'); }
}

// ── VER CARPETA ──────────────────────────────────────────────────
async function verCarpeta(carpeta) {
    genActualAbierta = { gen: carpeta.gens ? carpeta.gens[0] : null, region: `Carpeta ${carpeta.nombre}`, esCarpeta: true, carpeta };
    actualizarTarjetaProgreso();
    renderSidebar();
    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    mostrarGalleryShell(`Carpeta ${carpeta.nombre}`);
    let todos;
    if (carpeta.gens) {
        todos = [];
        for (const g of carpeta.gens) {
            if (!cachePokemon[g]) {
                const datos = await fetchGenSegura(g);
                if (!datos) continue;
                cachePokemon[g] = datos;
            }
            todos.push(...cachePokemon[g]);
        }
    } else {
        todos = await fetchRangoSegura(carpeta.desde, carpeta.hasta) || [];
    }
    pkmsActuales = todos;
    renderGaleria(todos, false);
}

// ── VER POKÉDEX COMPLETA ──────────────────────────────────────────
async function verPokedexCompleta() {
    genActualAbierta = { gen: null, region: 'Pokédex Completa', esCarpeta: false, esCompleta: true };
    actualizarTarjetaProgreso();
    renderSidebar();
    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    mostrarGalleryShell('Pokédex Completa');

    const todos = [];
    for (let g = 1; g <= 9; g++) {
        if (!cachePokemon[g]) {
            const datos = await fetchGenSegura(g);
            if (!datos) continue;
            cachePokemon[g] = datos;
        }
        todos.push(...cachePokemon[g]);
    }
    pkmsActuales = todos;
    setFiltro(filtroActual);
}

// ── SINCRONIZADOR: qué hay en Bulk que aún no está en Carpetas ────
// Trae y cachea las 9 generaciones completas (para poder filtrar por id sin
// importar en qué generación cayó cada Pokémon).
async function obtenerTodosPokemon() {
    const todos = [];
    for (let g = 1; g <= 9; g++) {
        if (!cachePokemon[g]) {
            const datos = await fetchGenSegura(g);
            if (!datos) continue;
            cachePokemon[g] = datos;
        }
        todos.push(...cachePokemon[g]);
    }
    return todos;
}

// Compara los dos inventarios en el servidor y devuelve los ids que están en
// Bulk pero no en Carpetas. null si algo falló de red.
async function calcularIdsPendientes() {
    let bulkData, carpetasData;
    try {
        const [rBulk, rCarp] = await Promise.all([
            fetch(`/api/estadisticas?modo=bulk&nocache=${Date.now()}`),
            fetch(`/api/estadisticas?modo=carpetas&nocache=${Date.now()}`)
        ]);
        if (!rBulk.ok || !rCarp.ok) throw new Error('respuesta no válida');
        bulkData = await rBulk.json();
        carpetasData = await rCarp.json();
    } catch (err) {
        mostrarToastError('No se pudo comparar Bulk y Carpetas. Revisa tu conexión.');
        return null;
    }
    const idsEnCarpetas = new Set(Object.keys(carpetasData.listaIds || {}).map(Number));
    return Object.keys(bulkData.listaIds || {}).map(Number).filter(id => !idsEnCarpetas.has(id));
}

function actualizarTarjetaProgresoPendientes(cantidad) {
    document.getElementById('global-count-num').textContent   = cantidad;
    document.getElementById('global-count-total').textContent = '';
    document.getElementById('global-count-de').style.display  = 'none'; // acá no hay "total", "de" sin nada después se ve raro
    document.getElementById('global-percentage').textContent  = cantidad > 0 ? '' : '✓';
    // No hay un "total" natural del cual esto sea un porcentaje, así que el
    // círculo no tiene nada que representar acá — mejor ocultarlo que mostrarlo
    // casi vacío con un punto perdido (antes quedaba fijo en dasharray "0,100").
    document.getElementById('circle-wrap').style.display = cantidad > 0 ? 'none' : '';
    if (cantidad === 0) document.getElementById('global-circle').setAttribute('stroke-dasharray', '100,100');
    document.getElementById('stat-card-title').textContent = 'Por acomodar en Carpetas';
    document.getElementById('stat-card-subtitle').textContent = cantidad > 0
        ? 'Tienes estas cartas en Bulk, todavía no están en tus carpetas'
        : '¡Todo lo que tienes en Bulk ya está acomodado!';
    document.getElementById('jalon-global').classList.remove('visible');
}

// ── CONFETI: celebración al completar una generación o el 100% ────
function lanzarConfeti() {
    const contenedor = document.createElement('div');
    contenedor.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1000;overflow:hidden;';
    document.body.appendChild(contenedor);
    const colores = ['#3b5bdb','#7c3aed','#db2777','#dc2626','#f59e0b','#10b981'];
    for (let i = 0; i < 40; i++) {
        const p = document.createElement('div');
        const color    = colores[Math.floor(Math.random() * colores.length)];
        const izquierda = Math.random() * 100;
        const retraso   = Math.random() * 0.4;
        const duracion  = 1.8 + Math.random() * 1.2;
        const tamano    = 6 + Math.random() * 6;
        p.style.cssText = `position:absolute;top:-10px;left:${izquierda}%;width:${tamano}px;height:${tamano}px;background:${color};border-radius:${Math.random() > 0.5 ? '50%' : '2px'};opacity:0.9;animation:confeti-caida ${duracion}s ease-in ${retraso}s forwards;`;
        contenedor.appendChild(p);
    }
    setTimeout(() => contenedor.remove(), 3200);
}

// Compara el snapshot de estadísticas ANTES de un cambio contra el de DESPUÉS,
// y lanza confeti si alguna generación (o la colección completa) pasó de
// incompleta a completa. Se usa alrededor de cargarEstadisticasSinMoverScroll().
function detectarYCelebrarCompletado(statsAntes, statsDespues) {
    if (!statsAntes || !statsDespues) return;
    const globalAntesCompleto = statsAntes.global.conseguidos >= statsAntes.global.total && statsAntes.global.total > 0;
    const globalDespuesCompleto = statsDespues.global.conseguidos >= statsDespues.global.total && statsDespues.global.total > 0;
    if (!globalAntesCompleto && globalDespuesCompleto) { lanzarConfeti(); return; }
    for (let g = 1; g <= 9; g++) {
        const antes = statsAntes.generaciones[g], despues = statsDespues.generaciones[g];
        if (!antes || !despues) continue;
        const eraCompleta = antes.conseguidos >= antes.total && antes.total > 0;
        const esCompleta  = despues.conseguidos >= despues.total && despues.total > 0;
        if (!eraCompleta && esCompleta) { lanzarConfeti(); return; }
    }
}

// ── IMPORTAR RESPALDO ───────────────────────────────────────────────
function dispararInputImportar() {
    requiereSesion(() => document.getElementById('input-importar').click());
}
async function manejarArchivoImportar(event) {
    const archivo = event.target.files[0];
    event.target.value = ''; // para poder volver a elegir el mismo archivo después
    if (!archivo) return;

    let data;
    try {
        const texto = await archivo.text();
        data = JSON.parse(texto);
    } catch (err) {
        mostrarToastError('Ese archivo no es un JSON válido.');
        return;
    }
    if (!data || (!data.bulk && !data.carpetas)) {
        mostrarToastError('Ese archivo no tiene el formato de un respaldo de esta app.');
        return;
    }
    const registros = data[modoActual];
    if (!Array.isArray(registros)) {
        mostrarToastError(`El archivo no trae datos para "${modoActual}".`);
        return;
    }
    const ok = confirm(
        `Esto REEMPLAZA todo tu inventario actual de "${modoActual === 'bulk' ? 'Bulk' : 'Carpetas'}" ` +
        `con los ${registros.length} registros de este archivo. Se guarda un respaldo del estado actual por si acaso. ¿Continuar?`
    );
    if (!ok) return;

    try {
        const res = await fetch('/api/importar', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ modo: modoActual, registros })
        });
        if (res.status === 401) {
            abrirLoginModal(() => document.getElementById('input-importar').click());
            return;
        }
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'respuesta no válida');
        mostrarToastInfo(`Importado: ${body.importados} registros${body.ignorados ? ` (${body.ignorados} ignorados)` : ''}.`);
        Object.keys(cachePokemon).forEach(k => delete cachePokemon[k]);
        cerrarGaleriaYVolver();
        await cargarEstadisticasSinMoverScroll();
        actualizarBadgePendientes();
    } catch (err) {
        mostrarToastError('No se pudo importar el respaldo. Revisa el archivo o tu conexión.');
    }
}

// ── LISTA DE FALTANTES (descarga en texto plano) ──────────────────
async function descargarListaFaltantes() {
    if (!dataGlobalCache) { mostrarToastError('Espera a que cargue la colección.'); return; }
    const todos = await obtenerTodosPokemon();
    const tenidos = new Set(Object.keys(dataGlobalCache.listaIds || {}).map(Number));
    const faltan = todos.filter(p => !tenidos.has(p.id)).sort((a,b) => a.id - b.id);
    if (!faltan.length) { mostrarToastInfo('¡No te falta ningún Pokémon en este modo!'); return; }

    const encabezado = `Pokémon que faltan — ${modoActual === 'bulk' ? 'Bulk' : 'Carpetas'}\n` +
        `Generado el ${new Date().toLocaleDateString('es', { day:'numeric', month:'long', year:'numeric' })}\n` +
        `Total: ${faltan.length}\n\n`;
    const lineas = faltan.map(p => `#${p.id.toString().padStart(4,'0')}  ${p.name.toLowerCase()}`).join('\n');

    const blob = new Blob([encabezado + lineas], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `pokedex-faltantes-${modoActual}-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function verPendientesAcomodar() {
    const ids = await calcularIdsPendientes();
    if (ids === null) return;
    const todosPokemon = await obtenerTodosPokemon();
    const idsSet = new Set(ids);
    const pkms = todosPokemon.filter(p => idsSet.has(p.id)).sort((a,b) => a.id - b.id);

    genActualAbierta = { gen: null, region: 'Por acomodar', esPendientes: true };
    pendientesActuales = pkms;
    pkmsActuales = pkms;

    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    // Aquí no aplica "Todos/Tenemos/Faltan": todo lo que se muestra ya es "pendiente" por definición.
    document.querySelectorAll('.gallery-filter').forEach(f => f.style.display = 'none');
    mostrarGalleryShell(`Por acomodar (${pkms.length})`, 'Están en Bulk, todavía no en tus carpetas');
    actualizarTarjetaProgresoPendientes(pkms.length);
    renderGaleria(pkms, false, false, true);
    actualizarBadgePendientes(pkms.length); // ya lo calculamos, aprovechamos para refrescar el badge
}

// Actualiza el numerito del botón "Por acomodar". Si no se le pasa una cantidad
// ya calculada, la calcula (dos fetches ligeros). Falla en silencio: el badge
// es informativo, no vale la pena molestar al usuario si por algo no cargó.
async function actualizarBadgePendientes(cantidadConocida) {
    let cantidad = cantidadConocida;
    if (cantidad === undefined) {
        const ids = await calcularIdsPendientesSilencioso();
        if (ids === null) return;
        cantidad = ids.length;
    }
    document.querySelectorAll('.btn-badge').forEach(b => {
        b.textContent = cantidad > 99 ? '99+' : String(cantidad);
        b.classList.toggle('visible', cantidad > 0);
    });
}
// Igual que calcularIdsPendientes pero sin mostrar toast de error (se usa en
// segundo plano para el badge, no queremos interrumpir al usuario por eso).
async function calcularIdsPendientesSilencioso() {
    try {
        const [rBulk, rCarp] = await Promise.all([
            fetch(`/api/estadisticas?modo=bulk&nocache=${Date.now()}`),
            fetch(`/api/estadisticas?modo=carpetas&nocache=${Date.now()}`)
        ]);
        if (!rBulk.ok || !rCarp.ok) throw new Error('respuesta no válida');
        const bulkData = await rBulk.json();
        const carpetasData = await rCarp.json();
        const idsEnCarpetas = new Set(Object.keys(carpetasData.listaIds || {}).map(Number));
        return Object.keys(bulkData.listaIds || {}).map(Number).filter(id => !idsEnCarpetas.has(id));
    } catch (err) {
        return null;
    }
}

// ── EXPORTAR / RESPALDAR COLECCIÓN ──────────────────────────────────
async function exportarColeccion() {
    let data;
    try {
        const res = await fetch('/api/exportar');
        if (!res.ok) throw new Error('respuesta no válida');
        data = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo generar el respaldo. Revisa tu conexión.');
        return;
    }
    const fechaArchivo = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `pokedex-tcg-respaldo-${fechaArchivo}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    mostrarToastInfo('Respaldo descargado.');
}

// ── PDF DE RECORTABLES PARA CARPETAS ────────────────────────────────
async function descargarRecortablesPDF() {
    const btn   = document.getElementById('btn-pdf-recortables');
    const icono = document.getElementById('btn-pdf-recortables-icon');
    const sub   = document.getElementById('btn-pdf-recortables-sub');
    if (btn.disabled) return; // ya se está generando, ignoramos clicks de más

    const carpetasElegidas = [...document.querySelectorAll('.pdf-carpeta-check:checked')].map(c => c.value);
    if (!carpetasElegidas.length) {
        mostrarToastError('Elegí al menos una carpeta.');
        return;
    }
    const incluirPortadas = modoCarpetasConfig === 'seguidas' ? false : document.getElementById('pdf-check-portadas').checked;
    const numeros = document.querySelector('input[name="pdf-numeros"]:checked').value;
    const params = new URLSearchParams({
        carpetas: carpetasElegidas.join(','),
        portadas: incluirPortadas ? '1' : '0',
        numeros
    });

    const subOriginal = sub.textContent;
    btn.disabled = true;
    icono.textContent = '⏳';
    icono.classList.add('girando');
    sub.textContent = 'Generando... puede tardar un minuto';

    try {
        const res = await fetch(`/api/pdf-carpetas?${params.toString()}`);
        if (!res.ok) throw new Error('respuesta no válida');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `pokedex-recortables-${new Date().toISOString().slice(0,10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        mostrarToastInfo('PDF listo.');
    } catch (err) {
        mostrarToastError('No se pudo generar el PDF. Revisa tu conexión.');
    } finally {
        btn.disabled = false;
        icono.textContent = '✂️';
        icono.classList.remove('girando');
        sub.textContent = subOriginal;
    }
}

// ── GALLERY ──
async function verListadoGeneracion(gen, region) {
    genActualAbierta = { gen, region, esCarpeta: false };
    actualizarTarjetaProgreso();
    renderSidebar();
    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        document.getElementById('sugerencias').style.display = 'none';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    mostrarGalleryShell(region);
    await RefrescarGaleria();
}

function mostrarGalleryShell(titulo, subtitulo = '') {
    const tEl  = document.getElementById('gallery-title-text');
    const tElD = document.getElementById('gallery-title-text-desktop');
    if (tEl)  tEl.textContent  = titulo;
    if (tElD) tElD.textContent = titulo;
    // Siempre se pisa el subtítulo (aunque sea con ''): si no, en la vista
    // "Por acomodar" (que no llama actualizarGalleryHeader) se queda pegado
    // el subtítulo de la última generación que se haya visto antes.
    const sEl  = document.getElementById('gallery-subtitle-text');
    const sElD = document.getElementById('gallery-subtitle-text-desktop');
    if (sEl)  sEl.textContent  = subtitulo;
    if (sElD) sElD.textContent = subtitulo;
}

function actualizarGalleryHeader() {
    if (!genActualAbierta) return;
    if (genActualAbierta.esPendientes) return; // el título ya trae el conteo (ver mostrarGalleryShell)
    const tenemos = pkmsActuales.filter(p => tieneEnLS(p.id)).length;
    const faltan  = pkmsActuales.length - tenemos;
    const sub     = `${tenemos} de ${pkmsActuales.length} · faltan ${faltan}`;
    const sEl  = document.getElementById('gallery-subtitle-text');
    const sElD = document.getElementById('gallery-subtitle-text-desktop');
    if (sEl)  sEl.textContent  = sub;
    if (sElD) sElD.textContent = sub;
}

function setFiltro(f) {
    filtroActual = f;
    ['todos','tenemos','faltan'].forEach(x => {
        const a = document.getElementById(`filter-${x}`);
        const b = document.getElementById(`filter-${x}-d`);
        if (a) a.classList.toggle('active', x === f);
        if (b) b.classList.toggle('active', x === f);
    });
    const filtrados = pkmsActuales.filter(p => {
        const tiene = tieneEnLS(p.id);
        if (f === 'tenemos') return tiene;
        if (f === 'faltan')  return !tiene;
        return true;
    });
    renderGaleria(filtrados, true);
}

function aplicarModoVista() {
    const grids = [document.getElementById('gallery-grid'), document.getElementById('gallery-grid-mobile')];
    grids.forEach(g => g && g.classList.toggle('vista-chico', modoVista === 'chico'));
    grids.forEach(g => g && g.classList.toggle('vista-grande', modoVista === 'grande'));
    document.querySelectorAll('.vista-btn').forEach(b => b.classList.toggle('active', b.dataset.vista === modoVista));
}

function elegirModoVista(modo) {
    modoVista = modo;
    localStorage.setItem('vistaGaleriaPreferida', modo);
    aplicarModoVista();
    if (genActualAbierta) RefrescarGaleria(true);
}

function gridActivo() {
    return esDesktop()
        ? document.getElementById('gallery-grid')
        : document.getElementById('gallery-grid-mobile');
}

function renderGaleria(pkms, mantenerScroll, forzarEstado, esVistaPendientes) {
    const grid       = gridActivo();
    const scrollEl   = esDesktop() ? document.querySelector('.desktop-grid-scroll') : document.getElementById('scroll-root');
    const scrollPos  = mantenerScroll && scrollEl ? scrollEl.scrollTop : 0;

    const frag = document.createDocumentFragment();
    pkms.forEach(p => {
        // En la vista "Por acomodar" el estado no depende del modo que estés viendo:
        // ahí siempre se muestran como pendientes (forzarEstado=false), sin consultar localStorage.
        const tiene   = (forzarEstado !== undefined) ? forzarEstado : tieneEnLS(p.id);
        const ancla   = anclaIdCliente(p);
        let numR      = ancla - cortesGen[p.gen];
        if (ancla >= 899 && ancla <= 905) numR = ancla - 809;
        const prefijo = (ancla >= 899 && ancla <= 905) ? 'H' : 'R';
        const ridTxt  = `${prefijo}#${numR.toString().padStart(3,'0')}`;
        const nidTxt  = `N#${ancla.toString().padStart(4,'0')}`;
        const catInfo = p.categoria ? CATEGORIA_INFO[p.categoria] : null;

        const tiposPk   = p.types && p.types.length ? p.types : ['normal'];
        const pillsHTML = tiposPk.map(t => {
            const info = infoTipo(t);
            return `<span class="tipo-pill-mini" style="background:${hexToRgba(info.color,0.16)};color:${info.color};">${info.emoji} ${info.label}</span>`;
        }).join('');
        const fechaTxt = tiene ? getFechaRegistro(p.id) : null;

        const carpetaPk = carpetaDe(p);
        const colorPk   = carpetaPk ? carpetaPk.color : (coloresGen[p.gen-1] || '#999');
        const bgPk      = carpetaPk ? carpetaPk.bg    : (coloresBg[p.gen-1] || 'rgba(153,153,153,0.16)');

        const card = document.createElement('div');
        card.className = `pk-card ${tiene ? 'found' : 'missing'}`;
        card.style.borderTopColor = colorPk;
        card.onclick = () => mostrarFicha(p, esVistaPendientes);

        // ── MOBILE elements ──
        const ridM = document.createElement('div'); ridM.className = 'pk-rid';
        ridM.style.color = colorPk; ridM.style.background = bgPk;
        ridM.textContent = ridTxt;
        const nidM = document.createElement('div'); nidM.className = 'pk-nid';
        nidM.textContent = `N#${ancla.toString().padStart(3,'0')}`;
        const imgM = document.createElement('img'); imgM.className = 'pk-img';
        imgM.src = p.image; imgM.alt = p.name; imgM.loading = 'lazy';
        const nameM = document.createElement('div'); nameM.className = 'pk-name';
        nameM.textContent = p.name.toLowerCase();
        const statusM = document.createElement('div'); statusM.className = 'pk-status-tag';
        statusM.textContent = tiene ? 'tenemos' : 'falta';
        const dotM = document.createElement('div'); dotM.className = 'pk-status-dot';
        dotM.textContent = tiene ? '✓' : '○';
        const extraM = document.createElement('div'); extraM.className = 'pk-extra-mobile';
        extraM.innerHTML = `<div class="pk-extra-tipos">${pillsHTML}</div>${fechaTxt ? `<div class="pk-extra-fecha">Registrado el ${fechaTxt}</div>` : ''}`;

        // ── DESKTOP elements ──
        const header = document.createElement('div'); header.className = 'pk-dt-header';
        const ridD = document.createElement('span'); ridD.className = 'pk-rid';
        ridD.style.color = colorPk; ridD.style.background = bgPk;
        ridD.textContent = ridTxt;
        const nidD = document.createElement('span'); nidD.className = 'pk-nid';
        nidD.textContent = nidTxt;
        header.appendChild(ridD); header.appendChild(nidD);

        const imgD = document.createElement('img'); imgD.className = 'pk-dt-img';
        imgD.src = p.image; imgD.alt = p.name; imgD.loading = 'lazy';

        const footer = document.createElement('div'); footer.className = 'pk-dt-footer';
        const nameD = document.createElement('div'); nameD.className = 'pk-name';
        nameD.textContent = p.name.toLowerCase();
        const statusD = document.createElement('div'); statusD.className = 'pk-status-tag';
        statusD.textContent = tiene ? 'tenemos' : 'falta';
        if (tiene) statusD.style.color = 'var(--found)';
        footer.appendChild(nameD); footer.appendChild(statusD);
        const extraD = document.createElement('div'); extraD.className = 'pk-extra-desktop';
        extraD.innerHTML = `<div class="pk-extra-tipos">${pillsHTML}</div>${fechaTxt ? `<div class="pk-extra-fecha">Registrado el ${fechaTxt}</div>` : ''}`;
        footer.appendChild(extraD);

        card.appendChild(ridM); card.appendChild(nidM); card.appendChild(imgM);
        card.appendChild(nameM); card.appendChild(statusM); card.appendChild(dotM);
        card.appendChild(extraM);
        card.appendChild(header); card.appendChild(imgD); card.appendChild(footer);

        if (catInfo) {
            const badge = document.createElement('div'); badge.className = 'pk-var-badge';
            badge.style.background = catInfo.color;
            badge.textContent = catInfo.label;
            card.appendChild(badge);
        }

        frag.appendChild(card);
    });

    grid.replaceChildren(frag);
    actualizarGalleryHeader();
    if (mantenerScroll && scrollEl) requestAnimationFrame(() => { scrollEl.scrollTop = scrollPos; });
}

async function RefrescarGaleria(mantenerScroll = false) {
    if (!genActualAbierta) return;
    if (genActualAbierta.esPendientes) {
        // No volvemos a comparar bulk vs carpetas en cada refresco automático (sería
        // una llamada extra cada vez); la lista se re-calcula al abrir la vista de nuevo.
        renderGaleria(pendientesActuales, mantenerScroll, false, true);
        return;
    }
    if (genActualAbierta.esCarpeta || genActualAbierta.esCompleta) {
        const filtrados = pkmsActuales.filter(p => {
            const tiene = tieneEnLS(p.id);
            if (filtroActual === 'tenemos') return tiene;
            if (filtroActual === 'faltan')  return !tiene;
            return true;
        });
        renderGaleria(filtrados, mantenerScroll);
        return;
    }
    const { gen } = genActualAbierta;
    const grid    = gridActivo();
    if (!cachePokemon[gen]) {
        if (!mantenerScroll) {
            grid.innerHTML = Array(9).fill(0).map(() =>
                `<div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;aspect-ratio:1;animation:skeleton 1.2s ease infinite alternate;"></div>`
            ).join('');
        }
        const datos = await fetchGenSegura(gen);
        if (!datos) { grid.innerHTML = ''; return; }
        cachePokemon[gen] = datos;
    }
    pkmsActuales = cachePokemon[gen];
    const filtrados = pkmsActuales.filter(p => {
        const tiene = tieneEnLS(p.id);
        if (filtroActual === 'tenemos') return tiene;
        if (filtroActual === 'faltan')  return !tiene;
        return true;
    });
    renderGaleria(filtrados, mantenerScroll);
}

function cerrarGaleriaYVolver() {
    genActualAbierta = null; pkmsActuales = []; filtroActual = 'todos';
    pendientesActuales = []; fichaOrigenPendientes = false;
    document.querySelectorAll('.gallery-filter').forEach(f => f.style.display = '');
    ['todos','tenemos','faltan'].forEach(x => {
        const a = document.getElementById(`filter-${x}`);
        const b = document.getElementById(`filter-${x}-d`);
        if (a) a.classList.toggle('active', x === 'todos');
        if (b) b.classList.toggle('active', x === 'todos');
    });
    if (!esDesktop()) {
        document.getElementById('gallery-section').style.display = 'none';
        document.getElementById('generaciones-section-title').style.display = 'block';
        document.getElementById('grid-generaciones').style.display = 'grid';
        ocultarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    actualizarTarjetaProgreso();
    renderSidebar();
}

// ── GRID MOBILE/DESKTOP switch ────────────────────────────────────
function sincronizarGrids() {
    const gDesktop = document.getElementById('gallery-grid');
    const gMobile  = document.getElementById('gallery-grid-mobile');
    const wrapMob  = document.getElementById('gallery-grid-mobile-wrap');
    if (esDesktop()) {
        gDesktop.style.display = '';
        if (gMobile)  gMobile.style.display  = 'none';
        if (wrapMob)  wrapMob.style.display  = 'none';
    } else {
        gDesktop.style.display = 'none';
        if (gMobile)  gMobile.style.display  = '';
        if (wrapMob)  wrapMob.style.display  = '';
    }
}

// ── FICHA ────────────────────────────────────────────────────────
function mostrarFicha(p, esPendientes) {
    fichaOrigenPendientes = !!esPendientes;
    pkSeleccionado = p;
    const ancla = anclaIdCliente(p);
    let numR = ancla - cortesGen[p.gen];
    let regionName = regiones[p.gen - 1];
    if (ancla >= 899 && ancla <= 905) { numR = ancla - 809; regionName = 'Hisui'; }
    const regionEl = document.getElementById('pk-region');
    regionEl.textContent = regionName.toUpperCase() + ' · GEN ' + p.gen;
    regionEl.style.color = coloresGen[p.gen-1];
    regionEl.style.background = coloresBg[p.gen-1];
    document.getElementById('pk-name').textContent = p.name.toLowerCase();
    const catInfo = p.categoria ? CATEGORIA_INFO[p.categoria] : null;
    document.getElementById('pk-id').textContent =
        `Regional #${numR.toString().padStart(3,'0')} · Nacional #${ancla.toString().padStart(4,'0')}${catInfo ? ' · ' + catInfo.label : ''}`;
    document.getElementById('pk-img').src = p.image;
    document.getElementById('pk-img').alt = p.name;

    // "Carta física": el tipo primario define el color del marco (--type-color);
    // los demás tipos se listan como pills adicionales, sin pelear por el color.
    const tipos = p.types && p.types.length ? p.types : ['normal'];
    const tipoPrincipal = infoTipo(tipos[0]);
    const overlay = document.getElementById('detail-overlay');
    const tieneVisual = fichaOrigenPendientes ? true : tieneEnLS(p.id);
    overlay.style.setProperty('--type-color', tieneVisual ? tipoPrincipal.color : 'var(--border)');
    overlay.classList.toggle('missing', !tieneVisual);
    document.getElementById('pk-tipos').innerHTML = tipos.map(t => {
        const info = infoTipo(t);
        return `<span class="tipo-pill" style="background:${hexToRgba(info.color,0.16)};color:${info.color};">${info.emoji} ${info.label}</span>`;
    }).join('');
    document.getElementById('art-box').classList.toggle('tiene', tieneVisual);

    const carpetaPk = carpetaDe(p);
    const bd = carpetaPk
        ? { bg: carpetaPk.bg, color: carpetaPk.color, border: carpetaPk.color, text: `Carpeta ${carpetaPk.nombre} — ${carpetaPk.rango}` }
        : { bg: coloresBg[p.gen-1] || 'rgba(153,153,153,0.16)', color: coloresGen[p.gen-1] || '#999', border: coloresGen[p.gen-1] || '#999', text: '' };
    const guide = document.getElementById('binder-guide');
    guide.style.background = bd.bg; guide.style.color = bd.color;
    guide.style.border = `1px solid ${bd.border}`; guide.textContent = bd.text;

    if (fichaOrigenPendientes) {
        // Por definición, si está aquí es porque está en Bulk pero no en Carpetas:
        // la única acción con sentido es marcarlo como acomodado en Carpetas.
        const btn = document.getElementById('btn-toggle-status');
        btn.style.background = 'var(--accent2)';
        btn.textContent = '📥 Marcar como acomodado en Carpetas';
        document.getElementById('detail-fecha').textContent = 'Está en tu Bulk — aún no está en Carpetas';
    } else {
        const tiene = tieneEnLS(p.id);
        actualizarBotonEstado(tiene);
        const fecha = getFechaRegistro(p.id);
        document.getElementById('detail-fecha').textContent = tiene && fecha ? `Registrado el ${fecha}` : '';
    }
    document.getElementById('detail-modal').classList.add('open');
}

function actualizarBotonEstado(tiene) {
    const btn = document.getElementById('btn-toggle-status');
    btn.style.background = tiene ? 'var(--found)' : 'var(--danger)';
    btn.textContent = tiene ? '✅ Ya lo tenemos' : '❌ No lo tenemos — tocar para guardar';
}

document.getElementById('btn-toggle-status').onclick = () => requiereSesion(ejecutarToggleStatus);

async function ejecutarToggleStatus() {
    if (!pkSeleccionado) return;
    const idPk = pkSeleccionado.id;

    if (fichaOrigenPendientes) {
        // Siempre escribe en "carpetas", sin importar qué modo estés viendo ahora mismo.
        const fechaIso = new Date().toISOString();
        try {
            const res = await fetch('/api/inventario', {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ id: idPk, estado: true, fecha: fechaIso, modo: 'carpetas' })
            });
            if (res.status === 401) { abrirLoginModal(ejecutarToggleStatus); return; }
            if (!res.ok) throw new Error('respuesta no válida');
        } catch (err) {
            mostrarToastError('No se pudo guardar el cambio. Intenta de nuevo.');
            return;
        }
        if (modoActual === 'carpetas') {
            localStorage.setItem(claveLS(idPk), 'true');
            guardarFechaRegistro(idPk, fechaIso);
        }
        document.getElementById('detail-modal').classList.remove('open');
        pkSeleccionado = null;
        fichaOrigenPendientes = false;
        // Lo sacamos de la lista de pendientes en pantalla, sin volver a comparar todo el inventario.
        pendientesActuales = pendientesActuales.filter(x => x.id !== idPk);
        pkmsActuales = pendientesActuales;
        mostrarGalleryShell(`Por acomodar (${pendientesActuales.length})`, 'Están en Bulk, todavía no en tus carpetas');
        actualizarTarjetaProgresoPendientes(pendientesActuales.length);
        renderGaleria(pendientesActuales, true, false, true);
        if (modoActual === 'carpetas') {
            const statsAntes = dataGlobalCache;
            await cargarEstadisticasSinMoverScroll();
            detectarYCelebrarCompletado(statsAntes, dataGlobalCache);
        }
        actualizarBadgePendientes();
        return;
    }

    const actual = tieneEnLS(idPk);
    const nuevoEstado = !actual;
    const nombrePk = pkSeleccionado.name;
    const fechaIso = new Date().toISOString();
    try {
        const res = await fetch('/api/inventario', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ id: idPk, estado: nuevoEstado, fecha: fechaIso, modo: modoActual })
        });
        if (res.status === 401) { abrirLoginModal(ejecutarToggleStatus); return; }
        if (!res.ok) throw new Error('respuesta no válida');
        let fechaServidor = null;
        try {
            const body = await res.json();
            fechaServidor = body && body.fecha ? body.fecha : null;
        } catch (e) { /* el backend puede no devolver JSON; no es grave */ }
        const fechaPreservada = getFechaISO(idPk); // por si la desmarcas: para poder deshacer con la misma fecha
        localStorage.setItem(claveLS(idPk), nuevoEstado ? 'true' : 'false');
        if (nuevoEstado) guardarFechaRegistro(idPk, fechaServidor || fechaIso);
        actualizarBotonEstado(nuevoEstado);
        document.getElementById('detail-modal').classList.remove('open');
        pkSeleccionado = null;
        const statsAntes = dataGlobalCache;
        await cargarEstadisticasSinMoverScroll();
        if (nuevoEstado) detectarYCelebrarCompletado(statsAntes, dataGlobalCache);
        actualizarBadgePendientes();
        if (!nuevoEstado) mostrarToastDeshacer(idPk, fechaPreservada, nombrePk);
    } catch (err) {
        mostrarToastError('No se pudo guardar el cambio. Intenta de nuevo.');
    }
}

document.getElementById('detail-close').onclick = () => {
    document.getElementById('detail-modal').classList.remove('open');
    pkSeleccionado = null;
};

// Cerrar sugerencias al tocar fuera
document.addEventListener('pointerdown', (e) => {
    const sug = document.getElementById('sugerencias');
    const inp = document.getElementById('search-input');
    const inpD = document.getElementById('search-input-desktop');
    if (!sug.contains(e.target) && e.target !== inp && e.target !== inpD)
        sug.style.display = 'none';
});

// ── BUSCADOR ─────────────────────────────────────────────────────
let searchTimer = null;
let searchAbortController = null;
const searchInput  = document.getElementById('search-input');
const searchInputD = document.getElementById('search-input-desktop');
const sugBox       = document.getElementById('sugerencias');

let cursorEsperado = 0;
let guardandoCursor = false;

document.addEventListener('selectionchange', () => {
    if (!guardandoCursor) return;
    if (document.activeElement !== searchInput && document.activeElement !== searchInputD) return;
    const inp    = document.activeElement;
    const actual = inp.selectionStart;
    if (actual !== cursorEsperado) inp.setSelectionRange(cursorEsperado, cursorEsperado);
});

function posicionarSugerencias(inputEl) {
    const rect = inputEl.getBoundingClientRect();
    sugBox.style.top   = (rect.bottom + 6) + 'px';
    sugBox.style.left  = rect.left + 'px';
    sugBox.style.width = rect.width + 'px';
}

function handleSearchInput(e, inputEl) {
    const val = e.target.value;
    cursorEsperado  = inputEl.selectionStart;
    guardandoCursor = false;
    if (val.length < 2) { sugBox.style.display = 'none'; clearTimeout(searchTimer); return; }
    clearSearchTimer();
    searchTimer = setTimeout(async () => {
        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();
        const miController = searchAbortController;
        let data;
        try {
            const res = await fetch(`/api/buscar?q=${encodeURIComponent(val)}`, { signal: miController.signal });
            data = await res.json();
        } catch(err) {
            if (err.name === 'AbortError') return;
            sugBox.style.display = 'none';
            return;
        }
        if (miController !== searchAbortController) return;
        if (!data.length) { sugBox.style.display = 'none'; return; }
        const frag = document.createDocumentFragment();
        data.forEach(p => {
            const ancla = anclaIdCliente(p);
            let numR = ancla - cortesGen[p.gen];
            let rName = regiones[p.gen - 1];
            if (ancla >= 899 && ancla <= 905) { numR = ancla - 809; rName = 'Hisui'; }
            const tiene = tieneEnLS(p.id);
            const carpetaPk = carpetaDe(p);
            const colorPk = carpetaPk ? carpetaPk.color : coloresGen[p.gen-1];
            const bgPk    = carpetaPk ? carpetaPk.bg    : coloresBg[p.gen-1];
            const item  = document.createElement('div');
            item.className = `sugerencia-item${tiene ? ' found' : ''}`;
            const check = document.createElement('span'); check.className = 'sugerencia-check-left'; check.textContent = tiene ? '✓' : '';
            const name  = document.createElement('span'); name.className = `sugerencia-name${tiene ? ' found-name' : ''}`; name.textContent = p.name.toLowerCase();
            const meta  = document.createElement('span'); meta.className = 'sugerencia-meta';
            meta.style.background = bgPk; meta.style.color = colorPk;
            meta.textContent = `${rName} · Gen ${p.gen} #${numR.toString().padStart(3,'0')}`;
            item.appendChild(check); item.appendChild(name); item.appendChild(meta);
            item.addEventListener('touchstart', ev => { ev.preventDefault(); }, { passive:false });
            item.addEventListener('touchend', () => {
                inputEl.readOnly = true; inputEl.blur();
                setTimeout(() => { inputEl.readOnly = false; }, 100);
                inputEl.value = ''; sugBox.style.display = 'none';
                mostrarFicha(p);
            });
            item.addEventListener('click', () => {
                inputEl.value = ''; sugBox.style.display = 'none';
                document.activeElement.blur();
                setTimeout(() => mostrarFicha(p), 150);
            });
            frag.appendChild(item);
        });
        posicionarSugerencias(inputEl);
        sugBox.replaceChildren(frag);
        sugBox.style.display = 'block';
        guardandoCursor = true;
        setTimeout(() => { guardandoCursor = false; }, 500);
    }, 300);
}

function clearSearchTimer() {
    if (searchTimer) { clearTimeout(searchTimer); searchTimer = null; }
}

searchInput.addEventListener('input',  e => handleSearchInput(e, searchInput));
searchInputD.addEventListener('input', e => handleSearchInput(e, searchInputD));

function cambiarTab(tipo) {
    if (tipo === 'home') {
        cerrarGaleriaYVolver();
        if (streamCamara) toggleCamaraOCR();
        if (esDesktop() && !genActualAbierta) verPokedexCompleta();
    }
}
function mostrarFAB() { document.getElementById('fab-home').classList.add('visible'); }
function ocultarFAB() { document.getElementById('fab-home').classList.remove('visible'); }

// ── MÉTRICAS ─────────────────────────────────────────────────────
function mostrarMetricas() {
    if (!dataGlobalCache) return;
    const d = dataGlobalCache;
    document.getElementById('metrics-subtitle').textContent = `${d.global.conseguidos || 0} de ${d.global.total || 1025} Pokémon registrados`;

    const { ultimos7, ultimos30 } = calcularProgresoReciente();
    let html = `<div class="metrics-section-title">Progreso reciente (${modoActual === 'bulk' ? 'Bulk' : 'Carpetas'})</div>
        <div class="metrics-row">
            <span class="metrics-row-label">Últimos 7 días</span>
            <span class="metrics-row-val">${ultimos7 > 0 ? `+${ultimos7}` : '0'}</span>
        </div>
        <div class="metrics-row">
            <span class="metrics-row-label">Últimos 30 días</span>
            <span class="metrics-row-val">${ultimos30 > 0 ? `+${ultimos30}` : '0'}</span>
        </div>`;

    const jalones = [];
    regiones.forEach((r, i) => {
        const g = d.generaciones[i+1];
        const j = calcularJalon(g.conseguidos, g.total);
        if (j) jalones.push(`<span style="color:${coloresGen[i]};font-weight:700;">${r}:</span> ${j}`);
    });
    if (jalones.length) {
        html += `<div class="metrics-section-title">Jalones</div>`;
        jalones.forEach(j => { html += `<div class="metrics-jalon">${j}</div>`; });
    }
    html += `<div class="metrics-section-title">Por generación</div>`;
    html += regiones.map((r, i) => {
        const g   = d.generaciones[i+1];
        const pct = g.total > 0 ? Math.round((g.conseguidos/g.total)*100) : 0;
        const f   = g.total - g.conseguidos;
        return `<div class="metrics-row">
            <span class="metrics-row-label" style="color:${coloresGen[i]}">${r}</span>
            <div style="text-align:right;">
                <div class="metrics-row-val">${g.conseguidos}/${g.total} · ${pct}%</div>
                <div class="metrics-row-sub">${f > 0 ? `faltan ${f}` : '✓ completa'}</div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('metrics-content').innerHTML = html;
    document.getElementById('metrics-modal').classList.add('open');
}

// Cuenta cuántos registros (del modo activo) tienen fecha dentro de los
// últimos 7 y 30 días, usando las fechas que ya viven en localStorage.
function calcularProgresoReciente() {
    const ahora  = Date.now();
    const semana = 7  * 24 * 60 * 60 * 1000;
    const mes    = 30 * 24 * 60 * 60 * 1000;
    const prefijo = `pk_fecha_${modoActual}_`;
    let ultimos7 = 0, ultimos30 = 0;
    Object.keys(localStorage).forEach(key => {
        if (!key.startsWith(prefijo)) return;
        // Solo cuenta si el Pokémon sigue marcado como "tenemos" ahora mismo
        // (si lo desmarcaste, ya no debería sumar a tu progreso reciente).
        const id = key.slice(prefijo.length);
        if (!tieneEnLS(id)) return;
        const t = new Date(localStorage.getItem(key)).getTime();
        if (isNaN(t)) return;
        const diff = ahora - t;
        if (diff <= semana) ultimos7++;
        if (diff <= mes) ultimos30++;
    });
    return { ultimos7, ultimos30 };
}
function cerrarMetricas() { document.getElementById('metrics-modal').classList.remove('open'); }
document.getElementById('metrics-close').onclick = cerrarMetricas;

// ── AJUSTES: panel único, compartido entre desktop y mobile ────────
function abrirAjustes() {
    document.getElementById('ajustes-modal').classList.add('open');
}
function cerrarAjustes() {
    document.getElementById('ajustes-modal').classList.remove('open');
}
document.getElementById('ajustes-close').onclick = cerrarAjustes;

// ── PDF DE RECORTABLES: modal de opciones ───────────────────────────
function abrirOpcionesPDF() {
    // Se re-arma siempre (no se cachea) para reflejar cambios recientes del
    // wizard de carpetas sin depender de un reload de página.
    document.getElementById('pdf-opciones-carpetas').innerHTML = carpetas.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="pdf-carpeta-check" value="${c.nombre}" checked>
            <span class="pdf-carpeta-swatch" style="background:${c.color}"></span>
            ${c.nombre} (${c.rango})
        </label>
    `).join('');
    // La portada por región no aplica en modo "seguidas": una carpeta puede
    // cortar una región al medio, así que no hay "la región" de esa carpeta.
    document.getElementById('pdf-opciones-portadas-seccion').style.display =
        modoCarpetasConfig === 'seguidas' ? 'none' : '';
    cerrarAjustes();
    document.getElementById('pdf-opciones-modal').classList.add('open');
}
function cerrarOpcionesPDF() {
    document.getElementById('pdf-opciones-modal').classList.remove('open');
}
document.getElementById('pdf-opciones-close').onclick = cerrarOpcionesPDF;

// ── AJUSTES: panel de categorías de variantes ───────────────────────
const CATEGORIAS_VARIANTES_INFO = [
    { key: 'regional',    label: 'Formas regionales',      sub: 'Alolan, Galarian, Hisuian, Paldean' },
    { key: 'mega',        label: 'Megaevolución',          sub: 'Incluye los casos X/Y (Charizard, Mewtwo)' },
    { key: 'primigenia',  label: 'Regresión Primigenia',   sub: 'Kyogre y Groudon' },
    { key: 'gigamax',     label: 'Gigamax',                sub: 'Espada/Escudo + expansiones' },
    { key: 'alternativa', label: 'Formas alternativas',    sub: 'Con carta TCG propia (Deoxys, Rotom, Arceus, etc.)' },
];
let variantesConfigActual = null;

async function abrirPanelVariantes() {
    try {
        const res = await fetch('/api/variantes-config');
        if (!res.ok) throw new Error('respuesta no válida');
        variantesConfigActual = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo cargar la configuración de variantes.');
        return;
    }
    document.getElementById('variantes-checks').innerHTML = CATEGORIAS_VARIANTES_INFO.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="variante-cat-check" data-cat="${c.key}" ${variantesConfigActual[c.key] ? 'checked' : ''} onchange="toggleCategoriaVariante('${c.key}', this.checked)">
            <span>${c.label}<br><span style="font-size:11px;color:var(--muted);font-weight:400;">${c.sub}</span></span>
        </label>
    `).join('');
    cerrarAjustes();
    document.getElementById('variantes-modal').classList.add('open');
}
function cerrarPanelVariantes() {
    document.getElementById('variantes-modal').classList.remove('open');
}
document.getElementById('variantes-close').onclick = cerrarPanelVariantes;

async function toggleCategoriaVariante(categoria, activada) {
    const checkbox = document.querySelector(`.variante-cat-check[data-cat="${categoria}"]`);
    const guardar = async () => {
        const nueva = { ...variantesConfigActual, [categoria]: activada };
        try {
            sseIgnorarProximoConfig = true;
            const res = await fetch('/api/variantes-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nueva)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
            variantesConfigActual = nueva;
            // cachePokemon (por generación) y pkmsActuales pueden tener datos
            // cargados antes de este cambio, sin las variantes recién
            // activadas/desactivadas — si no se limpian, la galería que ya
            // estaba abierta seguiría mostrando la lista vieja hasta que el
            // usuario recargue la página a mano. Volvemos a la vista general
            // (misma acción que ya hace el handler de SSE 'config' para otros
            // cambios grandes) para que la próxima vez que abra una
            // generación/carpeta la traiga de nuevo, ya con la config nueva.
            // En escritorio no hay una "pantalla de inicio" separada de la
            // galería (a diferencia de mobile, donde cerrarGaleriaYVolver()
            // vuelve a la grilla de generaciones) — sin volver a abrir una
            // vista, el panel se queda mostrando exactamente lo que había
            // antes del toggle. Mismo patrón que ya usan cambiarModo() y
            // cambiarTab('home').
            Object.keys(cachePokemon).forEach(k => delete cachePokemon[k]);
            if (genActualAbierta) {
                cerrarGaleriaYVolver();
                if (esDesktop()) await verPokedexCompleta();
            }
            await cargarEstadisticasSinMoverScroll();
            if (activada) await revisarCapacidadCarpetas();
            mostrarToastInfo(activada ? 'Categoría activada.' : 'Categoría desactivada.');
        } catch (err) {
            sseIgnorarProximoConfig = false; // no se llegó a guardar: no habrá eco que ignorar
            if (checkbox) checkbox.checked = !activada; // revertir el toggle visual si falló
            mostrarToastError(err.message || 'No se pudo guardar la configuración de variantes.');
        }
    };
    const revertirSiCancela = () => { if (checkbox) checkbox.checked = !activada; };
    requiereSesion(guardar) || revertirSiCancela();
}

// ── AJUSTES: ver y restaurar respaldos automáticos ──────────────────
const RESPALDO_TIPO_LABEL = {
    'automatico': 'Automático',
    'pre-importacion': 'Antes de importar',
    'pre-restauracion': 'Antes de restaurar'
};

async function abrirPanelRespaldos() {
    const lista = document.getElementById('respaldos-lista');
    lista.innerHTML = '<div class="pdf-opciones-label">Cargando…</div>';
    cerrarAjustes();
    document.getElementById('respaldos-modal').classList.add('open');

    let respaldos;
    try {
        const res = await fetch('/api/backups');
        if (!res.ok) throw new Error('respuesta no válida');
        respaldos = await res.json();
    } catch (err) {
        lista.innerHTML = '<div class="pdf-opciones-label">No se pudieron cargar los respaldos.</div>';
        return;
    }

    if (!respaldos.length) {
        lista.innerHTML = '<div class="pdf-opciones-label">Todavía no hay respaldos guardados.</div>';
        return;
    }

    lista.innerHTML = respaldos.map(r => `
        <div class="respaldo-fila">
            <div class="respaldo-info">
                <span class="respaldo-fecha">${new Date(r.fecha).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                <span class="respaldo-tipo">${RESPALDO_TIPO_LABEL[r.tipo] || r.tipo}</span>
            </div>
            <button class="respaldo-btn-restaurar" onclick="restaurarRespaldo('${r.archivo}')">Restaurar</button>
        </div>
    `).join('');
}
function cerrarPanelRespaldos() {
    document.getElementById('respaldos-modal').classList.remove('open');
}
document.getElementById('respaldos-close').onclick = cerrarPanelRespaldos;

function restaurarRespaldo(archivo) {
    requiereSesion(async () => {
        const ok = confirm(
            'Esto REEMPLAZA todo tu inventario actual (Bulk Y Carpetas) con el contenido de este respaldo. ' +
            'Se guarda una copia del estado actual antes de pisarlo, por si acaso. ¿Continuar?'
        );
        if (!ok) return;
        try {
            const res = await fetch('/api/backups/restaurar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archivo })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
            mostrarToastInfo('Inventario restaurado.');
            cerrarPanelRespaldos();
            Object.keys(cachePokemon).forEach(k => delete cachePokemon[k]);
            cerrarGaleriaYVolver();
            await cargarEstadisticasSinMoverScroll();
            actualizarBadgePendientes();
        } catch (err) {
            mostrarToastError(err.message || 'No se pudo restaurar el respaldo.');
        }
    });
}

// ── WIZARD: PLANEAR MIS CARPETAS ────────────────────────────────────
// Pensado como ayuda para planificar el álbum físico, no como un
// formulario de configuración. Secuencia: modo de acomodo → formato de
// hoja (bolsillos + espacios en blanco entre generaciones) → cuántas
// carpetas → capacidad de cada una (fija, la elegís vos) → el wizard
// RECOMIENDA cómo repartir las 9 generaciones en esas capacidades
// (bin-packing en orden), dejás ajustar tocando fichas, avisa si algo
// no entra → nombre y color.
const PALETA_CARPETAS = ['#3b5bdb','#7c3aed','#db2777','#dc2626','#059669','#d97706','#0891b2','#65a30d','#9333ea'];
let wizardModo          = 'separadas'; // 'separadas' | 'seguidas'
let wizardBolsillos     = 9;
let wizardEspaciosBlanco = false;
let wizardNumCarpetas    = 4;
let wizardCapacidadesFijas = []; // espacios (hojas × bolsillos) por carpeta, largo wizardNumCarpetas
let wizardAsignacion    = {};    // { gen(1-9): numeroDeCarpeta(1..wizardNumCarpetas) } — solo modo separadas
let wizardGrupos        = [];    // array de arrays de gens — solo modo separadas
let wizardRangos        = [];    // array de {desde,hasta}|null por carpeta — solo modo seguidas

function abrirWizardCarpetas() {
    cerrarAjustes();
    wizardMostrarPaso('modo');
    document.getElementById('wizard-carpetas-modal').classList.add('open');
}
function cerrarWizardCarpetas() {
    localStorage.setItem('carpetasWizardVisto', '1');
    document.getElementById('wizard-carpetas-modal').classList.remove('open');
}
document.getElementById('wizard-carpetas-close').onclick = cerrarWizardCarpetas;

function wizardMostrarPaso(paso) {
    ['modo','formato','cantidad','capacidad','ajuste','nombres'].forEach(p => {
        document.getElementById(`wizard-paso-${p}`).style.display = (p === paso) ? '' : 'none';
    });
}

function wizardElegirModo(modo) {
    wizardModo = modo;
    document.getElementById('wizard-espacios-blanco-fila').style.display = modo === 'seguidas' ? 'none' : '';
    wizardMostrarPaso('formato');
}

// Cuántos Pokémon en total (toda la Pokédex, no solo lo que ya tenés)
// tiene una generación.
function pokemonEnGen(gen) {
    if (!dataGlobalCache) return 0;
    return dataGlobalCache.generaciones[gen]?.total || 0;
}

// "Huella" de una generación dentro de una carpeta: su cantidad real de
// Pokémon, o esa cantidad redondeada hacia arriba a la próxima hoja
// completa si se pidió dejar espacios en blanco entre generaciones.
function wizardHuellaGen(gen) {
    const total = pokemonEnGen(gen);
    if (!wizardEspaciosBlanco) return total;
    return Math.ceil(total / wizardBolsillos) * wizardBolsillos;
}

function wizardConfirmarCantidad() {
    wizardNumCarpetas = Math.max(1, Math.min(9, parseInt(document.getElementById('wizard-cantidad-carpetas').value) || 1));
    wizardBolsillos = parseInt(document.getElementById('wizard-bolsillos-hoja').value) || 9;
    wizardEspaciosBlanco = wizardModo === 'seguidas' ? false : document.getElementById('wizard-espacios-blanco').checked;
    wizardArmarPasoCapacidad();
    wizardMostrarPaso('capacidad');
}

// 'hojas' (contando las 2 caras) o 'espacios' (número total, directo).
function wizardModoCapacidad() {
    return document.querySelector('input[name="wizard-modo-capacidad"]:checked').value;
}

// Cuánto necesita cubrir la capacidad total: toda la colección efectiva
// (1025 + variantes activas) en modo seguidas, o la suma de "huellas" de las
// 9 generaciones en separadas (que ya incluyen variantes activas, porque
// pokemonEnGen() lee de dataGlobalCache, ya filtrado por el servidor).
function wizardNecesarioTotal() {
    if (wizardModo === 'seguidas') return (dataGlobalCache && dataGlobalCache.global.total) || 1025;
    return Array.from({ length: 9 }, (_, i) => wizardHuellaGen(i + 1)).reduce((a, b) => a + b, 0);
}

function wizardArmarPasoCapacidad() {
    const necesarioTotal = wizardNecesarioTotal();
    const modo = wizardModoCapacidad();
    if (modo === 'hojas') {
        // Una hoja tiene 2 páginas (frente y dorso), así que multiplicamos x2
        // los bolsillos por página que se eligieron en el paso anterior.
        const espaciosPorHoja = wizardBolsillos * 2;
        const hojasSugeridas = Math.ceil(Math.ceil(necesarioTotal / wizardNumCarpetas) / espaciosPorHoja);
        document.getElementById('wizard-capacidad-lista').innerHTML = Array.from({ length: wizardNumCarpetas }, (_, i) => `
            <div class="wizard-espacios-fila">
                <label>Carpeta ${i + 1} — hojas (${espaciosPorHoja} espacios c/u)</label>
                <input type="number" min="1" value="${hojasSugeridas}" class="wizard-capacidad-fija-input" data-carpeta="${i}" oninput="wizardActualizarTotalCapacidad()">
            </div>
        `).join('');
    } else {
        const espaciosSugeridos = Math.ceil(necesarioTotal / wizardNumCarpetas);
        document.getElementById('wizard-capacidad-lista').innerHTML = Array.from({ length: wizardNumCarpetas }, (_, i) => `
            <div class="wizard-espacios-fila">
                <label>Carpeta ${i + 1} — espacios totales</label>
                <input type="number" min="1" value="${espaciosSugeridos}" class="wizard-capacidad-fija-input" data-carpeta="${i}" oninput="wizardActualizarTotalCapacidad()">
            </div>
        `).join('');
    }
    wizardActualizarTotalCapacidad();
}

function wizardCapacidadDeInput(inp) {
    const valor = parseInt(inp.value) || 0;
    return wizardModoCapacidad() === 'hojas' ? valor * wizardBolsillos * 2 : valor;
}

function wizardActualizarTotalCapacidad() {
    const necesarioTotal = wizardNecesarioTotal();
    let capacidadTotal = 0;
    document.querySelectorAll('.wizard-capacidad-fija-input').forEach(inp => {
        capacidadTotal += wizardCapacidadDeInput(inp);
    });
    const div = document.getElementById('wizard-capacidad-total');
    if (capacidadTotal < necesarioTotal) {
        div.innerHTML = `<div class="wizard-preview-fila error">⚠️ Entre todas suman ${capacidadTotal} espacios, y hacen falta ${necesarioTotal} para cubrir toda la colección.</div>`;
    } else {
        div.innerHTML = `<div class="wizard-preview-fila ok">✓ Entre todas suman ${capacidadTotal} espacios (necesitás al menos ${necesarioTotal}).</div>`;
    }
}

function wizardCapacidadSiguiente() {
    wizardCapacidadesFijas = [...document.querySelectorAll('.wizard-capacidad-fija-input')]
        .sort((a, b) => parseInt(a.dataset.carpeta) - parseInt(b.dataset.carpeta))
        .map(wizardCapacidadDeInput);

    if (wizardModo === 'seguidas') {
        // Sin paso de ajuste manual (confirmado: el reparto automático alcanza)
        // — pero si la capacidad no llega a lo necesario, no hay "ajuste" que lo
        // salve más adelante como en modo separadas, así que se bloquea acá.
        const total = wizardCapacidadesFijas.reduce((a, b) => a + b, 0);
        const necesario = wizardNecesarioTotal();
        if (total < necesario) {
            mostrarToastError(`Entre todas suman ${total} espacios, y hacen falta ${necesario} para cubrir toda la colección.`);
            return;
        }
        wizardRangos = wizardCalcularRangos();
        wizardArmarPasoNombres();
        wizardMostrarPaso('nombres');
        return;
    }

    wizardAsignacion = wizardRecomendarAsignacion();
    wizardArmarPasoAjuste();
    wizardMostrarPaso('ajuste');
}

// Reparte 1..1025 en rangos contiguos según la capacidad fija de cada
// carpeta, en orden. La última carpeta siempre termina en 1025 (si le sobra
// o falta capacidad declarada, ese desajuste se absorbe ahí). Si una carpeta
// anterior ya consumió todo el rango (capacidades muy dispares), o si a una
// carpeta (que no sea la última) le tocó una capacidad propia de 0 o menos
// (input vaciado/en 0), esa carpeta queda en null en vez de un rango vacío o
// invertido — se descartan al guardar, igual que las carpetas sin
// generaciones asignadas en modo separadas.
function wizardCalcularRangos() {
    const rangos = [];
    let desde = 1;
    for (let i = 0; i < wizardNumCarpetas; i++) {
        if (desde > 1025) { rangos.push(null); continue; }
        const esUltima = i === wizardNumCarpetas - 1;
        const hasta = esUltima ? 1025 : Math.min(1025, desde + wizardCapacidadesFijas[i] - 1);
        if (hasta < desde) { rangos.push(null); continue; }
        rangos.push({ desde, hasta });
        desde = hasta + 1;
    }
    return rangos;
}

// Reparte las 9 generaciones, en orden, en las carpetas ya definidas
// (con capacidad fija): va llenando la carpeta actual hasta que la
// próxima generación no entre, y ahí pasa a la siguiente carpeta.
function wizardRecomendarAsignacion() {
    const asign = {};
    let carpetaActual = 0, usado = 0;
    for (let gen = 1; gen <= 9; gen++) {
        const huella = wizardHuellaGen(gen);
        while (carpetaActual < wizardNumCarpetas - 1 && usado + huella > wizardCapacidadesFijas[carpetaActual]) {
            carpetaActual++;
            usado = 0;
        }
        asign[gen] = carpetaActual + 1;
        usado += huella;
    }
    return asign;
}

function wizardColorDeGrupo(numero) {
    return PALETA_CARPETAS[(numero - 1) % PALETA_CARPETAS.length];
}

function wizardTotalesPorCarpeta() {
    const totales = Array(wizardNumCarpetas).fill(0);
    const gensPorCarpeta = Array.from({ length: wizardNumCarpetas }, () => []);
    for (let gen = 1; gen <= 9; gen++) {
        const idx = wizardAsignacion[gen] - 1;
        totales[idx] += wizardHuellaGen(gen);
        gensPorCarpeta[idx].push(gen);
    }
    return { totales, gensPorCarpeta };
}

function wizardArmarPasoAjuste() {
    document.getElementById('wizard-chips').innerHTML = Array.from({ length: 9 }, (_, i) => {
        const gen = i + 1;
        const grupo = wizardAsignacion[gen];
        return `<button type="button" class="wizard-chip" style="background:${wizardColorDeGrupo(grupo)}" onclick="wizardCiclarChip(${gen})">
            <span class="wizard-chip-region">${regiones[i]}</span>
            <span class="wizard-chip-grupo">Carpeta ${grupo}</span>
        </button>`;
    }).join('');
    wizardActualizarPreviewAjuste();
}

// Tocar una ficha la manda a la siguiente carpeta (ciclando entre las N
// ya definidas — acá la cantidad de carpetas es fija, no se crean nuevas).
function wizardCiclarChip(gen) {
    wizardAsignacion[gen] = (wizardAsignacion[gen] % wizardNumCarpetas) + 1;
    wizardArmarPasoAjuste();
}

function wizardActualizarPreviewAjuste() {
    const { totales, gensPorCarpeta } = wizardTotalesPorCarpeta();
    document.getElementById('wizard-ajuste-preview').innerHTML = gensPorCarpeta.map((gens, i) => {
        const capacidad = wizardCapacidadesFijas[i];
        const usado = totales[i];
        const vacios = capacidad - usado;
        const gensTxt = gens.length ? gens.map(x => regiones[x-1]).join(', ') : '(vacía)';
        const estado = vacios < 0
            ? `<span class="wizard-espacios-feedback error">⚠️ Se pasa por ${-vacios} espacios</span>`
            : `<span class="wizard-espacios-feedback ok">${vacios} espacios vacíos</span>`;
        return `<div class="wizard-preview-fila" style="border-left:4px solid ${wizardColorDeGrupo(i+1)}">
            <strong>Carpeta ${i+1}:</strong> ${gensTxt}<br>${estado}
        </div>`;
    }).join('');
    const btn = document.getElementById('wizard-btn-a-nombres');
    const hayProblema = totales.some((t, i) => t > wizardCapacidadesFijas[i]);
    btn.disabled = hayProblema;
    btn.textContent = hayProblema ? 'Resolvé lo que no entra primero' : 'Siguiente →';
}

function wizardAjusteSiguiente() {
    const { gensPorCarpeta } = wizardTotalesPorCarpeta();
    wizardGrupos = gensPorCarpeta;
    wizardArmarPasoNombres();
    wizardMostrarPaso('nombres');
}

function wizardVolverDesdeNombres() {
    wizardMostrarPaso(wizardModo === 'seguidas' ? 'capacidad' : 'ajuste');
}

function wizardArmarPasoNombres() {
    if (wizardModo === 'seguidas') {
        document.getElementById('wizard-nombres-lista').innerHTML = wizardRangos.map((r, i) => {
            const colorDefault = wizardColorDeGrupo(i + 1);
            const swatches = PALETA_CARPETAS.map(col =>
                `<button type="button" class="wizard-swatch${col === colorDefault ? ' selected' : ''}" style="background:${col}" data-color="${col}" onclick="wizardElegirColor(this)"></button>`
            ).join('');
            const sub = r ? `#${r.desde}–${r.hasta} · ${wizardCapacidadesFijas[i]} espacios` : `Sin Pokémon asignados · ${wizardCapacidadesFijas[i]} espacios`;
            return `<div class="wizard-nombre-fila" data-desde="${r ? r.desde : ''}" data-hasta="${r ? r.hasta : ''}">
                <input type="text" class="wizard-nombre-input" value="Carpeta ${i + 1}" maxlength="24" placeholder="Nombre de la carpeta">
                <div class="wizard-swatches" data-color-actual="${colorDefault}">${swatches}</div>
                <div class="wizard-nombre-sub">${sub}</div>
            </div>`;
        }).join('');
        return;
    }
    document.getElementById('wizard-nombres-lista').innerHTML = wizardGrupos.map((gens, i) => {
        // Si el grupo coincide exactamente con una carpeta existente, reusamos su nombre/color.
        const existente = carpetas.find(c => c.gens && c.gens.length === gens.length && c.gens.every(g => gens.includes(g)));
        const nombreDefault = existente ? existente.nombre : `Carpeta ${i + 1}`;
        const colorDefault  = existente ? existente.color : wizardColorDeGrupo(i + 1);
        const swatches = PALETA_CARPETAS.map(col =>
            `<button type="button" class="wizard-swatch${col === colorDefault ? ' selected' : ''}" style="background:${col}" data-color="${col}" onclick="wizardElegirColor(this)"></button>`
        ).join('');
        const sub = gens.length ? `${formatearRango(gens)} · ${wizardCapacidadesFijas[i]} espacios` : `Sin generaciones asignadas · ${wizardCapacidadesFijas[i]} espacios`;
        return `<div class="wizard-nombre-fila" data-gens="${gens.join(',')}">
            <input type="text" class="wizard-nombre-input" value="${nombreDefault}" maxlength="24" placeholder="Nombre de la carpeta">
            <div class="wizard-swatches" data-color-actual="${colorDefault}">${swatches}</div>
            <div class="wizard-nombre-sub">${sub}</div>
        </div>`;
    }).join('');
}

function wizardElegirColor(btn) {
    const cont = btn.parentElement;
    cont.dataset.colorActual = btn.dataset.color;
    [...cont.children].forEach(b => b.classList.toggle('selected', b === btn));
}

async function wizardGuardar() {
    const filas = [...document.querySelectorAll('.wizard-nombre-fila')];
    // Las carpetas sin nada asignado no se guardan (no hay nada que las identifique).
    const nueva = wizardModo === 'seguidas'
        ? filas
            .map((fila, i) => ({
                nombre: fila.querySelector('.wizard-nombre-input').value.trim(),
                color: fila.querySelector('.wizard-swatches').dataset.colorActual,
                desde: fila.dataset.desde ? Number(fila.dataset.desde) : null,
                hasta: fila.dataset.hasta ? Number(fila.dataset.hasta) : null,
                espacios: wizardCapacidadesFijas[i]
            }))
            .filter(c => c.desde !== null)
        : filas
            .map((fila, i) => ({
                nombre: fila.querySelector('.wizard-nombre-input').value.trim(),
                color: fila.querySelector('.wizard-swatches').dataset.colorActual,
                gens: fila.dataset.gens ? fila.dataset.gens.split(',').map(Number) : [],
                espacios: wizardCapacidadesFijas[i]
            }))
            .filter(c => c.gens.length);

    if (!nueva.length) {
        mostrarToastError(wizardModo === 'seguidas' ? 'Asigná al menos un rango a alguna carpeta.' : 'Asigná al menos una generación a alguna carpeta.');
        return;
    }
    if (nueva.some(c => !c.nombre)) {
        mostrarToastError('Todas las carpetas necesitan un nombre.');
        return;
    }
    const nombresVistos = new Set();
    if (nueva.some(c => {
        const clave = c.nombre.toLowerCase();
        if (nombresVistos.has(clave)) return true;
        nombresVistos.add(clave);
        return false;
    })) {
        mostrarToastError('Cada carpeta necesita un nombre distinto.');
        return;
    }

    const btn = document.getElementById('wizard-btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
        const res = await fetch('/api/carpetas-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modo: wizardModo, carpetas: nueva })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
        await cargarCarpetasConfig();
        renderSidebar();
        renderBinderBar();
        localStorage.setItem('carpetasWizardVisto', '1');
        cerrarWizardCarpetas();
        mostrarToastInfo('Carpetas actualizadas.');
        // La config recién guardada puede no alcanzar para las variantes activas
        // (wizardCalcularRangos no las conoce en modo "seguidas"); avisar sin bloquear.
        await revisarCapacidadCarpetas();
    } catch (err) {
        mostrarToastError(err.message || 'No se pudo guardar la configuración.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}


// ── CÁMARA OCR ───────────────────────────────────────────────────
const cameraBoxView = document.getElementById('camera-fullscreen-view');
const video         = document.getElementById('video');
const ocrStatus     = document.getElementById('ocr-status');

function agregarAlHistorial(p) {
    historialOCR.unshift(p);
    if (historialOCR.length > 8) historialOCR.pop();
    renderHistorial();
}
function renderHistorial() {
    if (!historialOCR.length) return;
    const wrap = document.getElementById('ocr-historial-wrap');
    const list = document.getElementById('ocr-historial-list');
    wrap.style.display = 'block';
    list.innerHTML = '';
    historialOCR.forEach(p => {
        const tiene = tieneEnLS(p.id);
        const ancla = anclaIdCliente(p);
        let numR = ancla - cortesGen[p.gen];
        if (ancla >= 899 && ancla <= 905) numR = ancla - 809;
        const carpetaPk = carpetaDe(p);
        const colorPk = carpetaPk ? carpetaPk.color : coloresGen[p.gen-1];
        const bgPk    = carpetaPk ? carpetaPk.bg    : coloresBg[p.gen-1];
        const item = document.createElement('div');
        item.className = 'ocr-hist-item';
        item.onclick = () => mostrarFicha(p);
        item.innerHTML = `<img class="ocr-hist-img" src="${p.image}" alt="${p.name}"><span class="ocr-hist-name">${p.name.toLowerCase()}</span><span class="ocr-hist-badge" style="background:${bgPk};color:${colorPk}">R#${numR.toString().padStart(3,'0')}</span><span class="ocr-hist-estado">${tiene ? '✓' : '○'}</span>`;
        list.appendChild(item);
    });
}
async function toggleCamaraOCR() {
    const btnCam  = document.getElementById('btn-camara-header');
    if (streamCamara) { detenerCamara(); return; }
    try {
        btnCam  && btnCam.classList.add('cam-active');
        if (!esDesktop()) {
            ocrStatus.style.display = 'block';
            ocrStatus.textContent   = 'Abriendo cámara... ⏳';
            cameraBoxView.style.display = 'block';
            cameraBoxView.scrollIntoView({ behavior:'smooth', block:'center' });
        }
        streamCamara = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
        video.srcObject = streamCamara;
        scanActivo = true;
        iniciarBucleOCR();
    } catch(err) { alert('Error al abrir la cámara.'); detenerCamara(); }
}
function detenerCamara() {
    scanActivo = false;
    if (streamCamara) { streamCamara.getTracks().forEach(t => t.stop()); streamCamara = null; }
    cameraBoxView.style.display = 'none';
    ocrStatus.style.display = 'none';
    const b = document.getElementById('btn-camara-header');
    b && b.classList.remove('cam-active');
}
async function iniciarBucleOCR() {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    if (!workerOCR) workerOCR = await Tesseract.createWorker('eng+spa', undefined, {
        workerPath: '/vendor/tesseract/worker.min.js',
        corePath: '/vendor/tesseract',
        // El paquete de idioma (eng/spa .traineddata) sigue viniendo de la
        // CDN por defecto de Tesseract: autohospedarlo sumaría ~20-30MB al
        // repo para una función que de por sí necesita cámara y uso activo.
        // Tesseract además cachea el paquete en IndexedDB tras la primera vez.
    });
    ocrStatus.style.display = 'block';
    ocrStatus.textContent   = '🔍 Escaneando nombre...';
    while (streamCamara && scanActivo) {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = 600; canvas.height = 150;
            ctx.filter = 'grayscale(100%) contrast(250%) brightness(120%)';
            ctx.drawImage(video, video.videoWidth*0.2, video.videoHeight*0.35, video.videoWidth*0.6, video.videoHeight*0.15, 0, 0, 600, 150);
            const { data: { text } } = await workerOCR.recognize(canvas);
            const nombre = text.trim().toUpperCase();
            if (nombre.length > 2) {
                let data = [];
                try {
                    const res = await fetch(`/api/buscar?q=${encodeURIComponent(nombre)}`);
                    if (res.ok) data = await res.json();
                } catch (err) {
                    // fallo de red puntual: seguimos escaneando en el siguiente ciclo
                }
                if (data.length > 0) {
                    if (navigator.vibrate) navigator.vibrate([80,40,80]);
                    ocrStatus.textContent = `✅ Encontrado: ${data[0].name.toLowerCase()}`;
                    agregarAlHistorial(data[0]);
                    mostrarFicha(data[0]);
                    detenerCamara();
                    break;
                }
            }
        }
        await new Promise(r => setTimeout(r, 1500));
    }
}

// ── SSE ──────────────────────────────────────────────────────────
// Se activa justo antes de que ESTA pestaña dispare un cambio que el propio
// servidor le va a reflejar de vuelta por el mismo broadcast (p.ej. togglear
// una categoría de variantes) — así el eco de nuestro propio cambio no
// dispara el aviso de "otro dispositivo" ni cierra la galería.
let sseIgnorarProximoConfig = false;
function iniciarSSE() {
    const es = new EventSource('/api/eventos');
    es.onmessage = (e) => {
        const msg = JSON.parse(e.data);

        if (msg.tipo === 'config') {
            if (sseIgnorarProximoConfig) { sseIgnorarProximoConfig = false; return; }
            // Se reutiliza este tipo para avisar "algo grande cambió, recarga todo"
            // (alguien importó un respaldo, o reconfiguró las carpetas, desde otro
            // dispositivo).
            Object.keys(cachePokemon).forEach(k => delete cachePokemon[k]);
            cerrarGaleriaYVolver();
            // En escritorio no hay pantalla de inicio separada de la galería
            // (ver mismo fix en toggleCategoriaVariante()) — sin esto el panel
            // se queda mostrando la vista vieja.
            if (esDesktop()) verPokedexCompleta();
            cargarCarpetasConfig().then(() => { renderSidebar(); renderBinderBar(); });
            cargarEstadisticasSinMoverScroll();
            actualizarBadgePendientes();
            mostrarToastInfo('La colección se actualizó desde otro dispositivo — recargando.');
            return;
        }

        if (msg.tipo !== 'cambio') return;
        actualizarBadgePendientes(); // el sincronizador compara bulk y carpetas, así que cualquier cambio en cualquiera de los dos puede afectarlo
        if (msg.modo !== modoActual) return; // el resto de esta vista no aplica al otro inventario
        if (msg.estado) {
            localStorage.setItem(claveLS(msg.id), 'true');
            if (msg.fecha) guardarFechaRegistro(msg.id, msg.fecha);
        } else {
            localStorage.removeItem(claveLS(msg.id));
        }
        cargarEstadisticasSinMoverScroll();
        mostrarToastSync(msg.id, msg.estado);
    };
    es.onerror = () => { es.close(); setTimeout(iniciarSSE, 3000); };
}
let toastTimer = null;
function mostrarToastSync(id, estado) {
    let toast = document.getElementById('sync-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sync-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 16px;font-size:12px;font-weight:600;color:var(--text);box-shadow:0 4px 16px var(--shadow);z-index:800;white-space:nowrap;opacity:0;transition:opacity .2s ease;';
        document.body.appendChild(toast);
    }
    toast.textContent = `🔄 Sincronizado — #${id} ${estado ? '✓ añadido' : '○ quitado'} en otro dispositivo`;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── INIT ─────────────────────────────────────────────────────────
window.onload = async () => {
    sincronizarGrids();
    aplicarTema();
    aplicarModoVista();
    actualizarBotonesModo();
    revisarSesion();
    await cargarCarpetasConfig();
    await cargarEstadisticas();

    if (esDesktop()) verPokedexCompleta();

    precargarTodasLasGens();
    iniciarSSE();
    actualizarBadgePendientes();

    // Service worker: permite ver la colección (últimos datos cargados) sin
    // internet. Los cambios (marcar/desmarcar) siguen necesitando conexión.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.warn('No se pudo registrar el service worker:', err);
        });
    }

    // Primer contacto: si todavía no pasó por el wizard de carpetas en este
    // dispositivo, lo abrimos solo (una vez que la app ya cargó y se puede
    // cerrar sin perder nada). Si lo cierra sin terminar, no vuelve a
    // insistir — queda accesible desde Ajustes cuando quiera.
    if (!localStorage.getItem('carpetasWizardVisto')) {
        setTimeout(abrirWizardCarpetas, 600);
    }
};

document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarLogin();
});
document.getElementById('login-toggle-ver').addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const btn   = document.getElementById('login-toggle-ver');
    const verla = input.type === 'password';
    input.type  = verla ? 'text' : 'password';
    btn.textContent = verla ? '🙈' : '👁️';
});
document.getElementById('login-close').onclick = cerrarLoginModal;

window.addEventListener('resize', () => {
    sincronizarGrids();
    if (esDesktop() && !genActualAbierta) verPokedexCompleta();
});

async function precargarTodasLasGens() {
    await new Promise(r => setTimeout(r, 1500));
    for (let g = 1; g <= 9; g++) {
        if (!cachePokemon[g]) {
            try {
                const res = await fetch(`/api/buscar?gen=${g}`);
                if (!res.ok) throw new Error('respuesta no válida');
                cachePokemon[g] = await res.json();
            } catch(e) {
                console.warn(`Gen ${g} no se pudo precargar`, e);
            }
        }
    }
}
