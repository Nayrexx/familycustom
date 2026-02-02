// ============================================
// FAMILY CUSTOM - Recommendations JS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    loadRecommendations();
});

async function loadRecommendations() {
    const grid = document.getElementById('recommendations-grid');
    if (!grid) return;

    // Get current product info from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentProductId = urlParams.get('id');
    const currentCategory = urlParams.get('category');

    try {
        // Wait for Firebase to be ready
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const db = firebase.firestore();
        let products = [];

        // Try to get products from same category first
        if (currentCategory) {
            const categorySnapshot = await db.collection('products')
                .where('category', '==', currentCategory)
                .limit(10)
                .get();
            
            categorySnapshot.forEach(doc => {
                if (doc.id !== currentProductId) {
                    products.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        // If not enough products, get from all categories
        if (products.length < 4) {
            const allSnapshot = await db.collection('products')
                .limit(12)
                .get();
            
            allSnapshot.forEach(doc => {
                if (doc.id !== currentProductId && !products.find(p => p.id === doc.id)) {
                    products.push({ id: doc.id, ...doc.data() });
                }
            });
        }

        // Shuffle and take max 4
        products = shuffleArray(products).slice(0, 4);

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="no-recommendations">
                    <p>Découvrez nos autres créations dans nos catégories !</p>
                    <a href="index.html#categories" class="btn-discover">Voir les catégories</a>
                </div>
            `;
            return;
        }

        // Render products
        grid.innerHTML = products.map(product => `
            <div class="recommendation-card" onclick="goToProduct('${product.id}', '${product.category || ''}')">
                <div class="recommendation-image">
                    ${product.image 
                        ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
                        : `<div class="placeholder-icon"><i class="fas fa-image"></i></div>`
                    }
                    ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
                </div>
                <div class="recommendation-info">
                    <h4>${product.name}</h4>
                    <p class="recommendation-category">${getCategoryName(product.category)}</p>
                    <div class="recommendation-price">
                        ${product.originalPrice && parseFloat(product.originalPrice) > parseFloat(product.price) 
                            ? `<span class="original-price">${parseFloat(product.originalPrice).toFixed(2)} €</span>` 
                            : ''}
                        <span class="current-price">${product.price ? parseFloat(product.price).toFixed(2) : '0.00'} €</span>
                    </div>
                </div>
                <div class="recommendation-overlay">
                    <span><i class="fas fa-eye"></i> Voir le produit</span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading recommendations:', error);
        grid.innerHTML = `
            <div class="no-recommendations">
                <p>Découvrez nos autres créations !</p>
                <a href="index.html#categories" class="btn-discover">Voir les catégories</a>
            </div>
        `;
    }
}

function goToProduct(productId, category) {
    window.location.href = `personnaliser.html?id=${productId}&category=${category}`;
}

function getCategoryName(category) {
    // Retourne le nom de la catégorie ou la catégorie elle-même
    // Les noms sont maintenant stockés dans Firebase
    return category || 'Création';
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
