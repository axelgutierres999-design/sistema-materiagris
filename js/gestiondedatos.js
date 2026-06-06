/**
 * Lógica para gestiondedatos.html
 * Requiere que config-master.js se haya cargado previamente.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Referencia al botón en el HTML
    const btnLimpiar = document.getElementById('btnLimpiarSieteDias');

    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', async () => {
            // 1. Confirmación de seguridad en el frontend
            const confirmar = confirm("¿Estás seguro de que deseas eliminar permanentemente los registros de dieta con más de 7 días de antigüedad?");
            
            if (!confirmar) return;

            try {
                // Bloqueamos el botón temporalmente para evitar doble clic
                btnLimpiar.disabled = true;
                btnLimpiar.innerText = "⏳ Procesando limpieza...";

                // 2. Llamada a la función SQL usando RPC
                // 'limpiar_dieta_semanal' es el nombre exacto de la función que creaste en SQL
                const { data, error } = await window.db.rpc('limpiar_dieta_semanal');

                // Si Supabase devuelve un error, lo lanzamos al bloque catch
                if (error) throw error;

                // 3. Confirmación de éxito
                alert("✅ Limpieza completada exitosamente. Los registros antiguos han sido eliminados del servidor.");
                
            } catch (err) {
                console.error("Error de base de datos:", err);
                alert("❌ Hubo un error al ejecutar la limpieza: " + err.message);
            } finally {
                // 4. Restaurar el estado del botón
                btnLimpiar.disabled = false;
                btnLimpiar.innerText = "🗑️ Borrar registros antiguos (7+ días)";
            }
        });
    } else {
        console.warn("No se encontró el botón btnLimpiarSieteDias en el DOM.");
    }
});