/**
 * Mass Promo Management - Family Custom
 * Gestion des promotions de masse pour l'admin
 */

const FCMassPromo = (function() {
    
    let products = [];
    let categories = [];
    let selectedProducts = new Set();
    
    /**
     * Charge les données
     */
    async function loadData() {
        if (typeof firebase === 'undefined') return;
        
        const db = firebase.firestore();
        
        try {
            // Charger les produits
            const productsSnap = await db.collection('products').get();
            products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Charger les catégories
            const categoriesSnap = await db.collection('categories').get();
            categories = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    /**
     * Ouvre le modal de promo de masse
     */
    function openModal() {
        // Créer le modal s'il n'existe pas
        let modal = document.getElementById('mass-promo-modal');
        if (!modal) {
            createModal();
            modal = document.getElementById('mass-promo-modal');
        }
        
        loadData().then(() => {
            renderProductSelector();
            modal.classList.add('active');
        });
    }
    
    /**
     * Ferme le modal
     */
    function closeModal() {
        const modal = document.getElementById('mass-promo-modal');
        if (modal) {
            modal.classList.remove('active');
            selectedProducts.clear();
        }
    }
    
    /**
     * Crée le modal HTML
     */
    function createModal() {
        const modalHtml = `
            <div id="mass-promo-modal" class="modal mass-promo-modal">
                <div class="modal-overlay" onclick="FCMassPromo.closeModal()"></div>
                <div class="modal-content mass-promo-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-tags"></i> Promo de Masse</h2>
                        <button class="modal-close" onclick="FCMassPromo.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    
                    <div class="modal-body">
                        <!-- Étape 1: Sélection -->
                        <div class="promo-step" id="promo-step-1">
                            <h3><span class="step-number">1</span> Sélectionner les produits</h3>
                            
                            <div class="selection-actions">
                                <div class="filter-group">
                                    <label>Filtrer par catégorie</label>
                                    <select id="promo-category-filter">
                                        <option value="">Toutes les catégories</option>
                                    </select>
                                </div>
                                <div class="selection-btns">
                                    <button class="btn btn-sm" onclick="FCMassPromo.selectAll()">
                                        <i class="fas fa-check-double"></i> Tout sélectionner
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="FCMassPromo.deselectAll()">
                                        <i class="fas fa-times"></i> Tout désélectionner
                                    </button>
                                </div>
                            </div>
                            
                            <div class="products-selector" id="products-selector">
                                <!-- Produits chargés dynamiquement -->
                            </div>
                            
                            <div class="selection-summary">
                                <span id="selection-count">0 produit(s) sélectionné(s)</span>
                            </div>
                        </div>
                        
                        <!-- Étape 2: Type de promo -->
                        <div class="promo-step" id="promo-step-2">
                            <h3><span class="step-number">2</span> Configurer la promotion</h3>
                            
                            <div class="promo-options">
                                <div class="promo-type-cards">
                                    <label class="promo-type-card">
                                        <input type="radio" name="promo-type" value="percentage" checked>
                                        <div class="card-content">
                                            <i class="fas fa-percent"></i>
                                            <span>Réduction en %</span>
                                        </div>
                                    </label>
                                    <label class="promo-type-card">
                                        <input type="radio" name="promo-type" value="fixed">
                                        <div class="card-content">
                                            <i class="fas fa-euro-sign"></i>
                                            <span>Montant fixe</span>
                                        </div>
                                    </label>
                                    <label class="promo-type-card">
                                        <input type="radio" name="promo-type" value="badge">
                                        <div class="card-content">
                                            <i class="fas fa-tag"></i>
                                            <span>Badge seul</span>
                                        </div>
                                    </label>
                                </div>
                                
                                <div class="promo-config" id="promo-config-percentage">
                                    <div class="form-group">
                                        <label>Pourcentage de réduction</label>
                                        <div class="input-with-suffix">
                                            <input type="number" id="promo-percentage" min="1" max="90" value="10">
                                            <span class="suffix">%</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="promo-config" id="promo-config-fixed" style="display:none;">
                                    <div class="form-group">
                                        <label>Montant à retirer</label>
                                        <div class="input-with-suffix">
                                            <input type="number" id="promo-fixed" min="1" value="10">
                                            <span class="suffix">€</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label>Badge à afficher (optionnel)</label>
                                    <select id="promo-badge">
                                        <option value="">Aucun badge</option>
                                        <option value="-10%">-10%</option>
                                        <option value="-20%">-20%</option>
                                        <option value="-30%">-30%</option>
                                        <option value="-50%">-50%</option>
                                        <option value="PROMO">PROMO</option>
                                        <option value="SOLDES">SOLDES</option>
                                        <option value="NOUVEAU">NOUVEAU</option>
                                        <option value="BEST-SELLER">BEST-SELLER</option>
                                        <option value="custom">Personnalisé...</option>
                                    </select>
                                    <input type="text" id="promo-badge-custom" placeholder="Texte du badge" style="display:none; margin-top:10px;">
                                </div>
                                
                                <div class="form-group">
                                    <label>Date de fin (optionnel)</label>
                                    <input type="date" id="promo-end-date">
                                </div>
                            </div>
                        </div>
                        
                        <!-- Aperçu -->
                        <div class="promo-preview" id="promo-preview">
                            <h4><i class="fas fa-eye"></i> Aperçu</h4>
                            <div class="preview-content" id="preview-content">
                                Sélectionnez des produits pour voir l'aperçu
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="FCMassPromo.closeModal()">
                            Annuler
                        </button>
                        <button class="btn btn-warning" onclick="FCMassPromo.resetPromos()">
                            <i class="fas fa-undo"></i> Réinitialiser les promos
                        </button>
                        <button class="btn btn-primary" onclick="FCMassPromo.applyPromo()">
                            <i class="fas fa-check"></i> Appliquer la promo
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Bind events
        bindEvents();
    }
    
    /**
     * Bind les événements
     */
    function bindEvents() {
        // Type de promo
        document.querySelectorAll('input[name="promo-type"]').forEach(input => {
            input.addEventListener('change', function() {
                document.getElementById('promo-config-percentage').style.display = 
                    this.value === 'percentage' ? 'block' : 'none';
                document.getElementById('promo-config-fixed').style.display = 
                    this.value === 'fixed' ? 'block' : 'none';
                updatePreview();
            });
        });
        
        // Badge custom
        document.getElementById('promo-badge').addEventListener('change', function() {
            document.getElementById('promo-badge-custom').style.display = 
                this.value === 'custom' ? 'block' : 'none';
        });
        
        // Filtre catégorie
        document.getElementById('promo-category-filter').addEventListener('change', function() {
            renderProductSelector(this.value);
        });
        
        // Update preview on input change
        ['promo-percentage', 'promo-fixed', 'promo-badge', 'promo-badge-custom'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updatePreview);
            document.getElementById(id)?.addEventListener('change', updatePreview);
        });
    }
    
    /**
     * Rendu du sélecteur de produits
     */
    function renderProductSelector(categoryFilter = '') {
        const container = document.getElementById('products-selector');
        const categorySelect = document.getElementById('promo-category-filter');
        
        // Remplir le filtre catégories
        categorySelect.innerHTML = '<option value="">Toutes les catégories</option>' +
            categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        // Filtrer les produits
        let filteredProducts = products;
        if (categoryFilter) {
            filteredProducts = products.filter(p => {
                // Support ancien format (categoryId) et nouveau format (categoryIds)
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return p.categoryIds.includes(categoryFilter);
                }
                return p.categoryId === categoryFilter;
            });
        }
        
        container.innerHTML = filteredProducts.map(product => `
            <label class="product-select-item ${selectedProducts.has(product.id) ? 'selected' : ''}">
                <input type="checkbox" value="${product.id}" 
                       ${selectedProducts.has(product.id) ? 'checked' : ''}
                       onchange="FCMassPromo.toggleProduct('${product.id}')">
                <div class="product-thumb">
                    ${product.image ? `<img src="${product.image}" alt="${product.name}">` : '<i class="fas fa-cube"></i>'}
                </div>
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">${product.price || 'Prix variable'}</span>
                    ${product.badge ? `<span class="current-badge">${product.badge}</span>` : ''}
                    ${product.originalPrice ? `<span class="has-promo">Promo en cours</span>` : ''}
                </div>
            </label>
        `).join('') || '<p class="empty-state">Aucun produit dans cette catégorie</p>';
        
        updateSelectionCount();
    }
    
    /**
     * Toggle la sélection d'un produit
     */
    function toggleProduct(productId) {
        if (selectedProducts.has(productId)) {
            selectedProducts.delete(productId);
        } else {
            selectedProducts.add(productId);
        }
        
        // Update visual
        document.querySelectorAll('.product-select-item').forEach(item => {
            const input = item.querySelector('input');
            item.classList.toggle('selected', input.checked);
        });
        
        updateSelectionCount();
        updatePreview();
    }
    
    /**
     * Sélectionner tous
     */
    function selectAll() {
        const categoryFilter = document.getElementById('promo-category-filter').value;
        let toSelect = products;
        if (categoryFilter) {
            toSelect = products.filter(p => {
                // Support ancien format (categoryId) et nouveau format (categoryIds)
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return p.categoryIds.includes(categoryFilter);
                }
                return p.categoryId === categoryFilter;
            });
        }
        
        toSelect.forEach(p => selectedProducts.add(p.id));
        
        document.querySelectorAll('.product-select-item input').forEach(input => {
            input.checked = true;
            input.closest('.product-select-item').classList.add('selected');
        });
        
        updateSelectionCount();
        updatePreview();
    }
    
    /**
     * Désélectionner tous
     */
    function deselectAll() {
        selectedProducts.clear();
        
        document.querySelectorAll('.product-select-item input').forEach(input => {
            input.checked = false;
            input.closest('.product-select-item').classList.remove('selected');
        });
        
        updateSelectionCount();
        updatePreview();
    }
    
    /**
     * Met à jour le compteur de sélection
     */
    function updateSelectionCount() {
        document.getElementById('selection-count').textContent = 
            `${selectedProducts.size} produit(s) sélectionné(s)`;
    }
    
    /**
     * Met à jour l'aperçu
     */
    function updatePreview() {
        const preview = document.getElementById('preview-content');
        
        if (selectedProducts.size === 0) {
            preview.innerHTML = 'Sélectionnez des produits pour voir l\'aperçu';
            return;
        }
        
        const promoType = document.querySelector('input[name="promo-type"]:checked').value;
        const percentage = parseInt(document.getElementById('promo-percentage').value) || 0;
        const fixed = parseFloat(document.getElementById('promo-fixed').value) || 0;
        const badgeSelect = document.getElementById('promo-badge').value;
        const badgeCustom = document.getElementById('promo-badge-custom').value;
        const badge = badgeSelect === 'custom' ? badgeCustom : badgeSelect;
        
        // Exemple avec premier produit sélectionné
        const firstProductId = Array.from(selectedProducts)[0];
        const product = products.find(p => p.id === firstProductId);
        
        if (!product) {
            preview.innerHTML = 'Produit non trouvé';
            return;
        }
        
        let originalPrice = parseFloat(String(product.price || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
        let newPrice = originalPrice;
        
        if (promoType === 'percentage') {
            newPrice = originalPrice * (1 - percentage / 100);
        } else if (promoType === 'fixed') {
            newPrice = originalPrice - fixed;
        }
        
        newPrice = Math.max(0, newPrice);
        
        preview.innerHTML = `
            <div class="preview-card">
                <div class="preview-image">
                    ${product.image ? `<img src="${product.image}">` : '<i class="fas fa-cube"></i>'}
                    ${badge ? `<span class="preview-badge">${badge}</span>` : ''}
                </div>
                <div class="preview-info">
                    <strong>${product.name}</strong>
                    ${promoType !== 'badge' ? `
                        <div class="preview-prices">
                            <span class="old-price">${originalPrice.toFixed(2)}€</span>
                            <span class="new-price">${newPrice.toFixed(2)}€</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <p class="preview-note">
                <i class="fas fa-info-circle"></i> 
                Cette modification sera appliquée à ${selectedProducts.size} produit(s)
            </p>
        `;
    }
    
    /**
     * Applique la promo
     */
    async function applyPromo() {
        if (selectedProducts.size === 0) {
            alert('Veuillez sélectionner au moins un produit');
            return;
        }
        
        const promoType = document.querySelector('input[name="promo-type"]:checked').value;
        const percentage = parseInt(document.getElementById('promo-percentage').value) || 0;
        const fixed = parseFloat(document.getElementById('promo-fixed').value) || 0;
        const badgeSelect = document.getElementById('promo-badge').value;
        const badgeCustom = document.getElementById('promo-badge-custom').value;
        const badge = badgeSelect === 'custom' ? badgeCustom : badgeSelect;
        const endDate = document.getElementById('promo-end-date').value;
        
        if (!confirm(`Appliquer cette promotion à ${selectedProducts.size} produit(s) ?`)) {
            return;
        }
        
        const db = firebase.firestore();
        const batch = db.batch();
        
        let successCount = 0;
        
        for (const productId of selectedProducts) {
            const product = products.find(p => p.id === productId);
            if (!product) continue;
            
            const updates = {};
            
            // Sauvegarder le prix original
            const currentPrice = parseFloat(String(product.price || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
            
            if (promoType === 'percentage' && percentage > 0) {
                const newPrice = currentPrice * (1 - percentage / 100);
                updates.originalPrice = product.price;
                updates.price = newPrice.toFixed(2) + '€';
            } else if (promoType === 'fixed' && fixed > 0) {
                const newPrice = Math.max(0, currentPrice - fixed);
                updates.originalPrice = product.price;
                updates.price = newPrice.toFixed(2) + '€';
            }
            
            if (badge) {
                updates.badge = badge;
            }
            
            if (endDate) {
                updates.promoEndDate = endDate;
            }
            
            updates.promoAppliedAt = new Date().toISOString();
            
            const ref = db.collection('products').doc(productId);
            batch.update(ref, updates);
            successCount++;
        }
        
        try {
            await batch.commit();
            alert(`Promotion appliquée à ${successCount} produit(s) avec succès !`);
            closeModal();
            
            // Refresh la liste si on est dans l'admin
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
        } catch (error) {
            console.error('Error applying promo:', error);
            alert('Erreur lors de l\'application de la promotion');
        }
    }
    
    /**
     * Réinitialise les promos des produits sélectionnés
     */
    async function resetPromos() {
        if (selectedProducts.size === 0) {
            alert('Veuillez sélectionner les produits à réinitialiser');
            return;
        }
        
        if (!confirm(`Réinitialiser les promos de ${selectedProducts.size} produit(s) ?\n\nLes prix originaux seront restaurés et les badges supprimés.`)) {
            return;
        }
        
        const db = firebase.firestore();
        const batch = db.batch();
        
        let resetCount = 0;
        
        for (const productId of selectedProducts) {
            const product = products.find(p => p.id === productId);
            if (!product) continue;
            
            const updates = {
                badge: firebase.firestore.FieldValue.delete(),
                promoEndDate: firebase.firestore.FieldValue.delete(),
                promoAppliedAt: firebase.firestore.FieldValue.delete()
            };
            
            // Restaurer le prix original si disponible
            if (product.originalPrice) {
                updates.price = product.originalPrice;
                updates.originalPrice = firebase.firestore.FieldValue.delete();
            }
            
            const ref = db.collection('products').doc(productId);
            batch.update(ref, updates);
            resetCount++;
        }
        
        try {
            await batch.commit();
            alert(`${resetCount} produit(s) réinitialisé(s) avec succès !`);
            closeModal();
            
            if (typeof loadProducts === 'function') {
                loadProducts();
            }
        } catch (error) {
            console.error('Error resetting promos:', error);
            alert('Erreur lors de la réinitialisation');
        }
    }
    
    return {
        openModal,
        closeModal,
        toggleProduct,
        selectAll,
        deselectAll,
        applyPromo,
        resetPromos
    };
})();

window.FCMassPromo = FCMassPromo;

// Auto-attach event listener when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const btnMassPromo = document.getElementById('btn-mass-promo');
    if (btnMassPromo) {
        btnMassPromo.addEventListener('click', function() {
            FCMassPromo.openModal();
        });
    }
});
