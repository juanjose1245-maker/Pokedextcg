const fs = require('fs');

async function downloadPokedex() {
    console.log("🚀 Re-generando base de datos con asignaciones de región correctas...");
    const pokedex = [];
    
    for (let i = 1; i <= 1025; i++) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const data = await response.json();
            
            let gen = 1;
            if (i <= 151) gen = 1;       // Kanto
            else if (i <= 251) gen = 2;  // Johto
            else if (i <= 386) gen = 3;  // Hoenn
            else if (i <= 493) gen = 4;  // Sinnoh
            else if (i <= 649) gen = 5;  // Unova
            else if (i <= 721) gen = 6;  // Kalos
            else if (i <= 809) gen = 7;  // Alola
            else if (i <= 898) gen = 8;  // Galar
            else if (i <= 905) gen = 8;  // Formas/Especies de Hisui (Las dejamos agrupadas estructuralmente en el bloque de Octava para no descuadrar tu matriz 3x3, pero con su numeración correspondiente)
            else gen = 9;                // Paldea (Inicia exactamente en #906 con Sprigatito)

            pokedex.push({
                id: data.id,
                name: data.name.toUpperCase(),
                types: data.types.map(t => t.type.name),
                gen: gen,
                image: data.sprites.other['official-artwork'].front_default
            });
            
            if (i % 200 === 0) console.log(`📦 Procesados ${i}/1025...`);
        } catch (error) {
            console.error(`❌ Error en ID ${i}:`, error.message);
        }
    }

    fs.writeFileSync('pokemon_db.json', JSON.stringify(pokedex, null, 2));
    console.log("✅ ¡Base de datos local corregida con éxito!");
}

downloadPokedex();
