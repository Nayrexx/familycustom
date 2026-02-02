/**
 * Recently Viewed Products - Family Custom
 * Affiche les produits récemment consultés
 */

const FCRecentlyViewed = (function() {
    const STORAGE_KEY = 'fc_recently_viewed';
    const MAX_ITEMS = 10;
    
    function getViewed() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }
    
    function saveViewed(items) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    
    /**
     * Ajoute un produit aux récemment consultés
     */
    function addProduct(product) {
        if (!product || !product.id) return;
        
        let viewed = getViewed();
        
        // Retirer si déjà présent
        viewed = viewed.filter(p => p.id !== product.id);
        
        // Ajouter en premier
        viewed.unshift({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || product.images?.[0] || '',
            category: product.category || product.categoryId,
            timestamp: Date.now()
        });
        
        // Limiter à MAX_ITEMS
        if (viewed.length > MAX_ITEMS) {
            viewed = viewed.slice(0, MAX_ITEMS);
        }
        
        saveViewed(viewed);
    }
    
    /**
     * Récupère les produits récemment consultés
     */
    function getProducts(excludeId = null, limit = 6) {
        let viewed = getViewed();
        
        if (excludeId) {
            viewed = viewed.filter(p => p.id !== excludeId);
        }
        
        return viewed.slice(0, limit);
    }
    
    /**
     * Affiche la barre des produits récemment consultés
     */
    function render(containerId = 'recently-viewed-container', excludeId = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const products = getProducts(excludeId, 6);
        
        if (products.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        container.innerHTML = `
            <div class="recently-viewed-section">
                <div class="recently-viewed-header">
                    <h3><i class="fas fa-history"></i> Récemment consultés</h3>
                    <button class="rv-scroll-btn rv-scroll-left" onclick="FCRecentlyViewed.scroll('left')">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="rv-scroll-btn rv-scroll-right" onclick="FCRecentlyViewed.scroll('right')">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="recently-viewed-list" id="rv-list">
                    ${products.map(product => `
                        <a href="personnaliser.html?product=${product.id}" class="rv-item">
                            <div class="rv-image">
                                ${product.image 
                                    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
                                    : `<i class="fas fa-cube"></i>`
                                }
                            </div>
                            <div class="rv-info">
                                <span class="rv-name">${product.name}</span>
                                <span class="rv-price">${product.price || ''}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Scroll horizontal de la liste
     */
    function scroll(direction) {
        const list = document.getElementById('rv-list');
        if (!list) return;
        
        const scrollAmount = 200;
        if (direction === 'left') {
            list.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            list.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    }
    
    /**
     * Efface l'historique
     */
    function clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
    
    // Init auto
    document.addEventListener('DOMContentLoaded', function() {
        // Auto-render si le container existe
        const container = document.getElementById('recently-viewed-container');
        if (container) {
            // Récupérer l'ID du produit actuel si on est sur personnaliser.html
            const urlParams = new URLSearchParams(window.location.search);
            const currentProductId = urlParams.get('product');
            render('recently-viewed-container', currentProductId);
        }
    });
    
    return {
        addProduct,
        getProducts,
        render,
        scroll,
        clear
    };
})();

// Exposer globalement
window.FCRecentlyViewed = FCRecentlyViewed;
