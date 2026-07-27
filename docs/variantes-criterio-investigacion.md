# Criterio de investigación: variantes de Pokémon con carta TCG propia

## Criterio de inclusión

Una forma/variante de Pokémon se considera como "tiene su propia carta TCG" **si y solo si existe una carta impresa cuyo nombre oficial distingue esa forma específica de la especie base** — no basta que el arte represente esa forma bajo el nombre genérico de la especie.

Por ejemplo:
- **Incluida:** "Black Kyurem" es un nombre propio de carta (Boundaries Crossed, etc.) que distingue esta forma de Kyurem base.
- **Excluida:** "Giratina" es el nombre genérico de la carta, incluso si su arte representa Origin Forme; el nombre impreso no distingue la forma.

La verificación se realizó mediante búsqueda estructurada en `api.pokemontcg.io/v2/cards?q=name:X` (base de datos oficial de todas las cartas TCG impresas en inglés), contrastada con Bulbapedia cuando hubo dudas.

## Lista de candidatos investigados y descartados

Esta es una primera aproximación, revisable, de todas las formas alternativas investigadas y que **no superaron** el criterio de "nombre de carta distinto" (es decir, se descartaron para no incluir en `variantes_lista.json`). Fecha de investigación: julio de 2026.

| Candidato | especie (Dex #) | Razón de rechazo |
|---|---|---|
| Giratina (Origin Forme) | 487 | Todas las cartas encontradas ("Giratina", "Giratina-EX", "Giratina LV.X", "Giratina V/VSTAR") usan el nombre genérico sin distinguir Origin de Altered. |
| Zygarde 10% Forme | 718 | Todas las cartas de Zygarde en pokemontcg.io son "Zygarde", "Zygarde-EX" o "Zygarde-GX" — ninguna con "10%" en el nombre. |
| Zygarde Complete Forme | 718 | Existe un producto de colección llamado "Zygarde Complete Forme Collection", pero la carta es un "Zygarde-GX" genérico, sin "Complete" en el nombre impreso. |
| Palafín Héroe (palafin-hero) | 964 | Todas las cartas de Palafin ("Palafin", "Palafin ex") usan el nombre genérico; ninguna dice "Hero" o "Zero" en el nombre impreso, aunque el arte pueda representar la forma Héroe. |
| Shaymin Sky Forme | 492 | Todas las cartas son "Shaymin", "Shaymin LV.X", "Shaymin V/VSTAR", "Shaymin-EX" — sin distinción de forma en el nombre. |
| Meloetta Pirouette Forme | 648 | Todas las cartas son "Meloetta", "Meloetta ex/-EX" — sin distinción de forma en el nombre. |
| Hoopa Unbound | 720 | Existe "Hoopa-EX" (Ancient Origins) cuyo arte representa específicamente Hoopa Unbound, pero el nombre impreso de la carta es solo "Hoopa-EX", igual que otros; no hay una carta que diga "Unbound" en el nombre. |
| Darmanitan Zen Mode (forma base, no Galar) | 555 | Solo existen cartas "Darmanitan" genéricas; ninguna con "Zen Mode" en el nombre. |
| Darmanitan Galar Zen Mode | 555 | Solo "Galarian Darmanitan" y "Galarian Darmanitan V/VMAX" genéricas; ninguna con "Zen Mode" en el nombre. |
| Aegislash Blade Forme | 681 | Solo cartas "Aegislash", "Aegislash V/VMAX/ex/-EX" genéricas; ninguna con "Blade Forme" en el nombre. |
| Zacian Crowned Sword | 888 | Solo "Zacian", "Zacian V/VSTAR/LV.X" genéricas; ninguna con "Crowned" en el nombre. |
| Zamazenta Crowned Shield | 889 | Solo "Zamazenta", "Zamazenta V/VSTAR" genéricas; ninguna con "Crowned" en el nombre. |
| Landorus Therian Forme | 645 | Solo "Landorus", "Landorus-EX" genéricas; ninguna con "Therian" en el nombre. |
| Thundurus Therian Forme | 642 | Solo "Thundurus", "Thundurus-EX/-GX" genéricas; ninguna con "Therian" en el nombre. |
| Tornadus Therian Forme | 641 | Solo "Tornadus", "Tornadus V/VMAX/-EX/-GX" genéricas; ninguna con "Therian" en el nombre. |
| Basculegion (forma hembra) | 902 | Basculegion tiene variedad de género en PokeAPI, pero la única carta encontrada es "Hisuian Basculegion" genérica, sin distinción de sexo en el nombre impreso. Además, las variantes de género caen fuera del alcance de formas de batalla. |
| Genesect (Douse/Shock/Burn/Chill Drive) | 649 | Los 4 Drives cambian el tipo en el videojuego, pero todas las cartas encontradas son "Genesect", "Genesect-EX/-GX/V" genéricas, sin distinción de Drive en el nombre. |
| Arceus (18 placas) | 493 | Todas las cartas son "Arceus" genéricas (o "Arceus LV.X/V/VSTAR"); ninguna carta distingue placa/tipo en el nombre impreso. |
| Silvally (17 memorias/tipos) | 773 | Todas las cartas encontradas (13 resultados) son "Silvally" o "Silvally-GX" genéricas. El mecanismo de tipo se maneja vía cartas de Ítem "Memory", no vía un Pokémon con nombre distinto. |
| Cherrim (Sunshine Form) | 421 | Las 11 cartas encontradas en pokemontcg.io son todas "Cherrim" genéricas (Diamond & Pearl, Stormfront, Unleashed, Arceus, Plasma Storm, Ultra Prism, Battle Styles, etc.). Búsqueda por "Sunshine" no arrojó resultados de nombre oficial. |
| Enamorus (Therian Forme) | 905 | Las 6 cartas encontradas ("Enamorus V", "Enamorus", sets Lost Origin, Crown Zenith, Twilight Masquerade) son todas genéricas, ninguna dice "Therian" en el nombre. Sigue el mismo patrón que el resto de la familia Forces of Nature. |
| Terapagos (Terastal Form / Stellar Form) | 1024 | Las 10 cartas encontradas en pokemontcg.io ("Terapagos", "Terapagos ex", sets Stellar Crown, Surging Sparks, Ascended Heroes, Prismatic Evolutions) son todas genéricas. El nombre de venta del producto ("Terapagos ex Ultra-Premium Collection") usa "Stellar Form" como marketing/descripción, pero esto no es el nombre impreso en la carta oficial. |

## Notas

- Esta lista es un primer paso, revisable. Incluye toda la investigación realizada hasta julio de 2026, pero no es exhaustiva; investigaciones futuras pueden agregar nuevos candidatos descartados sin necesidad de rehacer lo ya documentado aquí.
- El criterio adoptado ("nombre de carta distinto", no solo arte distinto) es objetivo y verificable, pero más estricto que otros posibles enfoques (p. ej., incluir formas solo por tener arte distintos en cartas con nombre genérico). Si el proyecto requiere revisar este balance, los casos más discutibles para reconsiderar son: Hoopa Unbound (carta EX específica con arte confirmado) y Palafín Héroe (ejemplo dado por el usuario como "ya confirmado").
