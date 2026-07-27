const fs = require('fs');

async function fetchVariantes() {
    const base = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
    const baseIds = new Set(base.map(p => p.id));
    if (base.length !== 1025) {
        throw new Error(`pokemon_db.json tiene ${base.length} entradas, se esperaban 1025 — abortando para no pisar datos inesperados.`);
    }
    const genPorId = new Map(base.map(p => [p.id, p.gen]));
    const lista = JSON.parse(fs.readFileSync('variantes_lista.json', 'utf8'));

    const categoriasValidas = new Set(['regional', 'mega', 'primigenia', 'gigamax', 'alternativa']);
    const variantes = [];
    let siguienteId = 1026;

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
                continue;
            }
            const data = await response.json();
            const imagen = data.sprites.other['official-artwork'].front_default;
            if (!imagen) {
                console.error(`❌ ${entrada.nombrePokeAPI}: sin artwork oficial, se omite`);
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
        }
    }

    const idsNuevos = variantes.map(v => v.id);
    if (new Set(idsNuevos).size !== idsNuevos.length) {
        throw new Error('ids duplicados generados — no se escribe el archivo');
    }

    fs.writeFileSync('pokemon_db.json', JSON.stringify([...base, ...variantes], null, 2));
    console.log(`✅ ${variantes.length} variantes agregadas (ids ${variantes[0]?.id}–${variantes[variantes.length - 1]?.id}). Total: ${base.length + variantes.length}.`);
}

fetchVariantes();
