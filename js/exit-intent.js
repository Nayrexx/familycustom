/* ============================================
   EXIT INTENT POPUP - Family Custom
   Affiche un popup quand le visiteur quitte
   ============================================ */

(function() {
    'use strict';
    
    const CONFIG = {
        // Délai avant activation (évite trigger immédiat)
        delay: 3000,
        // Cookie durée en jours (ne pas réafficher)
        cookieDays: 7,
        // Code promo offert
        promoCode: 'RESTE10',
        promoDiscount: '10%',
        // Sensibilité (distance du haut en px)
        sensitivity: 20
    };
    
    let isEnabled = false;
    let hasTriggered = false;
    
    function init() {
        // Ne pas afficher sur checkout/panier (déjà engagé)
        if (window.location.pathname.includes('checkout') || 
            window.location.pathname.includes('panier') ||
            window.location.pathname.includes('success')) {
            return;
        }
        
        // Vérifier si déjà vu récemment
        if (getCookie('exitIntentShown')) {
            return;
        }
        
        // Activer après délai
        setTimeout(() => {
            isEnabled = true;
            document.addEventListener('mouseout', handleMouseOut);
        }, CONFIG.delay);
        
        // Injecter les styles
        injectStyles();
    }
    
    function handleMouseOut(e) {
        if (!isEnabled || hasTriggered) return;
        
        // Détecter si la souris quitte vers le haut (fermeture navigateur)
        if (e.clientY < CONFIG.sensitivity && 
            e.relatedTarget === null && 
            e.target.nodeName.toLowerCase() !== 'select') {
            showPopup();
        }
    }
    
    function showPopup() {
        hasTriggered = true;
        document.removeEventListener('mouseout', handleMouseOut);
        
        const popup = document.createElement('div');
        popup.id = 'exit-intent-overlay';
        popup.innerHTML = `
            <div class="exit-intent-popup">
                <button class="exit-close" onclick="window.closeExitIntent()">&times;</button>
                
                <div class="exit-content">
                    <div class="exit-emoji">🎁</div>
                    <h2>Attendez !</h2>
                    <p>Ne partez pas les mains vides...</p>
                    
                    <div class="exit-offer">
                        <span class="exit-discount">${CONFIG.promoDiscount}</span>
                        <span class="exit-text">de réduction<br>sur votre commande</span>
                    </div>
                    
                    <div class="exit-code-box">
                        <span class="exit-code-label">Votre code :</span>
                        <div class="exit-code" id="exit-promo-code">${CONFIG.promoCode}</div>
                        <button class="exit-copy-btn" onclick="window.copyExitCode()">
                            <i class="fas fa-copy"></i> Copier
                        </button>
                    </div>
                    
                    <a href="index.html#products" class="exit-cta" onclick="window.closeExitIntent()">
                        <i class="fas fa-shopping-bag"></i> Voir les produits
                    </a>
                    
                    <button class="exit-decline" onclick="window.closeExitIntent()">
                        Non merci, je préfère payer plein tarif
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Animation d'entrée
        setTimeout(() => popup.classList.add('show'), 10);
        
        // Fermer en cliquant à l'extérieur
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                window.closeExitIntent();
            }
        });
        
        // Fermer avec Escape
        document.addEventListener('keydown', handleEscape);
    }
    
    function handleEscape(e) {
        if (e.key === 'Escape') {
            window.closeExitIntent();
        }
    }
    
    window.closeExitIntent = function() {
        const popup = document.getElementById('exit-intent-overlay');
        if (popup) {
            popup.classList.remove('show');
            setTimeout(() => popup.remove(), 300);
        }
        document.removeEventListener('keydown', handleEscape);
        
        // Sauvegarder cookie pour ne pas réafficher
        setCookie('exitIntentShown', 'true', CONFIG.cookieDays);
    };
    
    window.copyExitCode = function() {
        const code = document.getElementById('exit-promo-code');
        if (code) {
            navigator.clipboard.writeText(code.textContent).then(() => {
                const btn = document.querySelector('.exit-copy-btn');
                btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                btn.style.background = '#4CAF50';
                
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                    btn.style.background = '';
                }, 2000);
            });
        }
    };
    
    // Cookie helpers
    function setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/`;
    }
    
    function getCookie(name) {
        return document.cookie.split('; ').find(row => row.startsWith(name + '='));
    }
    
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #exit-intent-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                backdrop-filter: blur(5px);
            }
            
            #exit-intent-overlay.show {
                opacity: 1;
                visibility: visible;
            }
            
            .exit-intent-popup {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                padding: 40px;
                max-width: 420px;
                width: 90%;
                position: relative;
                transform: scale(0.8) translateY(20px);
                transition: all 0.3s ease;
                border: 2px solid rgba(212, 175, 55, 0.3);
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
            }
            
            #exit-intent-overlay.show .exit-intent-popup {
                transform: scale(1) translateY(0);
            }
            
            .exit-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: white;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .exit-close:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: rotate(90deg);
            }
            
            .exit-content {
                text-align: center;
                color: white;
            }
            
            .exit-emoji {
                font-size: 60px;
                margin-bottom: 15px;
                animation: bounce 1s ease infinite;
            }
            
            @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            
            .exit-content h2 {
                font-size: 2rem;
                margin: 0 0 10px 0;
                background: linear-gradient(135deg, #d4af37, #f4d03f);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            
            .exit-content > p {
                color: rgba(255, 255, 255, 0.7);
                margin-bottom: 25px;
                font-size: 1.1rem;
            }
            
            .exit-offer {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 25px;
                padding: 20px;
                background: rgba(212, 175, 55, 0.1);
                border-radius: 12px;
                border: 1px dashed rgba(212, 175, 55, 0.3);
            }
            
            .exit-discount {
                font-size: 2.5rem;
                font-weight: 800;
                color: #d4af37;
            }
            
            .exit-text {
                text-align: left;
                font-size: 0.95rem;
                color: rgba(255, 255, 255, 0.8);
                line-height: 1.4;
            }
            
            .exit-code-box {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
            }
            
            .exit-code-label {
                display: block;
                font-size: 0.85rem;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 8px;
            }
            
            .exit-code {
                font-size: 1.8rem;
                font-weight: 700;
                letter-spacing: 3px;
                color: #d4af37;
                font-family: monospace;
                margin-bottom: 10px;
            }
            
            .exit-copy-btn {
                background: rgba(212, 175, 55, 0.2);
                border: 1px solid rgba(212, 175, 55, 0.3);
                color: #d4af37;
                padding: 8px 20px;
                border-radius: 6px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .exit-copy-btn:hover {
                background: rgba(212, 175, 55, 0.3);
            }
            
            .exit-cta {
                display: block;
                background: linear-gradient(135deg, #d4af37, #c9a227);
                color: white;
                text-decoration: none;
                padding: 15px 30px;
                border-radius: 10px;
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 15px;
                transition: all 0.3s;
            }
            
            .exit-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 30px rgba(212, 175, 55, 0.3);
            }
            
            .exit-cta i {
                margin-right: 8px;
            }
            
            .exit-decline {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.4);
                font-size: 0.8rem;
                cursor: pointer;
                transition: color 0.2s;
            }
            
            .exit-decline:hover {
                color: rgba(255, 255, 255, 0.6);
            }
            
            @media (max-width: 480px) {
                .exit-intent-popup {
                    padding: 30px 20px;
                }
                
                .exit-content h2 {
                    font-size: 1.5rem;
                }
                
                .exit-discount {
                    font-size: 2rem;
                }
                
                .exit-code {
                    font-size: 1.4rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
