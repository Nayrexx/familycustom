/**
 * Wishlist / Favoris - Family Custom
 * Gestion de la liste de souhaits
 */

const FCWishlist = (function() {
    const STORAGE_KEY = 'fc_wishlist';
    
    function getWishlist() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }
    
    function saveWishlist(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        updateBadges();
        window.dispatchEvent(new Event('wishlistUpdated'));
    }
    
    /**
     * Ajoute un produit aux favoris
     */
    function add(product) {
        if (!product || !product.id) return false;
        
        let wishlist = getWishlist();
        
        // Vérifier si déjà présent
        if (wishlist.some(p => p.id === product.id)) {
            return false;
        }
        
        wishlist.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || product.images?.[0] || '',
            category: product.category || product.categoryId,
            addedAt: Date.now()
        });
        
        saveWishlist(wishlist);
        showNotification('Ajouté aux favoris ❤️');
        
        // Sync avec Firebase si connecté
        syncWithFirebase();
        
        return true;
    }
    
    /**
     * Retire un produit des favoris
     */
    function remove(productId) {
        let wishlist = getWishlist();
        const initialLength = wishlist.length;
        
        wishlist = wishlist.filter(p => p.id !== productId);
        
        if (wishlist.length < initialLength) {
            saveWishlist(wishlist);
            showNotification('Retiré des favoris');
            syncWithFirebase();
            return true;
        }
        
        return false;
    }
    
    /**
     * Toggle favori
     */
    function toggle(product) {
        if (isInWishlist(product.id)) {
            return remove(product.id);
        } else {
            return add(product);
        }
    }
    
    /**
     * Vérifie si un produit est dans les favoris
     */
    function isInWishlist(productId) {
        return getWishlist().some(p => p.id === productId);
    }
    
    /**
     * Récupère tous les favoris
     */
    function getAll() {
        return getWishlist();
    }
    
    /**
     * Nombre de favoris
     */
    function count() {
        return getWishlist().length;
    }
    
    /**
     * Vide la wishlist
     */
    function clear() {
        saveWishlist([]);
        syncWithFirebase();
    }
    
    /**
     * Met à jour les badges de favoris
     */
    function updateBadges() {
        const badges = document.querySelectorAll('.wishlist-badge');
        const c = count();
        
        badges.forEach(badge => {
            badge.textContent = c;
            badge.style.display = c > 0 ? 'flex' : 'none';
        });
        
        // Mettre à jour les icônes coeur
        document.querySelectorAll('[data-wishlist-btn]').forEach(btn => {
            const productId = btn.dataset.productId;
            if (productId) {
                btn.classList.toggle('active', isInWishlist(productId));
            }
        });
    }
    
    /**
     * Affiche une notification
     */
    function showNotification(message) {
        // Créer notification toast
        const toast = document.createElement('div');
        toast.className = 'wishlist-toast';
        toast.innerHTML = `<i class="fas fa-heart"></i> ${message}`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    /**
     * Sync avec Firebase si utilisateur connecté
     */
    async function syncWithFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        try {
            await firebase.firestore().collection('customers').doc(user.uid).update({
                wishlist: getWishlist(),
                wishlistUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) {
            console.log('Wishlist sync skipped:', e.message);
        }
    }
    
    /**
     * Charge la wishlist depuis Firebase
     */
    async function loadFromFirebase() {
        if (typeof firebase === 'undefined' || !firebase.auth) return;
        
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        try {
            const doc = await firebase.firestore().collection('customers').doc(user.uid).get();
            if (doc.exists && doc.data().wishlist) {
                const remoteWishlist = doc.data().wishlist;
                const localWishlist = getWishlist();
                
                // Fusionner les deux listes
                const merged = [...localWishlist];
                remoteWishlist.forEach(item => {
                    if (!merged.some(p => p.id === item.id)) {
                        merged.push(item);
                    }
                });
                
                saveWishlist(merged);
            }
        } catch (e) {
            console.log('Wishlist load skipped:', e.message);
        }
    }
    
    /**
     * Crée un bouton favori pour un produit
     */
    function createButton(productId, productData = null) {
        const isActive = isInWishlist(productId);
        return `
            <button class="wishlist-btn ${isActive ? 'active' : ''}" 
                    data-wishlist-btn 
                    data-product-id="${productId}"
                    onclick="FCWishlist.handleClick(event, '${productId}')"
                    title="${isActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                <i class="fas fa-heart"></i>
            </button>
        `;
    }
    
    /**
     * Gère le clic sur un bouton favori
     */
    function handleClick(event, productId) {
        event.preventDefault();
        event.stopPropagation();
        
        const btn = event.currentTarget;
        
        // Récupérer les données du produit depuis le DOM ou un cache
        let productData = null;
        
        // Essayer de récupérer depuis les données en cache
        if (window.FCProductsCache && window.FCProductsCache[productId]) {
            productData = window.FCProductsCache[productId];
        } else {
            // Créer des données minimales
            const card = btn.closest('.product-card, .rv-item, .category-card');
            if (card) {
                productData = {
                    id: productId,
                    name: card.querySelector('h3, .rv-name, .product-name')?.textContent || 'Produit',
                    price: card.querySelector('.product-price, .rv-price')?.textContent || '',
                    image: card.querySelector('img')?.src || ''
                };
            } else {
                productData = { id: productId, name: 'Produit', price: '', image: '' };
            }
        }
        
        toggle(productData);
        btn.classList.toggle('active');
    }
    
    /**
     * Affiche la page/section des favoris
     */
    function renderWishlistPage(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const items = getAll();
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="wishlist-empty">
                    <i class="fas fa-heart"></i>
                    <h3>Votre liste de favoris est vide</h3>
                    <p>Parcourez nos produits et ajoutez vos coups de cœur !</p>
                    <a href="index.html#categories" class="btn-primary">
                        <i class="fas fa-shopping-bag"></i> Découvrir nos produits
                    </a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="wishlist-header">
                <h2><i class="fas fa-heart"></i> Mes Favoris (${items.length})</h2>
                <button class="btn-clear-wishlist" onclick="FCWishlist.confirmClear()">
                    <i class="fas fa-trash"></i> Tout supprimer
                </button>
            </div>
            <div class="wishlist-grid">
                ${items.map(product => `
                    <div class="wishlist-item" data-product-id="${product.id}">
                        <button class="wishlist-remove" onclick="FCWishlist.removeAndRefresh('${product.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                        <a href="personnaliser.html?product=${product.id}" class="wishlist-link">
                            <div class="wishlist-image">
                                ${product.image 
                                    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
                                    : `<i class="fas fa-cube"></i>`
                                }
                            </div>
                            <div class="wishlist-info">
                                <h4>${product.name}</h4>
                                <span class="wishlist-price">${product.price || ''}</span>
                            </div>
                        </a>
                        <button class="btn-add-cart" onclick="FCWishlist.addToCart('${product.id}')">
                            <i class="fas fa-shopping-cart"></i> Personnaliser
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    /**
     * Supprime et rafraîchit l'affichage
     */
    function removeAndRefresh(productId) {
        remove(productId);
        const container = document.getElementById('wishlist-container');
        if (container) {
            renderWishlistPage('wishlist-container');
        }
    }
    
    /**
     * Confirmation avant de vider
     */
    function confirmClear() {
        if (confirm('Voulez-vous vraiment supprimer tous vos favoris ?')) {
            clear();
            const container = document.getElementById('wishlist-container');
            if (container) {
                renderWishlistPage('wishlist-container');
            }
        }
    }
    
    /**
     * Redirige vers la personnalisation
     */
    function addToCart(productId) {
        window.location.href = `personnaliser.html?product=${productId}`;
    }
    
    // Init au chargement
    document.addEventListener('DOMContentLoaded', function() {
        updateBadges();
        
        // Charger depuis Firebase si connecté
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    loadFromFirebase();
                }
            });
        }
    });
    
    return {
        add,
        remove,
        toggle,
        isInWishlist,
        getAll,
        count,
        clear,
        updateBadges,
        createButton,
        handleClick,
        renderWishlistPage,
        removeAndRefresh,
        confirmClear,
        addToCart,
        loadFromFirebase
    };
})();

// Exposer globalement
window.FCWishlist = FCWishlist;
