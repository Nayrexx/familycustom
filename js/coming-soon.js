// Configuration du lancement
const LAUNCH_DATE = new Date('2026-02-02T20:00:00').getTime();
const ADMIN_PASSWORD = 'Louane2009'; // Changez ce mot de passe

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
    
    // Gestion de l'accès admin
    setupAdminAccess();
}

// Mettre à jour le compte à rebours avec animation
let lastValues = { days: '', hours: '', minutes: '', seconds: '' };

function updateCountdown() {
    const now = Date.now();
    const distance = LAUNCH_DATE - now;
    
    if (distance <= 0) {
        // Le site est lancé !
        revealSite();
        const overlay = document.getElementById('coming-soon-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.5s ease';
            setTimeout(() => overlay.remove(), 500);
        }
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
                setTimeout(() => overlay.remove(), 300);
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
