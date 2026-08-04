# Pokédex TCG

Pokédex/TCG personal collection tracker (bulk + carpetas). Instalable como
PWA.

## Instalar con Docker

1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Editá la variable `ADMIN_PASSWORD` con tu propia contraseña (no dejes el
   valor de ejemplo).
3. Corré:

   ```bash
   docker compose up -d
   ```

4. Abrí `http://localhost:3000` en el navegador.

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

Si al arrancar ves un error de permisos escribiendo en `./data`, corré una
vez en el host:

```bash
sudo chown -R 1000:1000 ./data
```
