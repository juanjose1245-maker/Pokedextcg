#!/bin/sh
set -e

# Arranca como root para poder arreglar la ownership de DATA_DIR (que puede
# ser un bind-mount del host con cualquier dueño, incluido root si Docker lo
# creó solo) y recién después baja privilegios al usuario no-root `node` para
# correr la app de verdad. Así el contenedor funciona sin importar quién creó
# la carpeta ./data en el host, sin pedirle al usuario que haga chown a mano.
mkdir -p "$DATA_DIR"
chown -R node:node "$DATA_DIR"

exec setpriv --reuid=node --regid=node --init-groups --no-new-privs "$@"
