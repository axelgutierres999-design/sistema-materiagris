/**
 * MASTER ADMIN LOGIC - ORDENLISTA
 * Gestiona restaurantes, pagos, suscripciones y personal.
 */

// 1. CONFIGURACIÓN DE SUPABASE
const supabaseUrl = 'https://cpveuexgxwxjejurtwro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdmV1ZXhneHd4amVqdXJ0d3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTYxMzAsImV4cCI6MjA4MjE5MjEzMH0.I4FeC3dmtOXNqLWA-tRgxAb7JCe13HysOkqMGkXaUUc';
const db = supabase.createClient(supabaseUrl, supabaseKey);

let todosLosRestaurantes = [];

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar sesión al entrar
    checkAuth();
    
    // Cargar datos
    await cargarRestaurantes();
    
    // Configurar buscador
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

// 3. CARGA DE DATOS (JOIN RESTAURANTES + SUSCRIPCIONES)
async function cargarRestaurantes() {
    const listaContenedor = document.getElementById('listaRestaurantes');
    listaContenedor.innerHTML = '<p aria-busy="true" style="color:#888;">Conectando con la base de datos...</p>';

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
        listaContenedor.innerHTML = `<p style="color: #ff5555;">Error: ${err.message}</p>`;
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
        // Datos de suscripción seguros
        const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito' };
        
        // Configuración de estilos por estado
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
                    <div style="margin-top: 12px;">
                        <button class="btn-outline" style="font-size: 0.8rem; padding: 5px 10px;" onclick="verDetalle('${res.id}')">
                            Administrar ⚙️
                        </button>
                    </div>
                </div>
            </div>
        `;
        contenedor.insertAdjacentHTML('beforeend', card);
    });
}

// 5. NAVEGACIÓN
function cambiarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.querySelectorAll('nav li').forEach(l => l.classList.remove('active'));
    
    // Mostrar sección
    const seccion = document.getElementById(`sec-${id}`);
    if (seccion) {
        seccion.classList.add('activa');
        seccion.style.display = 'block'; // Asegurar display block
    }
    
    // Ocultar las otras (Fix para el estilo inline display:none del HTML)
    document.querySelectorAll('.seccion:not(.activa)').forEach(s => s.style.display = 'none');

    // Activar menú
    const li = Array.from(document.querySelectorAll('nav li')).find(el => el.getAttribute('onclick').includes(id));
    if (li) li.classList.add('active');
}

// 6. GESTIÓN DE PAGOS (Lógica de Negocio)
async function actualizarPago(restauranteId, nuevoEstado) {
    const confirmacion = confirm(`¿Estás seguro de cambiar el estado a: ${nuevoEstado.toUpperCase()}?`);
    if (!confirmacion) return;

    try {
        const { error } = await db
            .from('suscripciones')
            .update({ 
                estado_pago: nuevoEstado,
                // Si paga, extendemos 30 días. Si no, dejamos la fecha como está o null.
                fecha_vencimiento: nuevoEstado === 'pagado' ? 
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : 
                    undefined
            })
            .eq('restaurante_id', restauranteId);

        if (error) throw error;

        alert("✅ Estado actualizado correctamente.");
        await cargarRestaurantes(); // Refrescar la lista de fondo
        document.getElementById('modalDetalle').close();
        
    } catch (err) {
        alert("Error al actualizar: " + err.message);
    }
}

// 7. MODAL DE DETALLES (Vista Unificada)
async function verDetalle(id) {
    const res = todosLosRestaurantes.find(r => r.id === id);
    if (!res) return;

    const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito', fecha_vencimiento: 'Sin fecha' };
    const modal = document.getElementById('modalDetalle');
    
    // Formatear fecha
    let fechaVenc = "Indefinida";
    if(susc.fecha_vencimiento) {
        fechaVenc = new Date(susc.fecha_vencimiento).toLocaleDateString();
    }

    document.getElementById('detNombre').innerText = res.nombre;
    document.getElementById('detContenido').innerHTML = `
        <div style="margin-bottom: 20px;">
            <p style="color:#aaa; font-size: 0.9rem; margin-bottom:5px;">Información de Contacto</p>
            <p style="margin:0;"><strong>📧 Email:</strong> ${res.correo_admin}</p>
            <p style="margin:0;"><strong>📞 Teléfono:</strong> ${res.telefono || 'No registrado'}</p>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid #333;">
            <p style="color:#aaa; font-size: 0.9rem; margin-bottom:10px;">Estado de Suscripción</p>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <span class="status-badge ${susc.estado_pago === 'pagado' ? 'status-pagado' : 'status-gratis'}" style="font-size:1rem;">
                    ${susc.estado_pago.toUpperCase()}
                </span>
                <small style="color:#888;">Vence: ${fechaVenc}</small>
            </div>

            <hr style="border-color: #333; margin: 15px 0;">

            <p style="color:#aaa; font-size: 0.8rem; margin-bottom:10px;">Acciones de Pago</p>
            <div style="display: grid; gap: 10px;">
                <button onclick="actualizarPago('${res.id}', 'pagado')" style="background: white; color: black; border: none; font-weight:bold;">
                    ✅ Marcar como PAGADO (+30 días)
                </button>
                <button onclick="actualizarPago('${res.id}', 'pendiente')" class="btn-outline" style="width:100%;">
                    ⚠️ Marcar como PENDIENTE
                </button>
            </div>
        </div>

        <div style="margin-top: 15px;">
             <button onclick="contactarOwner('${res.telefono}', '${res.nombre}')" style="width:100%; background:#25d366; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; font-weight:600;">
                📱 Contactar por WhatsApp
             </button>
        </div>
    `;
    modal.showModal();
}

// 8. GESTIÓN DE PERSONAL (Seguridad)
async function crearNuevoAdmin() {
    const email = document.getElementById('newAdminEmail').value;
    const pass = document.getElementById('newAdminPass').value;

    if(!email || !pass) return alert("Llena ambos campos");
    if(pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

    if(!confirm(`¿Dar acceso Master a ${email}?`)) return;

    try {
        const { data, error } = await db.auth.signUp({
            email: email,
            password: pass
        });

        if (error) throw error;
        
        // Opcional: Aquí podrías insertar también en la tabla 'personal_ol' si la usas
        // await db.from('personal_ol').insert({ auth_user_id: data.user.id, email: email, nombre: 'Admin' });

        alert(`✅ Usuario creado: ${email}\nYa puede iniciar sesión.`);
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPass').value = '';

    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 9. UTILIDADES
function contactarOwner(tel, nombre) {
    if(!tel || tel === 'N/A' || tel.length < 5) return alert("Este restaurante no tiene un teléfono válido registrado.");
    const msg = encodeURIComponent(`Hola, te escribo del soporte de OrdenLista respecto a tu restaurante ${nombre}.`);
    window.open(`https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}`, '_blank');
}

async function logout() {
    if (confirm("¿Cerrar sesión del Panel Maestro?")) {
        await db.auth.signOut();
        localStorage.removeItem('master_session');
        window.location.href = 'index.html'; 
    }
}

async function checkAuth() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
        // Si no hay usuario logueado, fuera
        window.location.href = 'index.html';
    }
}