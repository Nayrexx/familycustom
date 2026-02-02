/**
 * Animations - Family Custom
 * Animation panier "fly to cart" + Confettis succès
 */

const FCAnimations = (function() {
    
    /**
     * Animation "Fly to Cart" - Le produit vole vers l'icône panier
     * @param {HTMLElement} sourceElement - L'élément source (image produit ou bouton)
     * @param {string} imageUrl - URL de l'image du produit (optionnel)
     */
    function flyToCart(sourceElement, imageUrl = null) {
        const cartIcon = document.querySelector('.cart-link') || document.querySelector('.cart-badge');
        if (!cartIcon) return;
        
        // Récupérer les positions
        const sourceRect = sourceElement.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        // Créer l'élément volant
        const flyingEl = document.createElement('div');
        flyingEl.className = 'flying-item';
        
        if (imageUrl) {
            flyingEl.innerHTML = `<img src="${imageUrl}" alt="">`;
        } else {
            flyingEl.innerHTML = '<i class="fas fa-shopping-bag"></i>';
        }
        
        // Positionner au départ
        flyingEl.style.cssText = `
            position: fixed;
            z-index: 10000;
            left: ${sourceRect.left + sourceRect.width / 2}px;
            top: ${sourceRect.top + sourceRect.height / 2}px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            overflow: hidden;
            pointer-events: none;
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        `;
        
        if (imageUrl) {
            flyingEl.querySelector('img').style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        } else {
            flyingEl.style.cssText += `
                background: linear-gradient(135deg, #e07a5f, #c9a87c);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.5rem;
            `;
        }
        
        document.body.appendChild(flyingEl);
        
        // Animation vers le panier
        requestAnimationFrame(() => {
            flyingEl.style.left = `${cartRect.left + cartRect.width / 2}px`;
            flyingEl.style.top = `${cartRect.top + cartRect.height / 2}px`;
            flyingEl.style.width = '20px';
            flyingEl.style.height = '20px';
            flyingEl.style.opacity = '0.5';
        });
        
        // Animation du panier
        setTimeout(() => {
            cartIcon.classList.add('cart-bounce');
            setTimeout(() => cartIcon.classList.remove('cart-bounce'), 500);
            flyingEl.remove();
        }, 800);
    }
    
    /**
     * Confettis de succès
     * @param {number} duration - Durée en ms (défaut 3000)
     */
    function confetti(duration = 3000) {
        const colors = ['#e07a5f', '#c9a87c', '#27ae60', '#3498db', '#9b59b6', '#f39c12', '#e74c3c'];
        const confettiCount = 150;
        const container = document.createElement('div');
        container.className = 'confetti-container';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 99999;
            overflow: hidden;
        `;
        document.body.appendChild(container);
        
        for (let i = 0; i < confettiCount; i++) {
            createConfettiPiece(container, colors);
        }
        
        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.5s';
            setTimeout(() => container.remove(), 500);
        }, duration);
    }
    
    function createConfettiPiece(container, colors) {
        const piece = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 10 + 5;
        const startX = Math.random() * 100;
        const rotation = Math.random() * 360;
        const duration = Math.random() * 2 + 2;
        const delay = Math.random() * 0.5;
        
        // Formes variées
        const shapes = ['square', 'circle', 'triangle'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        
        let shapeStyle = '';
        if (shape === 'circle') {
            shapeStyle = 'border-radius: 50%;';
        } else if (shape === 'triangle') {
            shapeStyle = `
                width: 0 !important;
                height: 0 !important;
                border-left: ${size/2}px solid transparent;
                border-right: ${size/2}px solid transparent;
                border-bottom: ${size}px solid ${color};
                background: transparent !important;
            `;
        }
        
        piece.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            left: ${startX}%;
            top: -20px;
            transform: rotate(${rotation}deg);
            animation: confetti-fall ${duration}s ease-out ${delay}s forwards;
            ${shapeStyle}
        `;
        
        container.appendChild(piece);
    }
    
    /**
     * Animation de succès pour la page de confirmation
     */
    function successAnimation() {
        // Confettis
        confetti(4000);
        
        // Animation du checkmark si présent
        const successIcon = document.querySelector('.success-icon, .order-success i');
        if (successIcon) {
            successIcon.classList.add('success-pop');
        }
    }
    
    /**
     * Shake animation (pour erreurs)
     */
    function shake(element) {
        element.classList.add('shake-animation');
        setTimeout(() => element.classList.remove('shake-animation'), 500);
    }
    
    /**
     * Pulse animation
     */
    function pulse(element) {
        element.classList.add('pulse-animation');
        setTimeout(() => element.classList.remove('pulse-animation'), 1000);
    }
    
    // Injecter les styles CSS
    function injectStyles() {
        if (document.getElementById('fc-animations-css')) return;
        
        const style = document.createElement('style');
        style.id = 'fc-animations-css';
        style.textContent = `
            /* Flying item */
            .flying-item {
                transform: translate(-50%, -50%);
            }
            
            /* Cart bounce */
            .cart-bounce {
                animation: cartBounce 0.5s ease;
            }
            
            @keyframes cartBounce {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.3); }
                50% { transform: scale(0.9); }
                75% { transform: scale(1.1); }
            }
            
            /* Confetti fall */
            @keyframes confetti-fall {
                0% {
                    top: -20px;
                    opacity: 1;
                }
                100% {
                    top: 100vh;
                    opacity: 0;
                    transform: rotate(720deg) translateX(100px);
                }
            }
            
            /* Success pop */
            .success-pop {
                animation: successPop 0.6s ease;
            }
            
            @keyframes successPop {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); opacity: 1; }
            }
            
            /* Shake */
            .shake-animation {
                animation: shake 0.5s ease;
            }
            
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                20% { transform: translateX(-10px); }
                40% { transform: translateX(10px); }
                60% { transform: translateX(-10px); }
                80% { transform: translateX(10px); }
            }
            
            /* Pulse */
            .pulse-animation {
                animation: pulse 1s ease;
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Auto-init
    document.addEventListener('DOMContentLoaded', injectStyles);
    
    return {
        flyToCart,
        confetti,
        successAnimation,
        shake,
        pulse
    };
    
})();

window.FCAnimations = FCAnimations;
