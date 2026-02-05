// ==========================================
// 🎡 ROUE DE LA FORTUNE - CAPTURE D'EMAILS
// Version 2.0 - Design Premium
// ==========================================

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        showDelay: 8000,
        cookieName: 'fc_wheel_played',
        cookieDays: 30,
        firebaseCollection: 'newsletter',
        promoCodesCollection: 'promo_codes'
    };

    // Lots de la roue (probabilités = 100%)
    // Design: alternance de couleurs claires/foncées pour plus de lisibilité
    const WHEEL_PRIZES = [
        { text: '-5%', color: '#8B5CF6', probability: 35, discount: 5, type: 'percent', icon: '✨' },
        { text: 'Dommage', color: '#1e1e2e', probability: 20, discount: 0, type: null, icon: '😢' },
        { text: '-10%', color: '#EC4899', probability: 25, discount: 10, type: 'percent', icon: '🎉' },
        { text: 'Perdu', color: '#2d2d3d', probability: 12, discount: 0, type: null, icon: '💫' },
        { text: '-15%', color: '#F59E0B', probability: 5, discount: 15, type: 'percent', icon: '🔥' },
        { text: 'Livraison\nOfferte', color: '#10B981', probability: 2, discount: 0, type: 'free_shipping', icon: '🚚' },
        { text: '-20%', color: '#EF4444', probability: 0.9, discount: 20, type: 'percent', icon: '💎' },
        { text: '-25%', color: '#D4AF37', probability: 0.1, discount: 25, type: 'percent', icon: '👑' }
    ];

    // Générer un code unique
    function generateUniqueCode(prefix = 'FC') {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = prefix + '-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Vérifier si déjà joué
    function hasPlayed() {
        return document.cookie.includes(CONFIG.cookieName + '=true');
    }

    // Marquer comme joué
    function setPlayed() {
        const expires = new Date();
        expires.setDate(expires.getDate() + CONFIG.cookieDays);
        document.cookie = `${CONFIG.cookieName}=true; expires=${expires.toUTCString()}; path=/`;
    }

    // Sauvegarder l'email et créer le code promo
    async function saveEmailAndCreatePromoCode(email, prize) {
        const uniqueCode = generateUniqueCode('WHEEL');
        const emailNormalized = email.toLowerCase().trim(); // Normaliser l'email
        
        try {
            const db = window.FirebaseDB;
            if (db) {
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 7);
                
                await db.collection(CONFIG.promoCodesCollection).doc(uniqueCode).set({
                    code: uniqueCode,
                    email: emailNormalized,
                    prize: prize.text,
                    discount: prize.discount,
                    type: prize.type,
                    source: 'spin_wheel',
                    used: false,
                    usedAt: null,
                    usedOrderId: null,
                    createdAt: new Date(),
                    expiresAt: expirationDate,
                    page: window.location.pathname
                });
                
                await db.collection(CONFIG.firebaseCollection).add({
                    email: emailNormalized,
                    subscribedAt: new Date(),
                    source: 'spin_wheel',
                    prize: prize.text,
                    promoCode: uniqueCode,
                    discount: prize.discount,
                    type: prize.type,
                    page: window.location.pathname
                });
                
                console.log('✅ Code promo créé:', uniqueCode, 'pour', emailNormalized);
                return uniqueCode;
            }
        } catch (error) {
            console.error('Erreur création code promo:', error);
        }
        
        return uniqueCode;
    }

    // Créer les styles
    function injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'spin-wheel-styles';
        styles.textContent = `
            /* ===== OVERLAY ===== */
            .wheel-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s ease;
            }

            .wheel-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            /* ===== CONTAINER ===== */
            .wheel-container {
                position: relative;
                background: linear-gradient(160deg, #1a1a2e 0%, #0f0f1a 100%);
                border-radius: 28px;
                padding: 35px 30px;
                max-width: 95vw;
                width: 420px;
                box-shadow: 
                    0 30px 100px rgba(0, 0, 0, 0.8),
                    0 0 0 1px rgba(212, 175, 55, 0.2),
                    0 0 80px rgba(212, 175, 55, 0.15);
                transform: scale(0.85) translateY(40px);
                transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            .wheel-overlay.active .wheel-container {
                transform: scale(1) translateY(0);
            }

            /* ===== BOUTON FERMER ===== */
            .wheel-close {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 32px;
                height: 32px;
                border: none;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 50%;
                color: rgba(255, 255, 255, 0.5);
                font-size: 18px;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
            }

            .wheel-close:hover {
                background: rgba(255, 100, 100, 0.3);
                color: #fff;
                transform: rotate(90deg);
            }

            /* ===== HEADER ===== */
            .wheel-header {
                text-align: center;
                margin-bottom: 20px;
            }

            .wheel-badge {
                display: inline-block;
                background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%);
                color: #0a0a0b;
                font-size: 0.7rem;
                font-weight: 800;
                padding: 5px 12px;
                border-radius: 50px;
                margin-bottom: 12px;
                font-family: 'Space Grotesk', sans-serif;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .wheel-title {
                font-family: 'Playfair Display', Georgia, serif;
                font-size: clamp(1.4rem, 5vw, 1.8rem);
                font-weight: 700;
                color: #fff;
                margin: 0 0 8px;
                line-height: 1.2;
            }

            .wheel-title span {
                background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .wheel-subtitle {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.9rem;
                color: rgba(255, 255, 255, 0.6);
                margin: 0;
            }

            /* ===== ROUE ===== */
            .wheel-game {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 25px 0;
            }

            .wheel-wrapper {
                position: relative;
                width: 260px;
                height: 260px;
            }

            /* Pointeur élégant */
            .wheel-pointer {
                position: absolute;
                top: -8px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10;
                width: 30px;
                height: 40px;
            }

            .wheel-pointer::before {
                content: '';
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 15px solid transparent;
                border-right: 15px solid transparent;
                border-top: 28px solid #d4af37;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
            }

            .wheel-pointer::after {
                content: '';
                position: absolute;
                top: 3px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 18px solid #f4e4bc;
            }

            /* Canvas */
            .wheel-canvas {
                width: 260px;
                height: 260px;
                border-radius: 50%;
                box-shadow: 
                    0 0 0 6px #d4af37,
                    0 0 0 10px rgba(212, 175, 55, 0.25),
                    0 0 50px rgba(212, 175, 55, 0.3),
                    inset 0 0 40px rgba(0, 0, 0, 0.4);
                transition: transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99);
            }

            /* Centre de la roue */
            .wheel-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 55px;
                height: 55px;
                background: linear-gradient(145deg, #d4af37, #f4e4bc);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                box-shadow: 
                    0 4px 15px rgba(0, 0, 0, 0.4),
                    inset 0 2px 0 rgba(255, 255, 255, 0.6),
                    inset 0 -2px 0 rgba(0, 0, 0, 0.1);
                z-index: 5;
                border: 3px solid rgba(255,255,255,0.3);
            }

            /* ===== FORMULAIRE ===== */
            .wheel-form {
                width: 100%;
                margin-top: 15px;
            }

            .wheel-input-wrapper {
                position: relative;
                margin-bottom: 12px;
            }

            .wheel-input {
                width: 100%;
                padding: 16px 20px;
                border: 2px solid rgba(212, 175, 55, 0.25);
                border-radius: 14px;
                background: rgba(255, 255, 255, 0.04);
                color: #fff;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1rem;
                transition: all 0.3s ease;
                box-sizing: border-box;
            }

            .wheel-input::placeholder {
                color: rgba(255, 255, 255, 0.35);
            }

            .wheel-input:focus {
                outline: none;
                border-color: #d4af37;
                background: rgba(255, 255, 255, 0.08);
                box-shadow: 0 0 25px rgba(212, 175, 55, 0.15);
            }

            .wheel-spin-btn {
                width: 100%;
                padding: 16px 28px;
                background: linear-gradient(135deg, #d4af37 0%, #f4e4bc 50%, #d4af37 100%);
                background-size: 200% 200%;
                border: none;
                border-radius: 14px;
                color: #0a0a0b;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.1rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .wheel-spin-btn:hover:not(:disabled) {
                background-position: 100% 0;
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(212, 175, 55, 0.45);
            }

            .wheel-spin-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .wheel-spin-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
                animation: btnShine 2.5s infinite;
            }

            @keyframes btnShine {
                0% { left: -100%; }
                50%, 100% { left: 100%; }
            }

            .wheel-legal {
                font-size: 0.7rem;
                color: rgba(255, 255, 255, 0.35);
                text-align: center;
                margin: 12px 0 0;
                line-height: 1.4;
            }

            /* ===== RÉSULTAT ===== */
            .wheel-result {
                text-align: center;
                padding: 15px 0;
                display: none;
            }

            .wheel-result.show {
                display: block;
                animation: fadeInUp 0.5s ease;
            }

            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .wheel-result-icon {
                font-size: 3.5rem;
                margin-bottom: 10px;
                animation: bounceIn 0.6s ease;
            }

            @keyframes bounceIn {
                0% { transform: scale(0); }
                50% { transform: scale(1.15); }
                100% { transform: scale(1); }
            }

            .wheel-result-title {
                font-family: 'Playfair Display', serif;
                font-size: 1.5rem;
                color: #fff;
                margin: 0 0 5px;
            }

            .wheel-result-prize {
                font-family: 'Space Grotesk', sans-serif;
                font-size: 2.2rem;
                font-weight: 700;
                color: #d4af37;
                margin: 12px 0;
                text-shadow: 0 0 30px rgba(212, 175, 55, 0.5);
            }

            .wheel-result-code {
                display: inline-block;
                padding: 14px 35px;
                background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
                border: 2px dashed #d4af37;
                border-radius: 12px;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 1.2rem;
                font-weight: 700;
                color: #d4af37;
                letter-spacing: 3px;
                margin: 12px 0;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .wheel-result-code:hover {
                background: rgba(212, 175, 55, 0.2);
                transform: scale(1.03);
            }

            .wheel-result-code.copied {
                background: rgba(34, 197, 94, 0.15);
                border-color: #22c55e;
                color: #22c55e;
            }

            .wheel-result-hint {
                font-size: 0.8rem;
                color: rgba(255, 255, 255, 0.5);
                margin: 8px 0;
            }

            .wheel-result-expiry {
                font-size: 0.8rem;
                color: #ff6b6b;
                font-weight: 600;
                margin: 5px 0;
            }

            .wheel-result-lost {
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.95rem;
            }

            .wheel-shop-btn {
                display: inline-block;
                margin-top: 18px;
                padding: 14px 45px;
                background: linear-gradient(135deg, #d4af37, #f4e4bc);
                border: none;
                border-radius: 50px;
                color: #0a0a0b;
                font-family: 'Space Grotesk', sans-serif;
                font-size: 0.95rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .wheel-shop-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 15px 40px rgba(212, 175, 55, 0.4);
            }

            /* ===== CONFETTIS ===== */
            .confetti {
                position: absolute;
                width: 10px;
                height: 10px;
                pointer-events: none;
            }

            @keyframes confettiFall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(400px) rotate(720deg); opacity: 0; }
            }

            /* ===== RESPONSIVE ===== */
            @media (max-width: 480px) {
                .wheel-container {
                    padding: 25px 20px;
                    margin: 10px;
                    border-radius: 20px;
                }

                .wheel-wrapper {
                    width: 220px;
                    height: 220px;
                }

                .wheel-canvas {
                    width: 220px;
                    height: 220px;
                }

                .wheel-center {
                    width: 45px;
                    height: 45px;
                    font-size: 18px;
                }

                .wheel-title {
                    font-size: 1.3rem;
                }

                .wheel-result-prize {
                    font-size: 1.8rem;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    // Créer le HTML
    function createWheelHTML() {
        const overlay = document.createElement('div');
        overlay.className = 'wheel-overlay';
        overlay.id = 'wheel-overlay';
        
        overlay.innerHTML = `
            <div class="wheel-container">
                <button class="wheel-close" id="wheel-close">&times;</button>
                
                <div class="wheel-header">
                    <div class="wheel-badge">🎁 Exclusif</div>
                    <h2 class="wheel-title">Tentez votre <span>chance</span> !</h2>
                    <p class="wheel-subtitle">Tournez la roue et gagnez une réduction</p>
                </div>
                
                <div class="wheel-game">
                    <div class="wheel-wrapper">
                        <div class="wheel-pointer"></div>
                        <canvas class="wheel-canvas" id="wheel-canvas" width="260" height="260"></canvas>
                        <div class="wheel-center">🎯</div>
                    </div>
                </div>
                
                <div class="wheel-form" id="wheel-form">
                    <div class="wheel-input-wrapper">
                        <input type="email" class="wheel-input" id="wheel-email" placeholder="Entrez votre email pour jouer..." required>
                    </div>
                    <button class="wheel-spin-btn" id="wheel-spin-btn">🎡 Tourner la roue</button>
                    <p class="wheel-legal">En jouant, vous acceptez de recevoir nos offres. Désabonnement possible à tout moment.</p>
                </div>
                
                <div class="wheel-result" id="wheel-result">
                    <div class="wheel-result-icon" id="result-icon">🎉</div>
                    <h3 class="wheel-result-title" id="result-title">Félicitations !</h3>
                    <div class="wheel-result-prize" id="result-prize">-15%</div>
                    <div class="wheel-result-code" id="result-code" title="Cliquez pour copier">CODE</div>
                    <p class="wheel-result-hint">👆 Cliquez pour copier le code</p>
                    <p class="wheel-result-expiry" id="result-expiry">⏰ Valable 7 jours</p>
                    <button class="wheel-shop-btn" id="wheel-shop-btn">Utiliser mon code →</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    // Dessiner la roue avec un meilleur design
    function drawWheel() {
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 5;
        
        const totalSlices = WHEEL_PRIZES.length;
        const sliceAngle = (2 * Math.PI) / totalSlices;
        
        WHEEL_PRIZES.forEach((prize, index) => {
            const startAngle = index * sliceAngle - Math.PI / 2;
            const endAngle = startAngle + sliceAngle;
            
            // Dégradé pour chaque section
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            gradient.addColorStop(0, lightenColor(prize.color, 20));
            gradient.addColorStop(0.7, prize.color);
            gradient.addColorStop(1, darkenColor(prize.color, 15));
            
            // Dessiner la tranche
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Bordure
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Texte
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px "Space Grotesk", Arial, sans-serif';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            const lines = prize.text.split('\n');
            const lineHeight = 14;
            const totalHeight = lines.length * lineHeight;
            
            lines.forEach((line, lineIndex) => {
                const yOffset = -totalHeight / 2 + lineHeight / 2 + lineIndex * lineHeight;
                ctx.fillText(line, radius - 18, yOffset);
            });
            
            ctx.restore();
        });
        
        // Cercles décoratifs au centre
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();
    }

    // Fonctions utilitaires pour les couleurs
    function lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    function darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    // Sélectionner un prix
    function selectPrize() {
        const random = Math.random() * 100;
        let cumulative = 0;
        
        for (let i = 0; i < WHEEL_PRIZES.length; i++) {
            cumulative += WHEEL_PRIZES[i].probability;
            if (random <= cumulative) {
                return i;
            }
        }
        return 0;
    }

    // Vérifier si l'email a déjà joué
    async function hasEmailPlayed(email) {
        try {
            const db = window.FirebaseDB;
            if (!db) return false;
            
            const snapshot = await db.collection(CONFIG.firebaseCollection)
                .where('email', '==', email.toLowerCase().trim())
                .where('source', '==', 'spin_wheel')
                .limit(1)
                .get();
            
            return !snapshot.empty;
        } catch (e) {
            console.error('Erreur vérification email:', e);
            return false;
        }
    }

    // Faire tourner la roue
    async function spinWheel(email) {
        const canvas = document.getElementById('wheel-canvas');
        const spinBtn = document.getElementById('wheel-spin-btn');
        const form = document.getElementById('wheel-form');
        const result = document.getElementById('wheel-result');
        const emailInput = document.getElementById('wheel-email');
        
        if (!canvas) return;
        
        spinBtn.disabled = true;
        spinBtn.textContent = '⏳ Vérification...';
        
        // Vérifier si cet email a déjà joué
        const emailNormalized = email.toLowerCase().trim();
        const alreadyPlayed = await hasEmailPlayed(emailNormalized);
        
        if (alreadyPlayed) {
            spinBtn.disabled = false;
            spinBtn.textContent = '🎡 Tourner la roue';
            
            // Afficher un message d'erreur
            if (emailInput) {
                emailInput.style.borderColor = '#ef4444';
                emailInput.style.animation = 'shake 0.5s ease-in-out';
            }
            
            // Créer/afficher message d'erreur
            let errorMsg = document.getElementById('wheel-email-error');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.id = 'wheel-email-error';
                errorMsg.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 8px; text-align: center;';
                emailInput?.parentNode?.appendChild(errorMsg);
            }
            errorMsg.textContent = '⚠️ Cet email a déjà participé !';
            
            setTimeout(() => {
                if (emailInput) {
                    emailInput.style.borderColor = '';
                    emailInput.style.animation = '';
                }
            }, 2000);
            
            return;
        }
        
        spinBtn.textContent = '🎡 Ça tourne...';
        
        const prizeIndex = selectPrize();
        const prize = WHEEL_PRIZES[prizeIndex];
        
        // Calcul de l'angle pour que le segment sélectionné soit sous la flèche (en haut)
        const totalSlices = WHEEL_PRIZES.length; // 8
        const sliceAngle = 360 / totalSlices;    // 45°
        
        // La roue est dessinée ainsi :
        // - Segment 0 : de -90° à -45° (son centre est à -67.5°, soit 22.5° à droite du haut)
        // - Segment 1 : de -45° à 0°
        // - Segment i : commence à (i * 45° - 90°)
        //
        // La flèche pointe vers le HAUT (position 12h, soit -90° en canvas ou 0° en CSS)
        //
        // Pour que le CENTRE du segment i soit en haut :
        // Centre du segment i = i * 45° + 22.5° - 90° = i * 45° - 67.5°
        // On veut que ce centre soit à 0° (en haut pour le CSS)
        // Donc on doit tourner de : 0° - (i * 45° - 67.5°) = -i * 45° + 67.5°
        // 
        // Mais CSS rotate positif = sens horaire, et on veut tourner dans le sens horaire
        // donc on inverse : rotation = i * 45° - 67.5° + 360° = i * 45° + 292.5°
        // Simplifions : on veut juste que segment i soit en haut
        // 
        // TEST SIMPLE: segment 0 doit avoir son centre en haut
        // Son centre est à -67.5° du haut initialement
        // Pour le ramener en haut, on tourne de +67.5° (pas -67.5°, car on tourne la roue, pas la flèche)
        // Non... si on tourne la roue de +67.5°, le segment 0 va vers la droite...
        //
        // OK reprenons: quand on rotate le canvas de X degrés dans le CSS:
        // - Le contenu qui était en haut se déplace vers X degrés (sens horaire)
        // - Donc le contenu qui était à -X degrés vient en haut
        //
        // Le centre du segment i est à : (i * 45°) + 22.5° par rapport au haut initial
        // (car segment 0 a son centre à 22.5° du haut, en sens horaire)
        //
        // Pour que le centre du segment i soit en haut, on tourne de :
        // rotation = (i * 45°) + 22.5°
        // Mais on veut que ça finisse EN HAUT, pas à cet angle.
        // Si on rotate de (i * 45° + 22.5°), le segment i se déplace de cet angle,
        // ce qui n'est PAS ce qu'on veut.
        //
        // En fait : pour amener un point qui est à l'angle A vers le haut (angle 0),
        // on doit faire une rotation de -A (ou 360 - A en positif)
        //
        // Le centre du segment 0 est à 22.5° du haut → rotation = -22.5° (ou 337.5°)
        // Le centre du segment 1 est à 67.5° du haut → rotation = -67.5° (ou 292.5°)
        // Le centre du segment i est à (i * 45° + 22.5°) → rotation = -(i * 45° + 22.5°)
        
        const segmentCenterOffset = prizeIndex * sliceAngle + sliceAngle / 2; // angle du centre par rapport au haut
        const targetAngle = 360 - segmentCenterOffset; // rotation pour ramener en haut
        
        // Ajouter plusieurs tours complets (ENTIERS pour ne pas décaler l'angle)
        const rotations = 5 + Math.floor(Math.random() * 4); // 5, 6, 7 ou 8 tours complets
        // Petit offset aléatoire pour rester dans le segment
        const randomOffset = (Math.random() - 0.5) * (sliceAngle * 0.6);
        const finalAngle = rotations * 360 + targetAngle + randomOffset;
        
        console.log(`🎯 Prix sélectionné: "${prize.text}" (index ${prizeIndex})`);
        console.log(`📐 Centre segment: ${segmentCenterOffset}°, rotation cible: ${targetAngle}°, finale: ${finalAngle.toFixed(1)}°`);
        
        canvas.style.transform = `rotate(${finalAngle}deg)`;
        
        // Créer le code promo
        let uniqueCode = null;
        if (prize.type) {
            uniqueCode = await saveEmailAndCreatePromoCode(email, prize);
        } else {
            try {
                const db = window.FirebaseDB;
                if (db) {
                    await db.collection(CONFIG.firebaseCollection).add({
                        email: email.toLowerCase().trim(), // Normaliser l'email
                        subscribedAt: new Date(),
                        source: 'spin_wheel',
                        prize: 'Perdu',
                        promoCode: null,
                        page: window.location.pathname
                    });
                }
            } catch (e) {
                console.error('Erreur sauvegarde:', e);
            }
        }
        
        // Afficher le résultat après l'animation
        setTimeout(() => {
            setPlayed();
            form.style.display = 'none';
            result.classList.add('show');
            
            const resultIcon = document.getElementById('result-icon');
            const resultTitle = document.getElementById('result-title');
            const resultPrize = document.getElementById('result-prize');
            const resultCode = document.getElementById('result-code');
            const resultHint = document.querySelector('.wheel-result-hint');
            const resultExpiry = document.getElementById('result-expiry');
            const shopBtn = document.getElementById('wheel-shop-btn');
            
            if (prize.type && uniqueCode) {
                resultIcon.textContent = prize.icon || '🎉';
                resultTitle.textContent = 'Félicitations !';
                
                if (prize.type === 'free_shipping') {
                    resultPrize.textContent = 'Livraison Offerte !';
                } else {
                    resultPrize.textContent = `-${prize.discount}%`;
                }
                
                resultCode.textContent = uniqueCode;
                resultCode.style.display = 'inline-block';
                resultHint.style.display = 'block';
                resultExpiry.style.display = 'block';
                shopBtn.style.display = 'inline-block';
                
                saveWonCode(uniqueCode, prize.discount, prize.type);
                createConfetti();
            } else {
                resultIcon.textContent = '😢';
                resultTitle.textContent = 'Pas de chance...';
                resultPrize.textContent = 'Dommage !';
                resultPrize.style.color = 'rgba(255, 255, 255, 0.5)';
                resultCode.style.display = 'none';
                resultHint.innerHTML = '<span class="wheel-result-lost">Revenez demain retenter votre chance !</span>';
                resultExpiry.style.display = 'none';
                shopBtn.style.display = 'inline-block';
                shopBtn.textContent = 'Voir nos produits →';
            }
            
        }, 5500);
    }

    // Confettis
    function createConfetti() {
        const container = document.querySelector('.wheel-container');
        const colors = ['#d4af37', '#f4e4bc', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'];
        
        for (let i = 0; i < 40; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                left: ${Math.random() * 100}%;
                top: -10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                transform: rotate(${Math.random() * 360}deg);
                animation: confettiFall ${2 + Math.random() * 2}s ease-out forwards;
                animation-delay: ${Math.random() * 0.5}s;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            `;
            container.appendChild(confetti);
        }
        
        setTimeout(() => {
            container.querySelectorAll('.confetti').forEach(c => c.remove());
        }, 4000);
    }

    // Validation email
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Copier le code
    function copyCode() {
        const codeEl = document.getElementById('result-code');
        const code = codeEl.textContent;
        
        navigator.clipboard.writeText(code).then(() => {
            codeEl.classList.add('copied');
            codeEl.textContent = '✓ Copié !';
            
            setTimeout(() => {
                codeEl.classList.remove('copied');
                codeEl.textContent = code;
            }, 2000);
        });
    }

    // Ouvrir/fermer
    function openWheel() {
        document.getElementById('wheel-overlay')?.classList.add('active');
    }

    function closeWheel() {
        document.getElementById('wheel-overlay')?.classList.remove('active');
    }

    // Sauvegarder le code gagné
    function saveWonCode(code, discount, type) {
        if (!code) return;
        
        const wonCodeData = {
            code: code,
            discount: discount,
            type: type,
            wonAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        localStorage.setItem('fc_wheel_won_code', JSON.stringify(wonCodeData));
    }

    function getWonCode() {
        try {
            const data = localStorage.getItem('fc_wheel_won_code');
            if (!data) return null;
            
            const wonCode = JSON.parse(data);
            if (new Date(wonCode.expiresAt) < new Date()) {
                localStorage.removeItem('fc_wheel_won_code');
                return null;
            }
            return wonCode;
        } catch (e) {
            return null;
        }
    }

    function clearWonCode() {
        localStorage.removeItem('fc_wheel_won_code');
    }

    // Initialisation
    function init() {
        if (document.getElementById('wheel-overlay')) return;
        
        injectStyles();
        createWheelHTML();
        drawWheel();

        // Event listeners
        document.getElementById('wheel-close')?.addEventListener('click', closeWheel);
        
        document.getElementById('wheel-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'wheel-overlay') closeWheel();
        });

        document.getElementById('wheel-spin-btn')?.addEventListener('click', () => {
            const emailInput = document.getElementById('wheel-email');
            const email = emailInput.value.trim();
            if (!validateEmail(email)) {
                emailInput.style.borderColor = '#ff6b6b';
                emailInput.focus();
                return;
            }
            emailInput.style.borderColor = 'rgba(212, 175, 55, 0.25)';
            spinWheel(email);
        });

        document.getElementById('wheel-email')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('wheel-spin-btn')?.click();
            }
        });

        document.getElementById('result-code')?.addEventListener('click', copyCode);

        document.getElementById('wheel-shop-btn')?.addEventListener('click', () => {
            closeWheel();
            const productsSection = document.querySelector('.products-section, #products, .hero');
            if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
            }
        });

        // Afficher après délai
        setTimeout(() => {
            if (!hasPlayed()) {
                openWheel();
            }
        }, CONFIG.showDelay);

        console.log('🎡 Roue de la fortune v2.0 initialisée !');
    }

    // Démarrer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

    // API publique
    window.FCWheel = {
        open: openWheel,
        close: closeWheel,
        reset: () => {
            document.cookie = `${CONFIG.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            localStorage.removeItem('fc_wheel_won_code');
            location.reload();
        },
        getWonCode: getWonCode,
        clearWonCode: clearWonCode
    };

})();
