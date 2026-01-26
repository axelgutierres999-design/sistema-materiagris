// js/login-master.js

// 1. CONFIGURACIÓN SUPABASE
const supabaseUrl = 'https://cpveuexgxwxjejurtwro.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwdmV1ZXhneHd4amVqdXJ0d3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MTYxMzAsImV4cCI6MjA4MjE5MjEzMH0.I4FeC3dmtOXNqLWA-tRgxAb7JCe13HysOkqMGkXaUUc';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// 2. LÓGICA DE LOGIN
document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnLogin');
    const errorMsg = document.getElementById('mensajeError');

    // Estado de carga
    btn.textContent = "Verificando...";
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        // Éxito: Guardamos un flag simple y redirigimos
        // Nota: En un sistema real, master.html debería verificar la sesión con db.auth.getUser()
        localStorage.setItem('master_session', JSON.stringify(data.session));
        window.location.href = 'master.html';

    } catch (err) {
        console.error(err);
        errorMsg.textContent = "❌ Acceso denegado: " + err.message;
        errorMsg.style.display = 'block';
        btn.textContent = "Iniciar Sesión";
        btn.disabled = false;
    }
});