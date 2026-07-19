# Comando rápido para ajustar la función de sincronización en vivo
cat << 'INNER_EOF' > patch.js
        window.onload = async () => {
            // Descargar el inventario real desde el archivo inventario.json del contenedor LXC
            const res = await fetch('/api/estadisticas');
            const data = await res.json();
            
            if (data.listaIds) {
                // Sincronizar todas las llaves en el almacenamiento local del celular
                localStorage.clear(); // Limpiar residuos viejos desincronizados
                Object.keys(data.listaIds).forEach(id => {
                    localStorage.setItem(`pk_${id}`, 'true');
                });
            }
            cargarEstadisticas();
        };
INNER_EOF
