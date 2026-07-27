const fs = require('fs');
const crypto = require('crypto');

// Dos variantes con el arte idéntico son la misma carta física repetida (ver
// el caso real de Toxtricity Amped/Low Key Gmax, que compartían imagen y se
// coló sin este chequeo la primera vez) — se hashea cada imagen bajada y se
// aborta si dos variantes nuevas comparten hash, antes de escribir el archivo.
async function buscarImagenesDuplicadas(variantes) {
    const porHash = new Map();
    const duplicados = [];
    for (const v of variantes) {
        const res = await fetch(v.image);
        const buffer = Buffer.from(await res.arrayBuffer());
        const hash = crypto.createHash('md5').update(buffer).digest('hex');
        if (porHash.has(hash)) {
            duplicados.push([porHash.get(hash), v.name]);
        } else {
            porHash.set(hash, v.name);
        }
    }
    return duplicados;
}

async function fetchVariantes() {
    const dbActual = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
    const base = dbActual.filter(p => p.id <= 1025);
    if (base.length !== 1025) {
        throw new Error(`Las entradas con id <= 1025 en pokemon_db.json son ${base.length}, se esperaban 1025 — abortando para no pisar datos inesperados.`);
    }
    const genPorId = new Map(base.map(p => [p.id, p.gen]));
    const lista = JSON.parse(fs.readFileSync('variantes_lista.json', 'utf8'));

    const categoriasValidas = new Set(['regional', 'mega', 'primigenia', 'gigamax', 'alternativa']);
    const variantes = [];
    let siguienteId = 1026;
    const saltados = [];

    console.log(`🚀 Procesando ${lista.length} variantes...`);

    for (const entrada of lista) {
        if (!categoriasValidas.has(entrada.categoria)) {
            throw new Error(`categoria inválida: ${entrada.categoria} (${entrada.nombrePokeAPI})`);
        }
        if (!genPorId.has(entrada.especieBase)) {
            throw new Error(`especieBase inválido: ${entrada.especieBase} (${entrada.nombrePokeAPI})`);
        }
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${entrada.nombrePokeAPI}`);
            if (!response.ok) {
                console.error(`❌ ${entrada.nombrePokeAPI}: HTTP ${response.status}, se omite`);
                saltados.push(entrada.nombrePokeAPI);
                continue;
            }
            const data = await response.json();
            const imagen = data.sprites.other['official-artwork'].front_default;
            if (!imagen) {
                console.error(`❌ ${entrada.nombrePokeAPI}: sin artwork oficial, se omite`);
                saltados.push(entrada.nombrePokeAPI);
                continue;
            }
            variantes.push({
                id: siguienteId++,
                name: data.name.toUpperCase().replace(/-/g, ' '),
                types: data.types.map(t => t.type.name),
                gen: genPorId.get(entrada.especieBase),
                image: imagen,
                categoria: entrada.categoria,
                especieBase: entrada.especieBase
            });
        } catch (error) {
            console.error(`❌ Error en ${entrada.nombrePokeAPI}:`, error.message);
            saltados.push(entrada.nombrePokeAPI);
        }
    }

    if (saltados.length > 0) {
        throw new Error(`Se omitieron ${saltados.length} entradas por datos incompletos/error de red: ${saltados.join(', ')} — no se escribe pokemon_db.json. Investigar y reintentar.`);
    }

    const idsNuevos = variantes.map(v => v.id);
    if (new Set(idsNuevos).size !== idsNuevos.length) {
        throw new Error('ids duplicados generados — no se escribe el archivo');
    }

    console.log('🔎 Chequeando imágenes duplicadas entre las variantes nuevas...');
    const duplicados = await buscarImagenesDuplicadas(variantes);
    if (duplicados.length > 0) {
        const detalle = duplicados.map(([a, b]) => `${a} == ${b}`).join('; ');
        throw new Error(`Imágenes idénticas entre variantes (misma carta física repetida): ${detalle} — no se escribe pokemon_db.json. Sacar la entrada redundante de variantes_lista.json y reintentar.`);
    }

    fs.writeFileSync('pokemon_db.json', JSON.stringify([...base, ...variantes], null, 2));
    console.log(`✅ ${variantes.length} variantes agregadas (ids ${variantes[0]?.id}–${variantes[variantes.length - 1]?.id}). Total: ${base.length + variantes.length}.`);
}

fetchVariantes().catch(err => {
    console.error(`❌ ${err.message}`);
    process.exitCode = 1;
});
