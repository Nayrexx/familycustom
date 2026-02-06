/* ============================================
   FAMILY CUSTOM - Cart Recommendations
   "Ils ont aussi commandé..."
   ============================================ */

(function() {
    'use strict';

    const FCCartRecommendations = {
        
        // Cache pour éviter de recharger les données
        ordersCache: null,
        productsCache: null,
        
        /**
         * Initialise les recommandations sur la page panier
         */
        async init() {
            console.log('[Recommendations] Init...');
            const container = document.getElementById('cart-recommendations');
            if (!container) {
                console.log('[Recommendations] Container not found');
                return;
            }
            
            const cart = window.FCCart ? window.FCCart.getCart() : [];
            console.log('[Recommendations] Cart items:', cart.length);
            
            if (cart.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.innerHTML = `
                <div class="cart-recommendations-inner">
                    <div class="recommendations-loading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Chargement des suggestions...</span>
                    </div>
                </div>
            `;
            container.style.display = 'block';
            
            try {
                const recommendations = await this.getRecommendations(cart);
                console.log('[Recommendations] Got products:', recommendations.length);
                this.render(container, recommendations);
            } catch (error) {
                console.error('[Recommendations] Erreur:', error);
                // En cas d'erreur, essayer le fallback simple
                try {
                    const fallback = await this.getSimpleFallback(cart);
                    this.render(container, fallback);
                } catch (e) {
                    container.style.display = 'none';
                }
            }
        },
        
        /**
         * Récupère les recommandations basées sur le panier actuel
         */
        async getRecommendations(cart) {
            const cartProductIds = cart.map(item => item.id);
            
            // Attendre Firebase
            let attempts = 0;
            while ((typeof firebase === 'undefined' || !firebase.firestore) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
            }
            
            if (typeof firebase === 'undefined' || !firebase.firestore) {
                console.error('[Recommendations] Firebase not available');
                throw new Error('Firebase not available');
            }
            
            const db = firebase.firestore();
            
            // 1. Récupérer les commandes passées qui contiennent au moins un des produits du panier
            const coProducts = await this.findCoProducts(db, cartProductIds);
            
            // 2. Filtrer les produits déjà dans le panier
            const filteredCoProducts = coProducts.filter(p => !cartProductIds.includes(p.productId));
            
            // 3. Trier par fréquence d'achat ensemble
            filteredCoProducts.sort((a, b) => b.count - a.count);
            
            // 4. Prendre les top 4
            const topProductIds = filteredCoProducts.slice(0, 4).map(p => p.productId);
            
            if (topProductIds.length === 0) {
                // Fallback: recommandations aléatoires de la même catégorie
                return await this.getFallbackRecommendations(db, cart, cartProductIds);
            }
            
            // 5. Récupérer les détails des produits
            const products = await this.getProductDetails(db, topProductIds);
            
            // Si pas assez de produits, compléter avec des produits aléatoires
            if (products.length < 4) {
                const fallback = await this.getFallbackRecommendations(db, cart, [...cartProductIds, ...topProductIds]);
                const needed = 4 - products.length;
                products.push(...fallback.slice(0, needed));
            }
            
            return products;
        },
        
        /**
         * Trouve les produits souvent achetés avec ceux du panier
         */
        async findCoProducts(db, cartProductIds) {
            const coProductsMap = new Map();
            
            try {
                // Récupérer les commandes récentes (derniers 3 mois)
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                
                const ordersSnapshot = await db.collection('orders')
                    .where('createdAt', '>=', threeMonthsAgo.toISOString())
                    .orderBy('createdAt', 'desc')
                    .limit(500)
                    .get();
                
                ordersSnapshot.forEach(doc => {
                    const order = doc.data();
                    if (!order.items || order.items.length < 2) return;
                    
                    const orderProductIds = order.items.map(item => item.id);
                    
                    // Vérifier si la commande contient un produit du panier
                    const hasCartProduct = cartProductIds.some(id => orderProductIds.includes(id));
                    
                    if (hasCartProduct) {
                        // Compter les autres produits de cette commande
                        orderProductIds.forEach(productId => {
                            if (!cartProductIds.includes(productId)) {
                                const current = coProductsMap.get(productId) || { productId, count: 0 };
                                current.count++;
                                coProductsMap.set(productId, current);
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('Erreur lors de la recherche des co-produits:', error);
            }
            
            return Array.from(coProductsMap.values());
        },
        
        /**
         * Recommandations de fallback (même catégorie ou populaires)
         */
        async getFallbackRecommendations(db, cart, excludeIds) {
            const products = [];
            
            try {
                // Récupérer les catégories des produits du panier
                const cartCategories = new Set();
                for (const item of cart) {
                    // Essayer de récupérer la catégorie du produit
                    const productDoc = await db.collection('products').doc(item.id).get();
                    if (productDoc.exists) {
                        const data = productDoc.data();
                        if (data.categoryId) cartCategories.add(data.categoryId);
                        if (data.categoryIds) data.categoryIds.forEach(c => cartCategories.add(c));
                    }
                }
                
                // Chercher des produits dans les mêmes catégories
                const categoryArray = Array.from(cartCategories);
                
                if (categoryArray.length > 0) {
                    const snapshot = await db.collection('products')
                        .where('categoryId', 'in', categoryArray.slice(0, 10))
                        .limit(20)
                        .get();
                    
                    snapshot.forEach(doc => {
                        if (!excludeIds.includes(doc.id) && products.length < 4) {
                            products.push({ id: doc.id, ...doc.data() });
                        }
                    });
                }
                
                // Si pas assez, prendre des produits populaires/récents
                if (products.length < 4) {
                    const allSnapshot = await db.collection('products')
                        .orderBy('updatedAt', 'desc')
                        .limit(20)
                        .get();
                    
                    allSnapshot.forEach(doc => {
                        if (!excludeIds.includes(doc.id) && !products.find(p => p.id === doc.id) && products.length < 4) {
                            products.push({ id: doc.id, ...doc.data() });
                        }
                    });
                }
            } catch (error) {
                console.error('Erreur fallback recommandations:', error);
            }
            
            return products;
        },
        
        /**
         * Récupère les détails des produits
         */
        async getProductDetails(db, productIds) {
            const products = [];
            
            for (const productId of productIds) {
                try {
                    const doc = await db.collection('products').doc(productId).get();
                    if (doc.exists) {
                        products.push({ id: doc.id, ...doc.data() });
                    }
                } catch (error) {
                    console.error(`Erreur produit ${productId}:`, error);
                }
            }
            
            return products;
        },
        
        /**
         * Affiche les recommandations
         */
        render(container, products) {
            if (!products || products.length === 0) {
                container.style.display = 'none';
                return;
            }
            
            container.innerHTML = `
                <div class="cart-recommendations-inner">
                    <h3 class="recommendations-title">
                        <i class="fas fa-lightbulb"></i>
                        <span>Ils ont aussi commandé</span>
                    </h3>
                    <div class="recommendations-grid">
                        ${products.map(product => this.renderProductCard(product)).join('')}
                    </div>
                </div>
            `;
            
            container.style.display = 'block';
            
            // Ajouter les event listeners pour les boutons
            container.querySelectorAll('.recommendation-quick-add').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.quickAddToCart(btn.dataset.productId);
                });
            });
            
            container.querySelectorAll('.recommendation-card').forEach(card => {
                card.addEventListener('click', () => {
                    window.location.href = `produit.html?id=${card.dataset.productId}`;
                });
            });
        },
        
        /**
         * Génère le HTML d'une carte produit
         */
        renderProductCard(product) {
            const hasPromo = product.originalPrice && product.originalPrice > product.price;
            
            return `
                <div class="recommendation-card" data-product-id="${product.id}">
                    <div class="recommendation-image">
                        ${product.image 
                            ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
                            : `<div class="placeholder-icon"><i class="fas fa-image"></i></div>`
                        }
                        ${product.badge ? `<span class="recommendation-badge">${product.badge}</span>` : ''}
                    </div>
                    <div class="recommendation-info">
                        <h4 class="recommendation-name">${product.name}</h4>
                        <div class="recommendation-price">
                            ${hasPromo 
                                ? `<span class="old-price">${parseFloat(product.originalPrice).toFixed(2)}€</span>` 
                                : ''}
                            <span class="current-price">${product.price ? parseFloat(product.price).toFixed(2) : '0.00'}€</span>
                        </div>
                    </div>
                    <button class="recommendation-quick-add" data-product-id="${product.id}" title="Voir le produit">
                        <i class="fas fa-eye"></i>
                        <span>Voir</span>
                    </button>
                </div>
            `;
        },
        
        /**
         * Redirige vers la page produit (car les produits peuvent avoir des options)
         */
        quickAddToCart(productId) {
            window.location.href = `produit.html?id=${productId}`;
        },
        
        /**
         * Fallback simple - récupère juste des produits aléatoires
         */
        async getSimpleFallback(cart) {
            const cartProductIds = cart.map(item => item.id);
            const products = [];
            
            try {
                const db = firebase.firestore();
                const snapshot = await db.collection('products').limit(20).get();
                
                snapshot.forEach(doc => {
                    if (!cartProductIds.includes(doc.id) && products.length < 4) {
                        products.push({ id: doc.id, ...doc.data() });
                    }
                });
            } catch (error) {
                console.error('[Recommendations] Simple fallback error:', error);
            }
            
            return products;
        }
    };
    
    // Initialiser quand le DOM est prêt
    document.addEventListener('DOMContentLoaded', () => {
        // Petit délai pour s'assurer que Firebase est chargé
        setTimeout(() => FCCartRecommendations.init(), 500);
    });
    
    // Re-init quand le panier change
    window.addEventListener('cartUpdated', () => {
        setTimeout(() => FCCartRecommendations.init(), 500);
    });
    
    // Exposer globalement
    window.FCCartRecommendations = FCCartRecommendations;
    
})();
