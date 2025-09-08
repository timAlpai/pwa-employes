// app.js (Version corrigée - Utilise l'Authentification de Base)

document.addEventListener('DOMContentLoaded', () => {
    // --- RÉFÉRENCES AUX ÉLÉMENTS DU DOM ---
    const screens = {
        login: document.getElementById('login-screen'),
        dashboard: document.getElementById('dashboard-screen'),
    };
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loginError = document.getElementById('login-error');

    // --- ÉTAT DE L'APPLICATION ---
    const state = {
        authHeader: null, // Le header d'authentification Basic
    };

    // --- GESTION DES ÉCRANS ---
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

  // --- LOGIQUE DE CONNEXION (Version Corrigée et Fiable) ---
    async function handleLogin(e) {
        e.preventDefault();
        const username = e.target.username.value;
        const appPassword = e.target.password.value.replace(/\s/g, ''); // Le mot de passe d'application
        const submitButton = e.target.querySelector('button');
        loginError.textContent = '';
        submitButton.disabled = true;
        submitButton.textContent = 'Connexion...';

        const basicAuth = 'Basic ' + btoa(username + ':' + appPassword);

        try {
            // ON APPELLE NOTRE NOUVEL ENDPOINT PERSONNALISÉ ET SÉCURISÉ
            const response = await fetch('https://portal.eecie.ca/wp-json/eecie-crm/v1/auth/validate', {
                headers: { 'Authorization': basicAuth }
            });

            const data = await response.json();
            
            if (!response.ok) {
                // Notre endpoint renvoie un message d'erreur standard de WordPress
                throw new Error(data.message || 'Identifiants ou mot de passe d\'application incorrects.');
            }

            // Connexion réussie !
            state.authHeader = basicAuth;
            localStorage.setItem('auth_header_employe', basicAuth);
            
            await fetchDashboardData(data.user); // On peut passer les infos utilisateur
            showScreen('dashboard');

        } catch (error) {
            loginError.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Connexion';
        }
    }
    // --- LOGIQUE DE DÉCONNEXION ---
    function handleLogout() {
        state.authHeader = null;
        localStorage.removeItem('auth_header_employe');
        showScreen('login');
        loginForm.reset();
        loginError.textContent = '';
    }

    // --- FONCTION POUR CHARGER LES DONNÉES (POUR PLUS TARD) ---
    async function fetchDashboardData() {
        // C'est ici que nous ferons les appels à votre API custom pour récupérer les tâches, etc.
        // en utilisant l'en-tête stocké dans state.authHeader.
        document.getElementById('dashboard-content').innerHTML = `<p>Bienvenue ! Connexion réussie.</p>`;
    }

    // --- INITIALISATION DE L'APPLICATION ---
    function init() {
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);

        // Vérifier si un en-tête d'authentification est déjà stocké
        const savedAuth = localStorage.getItem('auth_header_employe');
        if (savedAuth) {
            state.authHeader = savedAuth;
            fetchDashboardData();
            showScreen('dashboard');
        } else {
            showScreen('login');
        }
        
        // Enregistrer le Service Worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/pwa-employes/service-worker.js')
                    .then(reg => console.log('Service Worker enregistré.', reg))
                    .catch(err => console.log('Échec de l\'enregistrement du Service Worker: ', err));
            });
        }
    }

    init();
});