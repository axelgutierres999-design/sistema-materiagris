/**
 * Lógica para la configuración global del panel master
 */

async function cargarConfiguracionGlobal() {
    const { data, error } = await db
        .from('master_config')
        .select('*')
        .eq('id', 'global_config')
        .single();

    if (data) {
        document.getElementById('conf-datos-pago').value = data.datos_pago || '';
        document.getElementById('conf-mensaje-exito').value = data.mensaje_exito || '';
        document.getElementById('conf-fondo-url').value = data.fondo_url || '';
        
        // Aplicar el fondo inmediatamente si existe
        if (data.fondo_url) {
            document.body.style.backgroundImage = `url('${data.fondo_url}')`;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
        }
    }
}

async function guardarConfiguracionGlobal() {
    const datos = {
        datos_pago: document.getElementById('conf-datos-pago').value,
        mensaje_exito: document.getElementById('conf-mensaje-exito').value,
        fondo_url: document.getElementById('conf-fondo-url').value
    };

    const { error } = await db
        .from('master_config')
        .update(datos)
        .eq('id', 'global_config');

    if (error) {
        alert("Error al guardar: " + error.message);
    } else {
        alert("✅ Configuración guardada correctamente");
        location.reload(); // Recarga para aplicar fondo
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', cargarConfiguracionGlobal);