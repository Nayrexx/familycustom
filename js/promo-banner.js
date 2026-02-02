/* ============================================
   PROMO BANNER & POPUP - JavaScript
   Family Custom - Ouverture -20%
   ============================================ */

(function() {
    'use strict';
    
    const PROMO_CODE = 'BIENVENUE20';
    const PROMO_STORAGE_KEY = 'familycustom_promo_popup_shown';
    const BANNER_STORAGE_KEY = 'familycustom_promo_banner_closed';
    
    // ===== BANDEAU STICKY =====
    function initPromoBanner() {
        // Ne pas afficher si l'utilisateur l'a fermé récemment (24h)
        const bannerClosed = localStorage.getItem(BANNER_STORAGE_KEY);
        if (bannerClosed) {
            const closedTime = parseInt(bannerClosed);
            const now = Date.now();
            const hoursPassed = (now - closedTime) / (1000 * 60 * 60);
            if (hoursPassed < 24) {
                return; // Ne pas afficher pendant 24h
            }
        }
        
        // Créer le bandeau
        const banner = document.createElement('div');
        banner.className = 'promo-banner';
        banner.innerHTML = `
            <div class="promo-banner-content">
                <span class="promo-icon">🎉</span>
                <span class="promo-text">
                    <strong>OUVERTURE</strong> : -20% sur tout le site avec le code
                    <span class="promo-code" onclick="copyPromoCode(this, '${PROMO_CODE}')" title="Cliquer pour copier">
                        ${PROMO_CODE}
                    </span>
                </span>
                <span class="promo-icon">🎁</span>
            </div>
            <button class="promo-banner-close" onclick="closePromoBanner()" aria-label="Fermer">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.insertBefore(banner, document.body.firstChild);
        document.body.classList.add('has-promo-banner');
    }
    
    // Fermer le bandeau
    window.closePromoBanner = function() {
        const banner = document.querySelector('.promo-banner');
        if (banner) {
            banner.style.transform = 'translateY(-100%)';
            banner.style.opacity = '0';
            setTimeout(() => {
                banner.remove();
                document.body.classList.remove('has-promo-banner');
            }, 300);
            localStorage.setItem(BANNER_STORAGE_KEY, Date.now().toString());
        }
    };
    
    // ===== POP-UP PROMO =====
    function initPromoPopup() {
        // Ne pas afficher si déjà vu
        if (localStorage.getItem(PROMO_STORAGE_KEY)) {
            return;
        }
        
        // Attendre 2 secondes avant d'afficher le popup
        setTimeout(() => {
            showPromoPopup();
        }, 2000);
    }
    
    function showPromoPopup() {
        const overlay = document.createElement('div');
        overlay.className = 'promo-popup-overlay';
        overlay.innerHTML = `
            <div class="promo-popup">
                <button class="promo-popup-close" onclick="closePromoPopup()" aria-label="Fermer">
                    <i class="fas fa-times"></i>
                </button>
                
                <div class="promo-popup-header">
                    <div class="promo-popup-badge">-20%</div>
                    <h2 class="promo-popup-title">🎉 Bienvenue chez Family Custom !</h2>
                </div>
                
                <div class="promo-popup-body">
                    <p class="promo-popup-message">
                        Pour fêter notre ouverture, profitez de <strong>-20% sur toute votre commande</strong> !
                        <br>Créations personnalisées avec amour ❤️
                    </p>
                    
                    <div class="promo-popup-code-container">
                        <p class="promo-popup-code-label">Votre code promo exclusif</p>
                        <div class="promo-popup-code" onclick="copyPromoCode(this, '${PROMO_CODE}')" title="Cliquer pour copier">
                            <span>${PROMO_CODE}</span>
                            <i class="fas fa-copy"></i>
                        </div>
                    </div>
                    
                    <button class="promo-popup-cta" onclick="closePromoPopup()">
                        <i class="fas fa-shopping-bag"></i> J'en profite !
                    </button>
                </div>
                
                <div class="promo-popup-footer">
                    <p class="promo-popup-timer">
                        <i class="fas fa-clock"></i> Offre de lancement - Durée limitée
                    </p>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Afficher avec animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });
        
        // Fermer si clic en dehors
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePromoPopup();
            }
        });
        
        // Marquer comme vu
        localStorage.setItem(PROMO_STORAGE_KEY, 'true');
    }
    
    // Fermer le popup
    window.closePromoPopup = function() {
        const overlay = document.querySelector('.promo-popup-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    };
    
    // ===== COPIER LE CODE PROMO =====
    window.copyPromoCode = function(element, code) {
        navigator.clipboard.writeText(code).then(() => {
            // Ajouter classe copied
            element.classList.add('copied');
            
            // Changer le texte temporairement
            const originalText = element.innerHTML;
            if (element.classList.contains('promo-code')) {
                element.textContent = '✓ Copié !';
            } else {
                element.innerHTML = '<span>✓ Copié !</span><i class="fas fa-check"></i>';
            }
            
            // Réinitialiser après 2 secondes
            setTimeout(() => {
                element.classList.remove('copied');
                if (element.classList.contains('promo-code')) {
                    element.textContent = code;
                } else {
                    element.innerHTML = `<span>${code}</span><i class="fas fa-copy"></i>`;
                }
            }, 2000);
        }).catch(err => {
            console.error('Erreur copie:', err);
            // Fallback: sélectionner le texte
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        });
    };
    
    // ===== INITIALISATION =====
    function init() {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initPromoBanner();
                initPromoPopup();
            });
        } else {
            initPromoBanner();
            initPromoPopup();
        }
    }
    
    init();
})();
