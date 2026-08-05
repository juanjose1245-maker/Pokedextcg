# Pokédex TCG

Pokédex/TCG personal collection tracker (bulk + carpetas). Instalable como
PWA.

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

`ADMIN_PASSWORD` ya no es necesaria: la contraseña se define desde la
propia app la primera vez que hacés un cambio. Si venís de una instalación
vieja que ya la tenía seteada, seguí funcionando igual — se migra sola, una
única vez, a un archivo dentro de `DATA_DIR`. También podés seguir
fijándola por variable de entorno si la preferís así (ver el comentario en
`docker-compose.yml`); en una instalación nueva, esa migración pasa igual,
solo que en el primer arranque en vez de venir de "una instalación vieja".

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
