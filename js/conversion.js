/**
 * Conversion Boosters - Family Custom
 * Fonctionnalités pour augmenter les conversions
 */

const FCConversion = (function() {
    
    // Configuration
    const FREE_SHIPPING_THRESHOLD = 69;
    
    // =============================================
    // 1. BARRE LIVRAISON GRATUITE (DÉSACTIVÉE)
    // =============================================
    
    function initFreeShippingBar() {
        // Désactivé
        return;
    }
    
    function updateFreeShippingBar() {
        // Désactivé
        return;
    }
    
    // =============================================
    // 2. BADGES PAIEMENT SÉCURISÉ (DÉSACTIVÉ)
    // =============================================
    
    function initPaymentBadges() {
        // Désactivé
        return;
    }
    
    // =============================================
    // 3. NOTIFICATION PANIER ABANDONNÉ (Push-like)
    // =============================================
    
    let abandonedCartTimer = null;
    const ABANDONED_CART_DELAY = 30 * 60 * 1000; // 30 minutes
    
    function initAbandonedCartReminder() {
        // Vérifier si le navigateur supporte les notifications
        if (!('Notification' in window)) return;
        
        // Écouter les changements de panier
        window.addEventListener('cartUpdated', handleCartChange);
        
        // Vérifier au chargement s'il y a un panier abandonné
        checkAbandonedCart();
    }
    
    function handleCartChange(e) {
        const cart = e.detail || [];
        
        // Annuler le timer existant
        if (abandonedCartTimer) {
            clearTimeout(abandonedCartTimer);
            abandonedCartTimer = null;
        }
        
        // Si le panier n'est pas vide, démarrer un nouveau timer
        if (cart.length > 0) {
            // Sauvegarder le timestamp
            localStorage.setItem('fc_cart_timestamp', Date.now().toString());
            
            // Timer pour notification
            abandonedCartTimer = setTimeout(() => {
                showAbandonedCartNotification();
            }, ABANDONED_CART_DELAY);
        } else {
            localStorage.removeItem('fc_cart_timestamp');
        }
    }
    
    function checkAbandonedCart() {
        const cart = window.FCCart ? window.FCCart.getCart() : [];
        const timestamp = localStorage.getItem('fc_cart_timestamp');
        
        if (cart.length > 0 && timestamp) {
            const elapsed = Date.now() - parseInt(timestamp);
            
            // Si plus de 30 min depuis la dernière modification
            if (elapsed > ABANDONED_CART_DELAY) {
                // Afficher un reminder discret
                showAbandonedCartBanner();
            }
        }
    }
    
    function showAbandonedCartNotification() {
        // Demander la permission si pas encore accordée
        if (Notification.permission === 'granted') {
            sendNotification();
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    sendNotification();
                }
            });
        }
    }
    
    function sendNotification() {
        const cart = window.FCCart ? window.FCCart.getCart() : [];
        if (cart.length === 0) return;
        
        const total = window.FCCart.getCartTotal();
        
        const notification = new Notification('Votre panier vous attend ! 🛒', {
            body: `${cart.length} article(s) pour ${total.toFixed(2)}€ - Finalisez votre commande !`,
            icon: '/images/logo-icon.png',
            badge: '/images/logo-icon.png',
            tag: 'abandoned-cart',
            requireInteraction: true
        });
        
        notification.onclick = function() {
            window.focus();
            window.location.href = 'panier.html';
            notification.close();
        };
    }
    
    function showAbandonedCartBanner() {
        // Ne pas afficher si déjà sur la page panier
        if (window.location.pathname.includes('panier.html')) return;
        if (window.location.pathname.includes('checkout.html')) return;
        
        // Vérifier si le banner existe déjà
        if (document.getElementById('abandoned-cart-banner')) return;
        
        const cart = window.FCCart ? window.FCCart.getCart() : [];
        if (cart.length === 0) return;
        
        const total = window.FCCart.getCartTotal();
        
        const banner = document.createElement('div');
        banner.id = 'abandoned-cart-banner';
        banner.className = 'abandoned-cart-banner';
        banner.innerHTML = `
            <div class="abandoned-cart-content">
                <div class="abandoned-cart-icon">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-pulse"></span>
                </div>
                <div class="abandoned-cart-text">
                    <strong>Votre panier vous attend !</strong>
                    <span>${cart.length} article(s) • ${total.toFixed(2)}€</span>
                </div>
                <a href="panier.html" class="abandoned-cart-btn">
                    Voir mon panier <i class="fas fa-arrow-right"></i>
                </a>
                <button class="abandoned-cart-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Animation d'entrée
        setTimeout(() => banner.classList.add('show'), 100);
        
        // Mettre à jour le timestamp pour ne pas re-afficher tout de suite
        localStorage.setItem('fc_cart_timestamp', Date.now().toString());
    }
    
    // =============================================
    // INIT
    // =============================================
    
    function init() {
        document.addEventListener('DOMContentLoaded', function() {
            initFreeShippingBar();
            initPaymentBadges();
            initAbandonedCartReminder();
            injectStyles();
        });
    }
    
    function injectStyles() {
        if (document.getElementById('fc-conversion-css')) return;
        
        const style = document.createElement('style');
        style.id = 'fc-conversion-css';
        style.textContent = `
            /* ========== FREE SHIPPING BAR ========== */
            .free-shipping-bar {
                background: linear-gradient(135deg, #1a1a2e, #2d2d44);
                color: #fff;
                padding: 10px 20px;
                text-align: center;
                font-size: 0.9rem;
                position: fixed;
                top: 80px; /* Sous le header */
                left: 0;
                right: 0;
                z-index: 999;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            }
            
            .free-shipping-bar.has-progress {
                padding-bottom: 15px;
            }
            
            .free-shipping-bar.free-shipping-unlocked {
                background: linear-gradient(135deg, #27ae60, #2ecc71);
            }
            
            .shipping-bar-content {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .shipping-bar-content i {
                font-size: 1.1rem;
            }
            
            .shipping-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: rgba(255,255,255,0.2);
            }
            
            .shipping-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #e07a5f, #c9a87c);
                transition: width 0.5s ease;
            }
            
            /* ========== PAYMENT BADGES ========== */
            .payment-badges {
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 12px;
                padding: 20px;
                margin-top: 20px;
                text-align: center;
            }
            
            .payment-badges-title {
                font-weight: 600;
                color: #27ae60;
                margin-bottom: 15px;
                font-size: 0.95rem;
            }
            
            .payment-badges-title i {
                margin-right: 8px;
            }
            
            .payment-icons {
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .payment-icon {
                font-size: 2.2rem;
                color: #555;
                transition: transform 0.2s, color 0.2s;
            }
            
            .payment-icon:hover {
                transform: scale(1.1);
            }
            
            .payment-icon .fa-cc-visa:hover { color: #1a1f71; }
            .payment-icon .fa-cc-mastercard:hover { color: #eb001b; }
            .payment-icon .fa-cc-paypal:hover { color: #003087; }
            .payment-icon .fa-cc-apple-pay:hover { color: #000; }
            
            .security-text {
                font-size: 0.8rem;
                color: #888;
            }
            
            .security-text i {
                color: #27ae60;
                margin-right: 5px;
            }
            
            /* ========== ABANDONED CART BANNER ========== */
            .abandoned-cart-banner {
                position: fixed;
                bottom: 20px;
                left: 20px;
                right: 20px;
                max-width: 500px;
                background: linear-gradient(135deg, #1a1a2e, #2d2d44);
                border-radius: 15px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 9999;
                transform: translateY(150%);
                transition: transform 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            }
            
            .abandoned-cart-banner.show {
                transform: translateY(0);
            }
            
            .abandoned-cart-content {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px 20px;
                color: #fff;
            }
            
            .abandoned-cart-icon {
                position: relative;
                font-size: 1.8rem;
                color: #e07a5f;
            }
            
            .cart-pulse {
                position: absolute;
                top: -5px;
                right: -5px;
                width: 12px;
                height: 12px;
                background: #e74c3c;
                border-radius: 50%;
                animation: pulse 1.5s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.3); opacity: 0.7; }
            }
            
            .abandoned-cart-text {
                flex: 1;
            }
            
            .abandoned-cart-text strong {
                display: block;
                margin-bottom: 3px;
            }
            
            .abandoned-cart-text span {
                font-size: 0.85rem;
                color: #aaa;
            }
            
            .abandoned-cart-btn {
                background: linear-gradient(135deg, #e07a5f, #c9a87c);
                color: #fff;
                padding: 10px 20px;
                border-radius: 25px;
                text-decoration: none;
                font-weight: 500;
                font-size: 0.9rem;
                white-space: nowrap;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .abandoned-cart-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(224, 122, 95, 0.4);
            }
            
            .abandoned-cart-btn i {
                margin-left: 5px;
            }
            
            .abandoned-cart-close {
                background: none;
                border: none;
                color: #666;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 5px;
                transition: color 0.2s;
            }
            
            .abandoned-cart-close:hover {
                color: #fff;
            }
            
            /* Mobile */
            @media (max-width: 600px) {
                .abandoned-cart-banner {
                    left: 10px;
                    right: 10px;
                    bottom: 10px;
                }
                
                .abandoned-cart-content {
                    flex-wrap: wrap;
                    justify-content: center;
                    text-align: center;
                }
                
                .abandoned-cart-text {
                    width: 100%;
                    order: 1;
                }
                
                .abandoned-cart-icon {
                    order: 0;
                }
                
                .abandoned-cart-btn {
                    order: 2;
                    margin-top: 10px;
                }
                
                .abandoned-cart-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                }
                
                .payment-icons {
                    gap: 10px;
                }
                
                .payment-icon {
                    font-size: 1.8rem;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto-init
    init();
    
    return {
        updateFreeShippingBar,
        showAbandonedCartBanner,
        FREE_SHIPPING_THRESHOLD
    };
    
})();

window.FCConversion = FCConversion;
