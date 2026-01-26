/**
 * MASTER ADMIN LOGIC - ORDENLISTA
 * Gestiona la visualización de restaurantes, estados de pago y navegación del panel.
 */

// 1. CONFIGURACIÓN DE SUPABASE
// Usando las credenciales que ya tienes en tu proyecto
const supabaseUrl = 'https://cpveuexgxwxjejurtwro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdmV1ZXhneHd4amVqdXJ0d3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTYxMzAsImV4cCI6MjA4MjE5MjEzMH0.I4FeC3dmtOXNqLWA-tRgxAb7JCe13HysOkqMGkXaUUc';
const db = supabase.createClient(supabaseUrl, supabaseKey);

let todosLosRestaurantes = [];

// 2. INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar si hay sesión activa (opcional pero recomendado)
    checkAuth();
    
    // Cargar datos iniciales
    await cargarRestaurantes();
    
    // Configurar el buscador en tiempo real
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

// 3. CARGA DE DATOS (JOIN SQL)
async function cargarRestaurantes() {
    const listaContenedor = document.getElementById('listaRestaurantes');
    listaContenedor.innerHTML = '<p aria-busy="true">Conectando con la base de datos...</p>';

    try {
        // Traemos restaurantes y su estado de suscripción
        // Nota: Asegúrate de que la tabla 'suscripciones' exista en Supabase
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
        console.error("Error al cargar restaurantes:", err);
        listaContenedor.innerHTML = `<p style="color: #ff7675;">Error: ${err.message}</p>`;
    }
}

// 4. RENDERIZADO DE LA LISTA (Diseño de Cristal)
function renderizarLista(lista) {
    const contenedor = document.getElementById('listaRestaurantes');
    contenedor.innerHTML = '';

    if (lista.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; opacity:0.5;">No se encontraron restaurantes.</p>';
        return;
    }

    lista.forEach(res => {
        // Extraer estado de suscripción (o por defecto mes_gratuito)
        const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito' };
        
        // Mapeo de estilos según estado
        const statusMap = {
            'pagado': { clase: 'status-pagado', label: 'Pagado' },
            'mes_gratuito': { clase: 'status-gratis', label: 'Mes Gratuito' },
            'pendiente': { clase: 'status-gratis', label: 'Pendiente', color: '#f1c40f' }
        };

        const currentStatus = statusMap[susc.estado_pago] || statusMap['mes_gratuito'];

        const card = `
            <div class="res-card">
                <div class="res-info">
                    <h3 style="margin:0; font-weight:600;">${res.nombre}</h3>
                    <p style="font-size:0.85rem; opacity:0.7; margin:5px 0;">
                        👤 ${res.correo_admin || 'Sin correo'} <br>
                        📞 ${res.telefono || 'Sin teléfono'}
                    </p>
                </div>
                <div class="res-actions" style="text-align: right;">
                    <span class="status-badge ${currentStatus.clase}">
                        ${currentStatus.label}
                    </span>
                    <div style="margin-top: 12px;">
                        <button class="btn-detalle" onclick="verDetalle('${res.id}')">
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
    // Ocultar todas
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    // Desactivar botones de navegación
    document.querySelectorAll('nav li').forEach(l => l.classList.remove('active'));
    
    // Mostrar la seleccionada
    const seccion = document.getElementById(`sec-${id}`);
    if (seccion) seccion.classList.add('activa');

    // Activar botón (buscamos por el texto o el atributo onclick)
    const li = Array.from(document.querySelectorAll('nav li')).find(el => el.getAttribute('onclick').includes(id));
    if (li) li.classList.add('active');
}

// 6. MODAL DE DETALLES
async function verDetalle(id) {
    const res = todosLosRestaurantes.find(r => r.id === id);
    if (!res) return;

    const susc = (res.suscripciones && res.suscripciones[0]) || { estado_pago: 'mes_gratuito', fecha_vencimiento: 'N/A' };
    
    // Aquí podrías usar un modal de HTML5 <dialog> o crear uno dinámico
    const modal = document.getElementById('modalDetalle');
    if (!modal) {
        alert(`Restaurante: ${res.nombre}\nDueño: ${res.correo_admin}\nEstado: ${susc.estado_pago}`);
        return;
    }

    document.getElementById('detNombre').innerText = res.nombre;
    document.getElementById('detContenido').innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top:15px;">
            <div>
                <p><strong>📍 Dirección:</strong><br>${res.direccion || 'No especificada'}</p>
                <p><strong>📞 Contacto:</strong><br>${res.telefono || 'N/A'}</p>
                <p><strong>📧 Registro:</strong><br>${res.correo_admin}</p>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border: 1px solid var(--glass-border);">
                <p><strong>💳 Suscripción:</strong><br> ${susc.estado_pago.toUpperCase()}</p>
                <p><strong>📅 Vencimiento:</strong><br> ${susc.fecha_vencimiento}</p>
                <p><strong>🏪 Mesas:</strong> ${res.num_mesas || 0}</p>
            </div>
        </div>
        <div style="margin-top: 20px;">
             <button onclick="contactarOwner('${res.telefono}', '${res.nombre}')" style="width:100%; background:#25d366; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer;">
                Contactar por WhatsApp
             </button>
        </div>
    `;
    modal.showModal();
}

// 7. UTILIDADES
function contactarOwner(tel, nombre) {
    if(!tel || tel === 'N/A') return alert("Este restaurante no tiene teléfono registrado.");
    const msg = encodeURIComponent(`Hola, soy del equipo de administración de OrdenLista. Queríamos contactarte sobre tu restaurante ${nombre}...`);
    window.open(`https://wa.me/${tel.replace(/\D/g,'')}?text=${msg}`);
}

async function logout() {
    if (confirm("¿Cerrar sesión del Panel Maestro?")) {
        await db.auth.signOut();
        window.location.href = 'login.html'; // O tu página de inicio
    }
}

async function checkAuth() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) {
        // Opcional: Redirigir si no hay sesión
        // window.location.href = 'login.html';
    }
}
// --- GESTIÓN DE PERSONAL ---
async function crearNuevoAdmin() {
    const email = document.getElementById('newAdminEmail').value;
    const pass = document.getElementById('newAdminPass').value;

    if(!email || !pass) return alert("Llena ambos campos");
    if(pass.length < 6) return alert("La contraseña debe tener al menos 6 caracteres");

    if(!confirm(`¿Dar acceso Master a ${email}?`)) return;

    try {
        // Importante: Esto crea un usuario en Supabase Auth. 
        // Por defecto, cualquiera puede registrarse, pero aquí lo controlamos desde el panel.
        const { data, error } = await db.auth.signUp({
            email: email,
            password: pass
        });

        if (error) throw error;

        alert(`✅ Usuario creado: ${email}\nYa puede iniciar sesión en index.html`);
        document.getElementById('newAdminEmail').value = '';
        document.getElementById('newAdminPass').value = '';

    } catch (e) {
        alert("Error: " + e.message);
    }
}