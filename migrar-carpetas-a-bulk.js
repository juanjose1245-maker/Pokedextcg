// ── MIGRACIÓN: copiar todo el inventario de "carpetas" hacia "bulk" ──
//
// Uso:
//   1. Detén el servidor (para que no sobreescriba inventario.json mientras corres esto).
//   2. Coloca este archivo en la MISMA carpeta donde vive inventario.json (la raíz de tu proyecto).
//   3. Corre:  node migrar-carpetas-a-bulk.js
//   4. Vuelve a iniciar el servidor.
//
// Qué hace:
//   - Lee inventario.json
//   - Por cada Pokémon marcado en "carpetas", lo agrega también a "bulk"
//     (si ya estaba en bulk, respeta la fecha que ya tenía ahí — no la pisa)
//   - Guarda un respaldo (inventario.backup-<timestamp>.json) ANTES de escribir nada
//   - Escribe el inventario.json actualizado

const fs   = require('fs');
const path = require('path');

const RUTA_INVENTARIO = path.join(__dirname, 'inventario.json');

if (!fs.existsSync(RUTA_INVENTARIO)) {
    console.error('❌ No encontré inventario.json en esta carpeta. Copia este script junto a él y vuelve a correrlo.');
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RUTA_INVENTARIO, 'utf8'));

if (!raw.carpetas && !raw.bulk) {
    console.error('❌ Este inventario.json no tiene el formato nuevo ({ bulk, carpetas }). ¿Ya actualizaste el servidor?');
    process.exit(1);
}

const carpetas = raw.carpetas || {};
const bulk     = raw.bulk || {};

const idsCarpetas = Object.keys(carpetas);
if (idsCarpetas.length === 0) {
    console.log('ℹ️  No hay nada marcado en "carpetas" — no hay nada que copiar.');
    process.exit(0);
}

// ── Respaldo antes de tocar nada ──
const timestamp  = new Date().toISOString().replace(/[:.]/g, '-');
const rutaRespaldo = path.join(__dirname, `inventario.backup-${timestamp}.json`);
fs.writeFileSync(rutaRespaldo, JSON.stringify(raw, null, 2));
console.log(`🗂️  Respaldo guardado en: ${path.basename(rutaRespaldo)}`);

// ── Copiar carpetas -> bulk (sin pisar fechas que ya existan en bulk) ──
let agregados = 0;
let yaExistian = 0;

idsCarpetas.forEach(id => {
    if (bulk[id]) {
        yaExistian++;
    } else {
        bulk[id] = { fecha: carpetas[id]?.fecha || new Date().toISOString() };
        agregados++;
    }
});

raw.bulk = bulk;
fs.writeFileSync(RUTA_INVENTARIO, JSON.stringify(raw, null, 2));

console.log(`✅ Listo.`);
console.log(`   Total en "carpetas": ${idsCarpetas.length}`);
console.log(`   Agregados a "bulk": ${agregados}`);
console.log(`   Ya estaban en "bulk" (sin tocar): ${yaExistian}`);
console.log(`   Total ahora en "bulk": ${Object.keys(bulk).length}`);
console.log(`\nSi algo sale mal, tu respaldo está en: ${path.basename(rutaRespaldo)}`);
