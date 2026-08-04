# Pokédex TCG

Pokédex/TCG personal collection tracker (bulk + carpetas). Instalable como
PWA.

## Instalar con Docker

1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Editá la variable `ADMIN_PASSWORD` con tu propia contraseña (no dejes el
   valor de ejemplo).
3. Creá la carpeta `data` antes de arrancar, para que quede con tu usuario
   como dueño (si no existe, Docker la crea como root y el contenedor,
   que corre como usuario no-root, no puede escribir ahí):

   ```bash
   mkdir -p data
   ```

4. Corré:

   ```bash
   docker compose up -d
   ```

5. Abrí `http://localhost:3000` en el navegador.

¿Necesitás usar otro puerto porque el 3000 ya está ocupado? No hay una
variable de entorno para eso a propósito — cambiá el mapeo de puertos en
`docker-compose.yml`, por ejemplo `"8080:3000"` en vez de `"3000:3000"`.

Tus datos (colección, carpetas, respaldos) se guardan en la carpeta `./data`,
junto al `docker-compose.yml` — no se pierden si actualizás la imagen.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | Sí | Contraseña para las acciones de escritura (marcar cartas, importar, configurar carpetas). Sin esto, el servidor usa una contraseña por defecto insegura — **cambiala siempre** antes de exponer el puerto a internet. |
| `DATA_DIR` | No | Carpeta donde se guardan los datos. La imagen ya la fija en `/app/data`; no hace falta tocarla salvo que sepas lo que estás haciendo. |

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

La causa más común es un error de permisos escribiendo en `./data` (por
ejemplo si la carpeta ya existía con otro dueño, o quedó creada como root).
Se arregla corriendo una vez en el host:

```bash
sudo chown -R 1000:1000 ./data
```
