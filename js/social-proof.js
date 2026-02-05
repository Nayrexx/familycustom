/* ============================================
   FAMILY CUSTOM - Social Proof & Conversion Boosters
   - Viewers count (🔥 X personnes regardent ce produit)
   - Free shipping progress bar
   - Product reviews display
   - Bundle/Pack system
   ============================================ */

const FCSocialProof = (function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        FREE_SHIPPING_THRESHOLD: 69,
        MIN_VIEWERS: 2,
        MAX_VIEWERS: 7,
        VIEWER_UPDATE_INTERVAL: 20000, // 20 secondes
        REVIEWS_PER_PAGE: 5,
        VIEWER_SHOW_PROBABILITY: 0.4 // 40% de chance d'afficher le compteur
    };
    
    // =============================================
    // 1. VIEWERS COUNT - "🔥 X personnes regardent"
    // =============================================
    
    let currentViewers = 0;
    let viewerInterval = null;
    
    function initViewersCount() {
        // Chercher sur la page de personnalisation ou page produit
        const container = document.querySelector('.personnaliser-page, .customization-section, .product-detail, .product-page, [data-product-id]');
        if (!container) return;
        
        // Ne pas afficher sur tous les produits (40% de chance)
        if (Math.random() > CONFIG.VIEWER_SHOW_PROBABILITY) return;
        
        // Générer un nombre initial réaliste (2-7 personnes)
        const hour = new Date().getHours();
        const timeMultiplier = (hour >= 18 && hour <= 22) ? 1.3 : 1;
        currentViewers = Math.floor((Math.random() * (CONFIG.MAX_VIEWERS - CONFIG.MIN_VIEWERS) + CONFIG.MIN_VIEWERS) * timeMultiplier);
        
        createViewersWidget();
        startViewersAnimation();
    }
    
    function createViewersWidget() {
        // Chercher où insérer (après le titre du produit pour plus de discrétion)
        const insertPoint = document.querySelector('.product-header-row, .product-description');
        if (!insertPoint) return;
        
        // Vérifier si déjà créé
        if (document.querySelector('.viewers-widget')) return;
        
        const widget = document.createElement('div');
        widget.className = 'viewers-widget';
        widget.innerHTML = `
            <span class="viewers-fire">🔥</span>
            <span class="viewers-count">${currentViewers}</span>
            <span class="viewers-text">personnes regardent</span>
            <span class="viewers-pulse"></span>
        `;
        
        insertPoint.parentNode.insertBefore(widget, insertPoint.nextSibling);
    }
    
    function startViewersAnimation() {
        viewerInterval = setInterval(() => {
            // Variation aléatoire de -2 à +3
            const change = Math.floor(Math.random() * 6) - 2;
            currentViewers = Math.max(CONFIG.MIN_VIEWERS, Math.min(CONFIG.MAX_VIEWERS * 1.5, currentViewers + change));
            
            const countEl = document.querySelector('.viewers-count');
            if (countEl) {
                countEl.classList.add('updating');
                setTimeout(() => {
                    countEl.textContent = Math.round(currentViewers);
                    countEl.classList.remove('updating');
                }, 150);
            }
        }, CONFIG.VIEWER_UPDATE_INTERVAL);
    }
    
    // =============================================
    // 2. BARRE DE PROGRESSION LIVRAISON GRATUITE
    // =============================================
    
    function initFreeShippingBar() {
        // Uniquement sur la page panier
        if (!window.location.pathname.includes('panier')) return;
        
        // Créer la barre
        createShippingBar();
        
        // Mettre à jour au chargement et à chaque modification du panier
        updateShippingBar();
        window.addEventListener('cartUpdated', updateShippingBar);
    }
    
    function createShippingBar() {
        const cartTitle = document.querySelector('.cart-title');
        if (!cartTitle) return;
        
        // Vérifier si déjà créé
        if (document.querySelector('.shipping-progress-bar')) return;
        
        const bar = document.createElement('div');
        bar.className = 'shipping-progress-container';
        bar.innerHTML = `
            <div class="shipping-progress-bar">
                <div class="shipping-progress-fill"></div>
                <div class="shipping-progress-truck">🚚</div>
            </div>
            <div class="shipping-progress-text">
                <span class="shipping-message"></span>
            </div>
            <div class="shipping-progress-markers">
                <span class="marker-start">0€</span>
                <span class="marker-end">${CONFIG.FREE_SHIPPING_THRESHOLD}€</span>
            </div>
        `;
        
        cartTitle.parentNode.insertBefore(bar, cartTitle.nextSibling);
    }
    
    function updateShippingBar() {
        const fill = document.querySelector('.shipping-progress-fill');
        const truck = document.querySelector('.shipping-progress-truck');
        const message = document.querySelector('.shipping-message');
        
        if (!fill || !message) return;
        
        const cart = window.FCCart ? window.FCCart.getCart() : [];
        const subtotal = window.FCCart ? window.FCCart.getCartTotal() : 0;
        
        if (cart.length === 0) {
            fill.style.width = '0%';
            truck.style.left = '0%';
            message.innerHTML = `Ajoutez <strong>${CONFIG.FREE_SHIPPING_THRESHOLD}€</strong> pour la livraison gratuite`;
            return;
        }
        
        const remaining = CONFIG.FREE_SHIPPING_THRESHOLD - subtotal;
        const percentage = Math.min(100, (subtotal / CONFIG.FREE_SHIPPING_THRESHOLD) * 100);
        
        fill.style.width = percentage + '%';
        truck.style.left = percentage + '%';
        
        if (remaining <= 0) {
            message.innerHTML = `<span class="shipping-success">🎉 Félicitations ! Livraison <strong>GRATUITE</strong></span>`;
            fill.classList.add('complete');
            truck.classList.add('celebrating');
        } else {
            message.innerHTML = `Plus que <strong>${remaining.toFixed(2)}€</strong> pour la livraison gratuite !`;
            fill.classList.remove('complete');
            truck.classList.remove('celebrating');
        }
    }
    
    // =============================================
    // 3. SYSTÈME D'AVIS PRODUITS
    // =============================================
    
    // Avis par défaut (peuvent être remplacés par Firebase)
    const defaultReviews = [
        {
            id: 1,
            author: "Marie L.",
            rating: 5,
            date: "2025-12-15",
            text: "Magnifique ! Mon néon personnalisé est parfait. La qualité est au rendez-vous et le service client très réactif.",
            photo: null,
            verified: true
        },
        {
            id: 2,
            author: "Thomas D.",
            rating: 5,
            date: "2025-11-28",
            text: "Super cadeau pour ma femme, elle a adoré ! L'emballage était soigné.",
            photo: null,
            verified: true
        },
        {
            id: 3,
            author: "Sophie M.",
            rating: 4,
            date: "2025-11-10",
            text: "Très joli rendu, conforme aux photos. Juste un petit délai de livraison un peu long mais ça valait le coup d'attendre.",
            photo: null,
            verified: true
        },
        {
            id: 4,
            author: "Laurent P.",
            rating: 5,
            date: "2025-10-22",
            text: "Deuxième commande chez Family Custom, toujours aussi satisfait ! Le bois gravé est magnifique.",
            photo: null,
            verified: true
        },
        {
            id: 5,
            author: "Emma R.",
            rating: 5,
            date: "2025-10-05",
            text: "Cadeau personnalisé pour mon frère, il était ravi ! Je recommande vivement.",
            photo: null,
            verified: true
        }
    ];
    
    function initReviewsSystem() {
        // Afficher le badge global d'avis
        displayGlobalRatingBadge();
        
        // Sur page produit, afficher les avis détaillés
        const productContainer = document.querySelector('.product-detail, .product-page');
        if (productContainer) {
            displayProductReviews(productContainer);
        }
    }
    
    function displayGlobalRatingBadge() {
        // Ajouter badge sur les cartes produits
        const productCards = document.querySelectorAll('.product-card, .category-card');
        
        productCards.forEach(card => {
            if (card.querySelector('.product-rating-badge')) return;
            
            const badge = document.createElement('div');
            badge.className = 'product-rating-badge';
            
            // Générer une note aléatoire entre 4.5 et 5.0
            const rating = (4.5 + Math.random() * 0.5).toFixed(1);
            const reviewCount = Math.floor(150 + Math.random() * 150);
            
            badge.innerHTML = `
                <span class="rating-stars">⭐⭐⭐⭐⭐</span>
                <span class="rating-value">${rating}/5</span>
                <span class="rating-count">(${reviewCount} avis)</span>
            `;
            
            card.appendChild(badge);
        });
    }
    
    function displayProductReviews(container) {
        // Créer la section avis
        const reviewsSection = document.createElement('div');
        reviewsSection.className = 'product-reviews-section';
        
        // Calculer les stats
        const avgRating = calculateAverageRating(defaultReviews);
        const totalReviews = 234; // Nombre affiché
        
        reviewsSection.innerHTML = `
            <div class="reviews-header">
                <h3>Avis clients</h3>
                <div class="reviews-summary">
                    <div class="reviews-score">
                        <span class="score-stars">⭐⭐⭐⭐⭐</span>
                        <span class="score-value">${avgRating}/5</span>
                    </div>
                    <span class="reviews-count">${totalReviews} avis vérifiés</span>
                </div>
            </div>
            
            <div class="reviews-breakdown">
                ${generateRatingBreakdown()}
            </div>
            
            <div class="customer-photos">
                <h4>📸 Photos de nos clients</h4>
                <div class="photos-grid">
                    <div class="customer-photo-item" style="background: linear-gradient(135deg, #e07a5f20, #c9a87c20);">
                        <span class="photo-placeholder">🖼️</span>
                    </div>
                    <div class="customer-photo-item" style="background: linear-gradient(135deg, #c9a87c20, #e07a5f20);">
                        <span class="photo-placeholder">🖼️</span>
                    </div>
                    <div class="customer-photo-item" style="background: linear-gradient(135deg, #e07a5f20, #c9a87c20);">
                        <span class="photo-placeholder">🖼️</span>
                    </div>
                    <div class="customer-photo-item more-photos">
                        <span>+28</span>
                    </div>
                </div>
            </div>
            
            <div class="reviews-list">
                ${defaultReviews.map(review => renderReview(review)).join('')}
            </div>
            
            <button class="load-more-reviews">Voir plus d'avis</button>
        `;
        
        container.appendChild(reviewsSection);
    }
    
    function calculateAverageRating(reviews) {
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    }
    
    function generateRatingBreakdown() {
        const breakdown = [
            { stars: 5, percentage: 78 },
            { stars: 4, percentage: 15 },
            { stars: 3, percentage: 5 },
            { stars: 2, percentage: 1 },
            { stars: 1, percentage: 1 }
        ];
        
        return breakdown.map(item => `
            <div class="breakdown-row">
                <span class="breakdown-stars">${item.stars} ⭐</span>
                <div class="breakdown-bar">
                    <div class="breakdown-fill" style="width: ${item.percentage}%"></div>
                </div>
                <span class="breakdown-percent">${item.percentage}%</span>
            </div>
        `).join('');
    }
    
    function renderReview(review) {
        const starsHtml = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const date = new Date(review.date).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        
        return `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-author">
                        <span class="author-avatar">${review.author.charAt(0)}</span>
                        <div class="author-info">
                            <span class="author-name">${review.author}</span>
                            ${review.verified ? '<span class="verified-badge">✓ Achat vérifié</span>' : ''}
                        </div>
                    </div>
                    <div class="review-meta">
                        <span class="review-stars">${starsHtml}</span>
                        <span class="review-date">${date}</span>
                    </div>
                </div>
                <p class="review-text">${review.text}</p>
                ${review.photo ? `<img src="${review.photo}" alt="Photo client" class="review-photo">` : ''}
            </div>
        `;
    }
    
    // =============================================
    // 4. SYSTÈME BUNDLE / PACK
    // =============================================
    
    const bundles = [
        {
            id: 'bundle-neon-duo',
            name: 'Pack Duo Néons',
            description: '2 néons personnalisés au choix',
            products: ['neon-custom-1', 'neon-custom-2'],
            originalPrice: 118,
            bundlePrice: 99,
            savings: 19,
            image: 'images/bundle-neon.jpg'
        },
        {
            id: 'bundle-family',
            name: 'Pack Famille',
            description: 'Néon + Planche bois gravée',
            products: ['neon-custom', 'planche-bois'],
            originalPrice: 89,
            bundlePrice: 75,
            savings: 14,
            image: 'images/bundle-family.jpg'
        }
    ];
    
    function initBundleSystem() {
        // Afficher les bundles sur la page d'accueil
        const bundleContainer = document.querySelector('.bundles-container');
        if (bundleContainer) {
            displayBundles(bundleContainer);
        }
        
        // Sur page panier, suggérer des bundles
        if (window.location.pathname.includes('panier')) {
            suggestBundles();
        }
    }
    
    function displayBundles(container) {
        container.innerHTML = `
            <div class="bundles-grid">
                ${bundles.map(bundle => renderBundle(bundle)).join('')}
            </div>
        `;
    }
    
    function renderBundle(bundle) {
        const savingsPercent = Math.round((bundle.savings / bundle.originalPrice) * 100);
        
        return `
            <div class="bundle-card" data-bundle-id="${bundle.id}">
                <div class="bundle-badge">-${savingsPercent}%</div>
                <div class="bundle-image">
                    <div class="bundle-placeholder">🎁</div>
                </div>
                <div class="bundle-info">
                    <h3 class="bundle-name">${bundle.name}</h3>
                    <p class="bundle-desc">${bundle.description}</p>
                    <div class="bundle-pricing">
                        <span class="bundle-original">${bundle.originalPrice}€</span>
                        <span class="bundle-price">${bundle.bundlePrice}€</span>
                    </div>
                    <span class="bundle-savings">Économisez ${bundle.savings}€</span>
                    <button class="bundle-add-btn" onclick="FCSocialProof.addBundle('${bundle.id}')">
                        <i class="fas fa-cart-plus"></i> Ajouter le pack
                    </button>
                </div>
            </div>
        `;
    }
    
    function suggestBundles() {
        const cart = window.FCCart ? window.FCCart.getCart() : [];
        if (cart.length === 0) return;
        
        // Trouver un bundle pertinent basé sur le panier
        const suggestedBundle = bundles[0]; // Simplification - suggérer le premier bundle
        
        const recommendations = document.querySelector('#cart-recommendations');
        if (!recommendations) return;
        
        recommendations.innerHTML = `
            <div class="bundle-suggestion">
                <h3>💡 Suggestion</h3>
                <div class="suggested-bundle">
                    <div class="suggested-bundle-info">
                        <span class="suggestion-tag">Économisez ${suggestedBundle.savings}€</span>
                        <h4>${suggestedBundle.name}</h4>
                        <p>${suggestedBundle.description}</p>
                        <div class="suggested-pricing">
                            <span class="original">${suggestedBundle.originalPrice}€</span>
                            <span class="price">${suggestedBundle.bundlePrice}€</span>
                        </div>
                    </div>
                    <button class="btn-add-bundle" onclick="FCSocialProof.addBundle('${suggestedBundle.id}')">
                        Passer au pack
                    </button>
                </div>
            </div>
        `;
    }
    
    function addBundle(bundleId) {
        const bundle = bundles.find(b => b.id === bundleId);
        if (!bundle || !window.FCCart) return;
        
        // Ajouter le bundle comme un produit spécial
        window.FCCart.addToCart({
            id: bundle.id,
            name: bundle.name,
            price: bundle.bundlePrice + '€',
            image: bundle.image,
            isBundle: true
        });
        
        // Notification
        showBundleNotification(bundle);
    }
    
    function showBundleNotification(bundle) {
        const notification = document.createElement('div');
        notification.className = 'bundle-notification';
        notification.innerHTML = `
            <div class="bundle-notif-content">
                <span class="bundle-notif-icon">🎁</span>
                <div>
                    <strong>${bundle.name}</strong> ajouté !
                    <span class="savings-highlight">Vous économisez ${bundle.savings}€</span>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // =============================================
    // INITIALISATION
    // =============================================
    
    function init() {
        document.addEventListener('DOMContentLoaded', () => {
            initViewersCount();
            initFreeShippingBar();
            // initReviewsSystem(); // Désactivé temporairement - pas d'avis pour l'instant
            // initBundleSystem(); // Désactivé - section packs retirée
        });
    }
    
    init();
    
    // API Publique
    return {
        addBundle,
        updateShippingBar,
        CONFIG
    };
    
})();

// Export global
window.FCSocialProof = FCSocialProof;
