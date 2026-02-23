/**
 * MASTER ADMIN LOGIC - ORDENLISTA
 * Gestiona restaurantes, pagos, suscripciones y personal.
 */

// 1. CONFIGURACIÓN DE SUPABASE
// js/config-master.js

const supabaseUrl = 'https://cpveuexgxwxjejurtwro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdmV1ZXhneHd4amVqdXJ0d3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTYxMzAsImV4cCI6MjA4MjE5MjEzMH0.I4FeC3dmtOXNqLWA-tRgxAb7JCe13HysOkqMGkXaUUc';

// 1. Creamos el cliente
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// 2. LO HACEMOS GLOBAL (Esto es lo más importante)
window.supabase = supabaseClient;
window.db = supabaseClient; 

console.log("✅ Conexión global 'db' establecida.");
let todosLosRestaurantes = [];
// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión al entrar
    await checkAuth();
    
    // Cargar datos iniciales
    await cargarRestaurantes();
    
    // Configurar buscador en tiempo real
    const buscador = document.getElementById('inputBusqueda');
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            const busqueda = e.target.value.toLowerCase();
            const filtrados = todosLosRestaurantes.filter(res => 
                res.nombre.toLowerCase().includes(busqueda) || 
                (res.correo_admin && res.correo_admin.toLowerCase().includes(busqueda)) ||
                (res.telefono && res.telefono.includes(busqueda))
            );
            renderizarLista(filtrados);
        });
    }
});

// 3. CARGA DE DATOS (REPARADO PARA EVITAR BUCLES Y MANEJAR ERRORES)
async function cargarRestaurantes() {
    const listaContenedor = document.getElementById('listaRestaurantes');
    listaContenedor.innerHTML = '<p aria-busy="true" style="color:#888;">Cargando restaurantes...</p>';

    try {
        const { data, error } = await db
            .from('restaurantes')
            .select(`
                *,
                suscripciones ( estado_pago, fecha_vencimiento )
            `)
            .order('creado_en', { ascending: false });

        if (error) throw error;

        todosLosRestaurantes = data;
        renderizarLista(data);

    } catch (err) {
        console.error("Error al cargar:", err);
        // Mostrar el error visualmente (útil para detectar problemas de RLS/Recursión)
        listaContenedor.innerHTML = `
            <div style="background:rgba(255,0,0,0.1); padding:15px; border-radius:8px; border:1px solid #ff5555;">
                <p style="color: #ff5555; margin:0;"><strong>⚠️ Error de Base de Datos:</strong></p>
                <p style="color: #ff8888; font-size:0.85rem;">${err.message}</p>
                <button onclick="location.reload()" style="margin-top:10px; font-size:0.7rem; padding: 5px 10px; cursor:pointer;">Reintentar</button>
            </div>`;
    }
}

// 4. RENDERIZADO DE LISTA (CARD DESIGN)
function renderizarLista(lista) {
    const contenedor = document.getElementById('listaRestaurantes');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; opacity:0.5; padding:20px;">No se encontraron restaurantes.</p>';
        return;
    }

    lista.forEach(res => {
        // Datos de suscripción seguros (si no hay, por defecto es mes_gratuito)
        const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito' };
        const diasRestantes = susc.fecha_vencimiento
  ? Math.ceil(
      (new Date(susc.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
    )
  : null;
        
        // Mapeo de estilos por estado
        const statusMap = {
            'pagado': { clase: 'status-pagado', label: 'Pagado' },
            'mes_gratuito': { clase: 'status-gratis', label: 'Prueba Gratis' },
            'pendiente': { clase: 'status-gratis', label: 'Pendiente', style: 'color: #f1c40f; border-color: #f1c40f;' }
        };

        const currentStatus = statusMap[susc.estado_pago] || statusMap['mes_gratuito'];
        const extraStyle = currentStatus.style ? `style="${currentStatus.style}"` : '';

        const card = `
            <div class="res-card">
                <div class="res-info">
                    <h3 style="margin:0; font-weight:600; color:white;">${res.nombre}</h3>
                    <p style="font-size:0.85rem; opacity:0.7; margin:5px 0; color:#ccc;">
                        👤 ${res.correo_admin || 'Sin correo'} <br>
                        📞 ${res.telefono || 'Sin teléfono'}
                    </p>
                </div>
                <div class="res-actions" style="text-align: right;">
                    <span class="status-badge ${currentStatus.clase}" ${extraStyle}>
                        ${currentStatus.label}
                    </span>
                    <small style="display:block; margin-top:4px; color:#aaa; font-size:0.75rem;">
  ⏳ ${diasRestantes !== null ? diasRestantes + ' días restantes' : '—'}
</small>
                    <div style="margin-top: 12px;">
                        <button class="btn-outline" style="font-size: 0.8rem; padding: 5px 10px;" onclick="verDetalle('${res.id}')">
                            Gestionar ⚙️
                        </button>
                    </div>
                </div>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', card);
    });
}

// 5. NAVEGACIÓN ENTRE SECCIONES
function cambiarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('nav li').forEach(l => l.classList.remove('active'));
    
    const seccion = document.getElementById(`sec-${id}`);
    if (seccion) {
        seccion.classList.add('activa');
        seccion.style.display = 'block';
        
        // --- LÍNEA NUEVA AÑADIDA ---
        if (id === 'planos') cargarListaPlanos(); 
    }
    
    document.querySelectorAll('.seccion:not(.activa)').forEach(s => s.style.display = 'none');

    const li = Array.from(document.querySelectorAll('nav li')).find(el => el.getAttribute('onclick')?.includes(id));
    if (li) li.classList.add('active');
}

// 6. GESTIÓN DE PAGOS Y SUSCRIPCIONES
async function actualizarPago(restauranteId, nuevoEstado) {
    // Confirmación visual
    if (!confirm(`¿Estás seguro de cambiar el estado a: ${nuevoEstado.toUpperCase()}?`)) return;

    try {
        // 1. Enviamos SOLO el estado. 
        // Tu Trigger en SQL ("procesar_pago_y_sync") se encargará de 
        // calcular la fecha y actualizar la tabla 'restaurantes' automáticamente.
        const { error } = await db
            .from('suscripciones')
            .update({ 
                estado_pago: nuevoEstado 
            })
            .eq('restaurante_id', restauranteId);

        if (error) throw error;

        // 2. Éxito visual
        alert("✅ Estado actualizado correctamente.");

        // 3. Cerramos modal
        const modal = document.getElementById('modalDetalle');
        if (modal && modal.open) modal.close();

        // 4. IMPORTANTE: Forzar recarga completa de la lista
        // para ver el nuevo estado y la nueva fecha que calculó SQL
        await cargarRestaurantes(); 

    } catch (err) {
        console.error("Error crítico:", err);
        alert("❌ Error al actualizar: " + err.message);
    }
}

// 7. MODAL DE DETALLES (VISTA UNIFICADA)
async function verDetalle(id) {
    const res = todosLosRestaurantes.find(r => r.id === id);
    if (!res) return;

    const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito', fecha_vencimiento: null };
    const modal = document.getElementById('modalDetalle');
    
    let fechaVenc = susc.fecha_vencimiento ? new Date(susc.fecha_vencimiento).toLocaleDateString() : "Indefinida";
const diasRestantes = susc.fecha_vencimiento
  ? Math.ceil(
      (new Date(susc.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
    )
  : null;
    document.getElementById('detNombre').innerText = res.nombre;
    document.getElementById('detContenido').innerHTML = `
        <div style="margin-bottom: 20px;">
            <p style="color:#aaa; font-size: 0.9rem; margin-bottom:5px;">Información de Contacto</p>
            <p style="margin:0;"><strong>📧 Email:</strong> ${res.correo_admin}</p>
            <p style="margin:0;"><strong>📞 Teléfono:</strong> ${res.telefono || 'No registrado'}</p>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #333;">

        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #333;">
            <p style="color:#aaa; font-size: 0.9rem; margin-bottom:10px;">Estado de Suscripción</p>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span class="status-badge ${susc.estado_pago === 'pagado' ? 'status-pagado' : 'status-gratis'}" style="font-size:1rem;">
                    ${susc.estado_pago.toUpperCase()}
                </span>
                <small style="color:#888;">
  Vence: ${fechaVenc}
  ${diasRestantes !== null ? ` · ⏳ ${diasRestantes} días restantes` : ''}
</small>
            </div>

            <hr style="border-color: #333; margin: 15px 0;">

            <p style="color:#aaa; font-size: 0.8rem; margin-bottom:10px;">Acciones Administrativas</p>
            <div style="display: grid; gap: 10px;">
                <button onclick="actualizarPago('${res.id}', 'pagado')" style="background: white; color: black; border: none; font-weight:bold; padding: 10px; border-radius: 5px; cursor: pointer;">
                    ✅ Marcar como PAGADO (+30 días)
                </button>
                <button onclick="actualizarPago('${res.id}', 'pendiente')" class="btn-outline" style="width:100%; padding: 10px;">
                    ⚠️ Marcar como PENDIENTE
                </button>
            </div>
        </div>

        <div style="margin-top: 15px;">
             <button onclick="contactarOwner('${res.telefono}', '${res.nombre}')" style="width:100%; background:#25d366; color:white; border:none; padding:12px; border-radius:8px; cursor:pointer; font-weight:600;">
                📱 Contactar por WhatsApp
             </button>
        </div>
        
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px dashed #ff4444;">
    <p style="color:#ff4444; font-size: 0.8rem; margin-bottom:10px; font-weight:bold;">⚠️ ZONA PELIGROSA</p>
    <button onclick="eliminarRestaurante('${res.id}', '${res.nombre}')" 
            style="width:100%; background:transparent; color:#ff4444; border:1px solid #ff4444; padding:8px; border-radius:8px; cursor:pointer; font-size:0.8rem;">
        Borrar Restaurante Definitivamente 🗑️
    </button>
</div>

        
    `;
    modal.showModal();
}

// 8. SEGURIDAD Y GESTIÓN DE SESIÓN
async function checkAuth() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
        // Redirigir si no hay una sesión activa de Supabase
        window.location.href = 'index.html';
    }
}

async function logout() {
    if (confirm("¿Cerrar sesión del Panel Maestro?")) {
        await db.auth.signOut();
        // Limpiar cualquier rastro local
        localStorage.removeItem('master_session');
        window.location.href = 'index.html'; 
    }
}

// 9. UTILIDADES ADICIONALES
function contactarOwner(tel, nombre) {
    if(!tel || tel === 'N/A' || tel.length < 5) {
        return alert("Este restaurante no tiene un teléfono válido registrado.");
    }
    const msg = encodeURIComponent(`Hola, te escribo del soporte de OrdenLista respecto a tu restaurante ${nombre}.`);
    window.open(`https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}`, '_blank');
}

async function crearNuevoAdmin() {
    const email = document.getElementById('newAdminEmail').value;
    const pass = document.getElementById('newAdminPass').value;

    if(!email || !pass) return alert("Por favor, llena ambos campos");
    if(pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

    if(!confirm(`¿Deseas dar acceso Master a ${email}?`)) return;

    try {
        const { data, error } = await db.auth.signUp({
            email: email,
            password: pass
        });

        if (error) throw error;
        
        // Al usar SQL Trigger, el usuario se registrará automáticamente si lo configuraste así,
        // de lo contrario, puedes hacer un insert manual en personal_ol aquí.

        alert(`✅ Usuario creado: ${email}\nSe ha enviado un correo de confirmación (si está activo) o ya puede iniciar sesión.`);
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPass').value = '';

    } catch (e) {
        alert("Error al crear administrador: " + e.message);
    }
}
// Función para borrar restaurante definitivamente
async function eliminarRestaurante(id, nombre) {
    const confirmacion1 = confirm(`¿ESTÁS SEGURO? Esta acción borrará permanentemente el restaurante "${nombre}" y TODOS sus datos (productos, ventas, perfiles, etc.).`);
    
    if (confirmacion1) {
        const confirmacion2 = prompt(`Para confirmar la eliminación total, escribe el nombre del restaurante: "${nombre}"`);

        if (confirmacion2 === nombre) {
            try {
                const { error } = await db
                    .from('restaurantes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                alert("✅ Restaurante y datos asociados eliminados correctamente.");
                
                // Cerrar modal y recargar lista
                document.getElementById('modalDetalle').close();
                await cargarRestaurantes();

            } catch (err) {
                console.error("Error al eliminar:", err);
                alert("❌ Error al eliminar: " + err.message);
            }
        } else {
            alert("⚠️ El nombre no coincide. Operación cancelada.");
        }
    }
}
// ===============================
// INTEGRACIÓN CON CREADOR DE PLANOS
// ===============================
function abrirDiseñadorPlanos(idRestaurante, nombreRestaurante) {
    const nombreCodificado = encodeURIComponent(nombreRestaurante);
    window.open(`planos.html?restaurante_id=${idRestaurante}&nombre=${nombreCodificado}`, '_blank');
} 

// Función principal para cargar los planos en el panel
async function cargarListaPlanos() {
    const contenedor = document.getElementById('contenedorListaPlanos');
    if (!contenedor) return; 

    contenedor.innerHTML = '<p aria-busy="true" style="color:#888;">Cargando galería de diseños...</p>';

    try {
        const { data: planos, error } = await window.db
            .from('planos')
            .select('*')
            .order('creado_en', { ascending: false });

        if (error) throw error;
        
        if (planos.length === 0) {
            contenedor.innerHTML = '<p style="color: #555;">No hay planos guardados todavía.</p>';
            return;
        }

        contenedor.innerHTML = ''; // Limpiar mensaje de carga

        planos.forEach(plano => {
            const card = document.createElement('article');
            card.style.cssText = "background: #1a1a1a; border: 1px solid #333; padding: 20px; border-radius: 12px; display:flex; flex-direction:column; justify-content:space-between;";
            
            // Etiqueta visual si está asignado o es plantilla
            const badge = plano.restaurante_id 
                ? `<span style="background: #2c3e50; color: #3498db; font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;">ID: ${plano.restaurante_id.substring(0,6)}...</span>`
                : `<span style="background: #1b4d2e; color: #2ecc71; font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;">PLANTILLA LIBRE</span>`;

            card.innerHTML = `
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <h4 style="margin: 0; color: white;">${plano.nombre_plano || 'Sin título'}</h4>
                        ${badge}
                    </div>
                    <p style="font-size: 0.75rem; color: #666; margin: 10px 0;">
                        Modificado: ${new Date(plano.creado_en || new Date()).toLocaleDateString()}
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 15px;">
                    <button class="btn-outline" onclick="asignarPlano('${plano.id}')" style="font-size: 0.75rem; padding: 6px; background:#2b2b2b; color:white; border:none;">
                        🔗 Asignar ID
                    </button>
                    <button class="btn-outline" onclick="descargarPlano('${plano.id}')" style="font-size: 0.75rem; padding: 6px; background:#2b2b2b; color:white; border:none;">
                        ⬇️ Descargar
                    </button>
                    <button class="btn-outline" onclick="window.open('planos.html?id_plano=${plano.id}', '_blank')" style="font-size: 0.75rem; padding: 6px;">
                        ✏️ Editar
                    </button>
                    <button class="btn-outline" onclick="eliminarPlano('${plano.id}')" style="font-size: 0.75rem; padding: 6px; color: #ff4444; border-color: #ff4444;">
                        🗑️ Borrar
                    </button>
                </div>
            `;
            contenedor.appendChild(card);
        });

    } catch (error) {
        contenedor.innerHTML = '<p style="color: red;">Error al cargar los planos.</p>';
        console.error("Error cargando planos:", error);
    }

}
// Función para descargar el JSON del plano a tu PC
async function descargarPlano(planoId) {
    try {
        // 1. Buscamos la estructura completa del plano en la base de datos
        const { data, error } = await window.db
            .from('planos')
            .select('nombre_plano, estructura')
            .eq('id', planoId)
            .single();

        if (error) throw error;
        if (!data.estructura) return alert("Este plano no tiene estructura gráfica (está vacío).");

        // 2. Preparamos el archivo JSON
        const jsonString = JSON.stringify(data.estructura, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // 3. Forzamos la descarga en el navegador
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.nombre_plano || 'plano'}_${planoId.substring(0,5)}.json`;
        document.body.appendChild(a);
        a.click();
        
        // 4. Limpiamos
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error al descargar:", error);
        alert("❌ Error al descargar el plano.");
    }
}

// Función para asignar un plano a un Restaurante
async function asignarPlano(planoId) {
    const nuevoId = prompt("Ingresa el ID (UUID) del Restaurante al que pertenece este plano:\n\n*Si quieres dejarlo como plantilla libre, déjalo en blanco y dale a Aceptar.");
    
    // Si el usuario da a Cancelar, nuevoId es null, salimos.
    if (nuevoId === null) return;

    // Si está vacío, guardamos 'null' para hacerlo plantilla, si no, guardamos el ID
    const idFinal = nuevoId.trim() === "" ? null : nuevoId.trim();

    try {
        const { error } = await window.db
            .from('planos')
            .update({ restaurante_id: idFinal })
            .eq('id', planoId);

        if (error) throw error;
        
        alert("✅ Plano reasignado correctamente.");
        cargarListaPlanos(); // Recargamos la lista para ver el cambio visual

    } catch (error) {
        console.error("Error al asignar:", error);
        alert("❌ Error al asignar. Revisa que el ID sea correcto.");
    }
}

// Función para eliminar un plano
async function eliminarPlano(planoId) {
    if(!confirm("¿Seguro que quieres borrar este diseño permanentemente?")) return;
    
    try {
        const { error } = await window.db
            .from('planos')
            .delete()
            .eq('id', planoId);
            
        if (error) throw error;
        cargarListaPlanos(); // Recargar visualmente
        
    } catch(err) {
        alert("Error al borrar: " + err.message);
    }
}
// Funciones auxiliares para el listado
function editarPlano(id) {
    window.location.href = `planos.html?id_plano=${id}`;
}