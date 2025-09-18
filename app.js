// app.js (Version orchestrée)

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. RÉFÉRENCES AUX ÉLÉMENTS DU DOM ---
    const screens = {
        login: document.getElementById('login-screen'),
        dashboard: document.getElementById('dashboard-screen'),
    };
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const loginError = document.getElementById('login-error');
    const userInfo = document.getElementById('user-info');
    // --- NOUVEAU ---
    const activeTaskContainer = document.getElementById('active-task-container');

    // --- 2. ÉTAT GLOBAL DE L'APPLICATION ---
    const state = {
        jwt: null,
        socket: null,
        user: null,
        currentTask: null, // --- NOUVEAU : Pour stocker la tâche en cours ---
    };

    // --- 3. DÉCLARATION DES FONCTIONS ---

    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // --- MODIFIÉ : Le WebSocket écoute maintenant un événement spécifique pour recevoir une tâche ---
    function connectWebSocket() {
        if (state.socket) { state.socket.disconnect(); }
        state.socket = io("wss://portal.eecie.ca", { path: "/socket.io/", transports: ["websocket"] });

        state.socket.on("connect", () => {
            console.log("Socket.IO connecté !");
            state.socket.emit("authenticate", { token: state.jwt });
        });

        state.socket.on("authenticated", (data) => {
            if (data.status === 'success') {
                console.log(`%cAuth WebSocket réussie pour ${data.user_id} !`, "color: green;");
                // --- NOUVEAU : L'application signale au serveur qu'elle est prête ---
                console.log("Envoi de l'événement 'client_ready' au serveur.");
                state.socket.emit("client_ready", { userId: data.user_id });
            } else {
                console.error("Échec de l'auth WebSocket.");
            }
        });

        // --- NOUVEAU : L'écouteur principal de l'orchestrateur ---
        // Le serveur enverra une tâche via cet événement.
        state.socket.on("new_task_to_process", (taskData) => {
            console.log("Nouvelle tâche reçue de l'orchestrateur !", taskData);
            state.currentTask = taskData;
            renderSingleTaskView(taskData);
        });
        
        state.socket.on("no_task_available", () => {
             renderNoTaskView();
        });
    }
    
    // --- NOUVEAU : Fonction pour afficher la vue "aucune tâche" ---
    function renderNoTaskView() {
        activeTaskContainer.innerHTML = `
            <div class="placeholder-message">
                <h2>Aucune tâche disponible pour le moment.</h2>
                <p>Excellent travail ! Vous serez notifié dès qu'une nouvelle action sera requise.</p>
            </div>`;
    }

    // --- NOUVEAU : Fonction pour afficher UNE SEULE tâche ---
    function renderSingleTaskView(task) {
        const clientName = task.opportunite?.[0]?.value || 'N/A';
        const contact = task.contact?.[0]?.value || 'Non spécifié';

        // La structure HTML est la même que celle que nous avions conçue
        activeTaskContainer.innerHTML = `
            <div class="task-container" data-task-id="${task.id}">
                <div class="task-section">
                    <h2>${task.titre || 'Tâche sans titre'}</h2>
                    <p>${task.description || 'Aucune description.'}</p>
                    <hr style="margin: 15px 0; border: 0; border-top: 1px solid var(--medium-gray);">
                    <div class="client-info">
                        <div class="info-item"><label>Client (Opportunité)</label><span>${clientName}</span></div>
                        <div class="info-item"><label>Contact Principal</label><span>${contact}</span></div>
                        <!-- Ces champs seront remplis dynamiquement à l'avenir -->
                        <div class="info-item"><label>Email</label><span class="contact-email">...</span></div>
                        <div class="info-item"><label>Adresse</label><span class="contact-address">...</span></div>
                    </div>
                </div>
                <div class="task-section">
                    <div class="interaction-header">
                        <h3>Interactions & Devis</h3>
                        <button class="btn-new">Nouvelle Interaction</button>
                    </div>
                    <div class="interaction-list-content">
                        <p>Le chargement des interactions n'est pas encore implémenté.</p>
                    </div>
                </div>
                <div class="task-section">
                    <h2>Actions possibles</h2>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" data-action="edit">Modifier la Tâche</button>
                        <button class="action-btn btn-validate" data-action="complete">Marquer comme Terminée</button>
                    </div>
                </div>
            </div>
        `;
        
        // --- NOUVEAU : Ajouter des écouteurs sur les boutons d'action ---
        activeTaskContainer.querySelector('.action-buttons').addEventListener('click', handleTaskAction);
    }

    // --- NOUVEAU : Gère les actions sur la tâche affichée ---
    function handleTaskAction(e) {
        if (e.target.tagName !== 'BUTTON') return;

        const action = e.target.dataset.action;
        const taskId = state.currentTask.id;

        if (action === 'complete') {
            if (!confirm("Confirmez-vous avoir terminé cette tâche ?")) return;
            
            console.log(`Action 'complete' pour la tâche #${taskId}`);
            // On notifie le serveur que la tâche est terminée
            state.socket.emit("task_completed_by_user", { taskId: taskId });

            // On affiche un message d'attente
            renderNoTaskView();
            // Le serveur enverra la tâche suivante via l'événement 'new_task_to_process'
        }
        else if (action === 'edit') {
            alert("La modification de tâche sera bientôt disponible.");
        }
    }


    // --- MODIFIÉ : `fetchDashboardData` est maintenant beaucoup plus simple ---
    async function fetchDashboardData() {
        if (state.user) {
            userInfo.textContent = `Bienvenue, ${state.user.display_name}`;
        }
        // Il n'y a plus besoin de charger une liste de tâches.
        // On affiche simplement le message d'attente.
        renderNoTaskView();
    }

    // --- 4. GESTIONNAIRES D'ÉVÉNEMENTS (handleLogin, handleLogout - inchangés) ---
    async function handleLogin(e) {
        e.preventDefault();
        const username = e.target.username.value;
        const appPassword = e.target.password.value.replace(/\s/g, '');
        const submitButton = e.target.querySelector('button');
        loginError.textContent = '';
        submitButton.disabled = true;
        submitButton.textContent = 'Connexion...';
        const basicAuth = 'Basic ' + btoa(username + ':' + appPassword);
        try {
            const response = await fetch('https://portal.eecie.ca/wp-json/eecie-crm/v1/ws-auth', {
                method: 'POST',
                headers: { 'Authorization': basicAuth }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Identifiants incorrects.');
            state.jwt = data.token;
            state.user = data.user;
            localStorage.setItem('jwt_employe', data.token);
            localStorage.setItem('user_employe', JSON.stringify(data.user));
            connectWebSocket();
            await fetchDashboardData();
            showScreen('dashboard');
        } catch (error) {
            loginError.textContent = error.message;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Connexion';
        }
    }
    function handleLogout() {
        if (state.socket) { state.socket.disconnect(); }
        state.jwt = null;
        state.user = null;
        state.socket = null;
        localStorage.removeItem('jwt_employe');
        localStorage.removeItem('user_employe');
        showScreen('login');
        loginForm.reset();
        loginError.textContent = '';
    }

    // --- 5. POINT D'ENTRÉE DE L'APPLICATION (inchangé) ---
    function init() {
        loginForm.addEventListener('submit', handleLogin);
        logoutBtn.addEventListener('click', handleLogout);
        const savedJwt = localStorage.getItem('jwt_employe');
        if (savedJwt) {
            state.jwt = savedJwt;
            const savedUser = localStorage.getItem('user_employe');
            if (savedUser) { state.user = JSON.parse(savedUser); }
            connectWebSocket();
            fetchDashboardData();
            showScreen('dashboard');
        } else {
            showScreen('login');
        }
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