# Criterio de investigación: variantes de Pokémon con carta TCG propia

## Criterio de inclusión

Una forma/variante de Pokémon se considera como "tiene su propia carta TCG" **si y solo si existe una carta impresa real cuyo *arte* representa específicamente esa forma** — el nombre impreso de la carta **no** necesita distinguir la forma; puede ser el nombre genérico de la especie, siempre que el dibujo muestre inequívocamente esa forma alternativa (colores, plates, silueta, elementos de diseño específicos de la forma) y no la forma base u otra forma alternativa.

Por ejemplo, bajo el criterio actual:
- **Incluida:** "Giratina V" (swsh11-130) es nominalmente solo "Giratina", pero su arte muestra inequívocamente el cuerpo serpentino/alado dorado de Origin Forme — cuenta, aunque el nombre impreso no diga "Origin".
- **Incluida (más fuerte todavía):** "Black Kyurem" (Boundaries Crossed) además de tener arte distinto, tiene nombre impreso distinto — es el caso más sólido posible.
- **Sigue excluida:** cualquier forma para la que **ninguna** carta impresa, ni por nombre ni por arte, la distinga de la forma base (p. ej. Landorus Therian Forme — todas las cartas de Landorus muestran consistentemente Incarnate Forme).

La verificación se realiza cruzando `api.pokemontcg.io/v2/cards?q=name:X` (listado estructurado de todas las cartas impresas de la especie) con inspección visual directa de las imágenes (`images.large`) de las cartas candidatas, comparadas contra el `official-artwork` de PokeAPI para la forma en cuestión, y contrastadas con Bulbapedia/flavor text impreso cuando hubo dudas.

### Historial del criterio

La primera pasada de investigación (Tareas 4 y 9, julio de 2026) usó un criterio más estricto: solo contaba si el **nombre impreso** de la carta distinguía la forma (p. ej. "Black Kyurem", "Wash Rotom"), sin que bastara que el arte mostrara la forma bajo el nombre genérico de la especie. Ese criterio excluyó, entre otros, los tres ejemplos que el propio usuario había dado como punto de partida ya confirmado: Giratina Origen, Zygarde 10%/Completo y Palafín Héroe. Al revisar esos resultados, el usuario confirmó que el criterio que realmente quería aplicar era más amplio — arte distinto alcanza, aunque el nombre impreso sea genérico — lo que motivó una segunda pasada de investigación (Tareas 12 y 13) sobre los ~22 candidatos descartados bajo el criterio viejo, esta vez bajo el criterio de arte.

## Evidencia positiva (formas incluidas)

Tabla completa de las 39 entradas actualmente presentes en `variantes_lista.json` con `"categoria": "alternativa"`. La columna "Evidencia" indica bajo qué versión del criterio se confirmó cada una: **nombre distinto** (superó incluso el criterio estricto original, Tareas 4/8/9) o **arte distinto** (solo superó el criterio ampliado, Tarea 13 — el nombre impreso de la carta es genérico).

| nombrePokeAPI | especieBase (dex #) | Evidencia | Carta/set que lo confirma |
|---|---|---|---|
| deoxys-attack | 386 (Deoxys) | nombre distinto | "Deoxys Attack Forme" (Legends Awakened) |
| deoxys-defense | 386 (Deoxys) | nombre distinto | "Deoxys Defense Forme" (Legends Awakened) |
| deoxys-speed | 386 (Deoxys) | nombre distinto | "Deoxys Speed Forme" (Legends Awakened) |
| rotom-heat | 479 (Rotom) | nombre distinto | "Heat Rotom" (Ultra Prism, Rising Rivals, Paldean Fates, Destined Rivals) |
| rotom-wash | 479 (Rotom) | nombre distinto | "Wash Rotom" (Ultra Prism, Rising Rivals, Destined Rivals, SM Promos) |
| rotom-frost | 479 (Rotom) | nombre distinto | "Frost Rotom" (Ultra Prism, Rising Rivals) |
| rotom-fan | 479 (Rotom) | nombre distinto | "Fan Rotom" (Ultra Prism, Rising Rivals, Stellar Crown, Prismatic Evolutions) |
| rotom-mow | 479 (Rotom) | nombre distinto | "Mow Rotom" (Ultra Prism, Rising Rivals, Destined Rivals, Stellar Crown) |
| kyurem-black | 646 (Kyurem) | nombre distinto | "Black Kyurem" (Boundaries Crossed, Cosmic Eclipse, Surging Sparks, etc.) |
| kyurem-white | 646 (Kyurem) | nombre distinto | "White Kyurem" (Boundaries Crossed, Fates Collide, Lost Thunder, etc.) |
| necrozma-dusk | 800 (Necrozma) | nombre distinto | "Dusk Mane Necrozma(-GX)" (Ultra Prism, SM Promos) |
| necrozma-dawn | 800 (Necrozma) | nombre distinto | "Dawn Wings Necrozma(-GX)" (Ultra Prism, SM Promos) |
| necrozma-ultra | 800 (Necrozma) | nombre distinto | "Ultra Necrozma(-GX)" (Forbidden Light, Dragon Majesty, Cosmic Eclipse) |
| wormadam-sandy | 413 (Wormadam) | nombre distinto | "Wormadam Sandy Cloak" (Secret Wonders, Arceus, POP Series 7) |
| wormadam-trash | 413 (Wormadam) | nombre distinto | "Wormadam Trash Cloak" (Secret Wonders, Arceus) |
| calyrex-ice | 898 (Calyrex) | nombre distinto | "Ice Rider Calyrex V/VMAX" (Chilling Reign, Astral Radiance TG) |
| calyrex-shadow | 898 (Calyrex) | nombre distinto | "Shadow Rider Calyrex V/VMAX" (Chilling Reign, Astral Radiance TG) |
| urshifu-rapid-strike | 892 (Urshifu) | nombre distinto | "Rapid Strike Urshifu (V/VMAX)" (Chilling Reign, Battle Styles) |
| dialga-origin | 483 (Dialga) | nombre distinto | "Origin Forme Dialga V/VSTAR" (Astral Radiance, SWSH Black Star Promos, Crown Zenith Galarian Gallery) |
| palkia-origin | 484 (Palkia) | nombre distinto | "Origin Forme Palkia V/VSTAR" (Astral Radiance, SWSH Black Star Promos, Crown Zenith Galarian Gallery) |
| ursaluna-bloodmoon | 901 (Ursaluna) | nombre distinto | "Bloodmoon Ursaluna(ex)" (Twilight Masquerade, Shrouded Fable, Prismatic Evolutions, SV Promos) |
| ogerpon-hearthflame-mask | 1017 (Ogerpon) | nombre distinto | "Hearthflame Mask Ogerpon ex" (Twilight Masquerade, Prismatic Evolutions, Destined Rivals) |
| ogerpon-wellspring-mask | 1017 (Ogerpon) | nombre distinto | "Wellspring Mask Ogerpon ex" (Twilight Masquerade, Prismatic Evolutions, Destined Rivals) |
| ogerpon-cornerstone-mask | 1017 (Ogerpon) | nombre distinto | "Cornerstone Mask Ogerpon ex" (Twilight Masquerade, Prismatic Evolutions, Destined Rivals) |
| castform-sunny | 351 (Castform) | nombre distinto | "Sunny Castform" (Delta Species, Hidden Legends); "Castform Sunny Form" (Legends Awakened, Chilling Reign, Surging Sparks) |
| castform-rainy | 351 (Castform) | nombre distinto | "Rain Castform" (Delta Species, Hidden Legends); "Castform Rain Form" (Legends Awakened); "Castform Rainy Form" (Chilling Reign) |
| castform-snowy | 351 (Castform) | nombre distinto | "Snow-cloud Castform" (Delta Species, Hidden Legends); "Castform Snow-Cloud Form" (Legends Awakened); "Castform Snowy Form" (Chilling Reign) |
| giratina-origin | 487 (Giratina) | arte distinto | "Giratina V" (swsh11-130) y "Giratina LV.X" (pl1-124): arte con cuerpo serpentino/alado dorado de Origin Forme |
| zygarde-10 | 718 (Zygarde) | arte distinto | "Zygarde" (sm11-124, Unified Minds): flavor text impreso dice "This is Zygarde's form when about 10% of its pieces have been assembled" + arte de perro pequeño |
| zygarde-complete | 718 (Zygarde) | arte distinto | "Zygarde-GX" (sm6-73/123/136), "Zygarde-EX" (xy10-54): arte de figura humanoide gigante con "alas" de hoja/cuchilla |
| palafin-hero | 964 (Palafin) | arte distinto | "Palafin" (sv3-62) y "Palafin ex" (sv6-61, habilidad "Hero's Spirit"/"Zero to Hero"): arte de delfín musculoso con puños |
| shaymin-sky | 492 (Shaymin) | arte distinto | "Shaymin-EX" (bw4-5, xy6-77) y "Shaymin VSTAR" (swsh9-14): arte de forma alada/aerodinámica |
| meloetta-pirouette | 648 (Meloetta) | arte distinto | "Meloetta" (sm11-124/123, Unified Minds, ataque "Shooting Star Pirouette"): arte de turbante naranja y "falda" de tentáculos grises |
| hoopa-unbound | 720 (Hoopa) | arte distinto | "Hoopa-EX" (xy7-89, Ancient Origins): arte de cuerpo magenta multi-brazo con anillos dorados |
| aegislash-blade | 681 (Aegislash) | arte distinto | "Aegislash" (xy1-85) y "Aegislash ex" (sv4-135): pose ofensiva con espada al frente, contrastada con "Aegislash" (swsh2-135) cuyo flavor text dice explícitamente "In this defensive stance" (esa sí es Shield Forme) |
| zacian-crowned | 888 (Zacian) | arte distinto | "Zacian V" (swsh1-138) y toda la línea V/VSTAR/V-UNION posterior: espada en la boca, melena dorada tipo corona |
| zamazenta-crowned | 889 (Zamazenta) | arte distinto | "Zamazenta V" (swsh1-139) y toda la línea V/VSTAR posterior: armadura/escudo dorado-rojo cubriendo la cabeza |
| terapagos-terastal | 1024 (Terapagos) | arte distinto | "Terapagos" (sv8-161, Surging Sparks): caparazón de cristal hexagonal multicolor, cuello alargado con ojo azul |
| terapagos-stellar | 1024 (Terapagos) | arte distinto | "Terapagos ex" (sv7-128/170/173, sv8pt5-92/169/180, svp-165): cabeza/orbe de cristal gigante con formaciones de gemas |

**Total: 39 filas**, igual a la cantidad de entradas `alternativa` en `variantes_lista.json` (verificado por script). Desglose por origen: 18 de la Tarea 4, 6 de la Tarea 8, 3 de la Tarea 9 (todas nombre distinto), 12 de la Tarea 13 (arte distinto).

## Formas investigadas y descartadas

Candidatos con forma confirmada en el videojuego, investigados bajo el criterio actual de arte distinto, y que **no** encontraron ninguna carta real (ni por nombre ni por arte) que los muestre. No están en `variantes_lista.json`.

| Candidato | especie (dex #) | Razón de rechazo |
|---|---|---|
| Arceus (Flying) | 493 | Ninguna de las 34 cartas impresas de Arceus muestra este plate. El TCG nunca tuvo energía de tipo Volador (se fusiona con Incoloro), por lo que nunca se imprimió arte para este tipo. |
| Arceus (Poison) | 493 | Sin carta. El TCG no tiene energía de tipo Veneno. |
| Arceus (Ground) | 493 | Sin carta. El TCG no tiene energía de tipo Tierra. |
| Arceus (Rock) | 493 | Sin carta. El TCG no tiene energía de tipo Roca. |
| Arceus (Bug) | 493 | Sin carta. El TCG no tiene energía de tipo Bicho. |
| Arceus (Ghost) | 493 | Sin carta. El TCG no tiene energía de tipo Fantasma. |
| Arceus (Ice) | 493 | Sin carta. El TCG no tiene energía de tipo Hielo (se cubre con Agua). |
| Arceus (Dragon) | 493 | La única carta de Arceus con tipo Dragón impreso, "Arceus & Dialga & Palkia-GX" (sm12-156), es Dragón por ser un Tag Team con Dialga/Palkia (ambos Dragón en el TCG) — inspeccionada visualmente y muestra el Arceus de color por defecto, no un plate Dragón. No existe arte de Arceus Dragón dedicado. |
| Arceus (Fairy) | 493 | El TCG sí tuvo energía Hada (era XY), pero nunca se imprimió una carta de Arceus con ese tipo. |
| Darmanitan Zen Mode (forma base, no Galar) | 555 | Las 23 cartas impresas de Darmanitan/Galarian Darmanitan (incl. V, VMAX, "N's Darmanitan") muestran consistentemente Standard Mode. Ninguna muestra la forma redondeada tipo daruma de Zen Mode. |
| Darmanitan Galar Zen Mode | 555 | Mismo chequeo — sin evidencia visual en ninguna de las 23 cartas; "Galarian Darmanitan VMAX" (swsh4-187) se revisó específicamente y es Standard Mode agrandado (Dynamax), no Zen Mode. |
| Landorus Therian Forme | 645 | Las 14 cartas ("Landorus", "Landorus-EX", incl. sets recientes Surging Sparks/Black Bolt) muestran consistentemente Incarnate Forme. Ninguna Therian. |
| Thundurus Therian Forme | 642 | Las 16 cartas ("Thundurus", "Thundurus-EX/-GX") muestran Incarnate Forme exclusivamente. |
| Tornadus Therian Forme | 641 | Las 21 cartas, incluyendo "Tornadus V"/"Tornadus VMAX" (Chilling Reign), muestran Incarnate Forme exclusivamente. |
| Basculegion (forma hembra) | 902 | Las 3 cartas "Hisuian Basculegion" muestran el efecto espectral rosa/magenta del macho (especie base, ya cubierta); la forma hembra oficial tiene efecto blanco/celeste pálido — ninguna carta lo muestra. |
| Genesect (Douse/Shock/Burn/Chill Drive) | 649 | Ninguna de las 25 cartas impresas de Genesect muestra de forma inequívoca un Drive específico. Una primera lectura visual sugería confirmación (rojo=Burn, azul con rayos=Shock), pero al cruzar con Bulbapedia se confirmó que BW99/BW101 son en realidad Shiny Genesect, no Burn Drive, y el azul es branding temático de set ("Team Plasma"), no específico de Shock Drive. Nota adicional: aunque hubiera confirmación visual, PokeAPI tiene el mismo bloqueo estructural que Arceus para estas 4 formas (`pokemon/genesect-{drive}` → 404, solo existen como `pokemon-form` sin `official-artwork`). |
| Silvally (17 memorias/tipos) | 773 | Las 13 cartas impresas ("Silvally", "Silvally-GX") muestran consistentemente la apariencia plateada/gris "RKS Normal" por defecto, con energía Incolora en todos los casos — ninguna muestra un disco de memoria con color distintivo por tipo. Mismo bloqueo estructural de PokeAPI que Arceus/Genesect (`pokemon/silvally-{tipo}` → 404). |
| Enamorus (Therian Forme) | 905 | Descartado bajo el criterio de nombre distinto en la Tarea 9 (mismo patrón que Landorus/Thundurus/Tornadus: las 6 cartas encontradas eran todas genéricas). **No fue re-investigado bajo el criterio de arte distinto** — quedó fuera del alcance de la Tarea 13 por un hueco en su lista de candidatos (el brief de esa tarea enumeró 20 candidatos, no los 21 anunciados en su propio título, y Enamorus fue el que faltó). Dado que sigue el mismo patrón que el resto de la familia Forces of Nature (todas descartadas en la Tarea 13 incluso bajo el criterio de arte), es probable que tampoco pase, pero **esto no está confirmado** — pendiente de una investigación puntual futura. |

## Formas confirmadas por arte pero bloqueadas por falta de datos en PokeAPI

Estas formas **sí** tienen carta real que confirma su arte — superan el criterio de inclusión — pero no están en `variantes_lista.json` porque PokeAPI no expone artwork utilizable para ellas: para estas formas puramente cosméticas (sin diferencia de stats/movepool en el videojuego), PokeAPI solo devuelve un objeto `pokemon-form` que apunta de vuelta a la especie base, sin clave `official-artwork` (solo sprites clásicos de baja resolución). El pipeline de fetch actual (`fetch_variantes.js`) depende exclusivamente de `sprites.other['official-artwork'].front_default` de PokeAPI, así que no tiene de dónde traer una imagen para estas formas. El usuario decidió explícitamente diferirlas de esta fase (commit `7e1469f`, "Diferir las 8 variantes de tipo de Arceus confirmadas en la Tarea 12") en vez de cambiar la arquitectura del fetch.

| Candidato | especie (dex #) | Carta que confirma el arte | Bloqueo técnico |
|---|---|---|---|
| Arceus (Fire) | 493 | Arceus (Fire), set "Arceus" 2009, secreto AR3 | `pokemon/arceus-fire` → 404; solo existe como `pokemon-form` |
| Arceus (Water) | 493 | Arceus (Water), set "Arceus" 2009, secreto AR4 | `pokemon/arceus-water` → 404; solo existe como `pokemon-form` |
| Arceus (Electric) | 493 | Arceus (Lightning), set "Arceus" 2009, secreto AR6 | `pokemon/arceus-electric` → 404; solo existe como `pokemon-form` |
| Arceus (Grass) | 493 | Arceus (Grass), set "Arceus" 2009, secreto AR2 | `pokemon/arceus-grass` → 404; solo existe como `pokemon-form` |
| Arceus (Fighting) | 493 | Arceus (Fighting), set "Arceus" 2009, secreto AR8 | `pokemon/arceus-fighting` → 404; solo existe como `pokemon-form` |
| Arceus (Psychic) | 493 | Arceus (Psychic), set "Arceus" 2009, secreto AR7 | `pokemon/arceus-psychic` → 404; solo existe como `pokemon-form` |
| Arceus (Dark) | 493 | Arceus (Darkness), set "Arceus" 2009, secreto AR1 | `pokemon/arceus-dark` → 404; solo existe como `pokemon-form` |
| Arceus (Steel) | 493 | Arceus (Metal), set "Arceus" 2009, secreto AR9 | `pokemon/arceus-steel` → 404; solo existe como `pokemon-form` |
| Cherrim (Sunshine Form) | 421 | "Cherrim" (dp7-14, Stormfront) y "Cherrim" (swsh5-8, Battle Styles): flor completamente abierta, pétalos rosados extendidos, cara visible — contrastada con "Cherrim" (pl4-15, set Arceus, Poké-Body "Cloudy Sky") que es Overcast Form (especie base, ya cubierta) | `pokemon/cherrim-sunshine` → 404; solo existe como `pokemon-form` sin `official-artwork` |

**Total: 9 formas** (8 tipos de Arceus + Cherrim Sunshine). Vale la pena revisitar esta lista si el pipeline de fetch alguna vez agrega una fuente de imagen alternativa (p. ej. recortar el arte de la carta TCG directamente desde `pokemontcg.io`, en vez de depender solo de `official-artwork` de PokeAPI) — en ese momento también valdría la pena confirmar visualmente Genesect (4 Drives) y Silvally (17 memorias), que tienen el mismo bloqueo estructural de PokeAPI pero aún no lograron confirmación visual (ver tabla de descartes arriba).

## Notas

- Esta lista es un primer paso, revisable, y no exhaustiva. Investigaciones futuras pueden agregar nuevos candidatos confirmados o descartados sin necesidad de rehacer lo ya documentado aquí. Casos concretos pendientes de revisión: Enamorus Therian Forme (nunca re-investigado bajo el criterio de arte, ver tabla de descartes), y Genesect/Silvally (investigados y no confirmados por ahora, pero el mismo bloqueo estructural de PokeAPI que afecta a Arceus/Cherrim aplicaría si en el futuro se encuentra evidencia visual más sólida).
- El criterio actual (arte distinto) es más laxo que el original (nombre distinto), pero sigue siendo objetivo y verificable: exige una carta impresa real, con arte inequívocamente distinguible de la forma base, no una inferencia o un nombre de producto/marketing.
