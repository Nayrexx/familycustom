// Configuration du lancement
const LAUNCH_DATE = new Date('2026-02-02T20:00:00').getTime();
const ADMIN_PASSWORD = 'Louane2009'; // Changez ce mot de passe

// Firebase Realtime Database config (pour le compteur de visiteurs)
const FIREBASE_RTDB_URL = 'https://family-custom-default-rtdb.europe-west1.firebasedatabase.app';

// Cacher immédiatement le contenu si le site n'est pas lancé
(function() {
    const now = Date.now();
    const isLaunched = now >= LAUNCH_DATE;
    
    if (!isLaunched) {
        // Injecter immédiatement un style pour cacher le body
        const hideStyle = document.createElement('style');
        hideStyle.id = 'cs-hide-body';
        hideStyle.textContent = 'body > *:not(#coming-soon-overlay):not(script):not(style) { display: none !important; }';
        document.head.appendChild(hideStyle);
    }
})();

// Vérifier si l'utilisateur a déjà un accès admin
function hasAdminAccess() {
    return false; // Toujours demander le mot de passe
}

// Vérifier si le site est lancé
function isSiteLaunched() {
    return Date.now() >= LAUNCH_DATE;
}

// Créer l'overlay de compte à rebours
function createComingSoonOverlay() {
    // Si le site est lancé ou accès admin, ne pas afficher
    if (isSiteLaunched() || hasAdminAccess()) {
        return;
    }
    
    // Créer l'overlay
    const overlay = document.createElement('div');
    overlay.id = 'coming-soon-overlay';
    overlay.innerHTML = `
        <div class="cs-background">
            <div class="cs-grain"></div>
            <div class="cs-glow cs-glow-1"></div>
            <div class="cs-glow cs-glow-2"></div>
        </div>
        
        <!-- Compteur de visiteurs en haut à droite -->
        <div class="cs-visitors-topright" id="cs-visitors">
            <div class="cs-visitors-dot"></div>
            <span class="cs-visitors-count" id="visitors-count">0</span>
            <span class="cs-visitors-text">visiteurs en ligne</span>
        </div>
        
        <div class="cs-container">
            <div class="cs-logo" id="cs-logo">
                <img src="images/IMG_3402.jpeg" alt="Family Custom">
            </div>
            
            <h1 class="cs-title" id="cs-title">Family Custom</h1>
            <p class="cs-subtitle" id="cs-subtitle">Créations personnalisées uniques</p>
            
            <div class="cs-countdown" id="cs-countdown">
                <div class="cs-time-block">
                    <div class="cs-time-value" id="countdown-days">00</div>
                    <div class="cs-time-label">jours</div>
                </div>
                <div class="cs-time-separator"></div>
                <div class="cs-time-block">
                    <div class="cs-time-value" id="countdown-hours">00</div>
                    <div class="cs-time-label">heures</div>
                </div>
                <div class="cs-time-separator"></div>
                <div class="cs-time-block">
                    <div class="cs-time-value" id="countdown-minutes">00</div>
                    <div class="cs-time-label">min</div>
                </div>
                <div class="cs-time-separator"></div>
                <div class="cs-time-block">
                    <div class="cs-time-value" id="countdown-seconds">00</div>
                    <div class="cs-time-label">sec</div>
                </div>
            </div>
            
            <div class="cs-launch-info" id="cs-launch-info">
                <span class="cs-launch-line"></span>
                <span class="cs-launch-text">Lundi 2 Février • 20h</span>
                <span class="cs-launch-line"></span>
            </div>
            
            <div class="cs-socials" id="cs-socials">
                <a href="https://www.instagram.com/familycustom" target="_blank" rel="noopener" class="cs-social-link">
                    <i class="fab fa-instagram"></i>
                </a>
            </div>
        </div>
        
        <!-- Zone admin cachée -->
        <div class="cs-admin-zone" id="admin-access-zone">
            <button class="cs-admin-btn" id="admin-toggle-btn">
                <i class="fas fa-lock"></i>
            </button>
            <div class="cs-admin-form" id="admin-form" style="display: none;">
                <input type="password" id="admin-password" placeholder="Mot de passe" autocomplete="off">
                <button id="admin-submit-btn">
                    <i class="fas fa-arrow-right"></i>
                </button>
                <p class="cs-admin-error" id="admin-error" style="display: none;">Incorrect</p>
            </div>
        </div>
    `;
    
    // Ajouter les styles
    const styles = document.createElement('style');
    styles.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        #coming-soon-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #0a0a0b;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            font-family: 'Space Grotesk', 'Inter', sans-serif;
        }
        
        /* Background Effects */
        .cs-background {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
        
        .cs-grain {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
            opacity: 0.03;
            pointer-events: none;
        }
        
        .cs-glow {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.5;
            animation: glowFloat 8s ease-in-out infinite;
        }
        
        .cs-glow-1 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            top: -100px;
            right: -100px;
            animation-delay: 0s;
        }
        
        .cs-glow-2 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            bottom: -50px;
            left: -50px;
            animation-delay: -4s;
        }
        
        @keyframes glowFloat {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
            50% { transform: translate(30px, -30px) scale(1.1); opacity: 0.6; }
        }
        
        /* Container */
        .cs-container {
            position: relative;
            z-index: 1;
            text-align: center;
            padding: 40px 24px;
            max-width: 600px;
        }
        
        /* Logo */
        .cs-logo {
            width: 100px;
            height: 100px;
            margin: 0 auto 40px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            opacity: 0;
            transform: translateY(20px) scale(0.9);
            animation: fadeInUp 0.8s ease forwards, logoGlow 3s ease-in-out infinite;
            background: #0a0a0b;
        }
        
        .cs-logo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
        
        @keyframes logoGlow {
            0%, 100% { box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 0 rgba(102, 126, 234, 0); }
            50% { box-shadow: 0 10px 40px rgba(0,0,0,0.3), 0 0 30px rgba(102, 126, 234, 0.3); }
        }
        
        /* Title */
        .cs-title {
            font-size: clamp(2.5rem, 8vw, 4rem);
            font-weight: 600;
            color: #fff;
            margin: 0 0 12px;
            letter-spacing: -0.02em;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease 0.1s forwards;
        }
        
        .cs-subtitle {
            font-size: 1.1rem;
            color: rgba(255,255,255,0.5);
            margin: 0 0 50px;
            font-weight: 400;
            letter-spacing: 0.5px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease 0.2s forwards;
        }
        
        /* Countdown */
        .cs-countdown {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin-bottom: 40px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease 0.3s forwards;
        }
        
        .cs-time-block {
            text-align: center;
            min-width: 70px;
        }
        
        .cs-time-value {
            font-size: clamp(2.5rem, 10vw, 4rem);
            font-weight: 700;
            color: #fff;
            line-height: 1;
            font-variant-numeric: tabular-nums;
            transition: transform 0.3s ease;
        }
        
        .cs-time-value.flip {
            animation: flipNumber 0.3s ease;
        }
        
        @keyframes flipNumber {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); }
        }
        
        .cs-time-label {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-top: 8px;
            font-weight: 500;
        }
        
        .cs-time-separator {
            width: 4px;
            height: 4px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            margin: 0 8px;
            margin-bottom: 30px;
        }
        
        /* Launch Info */
        .cs-launch-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 50px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease 0.4s forwards;
        }
        
        .cs-launch-line {
            width: 40px;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        }
        
        .cs-launch-text {
            font-size: 0.9rem;
            color: rgba(255,255,255,0.6);
            letter-spacing: 1px;
            font-weight: 500;
        }
        
        /* Visitors Counter - Top Right */
        .cs-visitors-topright {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 50px;
            z-index: 10;
            opacity: 0;
            transform: translateY(-10px);
            animation: fadeInDown 0.8s ease 0.3s forwards;
        }
        
        @keyframes fadeInDown {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .cs-visitors-topright .cs-visitors-dot {
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            animation: visitorPulse 2s ease-in-out infinite;
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
        }
        
        @keyframes visitorPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.2); }
        }
        
        .cs-visitors-topright .cs-visitors-count {
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
            font-variant-numeric: tabular-nums;
            min-width: 25px;
            text-align: center;
        }
        
        .cs-visitors-topright .cs-visitors-text {
            font-size: 0.8rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
        }
        
        /* Socials */
        .cs-socials {
            display: flex;
            justify-content: center;
            gap: 16px;
            opacity: 0;
            transform: translateY(20px);
            animation: fadeInUp 0.8s ease 0.5s forwards;
        }
        
        .cs-social-link {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            color: rgba(255,255,255,0.7);
            font-size: 1.2rem;
            text-decoration: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .cs-social-link:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
            color: #fff;
            transform: translateY(-2px);
        }
        
        /* Admin Zone */
        .cs-admin-zone {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10;
        }
        
        .cs-admin-btn {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.2);
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.8rem;
        }
        
        .cs-admin-btn:hover {
            background: rgba(255,255,255,0.05);
            color: rgba(255,255,255,0.4);
        }
        
        .cs-admin-form {
            position: absolute;
            bottom: 46px;
            right: 0;
            background: rgba(20,20,22,0.95);
            backdrop-filter: blur(20px);
            padding: 12px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            animation: fadeInUp 0.3s ease;
        }
        
        .cs-admin-form input {
            width: 160px;
            padding: 10px 14px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
            color: #fff;
            font-size: 0.9rem;
            font-family: inherit;
            transition: all 0.3s ease;
        }
        
        .cs-admin-form input::placeholder {
            color: rgba(255,255,255,0.3);
        }
        
        .cs-admin-form input:focus {
            outline: none;
            border-color: rgba(255,255,255,0.2);
            background: rgba(255,255,255,0.08);
        }
        
        .cs-admin-form button {
            width: 38px;
            height: 38px;
            border-radius: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
        }
        
        .cs-admin-form button:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        }
        
        .cs-admin-error {
            position: absolute;
            top: -30px;
            left: 0;
            right: 0;
            text-align: center;
            color: #f5576c;
            font-size: 0.8rem;
            margin: 0;
            animation: shake 0.4s ease;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        /* Animations */
        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .cs-visitors-topright {
                top: 15px;
                right: 15px;
                padding: 8px 14px;
                gap: 8px;
            }
            
            .cs-visitors-topright .cs-visitors-count {
                font-size: 0.9rem;
            }
            
            .cs-visitors-topright .cs-visitors-text {
                font-size: 0.7rem;
            }
            
            .cs-countdown {
                gap: 4px;
            }
            
            .cs-time-block {
                min-width: 55px;
            }
            
            .cs-time-separator {
                margin: 0 4px;
            }
            
            .cs-launch-line {
                width: 24px;
            }
            
            .cs-admin-form {
                right: -12px;
            }
            
            .cs-admin-form input {
                width: 130px;
            }
        }
    `;
    
    document.head.appendChild(styles);
    document.body.appendChild(overlay);
    
    // Démarrer le compte à rebours
    updateCountdown();
    setInterval(updateCountdown, 1000);
    
    // Démarrer le compteur de visiteurs
    initVisitorsCounter();
    
    // Gestion de l'accès admin
    setupAdminAccess();
}

// ==========================================
// COMPTEUR DE VISITEURS EN LIGNE (FIREBASE REALTIME)
// ==========================================

let currentVisitors = 0;
let visitorRef = null;
let visitorCountRef = null;
let myConnectionRef = null;
let fallbackMode = false;

async function initVisitorsCounter() {
    const countEl = document.getElementById('visitors-count');
    if (!countEl) return;
    
    // Afficher un nombre initial pendant le chargement
    countEl.textContent = '...';
    
    try {
        // Charger Firebase Realtime Database dynamiquement
        if (typeof firebase !== 'undefined' && !firebase.database) {
            // Charger le SDK Realtime Database
            await loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js');
        }
        
        // Attendre que Firebase soit prêt
        let attempts = 0;
        while (typeof firebase === 'undefined' && attempts < 20) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }
        
        if (typeof firebase !== 'undefined' && firebase.database) {
            // Utiliser l'URL de la région europe-west1
            const database = firebase.app().database('https://family-custom-default-rtdb.europe-west1.firebasedatabase.app');
            
            // Référence au compteur de visiteurs
            visitorCountRef = database.ref('presence/count');
            const myPresenceRef = database.ref('presence/users/' + generateVisitorId());
            const connectedRef = database.ref('.info/connected');
            
            // Écouter l'état de connexion
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    // Quand connecté, marquer notre présence
                    myPresenceRef.set(true);
                    
                    // Quand on se déconnecte, supprimer notre présence
                    myPresenceRef.onDisconnect().remove();
                }
            });
            
            // Écouter le nombre total de visiteurs
            const usersRef = database.ref('presence/users');
            usersRef.on('value', (snap) => {
                const users = snap.val();
                const count = users ? Object.keys(users).length : 1;
                animateVisitorCount(currentVisitors, count, 500);
                currentVisitors = count;
            });
            
            console.log('[Visitors] Firebase Realtime Database connected');
            return;
        }
    } catch (error) {
        console.warn('[Visitors] Firebase Realtime Database not available, using fallback:', error);
    }
    
    // Fallback: compteur simulé si Firebase n'est pas disponible
    fallbackMode = true;
    initFallbackCounter();
}

// Charger un script dynamiquement
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Vérifier si déjà chargé
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Générer un ID unique pour ce visiteur
function generateVisitorId() {
    let visitorId = sessionStorage.getItem('fc_visitor_id');
    if (!visitorId) {
        visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('fc_visitor_id', visitorId);
    }
    return visitorId;
}

// Fallback: compteur simulé si Firebase n'est pas disponible
let targetVisitors = 0;

function initFallbackCounter() {
    // Nombre de base entre 45 et 85 visiteurs
    const baseVisitors = Math.floor(Math.random() * 40) + 45;
    currentVisitors = baseVisitors;
    targetVisitors = baseVisitors;
    
    // Afficher le nombre initial avec animation
    animateVisitorCount(0, currentVisitors, 2000);
    
    // Varier le nombre de visiteurs toutes les 3-8 secondes
    scheduleNextUpdate();
}

function getRandomInterval() {
    return Math.floor(Math.random() * 5000) + 3000; // 3-8 secondes
}

function scheduleNextUpdate() {
    setTimeout(() => {
        if (fallbackMode) {
            updateFallbackCount();
            scheduleNextUpdate();
        }
    }, getRandomInterval());
}

function updateFallbackCount() {
    // Variation de -3 à +5 visiteurs
    const change = Math.floor(Math.random() * 9) - 3;
    targetVisitors = Math.max(30, Math.min(150, currentVisitors + change));
    
    animateVisitorCount(currentVisitors, targetVisitors, 800);
    currentVisitors = targetVisitors;
}

function animateVisitorCount(from, to, duration) {
    const countEl = document.getElementById('visitors-count');
    if (!countEl) return;
    
    const startTime = performance.now();
    const diff = to - from;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function pour une animation plus fluide
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const current = Math.round(from + (diff * easeProgress));
        countEl.textContent = current;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Mettre à jour le compte à rebours avec animation
let lastValues = { days: '', hours: '', minutes: '', seconds: '' };

// ============================================
// 🎉 ANIMATION DE LANCEMENT SPECTACULAIRE 🎉
// ============================================

function playLaunchAnimation() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('coming-soon-overlay');
        if (!overlay) {
            resolve();
            return;
        }

        // Créer le container d'animation GLITCH
        const animContainer = document.createElement('div');
        animContainer.id = 'launch-animation';
        animContainer.innerHTML = `
            <div class="glitch-overlay" id="glitch-overlay"></div>
            <div class="glitch-scanlines"></div>
            <div class="glitch-noise"></div>
            <div class="site-peek-container" id="site-peek-container"></div>
        `;

        // Styles de l'animation GLITCH
        const animStyles = document.createElement('style');
        animStyles.id = 'launch-animation-styles';
        animStyles.textContent = `
            #launch-animation {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 100000;
                pointer-events: none;
                overflow: hidden;
            }

            .glitch-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: inherit;
            }

            .glitch-scanlines {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: repeating-linear-gradient(
                    0deg,
                    rgba(0, 0, 0, 0.15),
                    rgba(0, 0, 0, 0.15) 1px,
                    transparent 1px,
                    transparent 2px
                );
                animation: scanlineMove 0.1s linear infinite;
                opacity: 0;
            }

            @keyframes scanlineMove {
                0% { transform: translateY(0); }
                100% { transform: translateY(4px); }
            }

            .glitch-noise {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 200%;
                height: 200%;
                background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E");
                opacity: 0;
                animation: noiseAnim 0.2s steps(10) infinite;
            }

            @keyframes noiseAnim {
                0%, 100% { transform: translate(0, 0); }
                10% { transform: translate(-5%, -5%); }
                20% { transform: translate(5%, 5%); }
                30% { transform: translate(-5%, 5%); }
                40% { transform: translate(5%, -5%); }
                50% { transform: translate(-2%, 2%); }
                60% { transform: translate(2%, -2%); }
                70% { transform: translate(-3%, -3%); }
                80% { transform: translate(3%, 3%); }
                90% { transform: translate(-1%, 1%); }
            }

            .glitch-active {
                animation: glitchEffect 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both infinite;
            }

            @keyframes glitchEffect {
                0% {
                    transform: translate(0);
                    filter: hue-rotate(0deg);
                }
                10% {
                    transform: translate(-5px, 2px);
                    filter: hue-rotate(90deg);
                }
                20% {
                    transform: translate(5px, -2px);
                    filter: hue-rotate(180deg);
                }
                30% {
                    transform: translate(-3px, -3px);
                    filter: hue-rotate(270deg);
                }
                40% {
                    transform: translate(3px, 3px);
                    filter: hue-rotate(360deg);
                }
                50% {
                    transform: translate(-2px, 1px);
                    filter: hue-rotate(45deg);
                }
                60% {
                    transform: translate(2px, -1px);
                    filter: hue-rotate(135deg);
                }
                70% {
                    transform: translate(-4px, 2px);
                    filter: hue-rotate(225deg);
                }
                80% {
                    transform: translate(4px, -2px);
                    filter: hue-rotate(315deg);
                }
                90% {
                    transform: translate(-1px, -1px);
                    filter: hue-rotate(180deg);
                }
                100% {
                    transform: translate(0);
                    filter: hue-rotate(0deg);
                }
            }

            .glitch-slice {
                position: absolute;
                left: 0;
                width: 100%;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                overflow: hidden;
            }

            .glitch-rgb {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
            }

            .glitch-rgb-r {
                background: rgba(255, 0, 0, 0.1);
                animation: rgbShiftR 0.15s ease-in-out infinite;
            }

            .glitch-rgb-g {
                background: rgba(0, 255, 0, 0.1);
                animation: rgbShiftG 0.15s ease-in-out infinite;
            }

            .glitch-rgb-b {
                background: rgba(0, 0, 255, 0.1);
                animation: rgbShiftB 0.15s ease-in-out infinite;
            }

            @keyframes rgbShiftR {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(-10px); }
            }

            @keyframes rgbShiftG {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(10px); }
            }

            @keyframes rgbShiftB {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
            }

            .flash-white {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                opacity: 0;
            }

            @keyframes flashBang {
                0% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }

            .glitch-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-family: 'Courier New', monospace;
                font-size: 24px;
                color: #d4af37;
                text-transform: uppercase;
                letter-spacing: 10px;
                opacity: 0;
                text-shadow: 
                    2px 0 #ff0000,
                    -2px 0 #00ffff;
            }

            .pixel-dissolve {
                position: absolute;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            }

            @keyframes pixelFade {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0); }
            }

            /* Site Peek - Aperçu promo -20% */
            .site-peek-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 5;
            }

            .site-peek-window {
                position: absolute;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Space Grotesk', 'Inter', sans-serif;
                font-weight: 700;
                color: #d4af37;
                text-shadow: 
                    0 0 20px rgba(212, 175, 55, 0.8),
                    0 0 40px rgba(212, 175, 55, 0.5),
                    2px 2px 0 rgba(0, 0, 0, 0.5);
                animation: promoAppear 0.4s ease-out forwards;
                white-space: nowrap;
            }

            .site-peek-window::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 120%;
                height: 120%;
                background: radial-gradient(ellipse, rgba(212, 175, 55, 0.2) 0%, transparent 70%);
                z-index: -1;
            }

            @keyframes promoAppear {
                0% { 
                    opacity: 0;
                    transform: scale(0) rotate(-20deg);
                }
                50% { 
                    opacity: 1;
                    transform: scale(1.3) rotate(5deg);
                }
                100% { 
                    opacity: 0;
                    transform: scale(1) rotate(0deg);
                }
            }

            /* Explosions */
            .explosion-container {
                position: absolute;
                pointer-events: none;
            }

            .explosion-particle {
                position: absolute;
                border-radius: 50%;
                animation: explode 0.8s ease-out forwards;
            }

            @keyframes explode {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--tx), var(--ty)) scale(0);
                    opacity: 0;
                }
            }

            .explosion-ring {
                position: absolute;
                border: 3px solid #d4af37;
                border-radius: 50%;
                animation: ringExpand 0.6s ease-out forwards;
            }

            @keyframes ringExpand {
                0% {
                    width: 0;
                    height: 0;
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
                100% {
                    width: 200px;
                    height: 200px;
                    opacity: 0;
                    transform: translate(-50%, -50%);
                }
            }

            .explosion-flash {
                position: absolute;
                width: 100px;
                height: 100px;
                background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(212,175,55,0.5) 40%, transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: flashExpand 0.3s ease-out forwards;
            }

            @keyframes flashExpand {
                0% {
                    transform: translate(-50%, -50%) scale(0);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(3);
                    opacity: 0;
                }
            }

            .explosion-spark {
                position: absolute;
                width: 4px;
                height: 20px;
                background: linear-gradient(to bottom, #fff, #d4af37, transparent);
                transform-origin: center bottom;
                animation: sparkFly 0.5s ease-out forwards;
            }

            @keyframes sparkFly {
                0% {
                    transform: rotate(var(--angle)) translateY(0) scaleY(1);
                    opacity: 1;
                }
                100% {
                    transform: rotate(var(--angle)) translateY(-150px) scaleY(0.3);
                    opacity: 0;
                }
            }

            /* FINALE - Logo Néon + Promo */
            .finale-container {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 100001;
                background: rgba(0, 0, 0, 0.95);
                opacity: 0;
                animation: finaleAppear 0.5s ease-out forwards;
                pointer-events: auto;
            }

            @keyframes finaleAppear {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }

            .neon-logo {
                font-family: 'Playfair Display', 'Georgia', serif;
                font-size: clamp(3rem, 10vw, 6rem);
                font-weight: 700;
                text-align: center;
                position: relative;
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
            }

            .neon-letter {
                display: inline-block;
                color: #222;
                text-shadow: none;
                filter: brightness(0.2);
                transition: all 0.5s ease-out;
            }

            .neon-letter.lit {
                color: #fff !important;
                filter: brightness(1) !important;
                text-shadow:
                    0 0 5px #fff,
                    0 0 10px #fff,
                    0 0 20px #00d4ff,
                    0 0 40px #00d4ff,
                    0 0 80px #ff69b4,
                    0 0 120px #ff69b4 !important;
                animation: neonPulse 2s ease-in-out infinite 0.5s;
            }

            .neon-letter.lit {
                animation: neonPulse 2s ease-in-out infinite;
            }

            @keyframes neonPulse {
                0%, 100% {
                    text-shadow:
                        0 0 5px #fff,
                        0 0 10px #fff,
                        0 0 20px #00d4ff,
                        0 0 40px #00d4ff,
                        0 0 80px #ff69b4,
                        0 0 120px #ff69b4;
                }
                50% {
                    text-shadow:
                        0 0 10px #fff,
                        0 0 20px #fff,
                        0 0 40px #00d4ff,
                        0 0 80px #00d4ff,
                        0 0 120px #ff69b4,
                        0 0 200px #ff69b4;
                }
            }

            .neon-promo {
                font-family: 'Space Grotesk', sans-serif;
                font-size: clamp(4rem, 15vw, 10rem);
                font-weight: 700;
                color: #ff3333;
                margin-top: 20px;
                position: relative;
                animation: promoReveal 0.8s ease-out 0.5s forwards, promoPulse 0.5s ease-in-out infinite 1.3s;
                opacity: 0;
                transform: scale(0);
                text-shadow:
                    0 0 10px #ff3333,
                    0 0 20px #ff3333,
                    0 0 40px #ff0000,
                    0 0 80px #ff0000;
            }

            @keyframes promoReveal {
                0% {
                    opacity: 0;
                    transform: scale(0) rotate(-10deg);
                }
                50% {
                    transform: scale(1.2) rotate(5deg);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) rotate(0deg);
                }
            }

            @keyframes promoPulse {
                0%, 100% {
                    transform: scale(1);
                    text-shadow:
                        0 0 10px #ff3333,
                        0 0 20px #ff3333,
                        0 0 40px #ff0000,
                        0 0 80px #ff0000;
                }
                50% {
                    transform: scale(1.05);
                    text-shadow:
                        0 0 20px #ff3333,
                        0 0 40px #ff3333,
                        0 0 80px #ff0000,
                        0 0 120px #ff0000,
                        0 0 200px #ff0000;
                }
            }

            .promo-subtitle {
                font-family: 'Space Grotesk', sans-serif;
                font-size: clamp(1rem, 3vw, 1.5rem);
                color: rgba(255, 255, 255, 0.8);
                margin-top: 15px;
                letter-spacing: 5px;
                text-transform: uppercase;
                opacity: 0;
                animation: subtitleFade 0.5s ease-out 1s forwards;
            }

            @keyframes subtitleFade {
                0% { opacity: 0; transform: translateY(20px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            .finale-flash {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: white;
                pointer-events: none;
                opacity: 0;
            }

            @keyframes finaleFlash {
                0% { opacity: 0; }
                10% { opacity: 0.8; }
                100% { opacity: 0; }
            }

            .finale-explosion {
                position: absolute;
                pointer-events: none;
            }

            .finale-particle {
                position: absolute;
                border-radius: 50%;
                animation: finaleExplode 1.2s ease-out forwards;
            }

            @keyframes finaleExplode {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--tx), var(--ty)) scale(0);
                    opacity: 0;
                }
            }

            .star-burst {
                position: absolute;
                width: 4px;
                background: linear-gradient(to bottom, #fff, #d4af37, transparent);
                transform-origin: center top;
                animation: starBurst 0.8s ease-out forwards;
            }

            @keyframes starBurst {
                0% {
                    height: 0;
                    opacity: 1;
                }
                30% {
                    height: 100px;
                    opacity: 1;
                }
                100% {
                    height: 100px;
                    opacity: 0;
                    transform: translateY(-150px) rotate(var(--angle));
                }
            }

            /* Typing effect */
            .typing-text {
                font-family: 'Playfair Display', 'Georgia', serif;
                font-size: clamp(3rem, 10vw, 6rem);
                font-weight: 700;
                color: #fff;
                text-align: center;
                position: relative;
                overflow: hidden;
                white-space: nowrap;
                text-shadow:
                    0 0 5px #fff,
                    0 0 10px #fff,
                    0 0 20px #d4af37,
                    0 0 40px #d4af37,
                    0 0 80px #d4af37;
            }

            .typing-cursor {
                display: inline-block;
                width: 4px;
                height: 1em;
                background: #d4af37;
                margin-left: 5px;
                animation: cursorBlink 0.5s infinite;
                vertical-align: middle;
            }

            @keyframes cursorBlink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            /* Timer offre limitée */
            .offer-timer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-top: 25px;
                padding: 15px 30px;
                background: rgba(255, 51, 51, 0.2);
                border: 2px solid #ff3333;
                border-radius: 50px;
                opacity: 0;
                animation: timerAppear 0.5s ease-out 2s forwards;
            }

            @keyframes timerAppear {
                0% { opacity: 0; transform: scale(0.8); }
                100% { opacity: 1; transform: scale(1); }
            }

            .offer-timer-icon {
                font-size: 1.5rem;
                animation: iconPulse 1s ease-in-out infinite;
            }

            @keyframes iconPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            .offer-timer-text {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.1rem;
                color: #fff;
                font-weight: 600;
                letter-spacing: 1px;
            }

            .offer-timer-countdown {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.3rem;
                color: #ff3333;
                font-weight: 700;
                text-shadow: 0 0 10px rgba(255, 51, 51, 0.5);
            }

            /* Bouton ENTRER */
            .enter-button {
                margin-top: 40px;
                padding: 20px 60px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.3rem;
                font-weight: 700;
                letter-spacing: 3px;
                text-transform: uppercase;
                color: #0a0a0b;
                background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%);
                background-size: 200% 200%;
                border: none;
                border-radius: 50px;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                opacity: 0;
                transform: translateY(30px);
                animation: buttonAppear 0.8s ease-out 2.5s forwards;
                transition: all 0.3s ease;
                box-shadow: 
                    0 0 20px rgba(212, 175, 55, 0.5),
                    0 0 40px rgba(212, 175, 55, 0.3),
                    0 10px 30px rgba(0, 0, 0, 0.3);
            }

            @keyframes buttonAppear {
                0% { opacity: 0; transform: translateY(30px); }
                100% { opacity: 1; transform: translateY(0); }
            }

            .enter-button:hover {
                transform: scale(1.05);
                background-position: 100% 0;
                box-shadow: 
                    0 0 30px rgba(212, 175, 55, 0.8),
                    0 0 60px rgba(212, 175, 55, 0.5),
                    0 15px 40px rgba(0, 0, 0, 0.4);
            }

            .enter-button:active {
                transform: scale(0.98);
            }

            .enter-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: buttonShine 2s infinite;
            }

            @keyframes buttonShine {
                0% { left: -100%; }
                50%, 100% { left: 100%; }
            }

            .enter-button::after {
                content: '→';
                margin-left: 10px;
                display: inline-block;
                transition: transform 0.3s ease;
            }

            .enter-button:hover::after {
                transform: translateX(5px);
            }

            /* Showcase produit unique */
            .products-showcase {
                position: absolute;
                top: 50%;
                left: 10%;
                transform: translateY(-50%);
                z-index: 10;
                pointer-events: none;
            }

            .showcase-product {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 15px;
                opacity: 0;
                transform: translateX(-100vw) scale(0.8);
            }

            .showcase-product-img {
                width: 150px;
                height: 150px;
                min-width: 150px;
                min-height: 150px;
                max-width: 150px;
                max-height: 150px;
                border-radius: 15px;
                overflow: hidden;
                position: relative;
                box-shadow: 
                    0 15px 40px rgba(0, 0, 0, 0.5),
                    0 0 30px rgba(212, 175, 55, 0.3);
                border: 2px solid rgba(212, 175, 55, 0.5);
            }

            .showcase-product-img img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .showcase-product.animate-in {
                animation: productEnter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            .showcase-product.animate-out {
                animation: productExit 0.6s ease-in forwards;
            }

            @keyframes productEnter {
                0% {
                    opacity: 0;
                    transform: translateX(-100vw) scale(0.8) rotate(-10deg);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0) scale(1) rotate(0deg);
                }
            }

            @keyframes productExit {
                0% {
                    opacity: 1;
                    transform: translateX(0) scale(1) rotate(0deg);
                }
                100% {
                    opacity: 0;
                    transform: translateX(100vw) scale(0.8) rotate(10deg);
                }
            }

            .showcase-promo {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0);
                background: #ff3333;
                color: #fff;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 2rem;
                font-weight: 700;
                padding: 10px 20px;
                border-radius: 10px;
                opacity: 0;
                box-shadow: 0 0 30px rgba(255, 51, 51, 0.8);
            }

            .showcase-promo.show {
                animation: promoStamp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }

            @keyframes promoStamp {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0) rotate(-20deg);
                }
                60% {
                    transform: translate(-50%, -50%) scale(1.3) rotate(5deg);
                }
                100% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1) rotate(-5deg);
                }
            }

            .showcase-prices {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: 15px;
                opacity: 0;
                white-space: nowrap;
            }

            .showcase-prices.show {
                animation: pricesReveal 0.5s ease-out forwards;
            }

            @keyframes pricesReveal {
                0% {
                    opacity: 0;
                    transform: translateY(10px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .showcase-old-price {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.2rem;
                color: #ff6b6b;
                text-decoration: line-through;
            }

            .showcase-new-price {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.6rem;
                font-weight: 700;
                color: #4ade80;
                text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
                animation: priceGlow 1s ease-in-out infinite;
            }

            @keyframes priceGlow {
                0%, 100% {
                    text-shadow: 0 0 10px rgba(74, 222, 128, 0.5);
                }
                50% {
                    text-shadow: 0 0 20px rgba(74, 222, 128, 0.8), 0 0 30px rgba(74, 222, 128, 0.4);
                }
            }

            /* Particules qui forment le logo */
            .particle-logo-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 400px;
                height: 100px;
            }

            .forming-particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: #d4af37;
                border-radius: 50%;
                box-shadow: 0 0 10px #d4af37;
                animation: formParticle 1.5s ease-out forwards;
            }

            @keyframes formParticle {
                0% {
                    transform: translate(var(--startX), var(--startY)) scale(0);
                    opacity: 0;
                }
                30% {
                    opacity: 1;
                    transform: translate(var(--startX), var(--startY)) scale(1);
                }
                100% {
                    transform: translate(var(--endX), var(--endY)) scale(1);
                    opacity: 1;
                }
            }

            @keyframes particleExplodeFromLogo {
                0% {
                    transform: translate(var(--endX), var(--endY)) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--explodeX), var(--explodeY)) scale(0);
                    opacity: 0;
                }
            }
        `;

        document.head.appendChild(animStyles);
        overlay.appendChild(animContainer);

        // Ajouter les couches RGB
        const glitchOverlay = document.getElementById('glitch-overlay');
        glitchOverlay.innerHTML = `
            <div class="glitch-rgb glitch-rgb-r"></div>
            <div class="glitch-rgb glitch-rgb-g"></div>
            <div class="glitch-rgb glitch-rgb-b"></div>
            <div class="flash-white" id="flash-white"></div>
        `;

        const scanlines = animContainer.querySelector('.glitch-scanlines');
        const noise = animContainer.querySelector('.glitch-noise');
        const rgbLayers = animContainer.querySelectorAll('.glitch-rgb');
        const flashWhite = document.getElementById('flash-white');
        const sitePeekContainer = document.getElementById('site-peek-container');

        // Révéler le site en arrière-plan pour les aperçus (mais toujours caché par l'overlay)
        revealSite();

        // Séquence d'animation GLITCH
        let glitchCount = 0;
        const maxGlitches = 5;

        function triggerGlitch() {
            if (glitchCount >= maxGlitches) {
                // Fin de l'animation - FLASH final et dissolution
                finalReveal();
                return;
            }

            // Activer les effets glitch
            overlay.classList.add('glitch-active');
            scanlines.style.opacity = '1';
            noise.style.opacity = '0.1';
            rgbLayers.forEach(layer => layer.style.opacity = '1');

            // Créer des slices horizontaux aléatoires
            createGlitchSlices();

            // Créer des aperçus du site (à partir du 4ème glitch)
            if (glitchCount >= 3) {
                createSitePeekWindows(glitchCount);
                // Ajouter des explosions
                createExplosions(glitchCount);
            }

            // Durée du glitch qui augmente
            const glitchDuration = 100 + (glitchCount * 50);
            
            setTimeout(() => {
                // Désactiver les effets
                overlay.classList.remove('glitch-active');
                scanlines.style.opacity = '0';
                noise.style.opacity = '0';
                rgbLayers.forEach(layer => layer.style.opacity = '0');
                
                // Supprimer les slices
                document.querySelectorAll('.glitch-slice').forEach(s => s.remove());
                
                // Supprimer les aperçus du site
                document.querySelectorAll('.site-peek-window').forEach(w => w.remove());
                
                // Supprimer les explosions
                document.querySelectorAll('.explosion-container').forEach(e => e.remove());
                
                glitchCount++;
                
                // Prochain glitch après une pause
                const pauseDuration = Math.max(50, 300 - (glitchCount * 30));
                setTimeout(triggerGlitch, pauseDuration);
            }, glitchDuration);
        }

        function createGlitchSlices() {
            const numSlices = 3 + Math.floor(Math.random() * 4);
            for (let i = 0; i < numSlices; i++) {
                const slice = document.createElement('div');
                slice.className = 'glitch-slice';
                const height = 10 + Math.random() * 50;
                const top = Math.random() * (100 - height);
                const offsetX = (Math.random() - 0.5) * 40;
                
                slice.style.cssText = `
                    top: ${top}%;
                    height: ${height}px;
                    transform: translateX(${offsetX}px);
                    opacity: 0.9;
                `;
                animContainer.appendChild(slice);
            }
        }

        // Créer des "-20%" qui apparaissent partout
        function createSitePeekWindows(intensity) {
            const numWindows = 1 + Math.floor(intensity / 4);
            
            for (let i = 0; i < numWindows; i++) {
                const promoText = document.createElement('div');
                promoText.className = 'site-peek-window';
                promoText.textContent = '-20%';
                
                // Taille qui augmente avec l'intensité
                const fontSize = 30 + (intensity * 8) + Math.random() * 40;
                
                // Position aléatoire
                const left = 5 + Math.random() * 80;
                const top = 5 + Math.random() * 80;
                
                // Rotation aléatoire
                const rotation = (Math.random() - 0.5) * 30;
                
                promoText.style.cssText = `
                    left: ${left}%;
                    top: ${top}%;
                    font-size: ${fontSize}px;
                    transform: rotate(${rotation}deg);
                    animation-delay: ${i * 0.05}s;
                `;
                
                sitePeekContainer.appendChild(promoText);
            }
        }

        // Créer des explosions
        function createExplosions(intensity) {
            const numExplosions = 1 + Math.floor(intensity / 3);
            
            for (let e = 0; e < numExplosions; e++) {
                setTimeout(() => {
                    const explosion = document.createElement('div');
                    explosion.className = 'explosion-container';
                    
                    // Position aléatoire
                    const x = 10 + Math.random() * 80;
                    const y = 10 + Math.random() * 80;
                    
                    explosion.style.cssText = `
                        left: ${x}%;
                        top: ${y}%;
                    `;
                    
                    // Flash central
                    const flash = document.createElement('div');
                    flash.className = 'explosion-flash';
                    explosion.appendChild(flash);
                    
                    // Anneau qui s'étend
                    const ring = document.createElement('div');
                    ring.className = 'explosion-ring';
                    explosion.appendChild(ring);
                    
                    // Particules dorées
                    const colors = ['#d4af37', '#f4e4bc', '#ffd700', '#fff', '#ff6b6b'];
                    const numParticles = 15 + Math.floor(intensity * 3);
                    
                    for (let i = 0; i < numParticles; i++) {
                        const particle = document.createElement('div');
                        particle.className = 'explosion-particle';
                        
                        const angle = (Math.PI * 2 * i) / numParticles + Math.random() * 0.5;
                        const distance = 50 + Math.random() * 100;
                        const tx = Math.cos(angle) * distance;
                        const ty = Math.sin(angle) * distance;
                        const size = 4 + Math.random() * 8;
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        
                        particle.style.cssText = `
                            width: ${size}px;
                            height: ${size}px;
                            background: ${color};
                            box-shadow: 0 0 ${size}px ${color};
                            --tx: ${tx}px;
                            --ty: ${ty}px;
                            animation-delay: ${Math.random() * 0.1}s;
                        `;
                        
                        explosion.appendChild(particle);
                    }
                    
                    // Étincelles
                    const numSparks = 8 + Math.floor(intensity * 2);
                    for (let i = 0; i < numSparks; i++) {
                        const spark = document.createElement('div');
                        spark.className = 'explosion-spark';
                        const angle = (360 / numSparks) * i;
                        
                        spark.style.cssText = `
                            --angle: ${angle}deg;
                            animation-delay: ${Math.random() * 0.1}s;
                        `;
                        
                        explosion.appendChild(spark);
                    }
                    
                    sitePeekContainer.appendChild(explosion);
                }, e * 100);
            }
        }

        function finalReveal() {
            // Flash blanc intense
            flashWhite.style.animation = 'flashBang 0.4s ease-out forwards';
            
            // Créer quelques -20% et explosions avant la finale
            for (let i = 0; i < 2; i++) {
                setTimeout(() => {
                    createSitePeekWindows(6);
                    createExplosions(6);
                }, i * 100);
            }
            
            // Après les explosions, afficher la finale avec logo néon
            setTimeout(() => {
                showFinaleScreen();
            }, 600);
        }

        // Écran finale avec logo néon et -20%
        function showFinaleScreen() {
            const finaleContainer = document.createElement('div');
            finaleContainer.className = 'finale-container';
            finaleContainer.id = 'finale-container';
            
            // Créer le logo lettre par lettre
            const logoText = 'Family Custom';
            let logoHTML = '';
            for (let i = 0; i < logoText.length; i++) {
                const delay = i * 0.12; // 120ms entre chaque lettre
                if (logoText[i] === ' ') {
                    logoHTML += `<span style="width: 0.3em; display: inline-block;"></span>`;
                } else {
                    logoHTML += `<span class="neon-letter" style="--delay: ${delay}s">${logoText[i]}</span>`;
                }
            }
            
            finaleContainer.innerHTML = `
                <div class="finale-flash" id="finale-flash"></div>
                <div class="products-showcase" id="products-showcase"></div>
                <div class="neon-logo">${logoHTML}</div>
                <div class="promo-subtitle">-20% sur tout le site • Lancement exclusif</div>
                <div class="offer-timer">
                    <span class="offer-timer-icon">⏰</span>
                    <span class="offer-timer-text">Offre valable</span>
                    <span class="offer-timer-countdown" id="offer-countdown">48:00:00</span>
                </div>
                <button class="enter-button" id="enter-button">Entrer</button>
            `;
            
            animContainer.appendChild(finaleContainer);
            
            // Démarrer le carrousel de produits
            startProductsShowcase();
            
            // Flash initial
            const finaleFlash = document.getElementById('finale-flash');
            finaleFlash.style.animation = 'finaleFlash 0.3s ease-out forwards';
            
            // Explosions autour du logo
            createFinaleExplosions();
            
            // Allumer les lettres une par une avec JavaScript
            const letters = document.querySelectorAll('.neon-letter');
            letters.forEach((letter, index) => {
                setTimeout(() => {
                    letter.classList.add('lit');
                }, index * 120); // 120ms entre chaque lettre
            });
            
            // Flash supplémentaires
            setTimeout(() => {
                finaleFlash.style.animation = 'none';
                setTimeout(() => {
                    finaleFlash.style.animation = 'finaleFlash 0.2s ease-out forwards';
                }, 50);
            }, 500);
            
            setTimeout(() => {
                finaleFlash.style.animation = 'none';
                setTimeout(() => {
                    finaleFlash.style.animation = 'finaleFlash 0.15s ease-out forwards';
                }, 50);
            }, 1000);
            
            // Plus d'explosions
            setTimeout(() => createFinaleExplosions(), 400);
            setTimeout(() => createFinaleExplosions(), 800);
            setTimeout(() => createFinaleExplosions(), 1200);
            
            // Timer countdown
            startOfferCountdown();
            
            // Bouton ENTRER
            const enterButton = document.getElementById('enter-button');
            enterButton.addEventListener('click', () => {
                // Animation de clic
                finaleFlash.style.animation = 'finaleFlash 0.2s ease-out forwards';
                
                setTimeout(() => {
                    finaleContainer.style.transition = 'opacity 0.5s ease';
                    finaleContainer.style.opacity = '0';
                    setTimeout(() => {
                        resolve();
                    }, 500);
                }, 200);
            });
        }

        // Créer les particules qui forment "FamilyCustom"
        function createParticleLogo() {
            const container = document.getElementById('particle-logo');
            if (!container) return;
            
            const text = "FamilyCustom";
            const particles = [];
            const particleCount = 150;
            
            // Créer des positions cibles qui forment le texte
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'forming-particle';
                
                // Position de départ aléatoire (loin du centre)
                const startAngle = Math.random() * Math.PI * 2;
                const startDistance = 300 + Math.random() * 200;
                const startX = Math.cos(startAngle) * startDistance;
                const startY = Math.sin(startAngle) * startDistance;
                
                // Position finale (forme le texte approximativement)
                const charIndex = Math.floor((i / particleCount) * text.length);
                const charWidth = 30;
                const textWidth = text.length * charWidth;
                const endX = (charIndex * charWidth) - (textWidth / 2) + (Math.random() - 0.5) * 20;
                const endY = (Math.random() - 0.5) * 40;
                
                particle.style.cssText = `
                    --startX: ${startX}px;
                    --startY: ${startY}px;
                    --endX: ${endX}px;
                    --endY: ${endY}px;
                    animation-delay: ${Math.random() * 0.5}s;
                `;
                
                particle.dataset.endX = endX;
                particle.dataset.endY = endY;
                
                container.appendChild(particle);
                particles.push(particle);
            }
        }

        // Faire exploser les particules du logo
        function explodeParticleLogo() {
            const container = document.getElementById('particle-logo');
            if (!container) return;
            
            const particles = container.querySelectorAll('.forming-particle');
            particles.forEach(particle => {
                const endX = parseFloat(particle.dataset.endX);
                const endY = parseFloat(particle.dataset.endY);
                
                // Direction d'explosion (vers l'extérieur)
                const angle = Math.atan2(endY, endX) + (Math.random() - 0.5) * 0.5;
                const distance = 200 + Math.random() * 300;
                const explodeX = endX + Math.cos(angle) * distance;
                const explodeY = endY + Math.sin(angle) * distance;
                
                particle.style.setProperty('--explodeX', explodeX + 'px');
                particle.style.setProperty('--explodeY', explodeY + 'px');
                particle.style.animation = 'particleExplodeFromLogo 0.8s ease-out forwards';
            });
            
            // Supprimer le container après l'explosion
            setTimeout(() => {
                container.innerHTML = '';
            }, 800);
        }

        // Effet typing pour le logo
        function startTypingEffect() {
            const typingEl = document.getElementById('typing-logo');
            if (!typingEl) return;
            
            const text = "FamilyCustom";
            let index = 0;
            
            // Ajouter le curseur
            typingEl.innerHTML = '<span class="typing-cursor"></span>';
            
            // Ajouter le glow néon
            typingEl.style.textShadow = `
                0 0 5px #fff,
                0 0 10px #fff,
                0 0 20px #d4af37,
                0 0 40px #d4af37,
                0 0 80px #d4af37,
                0 0 120px #d4af37
            `;
            
            const typeInterval = setInterval(() => {
                if (index < text.length) {
                    typingEl.innerHTML = text.substring(0, index + 1) + '<span class="typing-cursor"></span>';
                    index++;
                } else {
                    clearInterval(typeInterval);
                    // Garder le curseur qui clignote un moment puis le retirer
                    setTimeout(() => {
                        typingEl.innerHTML = text;
                        typingEl.style.animation = 'neonGlow 2s ease-in-out infinite';
                    }, 1000);
                }
            }, 80);
        }

        // Timer de l'offre
        function startOfferCountdown() {
            const countdownEl = document.getElementById('offer-countdown');
            if (!countdownEl) return;
            
            let totalSeconds = 48 * 60 * 60; // 48 heures
            
            const updateTimer = () => {
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                countdownEl.textContent = 
                    String(hours).padStart(2, '0') + ':' +
                    String(minutes).padStart(2, '0') + ':' +
                    String(seconds).padStart(2, '0');
                
                if (totalSeconds > 0) {
                    totalSeconds--;
                }
            };
            
            updateTimer();
            setInterval(updateTimer, 1000);
        }

        // Showcase d'UN produit à la fois avec animation -20%
        async function startProductsShowcase() {
            const showcase = document.getElementById('products-showcase');
            if (!showcase) return;
            
            let realProducts = [];
            
            // Charger les vrais produits depuis Firebase
            try {
                const db = window.FirebaseDB;
                if (db) {
                    const snapshot = await db.collection('products').get();
                    if (!snapshot.empty) {
                        realProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        realProducts = realProducts.filter(p => p.image);
                    }
                }
            } catch (error) {
                console.log('Could not load products from Firebase');
            }
            
            if (realProducts.length === 0) return;
            
            let productIndex = 0;
            
            function showNextProduct() {
                const product = realProducts[productIndex % realProducts.length];
                
                // Calculer les prix
                let oldPrice = product.price || '0€';
                let newPrice = oldPrice;
                
                // Extraire le nombre du prix
                const priceMatch = oldPrice.match(/([\d,\.]+)/);
                if (priceMatch) {
                    const numPrice = parseFloat(priceMatch[1].replace(',', '.'));
                    const discountedPrice = (numPrice * 0.8).toFixed(2).replace('.', ',');
                    newPrice = discountedPrice + '€';
                }
                
                // Si le produit a déjà un prix original (promo existante)
                if (product.originalPrice) {
                    oldPrice = product.originalPrice;
                    newPrice = product.price;
                }
                
                // Créer le container produit
                const productEl = document.createElement('div');
                productEl.className = 'showcase-product';
                productEl.innerHTML = `
                    <div class="showcase-product-img">
                        <img src="${product.image}" alt="${product.name || 'Produit'}">
                        <div class="showcase-promo">-20%</div>
                    </div>
                    <div class="showcase-prices">
                        <span class="showcase-old-price">${oldPrice}</span>
                        <span class="showcase-new-price">${newPrice}</span>
                    </div>
                `;
                
                showcase.innerHTML = '';
                showcase.appendChild(productEl);
                
                // Animation d'entrée
                setTimeout(() => {
                    productEl.classList.add('animate-in');
                }, 50);
                
                // Afficher le -20% après l'entrée
                setTimeout(() => {
                    const promo = productEl.querySelector('.showcase-promo');
                    if (promo) promo.classList.add('show');
                }, 900);
                
                // Afficher les prix après le -20%
                setTimeout(() => {
                    const prices = productEl.querySelector('.showcase-prices');
                    if (prices) prices.classList.add('show');
                }, 1200);
                
                // Animation de sortie
                setTimeout(() => {
                    productEl.classList.remove('animate-in');
                    productEl.classList.add('animate-out');
                }, 2800);
                
                // Prochain produit
                setTimeout(() => {
                    productIndex++;
                    showNextProduct();
                }, 3500);
            }
            
            // Démarrer après un petit délai
            setTimeout(showNextProduct, 500);
        }

        // Explosions pour la finale
        function createFinaleExplosions() {
            const positions = [
                { x: 15, y: 40 },
                { x: 85, y: 40 },
                { x: 10, y: 60 },
                { x: 90, y: 60 },
                { x: 25, y: 25 },
                { x: 75, y: 25 },
            ];
            
            positions.forEach((pos, index) => {
                setTimeout(() => {
                    const explosion = document.createElement('div');
                    explosion.className = 'finale-explosion';
                    explosion.style.cssText = `left: ${pos.x}%; top: ${pos.y}%;`;
                    
                    // Particules
                    const colors = ['#d4af37', '#f4e4bc', '#ffd700', '#fff', '#ff6b6b', '#ff3333'];
                    for (let i = 0; i < 20; i++) {
                        const particle = document.createElement('div');
                        particle.className = 'finale-particle';
                        
                        const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
                        const distance = 80 + Math.random() * 120;
                        const tx = Math.cos(angle) * distance;
                        const ty = Math.sin(angle) * distance;
                        const size = 6 + Math.random() * 10;
                        const color = colors[Math.floor(Math.random() * colors.length)];
                        
                        particle.style.cssText = `
                            width: ${size}px;
                            height: ${size}px;
                            background: ${color};
                            box-shadow: 0 0 ${size * 2}px ${color};
                            --tx: ${tx}px;
                            --ty: ${ty}px;
                        `;
                        explosion.appendChild(particle);
                    }
                    
                    // Étoiles
                    for (let i = 0; i < 12; i++) {
                        const star = document.createElement('div');
                        star.className = 'star-burst';
                        const angle = (360 / 12) * i;
                        star.style.cssText = `--angle: ${angle}deg; transform: rotate(${angle}deg);`;
                        explosion.appendChild(star);
                    }
                    
                    const finaleContainer = document.getElementById('finale-container');
                    if (finaleContainer) {
                        finaleContainer.appendChild(explosion);
                    }
                }, index * 100);
            });
        }

        function createPixelDissolve() {
            const pixelSize = 20;
            const cols = Math.ceil(window.innerWidth / pixelSize);
            const rows = Math.ceil(window.innerHeight / pixelSize);
            
            // Créer un container pour les pixels
            const pixelContainer = document.createElement('div');
            pixelContainer.id = 'pixel-container';
            pixelContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            `;
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    const pixel = document.createElement('div');
                    pixel.className = 'pixel-dissolve';
                    const delay = Math.random() * 1.5;
                    
                    pixel.style.cssText = `
                        left: ${col * pixelSize}px;
                        top: ${row * pixelSize}px;
                        width: ${pixelSize}px;
                        height: ${pixelSize}px;
                        animation: pixelFade 0.5s ease-out ${delay}s forwards;
                    `;
                    pixelContainer.appendChild(pixel);
                }
            }
            
            // Cacher l'overlay original
            overlay.style.opacity = '0';
            animContainer.appendChild(pixelContainer);
        }

        // Démarrer après un petit délai
        setTimeout(triggerGlitch, 300);
    });
}

// Animation de révélation du site
async function animatedReveal() {
    // Jouer l'animation de lancement
    await playLaunchAnimation();
    
    // Révéler le site
    revealSite();
    
    // Supprimer l'overlay avec un fade
    const overlay = document.getElementById('coming-soon-overlay');
    if (overlay) {
        overlay.style.transition = 'opacity 0.8s ease';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.remove();
            // Nettoyer les styles d'animation
            const animStyles = document.getElementById('launch-animation-styles');
            if (animStyles) animStyles.remove();
            // Trigger resize pour réinitialiser les composants
            window.dispatchEvent(new Event('resize'));
        }, 800);
    }
}

// 🧪 FONCTION DE TEST - Tape testLaunchAnimation() dans la console !
window.testLaunchAnimation = function() {
    console.log('🎉 Démarrage de l\'animation de lancement...');
    playLaunchAnimation().then(() => {
        console.log('✅ Animation terminée ! Le site va se révéler...');
        setTimeout(() => {
            revealSite();
            const overlay = document.getElementById('coming-soon-overlay');
            if (overlay) {
                overlay.style.transition = 'opacity 0.8s ease';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 800);
            }
        }, 500);
    });
};

console.log('💡 Pour tester l\'animation de lancement, tape: testLaunchAnimation()');

function updateCountdown() {
    const now = Date.now();
    const distance = LAUNCH_DATE - now;
    
    if (distance <= 0) {
        // Le site est lancé ! 🎉 Jouer l'animation spectaculaire
        animatedReveal();
        return;
    }
    
    const days = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    const hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
    
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');
    
    // Animation flip pour les changements
    if (daysEl && days !== lastValues.days) {
        daysEl.textContent = days;
        daysEl.classList.add('flip');
        setTimeout(() => daysEl.classList.remove('flip'), 300);
        lastValues.days = days;
    }
    
    if (hoursEl && hours !== lastValues.hours) {
        hoursEl.textContent = hours;
        hoursEl.classList.add('flip');
        setTimeout(() => hoursEl.classList.remove('flip'), 300);
        lastValues.hours = hours;
    }
    
    if (minutesEl && minutes !== lastValues.minutes) {
        minutesEl.textContent = minutes;
        minutesEl.classList.add('flip');
        setTimeout(() => minutesEl.classList.remove('flip'), 300);
        lastValues.minutes = minutes;
    }
    
    if (secondsEl && seconds !== lastValues.seconds) {
        secondsEl.textContent = seconds;
        secondsEl.classList.add('flip');
        setTimeout(() => secondsEl.classList.remove('flip'), 300);
        lastValues.seconds = seconds;
    }
}

// Fonction pour révéler le site (supprimer le style qui cache le contenu)
function revealSite() {
    const hideStyle = document.getElementById('cs-hide-body');
    if (hideStyle) {
        hideStyle.remove();
    }
}

// Configuration de l'accès admin
function setupAdminAccess() {
    const toggleBtn = document.getElementById('admin-toggle-btn');
    const adminForm = document.getElementById('admin-form');
    const passwordInput = document.getElementById('admin-password');
    const submitBtn = document.getElementById('admin-submit-btn');
    const errorMsg = document.getElementById('admin-error');
    
    if (!toggleBtn || !adminForm) return;
    
    // Toggle du formulaire
    toggleBtn.addEventListener('click', () => {
        const isVisible = adminForm.style.display !== 'none';
        adminForm.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible && passwordInput) {
            passwordInput.focus();
        }
    });
    
    // Soumission du mot de passe
    const handleSubmit = () => {
        const password = passwordInput.value;
        
        if (password === ADMIN_PASSWORD) {
            revealSite();
            const overlay = document.getElementById('coming-soon-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    overlay.remove();
                    // Réinitialiser le carrousel après avoir révélé le site
                    // Cela force le recalcul des dimensions
                    window.dispatchEvent(new Event('resize'));
                    // Recharger les données Firebase si nécessaire
                    if (window.FirebaseDB) {
                        console.log('Site revealed, reinitializing components...');
                    }
                }, 300);
            }
        } else {
            errorMsg.style.display = 'block';
            passwordInput.value = '';
            passwordInput.focus();
            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 3000);
        }
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    });
}

// Fonction pour révoquer l'accès admin (utile pour tester)
function revokeAdminAccess() {
    location.reload();
}

// Initialiser dès que le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createComingSoonOverlay);
} else {
    createComingSoonOverlay();
}
