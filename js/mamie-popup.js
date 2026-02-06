/* ============================================
   POPUP FÊTE DES GRANDS-MÈRES
   Family Custom - Campagne Mars 2026
   ============================================ */

(function() {
    'use strict';

    const CONFIG = {
        showDelay: 5000, // Afficher après 5 secondes
        cookieName: 'fc_mamie_popup_closed',
        cookieDays: 3, // Ne plus afficher pendant 3 jours après fermeture
        endDate: new Date('2026-03-02T23:59:59') // Fin de la campagne
    };

    function hasSeenPopup() {
        return document.cookie.includes(CONFIG.cookieName + '=true');
    }

    function setPopupSeen() {
        const expires = new Date();
        expires.setDate(expires.getDate() + CONFIG.cookieDays);
        document.cookie = `${CONFIG.cookieName}=true; expires=${expires.toUTCString()}; path=/`;
    }

    function isCampaignActive() {
        return new Date() < CONFIG.endDate;
    }

    function createPopup() {
        // Ne pas afficher si déjà vu ou campagne terminée
        if (hasSeenPopup() || !isCampaignActive()) return;

        // Créer les styles
        const styles = document.createElement('style');
        styles.textContent = `
            .mamie-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                animation: mamiePopupFadeIn 0.4s ease forwards;
            }

            @keyframes mamiePopupFadeIn {
                to { opacity: 1; }
            }

            .mamie-popup {
                background: linear-gradient(135deg, #fff5f5, #fff);
                border-radius: 20px;
                padding: 2.5rem;
                max-width: 420px;
                width: 90%;
                text-align: center;
                position: relative;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
                transform: scale(0.8);
                animation: mamiePopupScale 0.4s ease forwards 0.1s;
            }

            @keyframes mamiePopupScale {
                to { transform: scale(1); }
            }

            .mamie-popup-close {
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #999;
                transition: color 0.2s;
            }

            .mamie-popup-close:hover {
                color: #333;
            }

            .mamie-popup-emoji {
                font-size: 4rem;
                margin-bottom: 1rem;
            }

            .mamie-popup h2 {
                font-family: 'Playfair Display', serif;
                font-size: 1.8rem;
                color: #1a1a2e;
                margin-bottom: 0.5rem;
            }

            .mamie-popup .subtitle {
                color: #e07a5f;
                font-size: 1.1rem;
                font-weight: 600;
                margin-bottom: 1rem;
            }

            .mamie-popup p {
                color: #555;
                line-height: 1.6;
                margin-bottom: 1.5rem;
            }

            .mamie-popup .promo-code-box {
                background: linear-gradient(135deg, #e07a5f, #c9a87c);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                font-size: 1.4rem;
                font-weight: 700;
                letter-spacing: 2px;
                margin-bottom: 1rem;
                display: inline-block;
            }

            .mamie-popup .discount-text {
                font-size: 0.9rem;
                color: #888;
                margin-bottom: 1.5rem;
            }

            .mamie-popup .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #1a1a2e, #2d2d3d);
                color: white;
                padding: 14px 32px;
                border-radius: 30px;
                text-decoration: none;
                font-weight: 600;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .mamie-popup .cta-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
            }

            .mamie-popup .countdown {
                margin-top: 1rem;
                font-size: 0.85rem;
                color: #e07a5f;
            }

            @media (max-width: 480px) {
                .mamie-popup {
                    padding: 2rem 1.5rem;
                }
                .mamie-popup h2 {
                    font-size: 1.5rem;
                }
                .mamie-popup-emoji {
                    font-size: 3rem;
                }
            }
        `;
        document.head.appendChild(styles);

        // Calculer les jours restants
        const daysLeft = Math.ceil((CONFIG.endDate - new Date()) / (1000 * 60 * 60 * 24));

        // Créer le popup
        const overlay = document.createElement('div');
        overlay.className = 'mamie-popup-overlay';
        overlay.innerHTML = `
            <div class="mamie-popup">
                <button class="mamie-popup-close" aria-label="Fermer">&times;</button>
                <div class="mamie-popup-emoji">👵🌷</div>
                <h2>Gâtez votre Mamie !</h2>
                <p class="subtitle">Fête des Grands-Mères - 1er Mars</p>
                <p>Offrez-lui un cadeau personnalisé qu'elle gardera précieusement. Utilisez le code :</p>
                <div class="promo-code-box">MAMIE15</div>
                <p class="discount-text">-15% sur tout le site</p>
                <a href="index.html#categories" class="cta-button">Découvrir nos idées cadeaux</a>
                <div class="countdown">⏰ Plus que ${daysLeft} jours pour commander !</div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Fermer le popup
        const closeBtn = overlay.querySelector('.mamie-popup-close');
        closeBtn.addEventListener('click', closePopup);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closePopup();
        });

        // Fermer avec le CTA aussi
        const ctaBtn = overlay.querySelector('.cta-button');
        ctaBtn.addEventListener('click', closePopup);

        function closePopup() {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
            setPopupSeen();
        }
    }

    // Initialiser après le chargement
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createPopup, CONFIG.showDelay);
        });
    } else {
        setTimeout(createPopup, CONFIG.showDelay);
    }

})();
