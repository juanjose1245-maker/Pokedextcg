// i18n.js — Diccionario de traducciones ES/EN y helper t().
//
// Español es el idioma por defecto; inglés es el segundo idioma soportado.
// Este archivo NO depende del DOM ni de app.js — puede cargar primero sin
// problema. Todavía nada lo consume (eso arranca en tasks posteriores):
// existe y funciona, pero index.html/app.js siguen con su texto hardcodeado.
//
// Convención de claves: "área.elemento" (en minúsculas, sin acentos ni
// espacios en la clave — el VALOR sí lleva acentos normalmente). Los
// strings con contenido dinámico usan placeholders `{nombre}` en vez del
// `${...}` original; t() los reemplaza con los valores pasados en `vars`.

const I18N = {
    es: {
        // ── COMÚN (piezas reutilizadas en varias plantillas) ──────────
        'comun.de': `de`,
        'comun.genNumero': `Gen {n}`,
        'comun.pokedexCompleta': `Pokédex Completa`,

        // ── FAB (botón flotante "volver" en vistas de detalle) ─────────
        'fab.volver': `← Volver`,

        // ── MODO: Bulk / Carpetas ──────────────────────────────────────
        'modo.bulk': `Bulk`,
        'modo.carpetas': `Carpetas`,
        'modo.bulkBadge': `📦 Bulk`,
        'modo.carpetasBadge': `📁 Carpetas`,

        // ── SIDEBAR (escritorio) ───────────────────────────────────────
        'sidebar.coleccion': `Colección`,
        'sidebar.carpetasLabel': `Carpetas`,
        'sidebar.metricas': `📊 Métricas`,
        'sidebar.camara': `📷 Cámara`,
        'sidebar.porAcomodar': `🔄 Por acomodar`,
        'sidebar.ajustes': `⚙️ Ajustes`,

        // ── HEADER (mobile, sticky) ────────────────────────────────────
        'header.tituloMetricas': `Métricas`,
        'header.tituloCamara': `Cámara`,
        'header.tituloPorAcomodar': `Por acomodar en Carpetas`,
        'header.tituloAjustes': `Ajustes`,

        // ── BUSCADOR ────────────────────────────────────────────────────
        'buscador.placeholder': `🔍 Buscar Pokémon...`,
        'buscador.sugerenciaMeta': `{region} · Gen {gen} #{numR}`,

        // ── TARJETA DE PROGRESO ────────────────────────────────────────
        'progreso.titulo': `Progreso de la colección`,
        'progreso.subtitulo': `Total registrado`,
        'progreso.tituloConRegion': `{region} · Progreso`,

        // ── CÁMARA / OCR ────────────────────────────────────────────────
        'camara.tituloSeccion': `Escáner de cartas`,
        'camara.iniciando': `Iniciando escáner... ⏳`,
        'camara.escaneadasSesion': `Escaneadas esta sesión`,
        'camara.abriendo': `Abriendo cámara... ⏳`,
        'camara.errorAbrir': `Error al abrir la cámara.`,
        'camara.escaneando': `🔍 Escaneando nombre...`,
        'camara.encontrado': `✅ Encontrado: {nombre}`,

        // ── GENERACIONES (grilla de inicio) ────────────────────────────
        'generaciones.tituloSeccion': `Progreso por generación`,
        'gen.completoTexto': `✓ completo`,
        'gen.faltanTexto': `faltan {n}`,

        // ── JALONES ─────────────────────────────────────────────────────
        'jalon.completado': `🎉 ¡Completado!`,
        'jalon.pocosFaltan': `🔥 Solo te faltan {faltan} para completar esta generación`,
        'jalon.casi': `⚡ ¡Casi! Faltan {faltan} Pokémon`,
        'jalon.porcentajeAlto': `💪 Al {pct}% — ¡casi lo logras!`,

        // ── FILTROS Y VISTA DE GALERÍA ──────────────────────────────────
        'filtro.todos': `Todos`,
        'filtro.tenemos': `✓ Tenemos`,
        'filtro.faltan': `○ Faltan`,
        'vista.chico': `Chico`,
        'vista.normal': `Normal`,
        'vista.grande': `Grande`,
        'galeria.subtituloConteo': `{tenemos} de {total} · faltan {faltan}`,
        'galeria.estadoTenemos': `tenemos`,
        'galeria.estadoFalta': `falta`,

        // ── CARPETAS (genérico) ────────────────────────────────────────
        'carpeta.rangoGens': `Gens {rango}`,
        'carpeta.tituloConNombre': `Carpeta {nombre}`,
        'carpeta.conRango': `Carpeta {nombre} — {rango}`,

        // ── POR ACOMODAR (pendientes Bulk → Carpetas) ──────────────────
        'pendientes.tituloConCantidad': `Por acomodar ({cantidad})`,
        'pendientes.subtitulo': `Están en Bulk, todavía no en tus carpetas`,
        'pendientes.subConCantidad': `Tienes estas cartas en Bulk, todavía no están en tus carpetas`,
        'pendientes.subCompleto': `¡Todo lo que tienes en Bulk ya está acomodado!`,

        // ── FICHA DE DETALLE ───────────────────────────────────────────
        'ficha.nombreDefault': `Pokémon`,
        'ficha.registradoEl': `Registrado el {fecha}`,
        'ficha.regionGen': `{region} · GEN {gen}`,
        'ficha.idRegionalNacional': `Regional #{numR} · Nacional #{nacional}`,
        'ficha.idRegionalNacionalConCategoria': `Regional #{numR} · Nacional #{nacional} · {categoria}`,
        'ficha.marcarAcomodado': `📥 Marcar como acomodado en Carpetas`,
        'ficha.estaEnBulk': `Está en tu Bulk — aún no está en Carpetas`,
        'ficha.yaLoTenemos': `✅ Ya lo tenemos`,
        'ficha.noLoTenemos': `❌ No lo tenemos — tocar para guardar`,

        // ── TIPOS DE POKÉMON ────────────────────────────────────────────
        'tipo.normal': `Normal`,
        'tipo.fuego': `Fuego`,
        'tipo.agua': `Agua`,
        'tipo.planta': `Planta`,
        'tipo.electrico': `Eléctrico`,
        'tipo.hielo': `Hielo`,
        'tipo.lucha': `Lucha`,
        'tipo.veneno': `Veneno`,
        'tipo.tierra': `Tierra`,
        'tipo.volador': `Volador`,
        'tipo.psiquico': `Psíquico`,
        'tipo.bicho': `Bicho`,
        'tipo.roca': `Roca`,
        'tipo.fantasma': `Fantasma`,
        'tipo.dragon': `Dragón`,
        'tipo.oscuro': `Oscuro`,
        'tipo.acero': `Acero`,
        'tipo.hada': `Hada`,

        // ── CATEGORÍAS DE VARIANTE (badge en la tarjeta/ficha) ──────────
        'categoria.regional': `Regional`,
        'categoria.mega': `Mega`,
        'categoria.primigenia': `Primigenia`,
        'categoria.gigamax': `Gigamax`,
        'categoria.alternativa': `Alt.`,

        // ── MÉTRICAS ────────────────────────────────────────────────────
        'metricas.titulo': `📊 Resumen`,
        'metricas.subtitulo': `{conseguidos} de {total} Pokémon registrados`,
        'metricas.progresoRecienteTitulo': `Progreso reciente ({modo})`,
        'metricas.ultimos7': `Últimos 7 días`,
        'metricas.ultimos30': `Últimos 30 días`,
        'metricas.jalonesTitulo': `Jalones`,
        'metricas.porGeneracionTitulo': `Por generación`,
        'metricas.completa': `✓ completa`,

        // ── AJUSTES ─────────────────────────────────────────────────────
        'ajustes.tema': `Tema`,
        'ajustes.idioma': `Idioma`,
        'ajustes.temaAuto': `Auto (según el sistema)`,
        'ajustes.temaClaro': `☀️ Claro`,
        'ajustes.temaOscuro': `🌙 Oscuro`,
        'ajustes.tituloModal': `⚙️ Ajustes`,
        'ajustes.seccionColeccion': `Colección`,
        'ajustes.exportarTitulo': `Exportar mi colección`,
        'ajustes.exportarSub': `Descarga un respaldo en JSON`,
        'ajustes.importarTitulo': `Importar respaldo`,
        'ajustes.importarSub': `Reemplaza el inventario actual`,
        'ajustes.listaFaltantesTitulo': `Lista de faltantes`,
        'ajustes.listaFaltantesSub': `Descarga un .txt con lo que te falta`,
        'ajustes.variantesTitulo': `Variantes`,
        'ajustes.variantesSub': `Formas regionales, Mega, Gigamax y más como cartas propias`,
        'ajustes.respaldosTitulo': `Respaldos`,
        'ajustes.respaldosSub': `Ver y restaurar copias automáticas del inventario`,
        'ajustes.seccionCarpetas': `Carpetas`,
        'ajustes.pdfTitulo': `Recortables para carpetas (PDF)`,
        'ajustes.pdfSub': `9 por hoja carta, en orden de Pokédex — con opciones`,
        'ajustes.configurarCarpetasTitulo': `Configurar carpetas`,
        'ajustes.configurarCarpetasSub': `Elegí cuántas carpetas tenés y qué generaciones va en cada una`,
        'ajustes.seccionPreferencias': `Preferencias`,
        'ajustes.sesionSub': `Necesaria para marcar/editar cartas`,
        'ajustes.version': `Versión {commit}`,

        // ── PDF DE RECORTABLES ─────────────────────────────────────────
        'pdf.tituloModal': `✂️ Recortables para carpetas`,
        'pdf.carpetasAIncluir': `Carpetas a incluir`,
        'pdf.portadaCheckbox': `Portada por región con los 3 iniciales`,
        'pdf.numerosAMostrar': `Números a mostrar`,
        'pdf.numerosAmbos': `Regional y Nacional`,
        'pdf.numerosSoloRegional': `Solo Regional`,
        'pdf.numerosSoloNacional': `Solo Nacional`,
        'pdf.generarBoton': `Generar PDF`,
        'pdf.generarSub': `Puede tardar un minuto la primera vez`,
        'pdf.generandoTexto': `Generando... puede tardar un minuto`,

        // ── VARIANTES ───────────────────────────────────────────────────
        'variantes.tituloModal': `🧬 Variantes`,
        'variantes.categoriasLabel': `Categorías a trackear como cartas propias`,
        'variantes.cat.regional.label': `Formas regionales`,
        'variantes.cat.regional.sub': `Alolan, Galarian, Hisuian, Paldean`,
        'variantes.cat.mega.label': `Megaevolución`,
        'variantes.cat.mega.sub': `Incluye los casos X/Y (Charizard, Mewtwo)`,
        'variantes.cat.primigenia.label': `Regresión Primigenia`,
        'variantes.cat.primigenia.sub': `Kyogre y Groudon`,
        'variantes.cat.gigamax.label': `Gigamax`,
        'variantes.cat.gigamax.sub': `Espada/Escudo + expansiones`,
        'variantes.cat.alternativa.label': `Formas alternativas`,
        'variantes.cat.alternativa.sub': `Con carta TCG propia (Deoxys, Rotom, Arceus, etc.)`,

        // ── RESPALDOS ───────────────────────────────────────────────────
        'respaldos.tituloModal': `🗄️ Respaldos`,
        'respaldos.avisoRestaurar': `Restaurar reemplaza TODO tu inventario (Bulk y Carpetas) por el de ese momento`,
        'respaldos.tipoAutomatico': `Automático`,
        'respaldos.tipoPreImportacion': `Antes de importar`,
        'respaldos.tipoPreRestauracion': `Antes de restaurar`,
        'respaldos.cargando': `Cargando…`,
        'respaldos.errorCarga': `No se pudieron cargar los respaldos.`,
        'respaldos.vacio': `Todavía no hay respaldos guardados.`,
        'respaldos.restaurarBoton': `Restaurar`,

        // ── WIZARD: PLANEAR MIS CARPETAS ────────────────────────────────
        'wizard.tituloModal': `🗂️ Planear mis carpetas`,
        'wizard.pasoVariantes.pregunta': `¿Contás alguna de estas variantes en tu colección?`,
        'wizard.pasoVariantes.nota': `💡 Podés dejarlas todas sin marcar y activarlas después desde Ajustes.`,
        'wizard.siguiente': `Siguiente →`,
        'wizard.atras': `← Atrás`,
        'wizard.resolverProblema': `Resolvé lo que no entra primero`,
        'wizard.pasoModo.pregunta': `¿Cómo querés acomodar tu colección?`,
        'wizard.pasoModo.seguidasTitulo': `Todas seguidas`,
        'wizard.pasoModo.seguidasDesc': `Reparte la colección en orden de Pokédex nacional, sin respetar cortes de generación`,
        'wizard.pasoModo.separadasTitulo': `Separadas por generación`,
        'wizard.pasoModo.separadasDesc': `Cada carpeta tiene generaciones completas, nunca partidas`,
        'wizard.pasoFormato.pregunta': `¿Bolsillos por página (una cara)?`,
        'wizard.pasoFormato.opcion4': `4 por página`,
        'wizard.pasoFormato.opcion9': `9 por página (lo más común)`,
        'wizard.pasoFormato.opcion12': `12 por página`,
        'wizard.pasoFormato.nota': `💡 Una hoja tiene 2 páginas (frente y dorso) — cuando más adelante pidamos "hojas", ya vamos a contar las dos caras solas.`,
        'wizard.pasoFormato.espaciosBlancoLabel': `Dejar espacios en blanco para que cada generación empiece en una página nueva`,
        'wizard.pasoCantidad.pregunta': `¿Cuántas carpetas querés usar?`,
        'wizard.pasoCapacidad.pregunta': `¿Cómo preferís poner la capacidad?`,
        'wizard.pasoCapacidad.opcionHojas': `En hojas (contando las 2 caras)`,
        'wizard.pasoCapacidad.opcionEspacios': `En espacios totales`,
        'wizard.pasoCapacidad.labelHojas': `Carpeta {n} — hojas ({espacios} espacios c/u)`,
        'wizard.pasoCapacidad.labelEspacios': `Carpeta {n} — espacios totales`,
        'wizard.pasoCapacidad.previewInsuficiente': `⚠️ Entre todas suman {capacidadTotal} espacios, y hacen falta {necesarioTotal} para cubrir toda la colección.`,
        'wizard.pasoCapacidad.previewSuficiente': `✓ Entre todas suman {capacidadTotal} espacios (necesitás al menos {necesarioTotal}).`,
        'wizard.error.capacidadInsuficiente': `Entre todas suman {total} espacios, y hacen falta {necesario} para cubrir toda la colección.`,
        'wizard.pasoAjuste.pregunta': `Así te recomendamos acomodarlas — tocá una generación para cambiarla de carpeta`,
        'wizard.carpetaN': `Carpeta {n}`,
        'wizard.pasoAjuste.carpetaConDosPuntos': `Carpeta {n}:`,
        'wizard.pasoAjuste.vacia': `(vacía)`,
        'wizard.pasoAjuste.sePasaPor': `⚠️ Se pasa por {n} espacios`,
        'wizard.pasoAjuste.espaciosVacios': `{n} espacios vacíos`,
        'wizard.pasoNombres.pregunta': `Nombre y color de cada carpeta`,
        'wizard.pasoNombres.placeholderNombre': `Nombre de la carpeta`,
        'wizard.pasoNombres.rangoConEspacios': `#{desde}–{hasta} · {espacios} espacios`,
        'wizard.pasoNombres.sinPokemon': `Sin Pokémon asignados · {espacios} espacios`,
        'wizard.pasoNombres.rangoGensConEspacios': `{rango} · {espacios} espacios`,
        'wizard.pasoNombres.sinGeneraciones': `Sin generaciones asignadas · {espacios} espacios`,
        'wizard.guardar': `Guardar`,
        'wizard.guardando': `Guardando...`,

        // ── LOGIN ───────────────────────────────────────────────────────
        'login.titulo': `Iniciar sesión`,
        'login.sub': `Necesitas iniciar sesión para hacer cambios (marcar cartas, importar, etc). Ver tu colección no requiere sesión.`,
        'login.cerrarSesion': `Cerrar sesión`,
        'login.tituloDefinir': `Definí tu contraseña`,
        'login.subDefinir': `Todavía no configuraste una contraseña de administración. Elegí una para poder hacer cambios (marcar cartas, importar, etc).`,
        'login.placeholderPassword': `Contraseña`,
        'login.togglePasswordTitle': `Mostrar/ocultar contraseña`,
        'login.placeholderNueva': `Nueva contraseña`,
        'login.placeholderConfirmar': `Confirmar contraseña`,
        'login.cancelar': `Cancelar`,
        'login.entrar': `Entrar`,
        'login.definirBoton': `Definir contraseña`,

        // ── TOASTS ──────────────────────────────────────────────────────
        'toast.sesionIniciada': `Sesión iniciada.`,
        'toast.sesionCerrada': `Sesión cerrada.`,
        'toast.quitasteA': `Quitaste a {nombre}`,
        'toast.botonDeshacer': `DESHACER`,
        'toast.versionNueva': `🔄 Hay una versión nueva`,
        'toast.botonActualizar': `ACTUALIZAR`,
        'toast.capacidadInsuficiente': `"{nombre}" necesita {necesario} espacios y tiene {espacios} — ajustá tus carpetas cuando puedas.`,
        'toast.botonAjustar': `AJUSTAR`,
        'toast.sinFaltantes': `¡No te falta ningún Pokémon en este modo!`,
        'toast.importado': `Importado: {importados} registros.`,
        'toast.importadoConIgnorados': `Importado: {importados} registros ({ignorados} ignorados).`,
        'toast.respaldoDescargado': `Respaldo descargado.`,
        'toast.pdfListo': `PDF listo.`,
        'toast.categoriaActivada': `Categoría activada.`,
        'toast.categoriaDesactivada': `Categoría desactivada.`,
        'toast.inventarioRestaurado': `Inventario restaurado.`,
        'toast.carpetasActualizadas': `Carpetas actualizadas.`,
        'toast.coleccionActualizadaOtroDispositivo': `La colección se actualizó desde otro dispositivo — recargando.`,
        'toast.sincronizadoAnadido': `🔄 Sincronizado — #{id} ✓ añadido en otro dispositivo`,
        'toast.sincronizadoQuitado': `🔄 Sincronizado — #{id} ○ quitado en otro dispositivo`,

        // ── ERRORES ─────────────────────────────────────────────────────
        'error.respuestaInvalida': `Respuesta no válida del servidor.`,
        'error.password_incorrecta': `Contraseña incorrecta.`,
        'error.noConexionServidor': `No se pudo conectar con el servidor.`,
        'error.passwordCorta': `La contraseña debe tener al menos 4 caracteres.`,
        'error.passwordsNoCoinciden': `Las contraseñas no coinciden.`,
        'error.noSePudoDefinirPassword': `No se pudo definir la contraseña.`,
        'error.noSePudoDeshacer': `No se pudo deshacer. Márcalo manualmente de nuevo.`,
        'error.noCargoGeneracion': `No se pudo cargar la generación {g}. Reintenta.`,
        'error.noCargoRango': `No se pudo cargar el rango #{desde}-{hasta}. Reintenta.`,
        'error.archivoNoJSON': `Ese archivo no es un JSON válido.`,
        'error.archivoFormatoInvalido': `Ese archivo no tiene el formato de un respaldo de esta app.`,
        'error.archivoSinDatosModo': `El archivo no trae datos para "{modo}".`,
        'error.noSePudoImportar': `No se pudo importar el respaldo. Revisa el archivo o tu conexión.`,
        'error.esperaCarga': `Espera a que cargue la colección.`,
        'error.noSePudoComparar': `No se pudo comparar Bulk y Carpetas. Revisa tu conexión.`,
        'error.noSePudoCargarColeccion': `No se pudo cargar la colección. Revisa tu conexión.`,
        'error.noSePudoSincronizar': `No se pudo sincronizar. Revisa tu conexión.`,
        'error.noSePudoGenerarRespaldo': `No se pudo generar el respaldo. Revisa tu conexión.`,
        'error.elegiUnaCarpeta': `Elegí al menos una carpeta.`,
        'error.noSePudoGenerarPDF': `No se pudo generar el PDF. Revisa tu conexión.`,
        'error.noSePudoGuardarCambio': `No se pudo guardar el cambio. Intenta de nuevo.`,
        'error.noSePudoCargarVariantes': `No se pudo cargar la configuración de variantes.`,
        'error.noSePudoGuardarVariantes': `No se pudo guardar la configuración de variantes.`,
        'error.noSePudoRestaurar': `No se pudo restaurar el respaldo.`,
        'error.asignaRango': `Asigná al menos un rango a alguna carpeta.`,
        'error.asignaGeneracion': `Asigná al menos una generación a alguna carpeta.`,
        'error.carpetasNecesitanNombre': `Todas las carpetas necesitan un nombre.`,
        'error.carpetasNombreDistinto': `Cada carpeta necesita un nombre distinto.`,
        'error.noSePudoGuardarConfig': `No se pudo guardar la configuración.`,

        // ── CONFIRMACIONES (window.confirm) ─────────────────────────────
        'confirm.importarReemplazo': `Esto REEMPLAZA todo tu inventario actual de "{modo}" con los {cantidad} registros de este archivo. Se guarda un respaldo del estado actual por si acaso. ¿Continuar?`,
        'confirm.restaurarRespaldo': `Esto REEMPLAZA todo tu inventario actual (Bulk Y Carpetas) con el contenido de este respaldo. Se guarda una copia del estado actual antes de pisarlo, por si acaso. ¿Continuar?`,

        // ── LISTA DE FALTANTES (descarga .txt) ──────────────────────────
        'listaFaltantes.encabezado': `Pokémon que faltan — {modo}`,
        'listaFaltantes.generadoEl': `Generado el {fecha}`,
        'listaFaltantes.total': `Total: {total}`,
    },
    en: {
        // ── COMÚN ───────────────────────────────────────────────────────
        'comun.de': `of`,
        'comun.genNumero': `Gen {n}`,
        'comun.pokedexCompleta': `Complete Pokédex`,

        // ── FAB (botón flotante "volver" en vistas de detalle) ─────────
        'fab.volver': `← Back`,

        // ── MODO: Bulk / Carpetas ──────────────────────────────────────
        'modo.bulk': `Bulk`,
        'modo.carpetas': `Folders`,
        'modo.bulkBadge': `📦 Bulk`,
        'modo.carpetasBadge': `📁 Folders`,

        // ── SIDEBAR (escritorio) ───────────────────────────────────────
        'sidebar.coleccion': `Collection`,
        'sidebar.carpetasLabel': `Folders`,
        'sidebar.metricas': `📊 Metrics`,
        'sidebar.camara': `📷 Camera`,
        'sidebar.porAcomodar': `🔄 To organize`,
        'sidebar.ajustes': `⚙️ Settings`,

        // ── HEADER (mobile, sticky) ────────────────────────────────────
        'header.tituloMetricas': `Metrics`,
        'header.tituloCamara': `Camera`,
        'header.tituloPorAcomodar': `To organize into Folders`,
        'header.tituloAjustes': `Settings`,

        // ── BUSCADOR ────────────────────────────────────────────────────
        'buscador.placeholder': `🔍 Search Pokémon...`,
        'buscador.sugerenciaMeta': `{region} · Gen {gen} #{numR}`,

        // ── TARJETA DE PROGRESO ────────────────────────────────────────
        'progreso.titulo': `Collection progress`,
        'progreso.subtitulo': `Total registered`,
        'progreso.tituloConRegion': `{region} · Progress`,

        // ── CÁMARA / OCR ────────────────────────────────────────────────
        'camara.tituloSeccion': `Card scanner`,
        'camara.iniciando': `Starting scanner... ⏳`,
        'camara.escaneadasSesion': `Scanned this session`,
        'camara.abriendo': `Opening camera... ⏳`,
        'camara.errorAbrir': `Error opening the camera.`,
        'camara.escaneando': `🔍 Scanning name...`,
        'camara.encontrado': `✅ Found: {nombre}`,

        // ── GENERACIONES (grilla de inicio) ────────────────────────────
        'generaciones.tituloSeccion': `Progress by generation`,
        'gen.completoTexto': `✓ complete`,
        'gen.faltanTexto': `{n} missing`,

        // ── JALONES ─────────────────────────────────────────────────────
        'jalon.completado': `🎉 Completed!`,
        'jalon.pocosFaltan': `🔥 Only {faltan} left to complete this generation`,
        'jalon.casi': `⚡ Almost there! {faltan} Pokémon left`,
        'jalon.porcentajeAlto': `💪 At {pct}% — you're almost there!`,

        // ── FILTROS Y VISTA DE GALERÍA ──────────────────────────────────
        'filtro.todos': `All`,
        'filtro.tenemos': `✓ Have`,
        'filtro.faltan': `○ Missing`,
        'vista.chico': `Small`,
        'vista.normal': `Normal`,
        'vista.grande': `Large`,
        'galeria.subtituloConteo': `{tenemos} of {total} · {faltan} missing`,
        'galeria.estadoTenemos': `have`,
        'galeria.estadoFalta': `missing`,

        // ── CARPETAS (genérico) ────────────────────────────────────────
        'carpeta.rangoGens': `Gens {rango}`,
        'carpeta.tituloConNombre': `Folder {nombre}`,
        'carpeta.conRango': `Folder {nombre} — {rango}`,

        // ── POR ACOMODAR (pendientes Bulk → Carpetas) ──────────────────
        'pendientes.tituloConCantidad': `To organize ({cantidad})`,
        'pendientes.subtitulo': `They're in Bulk, not yet in your folders`,
        'pendientes.subConCantidad': `You have these cards in Bulk, they're not in your folders yet`,
        'pendientes.subCompleto': `Everything you have in Bulk is already organized!`,

        // ── FICHA DE DETALLE ───────────────────────────────────────────
        'ficha.nombreDefault': `Pokémon`,
        'ficha.registradoEl': `Registered on {fecha}`,
        'ficha.regionGen': `{region} · GEN {gen}`,
        'ficha.idRegionalNacional': `Regional #{numR} · National #{nacional}`,
        'ficha.idRegionalNacionalConCategoria': `Regional #{numR} · National #{nacional} · {categoria}`,
        'ficha.marcarAcomodado': `📥 Mark as organized in Folders`,
        'ficha.estaEnBulk': `It's in your Bulk — not in Folders yet`,
        'ficha.yaLoTenemos': `✅ We already have it`,
        'ficha.noLoTenemos': `❌ We don't have it — tap to save`,

        // ── TIPOS DE POKÉMON ────────────────────────────────────────────
        'tipo.normal': `Normal`,
        'tipo.fuego': `Fire`,
        'tipo.agua': `Water`,
        'tipo.planta': `Grass`,
        'tipo.electrico': `Electric`,
        'tipo.hielo': `Ice`,
        'tipo.lucha': `Fighting`,
        'tipo.veneno': `Poison`,
        'tipo.tierra': `Ground`,
        'tipo.volador': `Flying`,
        'tipo.psiquico': `Psychic`,
        'tipo.bicho': `Bug`,
        'tipo.roca': `Rock`,
        'tipo.fantasma': `Ghost`,
        'tipo.dragon': `Dragon`,
        'tipo.oscuro': `Dark`,
        'tipo.acero': `Steel`,
        'tipo.hada': `Fairy`,

        // ── CATEGORÍAS DE VARIANTE (badge en la tarjeta/ficha) ──────────
        'categoria.regional': `Regional`,
        'categoria.mega': `Mega`,
        'categoria.primigenia': `Primal`,
        'categoria.gigamax': `Gigantamax`,
        'categoria.alternativa': `Alt.`,

        // ── MÉTRICAS ────────────────────────────────────────────────────
        'metricas.titulo': `📊 Summary`,
        'metricas.subtitulo': `{conseguidos} of {total} Pokémon registered`,
        'metricas.progresoRecienteTitulo': `Recent progress ({modo})`,
        'metricas.ultimos7': `Last 7 days`,
        'metricas.ultimos30': `Last 30 days`,
        'metricas.jalonesTitulo': `Milestones`,
        'metricas.porGeneracionTitulo': `By generation`,
        'metricas.completa': `✓ complete`,

        // ── AJUSTES ─────────────────────────────────────────────────────
        'ajustes.tema': `Theme`,
        'ajustes.idioma': `Language`,
        'ajustes.temaAuto': `Auto (based on system)`,
        'ajustes.temaClaro': `☀️ Light`,
        'ajustes.temaOscuro': `🌙 Dark`,
        'ajustes.tituloModal': `⚙️ Settings`,
        'ajustes.seccionColeccion': `Collection`,
        'ajustes.exportarTitulo': `Export my collection`,
        'ajustes.exportarSub': `Downloads a JSON backup`,
        'ajustes.importarTitulo': `Import backup`,
        'ajustes.importarSub': `Replaces the current inventory`,
        'ajustes.listaFaltantesTitulo': `Missing list`,
        'ajustes.listaFaltantesSub': `Downloads a .txt with what you're missing`,
        'ajustes.variantesTitulo': `Variants`,
        'ajustes.variantesSub': `Regional forms, Mega, Gigamax and more as their own cards`,
        'ajustes.respaldosTitulo': `Backups`,
        'ajustes.respaldosSub': `View and restore automatic inventory copies`,
        'ajustes.seccionCarpetas': `Folders`,
        'ajustes.pdfTitulo': `Cutouts for folders (PDF)`,
        'ajustes.pdfSub': `9 per letter-size sheet, in Pokédex order — with options`,
        'ajustes.configurarCarpetasTitulo': `Configure folders`,
        'ajustes.configurarCarpetasSub': `Choose how many folders you have and which generations go in each one`,
        'ajustes.seccionPreferencias': `Preferences`,
        'ajustes.sesionSub': `Required to mark/edit cards`,
        'ajustes.version': `Version {commit}`,

        // ── PDF DE RECORTABLES ─────────────────────────────────────────
        'pdf.tituloModal': `✂️ Folder cutouts`,
        'pdf.carpetasAIncluir': `Folders to include`,
        'pdf.portadaCheckbox': `Region cover page with the 3 starters`,
        'pdf.numerosAMostrar': `Numbers to show`,
        'pdf.numerosAmbos': `Regional and National`,
        'pdf.numerosSoloRegional': `Regional only`,
        'pdf.numerosSoloNacional': `National only`,
        'pdf.generarBoton': `Generate PDF`,
        'pdf.generarSub': `It might take a minute the first time`,
        'pdf.generandoTexto': `Generating... might take a minute`,

        // ── VARIANTES ───────────────────────────────────────────────────
        'variantes.tituloModal': `🧬 Variants`,
        'variantes.categoriasLabel': `Categories to track as their own cards`,
        'variantes.cat.regional.label': `Regional forms`,
        'variantes.cat.regional.sub': `Alolan, Galarian, Hisuian, Paldean`,
        'variantes.cat.mega.label': `Mega Evolution`,
        'variantes.cat.mega.sub': `Includes the X/Y cases (Charizard, Mewtwo)`,
        'variantes.cat.primigenia.label': `Primal Reversion`,
        'variantes.cat.primigenia.sub': `Kyogre and Groudon`,
        'variantes.cat.gigamax.label': `Gigantamax`,
        'variantes.cat.gigamax.sub': `Sword/Shield + expansions`,
        'variantes.cat.alternativa.label': `Alternate forms`,
        'variantes.cat.alternativa.sub': `With their own TCG card (Deoxys, Rotom, Arceus, etc.)`,

        // ── RESPALDOS ───────────────────────────────────────────────────
        'respaldos.tituloModal': `🗄️ Backups`,
        'respaldos.avisoRestaurar': `Restoring replaces your ENTIRE inventory (Bulk and Folders) with the one from that moment`,
        'respaldos.tipoAutomatico': `Automatic`,
        'respaldos.tipoPreImportacion': `Before importing`,
        'respaldos.tipoPreRestauracion': `Before restoring`,
        'respaldos.cargando': `Loading…`,
        'respaldos.errorCarga': `Couldn't load the backups.`,
        'respaldos.vacio': `There are no backups saved yet.`,
        'respaldos.restaurarBoton': `Restore`,

        // ── WIZARD: PLANEAR MIS CARPETAS ────────────────────────────────
        'wizard.tituloModal': `🗂️ Plan my folders`,
        'wizard.pasoVariantes.pregunta': `Do you have any of these variants in your collection?`,
        'wizard.pasoVariantes.nota': `💡 You can leave them all unchecked and turn them on later from Settings.`,
        'wizard.siguiente': `Next →`,
        'wizard.atras': `← Back`,
        'wizard.resolverProblema': `Fix what doesn't fit first`,
        'wizard.pasoModo.pregunta': `How do you want to organize your collection?`,
        'wizard.pasoModo.seguidasTitulo': `All in sequence`,
        'wizard.pasoModo.seguidasDesc': `Splits the collection in National Pokédex order, without respecting generation boundaries`,
        'wizard.pasoModo.separadasTitulo': `Split by generation`,
        'wizard.pasoModo.separadasDesc': `Each folder has whole generations, never split`,
        'wizard.pasoFormato.pregunta': `Pockets per page (one side)?`,
        'wizard.pasoFormato.opcion4': `4 per page`,
        'wizard.pasoFormato.opcion9': `9 per page (most common)`,
        'wizard.pasoFormato.opcion12': `12 per page`,
        'wizard.pasoFormato.nota': `💡 A sheet has 2 pages (front and back) — later on, when we ask for "sheets", we'll already be counting both sides.`,
        'wizard.pasoFormato.espaciosBlancoLabel': `Leave blank spaces so each generation starts on a new page`,
        'wizard.pasoCantidad.pregunta': `How many folders do you want to use?`,
        'wizard.pasoCapacidad.pregunta': `How do you prefer to set the capacity?`,
        'wizard.pasoCapacidad.opcionHojas': `In sheets (counting both sides)`,
        'wizard.pasoCapacidad.opcionEspacios': `In total spaces`,
        'wizard.pasoCapacidad.labelHojas': `Folder {n} — sheets ({espacios} spaces each)`,
        'wizard.pasoCapacidad.labelEspacios': `Folder {n} — total spaces`,
        'wizard.pasoCapacidad.previewInsuficiente': `⚠️ Together they add up to {capacidadTotal} spaces, but {necesarioTotal} are needed to cover the whole collection.`,
        'wizard.pasoCapacidad.previewSuficiente': `✓ Together they add up to {capacidadTotal} spaces (you need at least {necesarioTotal}).`,
        'wizard.error.capacidadInsuficiente': `Together they add up to {total} spaces, but you need at least {necesario} to cover the whole collection.`,
        'wizard.pasoAjuste.pregunta': `Here's how we recommend organizing them — tap a generation to move it to another folder`,
        'wizard.carpetaN': `Folder {n}`,
        'wizard.pasoAjuste.carpetaConDosPuntos': `Folder {n}:`,
        'wizard.pasoAjuste.vacia': `(empty)`,
        'wizard.pasoAjuste.sePasaPor': `⚠️ Over by {n} spaces`,
        'wizard.pasoAjuste.espaciosVacios': `{n} empty spaces`,
        'wizard.pasoNombres.pregunta': `Name and color for each folder`,
        'wizard.pasoNombres.placeholderNombre': `Folder name`,
        'wizard.pasoNombres.rangoConEspacios': `#{desde}–{hasta} · {espacios} spaces`,
        'wizard.pasoNombres.sinPokemon': `No Pokémon assigned · {espacios} spaces`,
        'wizard.pasoNombres.rangoGensConEspacios': `{rango} · {espacios} spaces`,
        'wizard.pasoNombres.sinGeneraciones': `No generations assigned · {espacios} spaces`,
        'wizard.guardar': `Save`,
        'wizard.guardando': `Saving...`,

        // ── LOGIN ───────────────────────────────────────────────────────
        'login.titulo': `Log in`,
        'login.sub': `You need to log in to make changes (mark cards, import, etc). Viewing your collection doesn't require a session.`,
        'login.cerrarSesion': `Log out`,
        'login.tituloDefinir': `Set your password`,
        'login.subDefinir': `You haven't set an admin password yet. Choose one so you can make changes (mark cards, import, etc).`,
        'login.placeholderPassword': `Password`,
        'login.togglePasswordTitle': `Show/hide password`,
        'login.placeholderNueva': `New password`,
        'login.placeholderConfirmar': `Confirm password`,
        'login.cancelar': `Cancel`,
        'login.entrar': `Log in`,
        'login.definirBoton': `Set password`,

        // ── TOASTS ──────────────────────────────────────────────────────
        'toast.sesionIniciada': `Session started.`,
        'toast.sesionCerrada': `Session closed.`,
        'toast.quitasteA': `You removed {nombre}`,
        'toast.botonDeshacer': `UNDO`,
        'toast.versionNueva': `🔄 There's a new version`,
        'toast.botonActualizar': `UPDATE`,
        'toast.capacidadInsuficiente': `"{nombre}" needs {necesario} spaces and has {espacios} — adjust your folders when you can.`,
        'toast.botonAjustar': `ADJUST`,
        'toast.sinFaltantes': `You're not missing any Pokémon in this mode!`,
        'toast.importado': `Imported: {importados} records.`,
        'toast.importadoConIgnorados': `Imported: {importados} records ({ignorados} skipped).`,
        'toast.respaldoDescargado': `Backup downloaded.`,
        'toast.pdfListo': `PDF ready.`,
        'toast.categoriaActivada': `Category turned on.`,
        'toast.categoriaDesactivada': `Category turned off.`,
        'toast.inventarioRestaurado': `Inventory restored.`,
        'toast.carpetasActualizadas': `Folders updated.`,
        'toast.coleccionActualizadaOtroDispositivo': `The collection was updated from another device — reloading.`,
        'toast.sincronizadoAnadido': `🔄 Synced — #{id} ✓ added on another device`,
        'toast.sincronizadoQuitado': `🔄 Synced — #{id} ○ removed on another device`,

        // ── ERRORES ─────────────────────────────────────────────────────
        'error.respuestaInvalida': `Invalid response from the server.`,
        'error.password_incorrecta': `Incorrect password.`,
        'error.noConexionServidor': `Couldn't connect to the server.`,
        'error.passwordCorta': `Password must be at least 4 characters.`,
        'error.passwordsNoCoinciden': `Passwords don't match.`,
        'error.noSePudoDefinirPassword': `Couldn't set the password.`,
        'error.noSePudoDeshacer': `Couldn't undo. Mark it manually again.`,
        'error.noCargoGeneracion': `Couldn't load generation {g}. Try again.`,
        'error.noCargoRango': `Couldn't load range #{desde}-{hasta}. Try again.`,
        'error.archivoNoJSON': `That file isn't a valid JSON.`,
        'error.archivoFormatoInvalido': `That file doesn't have this app's backup format.`,
        'error.archivoSinDatosModo': `The file has no data for "{modo}".`,
        'error.noSePudoImportar': `Couldn't import the backup. Check the file or your connection.`,
        'error.esperaCarga': `Wait for the collection to load.`,
        'error.noSePudoComparar': `Couldn't compare Bulk and Folders. Check your connection.`,
        'error.noSePudoCargarColeccion': `Couldn't load the collection. Check your connection.`,
        'error.noSePudoSincronizar': `Couldn't sync. Check your connection.`,
        'error.noSePudoGenerarRespaldo': `Couldn't generate the backup. Check your connection.`,
        'error.elegiUnaCarpeta': `Choose at least one folder.`,
        'error.noSePudoGenerarPDF': `Couldn't generate the PDF. Check your connection.`,
        'error.noSePudoGuardarCambio': `Couldn't save the change. Try again.`,
        'error.noSePudoCargarVariantes': `Couldn't load the variants configuration.`,
        'error.noSePudoGuardarVariantes': `Couldn't save the variants configuration.`,
        'error.noSePudoRestaurar': `Couldn't restore the backup.`,
        'error.asignaRango': `Assign at least one range to a folder.`,
        'error.asignaGeneracion': `Assign at least one generation to a folder.`,
        'error.carpetasNecesitanNombre': `All folders need a name.`,
        'error.carpetasNombreDistinto': `Each folder needs a different name.`,
        'error.noSePudoGuardarConfig': `Couldn't save the configuration.`,

        // ── CONFIRMACIONES (window.confirm) ─────────────────────────────
        'confirm.importarReemplazo': `This REPLACES your entire current "{modo}" inventory with the {cantidad} records from this file. A backup of the current state is saved just in case. Continue?`,
        'confirm.restaurarRespaldo': `This REPLACES your entire current inventory (Bulk AND Folders) with the contents of this backup. A copy of the current state is saved before overwriting it, just in case. Continue?`,

        // ── LISTA DE FALTANTES (descarga .txt) ──────────────────────────
        'listaFaltantes.encabezado': `Missing Pokémon — {modo}`,
        'listaFaltantes.generadoEl': `Generated on {fecha}`,
        'listaFaltantes.total': `Total: {total}`,
    }
};

let idiomaActual = localStorage.getItem('idiomaPreferido') || detectarIdiomaNavegador();

// "es" si el navegador está en español (cualquier variante: es, es-AR,
// es-MX, etc.), "en" para cualquier otro idioma — solo 2 idiomas
// soportados, no hace falta detectar más granularidad que esa.
function detectarIdiomaNavegador() {
    const lang = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
}

// t('clave', {n: 5}) → interpola {n} dentro del string encontrado.
// I18N.es es el fallback si falta la clave en el idioma activo (nunca
// debe devolver undefined para una clave real del diccionario). Si la
// clave no existe en ningún lado, devuelve la clave misma (para que un
// error de tipeo se note en pantalla en vez de mostrar texto vacío).
function t(clave, vars) {
    let texto = (I18N[idiomaActual] && I18N[idiomaActual][clave]) || I18N.es[clave] || clave;
    if (vars) for (const [k, v] of Object.entries(vars)) texto = texto.replaceAll(`{${k}}`, v);
    return texto;
}
