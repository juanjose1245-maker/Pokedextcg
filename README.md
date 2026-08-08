# Pokédex TCG

**Español** | [English](README.en.md)

Pokédex/TCG personal collection tracker — una PWA autohospedada para llevar
el control de tu colección de cartas, sola o en carpetas.

<img src="screenshot.png" alt="Vista de la Pokédex con progreso de colección y detalle de cartas" width="360">

<table>
<tr>
<td><img src="screenshot-dark.png" alt="Tema oscuro" width="220"><br><sub>Tema oscuro</sub></td>
<td><img src="screenshot-wizard.png" alt="Wizard de configuración de carpetas" width="220"><br><sub>Wizard de carpetas</sub></td>
<td><img src="screenshot-variantes.png" alt="Panel de variantes (Mega, Gigamax, formas regionales)" width="220"><br><sub>Variantes (Mega, Gigamax, etc.)</sub></td>
<td><img src="screenshot-pdf.jpeg" alt="PDF de recortables para armar carpetas físicas" width="220"><br><sub>PDF de recortables</sub></td>
</tr>
</table>

## Qué hace

- **Dos modos de colección independientes**: `bulk` (cartas sueltas, sin
  organizar) y `carpetas` (organizadas en binders configurables —
  por generación completa o por un rango contiguo de números de Pokédex).
- **Wizard de configuración de carpetas**: elegís cuántas carpetas tenés,
  cuántos bolsillos por hoja tienen tus binders físicos, y la app calcula
  sola cómo repartir los Pokémon entre ellas.
- **Export/import** de tu colección completa, y generación de **PDFs
  recortables** con las cartas que te faltan.
- **Variantes opcionales**: Mega Evolución, Gigamax, formas regionales,
  Regresión Primigenia y formas alternativas, cada categoría activable por
  separado si las contás como cartas propias.
- **Sincronización en vivo entre dispositivos**: marcás una carta desde el
  celular y se refleja al instante en la compu (Server-Sent Events, sin
  polling).
- **Instalable como PWA**, con vista offline de la colección ya cargada, y
  tema claro/oscuro/automático.
- **Español / inglés**, con detección automática por navegador y selector
  manual en Ajustes.

## Instalar con Docker

1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Corré:

   ```bash
   docker compose up -d
   ```

3. Abrí `http://localhost:3000` en el navegador — la primera vez que
   intentes hacer un cambio (marcar una carta, configurar carpetas, etc.)
   te va a pedir definir tu contraseña ahí mismo.

¿Necesitás usar otro puerto porque el 3000 ya está ocupado? No hay una
variable de entorno para eso a propósito — cambiá el mapeo de puertos en
`docker-compose.yml`, por ejemplo `"8080:3000"` en vez de `"3000:3000"`.

Tus datos (colección, carpetas, respaldos) se guardan en la carpeta `./data`,
junto al `docker-compose.yml` — no se pierden si actualizás la imagen.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATA_DIR` | No | Carpeta donde se guardan los datos. La imagen ya la fija en `/app/data`; no hace falta tocarla salvo que sepas lo que estás haciendo. |

No hace falta configurar ninguna contraseña de antemano: la definís desde
la propia app la primera vez que hacés un cambio. Si preferís fijarla vos
por variable de entorno en cambio, podés seguir usando `ADMIN_PASSWORD`
(ver el comentario en `docker-compose.yml`).

### Actualizar

```bash
docker compose pull
docker compose up -d
```

### Problemas comunes

Si `http://localhost:3000` no responde ("connection refused" o similar),
puede que el contenedor esté reiniciándose en loop sin que `docker compose
up -d` te lo avise (ese comando reporta éxito aunque el contenedor esté
fallando). Revisá:

```bash
docker compose ps
```

Si aparece reiniciándose (`Restarting`) en vez de `Up`, mirá el error real
con:

```bash
docker compose logs
```

## Cómo está armado

Backend en Node + Express, un solo archivo (`server.js`) sin base de
datos — la colección y la configuración se guardan en archivos JSON. El
frontend es HTML/CSS/JS planos servidos como estáticos (`public/`), sin
build step ni framework.

## Licencia

MIT — ver [`LICENSE`](LICENSE).
