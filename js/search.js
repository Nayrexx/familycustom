// ============================================
// FAMILY CUSTOM - Search System
// Recherche produits avec suggestions
// ============================================

const FCSearch = (function() {
    let searchInput = null;
    let searchResults = null;
    let searchClear = null;
    let allProducts = [];
    let allCategories = [];
    let isLoading = false;
    let debounceTimer = null;

    // Initialisation
    function init() {
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');
        searchClear = document.getElementById('search-clear');

        if (!searchInput) return;

        // Event listeners
        searchInput.addEventListener('input', handleInput);
        searchInput.addEventListener('focus', handleFocus);
        searchInput.addEventListener('keydown', handleKeydown);
        
        if (searchClear) {
            searchClear.addEventListener('click', clearSearch);
        }

        // Fermer les résultats quand on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.search-container')) {
                hideResults();
            }
        });

        // Charger les données au premier focus
        searchInput.addEventListener('focus', loadDataOnce, { once: true });
    }

    // Charger produits et catégories depuis Firebase
    async function loadDataOnce() {
        if (allProducts.length > 0 || isLoading) return;
        
        isLoading = true;
        
        try {
            const db = window.FirebaseDB;
            if (!db) {
                console.log('Firebase non disponible pour la recherche');
                return;
            }

            // Charger les catégories
            const catSnapshot = await db.collection('categories').get();
            allCategories = catSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'category',
                ...doc.data()
            }));

            // Charger les produits
            const prodSnapshot = await db.collection('products').get();
            allProducts = prodSnapshot.docs.map(doc => ({
                id: doc.id,
                type: 'product',
                ...doc.data()
            }));

            console.log(`Recherche: ${allCategories.length} catégories, ${allProducts.length} produits chargés`);

        } catch (error) {
            console.error('Erreur chargement données recherche:', error);
        } finally {
            isLoading = false;
        }
    }

    // Gestion de l'input
    function handleInput(e) {
        const query = e.target.value.trim();
        
        // Afficher/masquer le bouton clear
        if (searchClear) {
            searchClear.style.display = query.length > 0 ? 'flex' : 'none';
        }

        // Debounce pour éviter trop de recherches
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (query.length >= 2) {
                performSearch(query);
            } else {
                hideResults();
            }
        }, 200);
    }

    // Focus sur l'input
    function handleFocus() {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            performSearch(query);
        }
    }

    // Navigation clavier
    function handleKeydown(e) {
        const items = searchResults.querySelectorAll('.search-result-item');
        const activeItem = searchResults.querySelector('.search-result-item.active');
        let currentIndex = Array.from(items).indexOf(activeItem);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentIndex < items.length - 1) {
                items[currentIndex]?.classList.remove('active');
                items[currentIndex + 1]?.classList.add('active');
                items[currentIndex + 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentIndex > 0) {
                items[currentIndex]?.classList.remove('active');
                items[currentIndex - 1]?.classList.add('active');
                items[currentIndex - 1]?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeItem) {
                activeItem.click();
            }
        } else if (e.key === 'Escape') {
            hideResults();
            searchInput.blur();
        }
    }

    // Effectuer la recherche
    function performSearch(query) {
        const normalizedQuery = normalizeText(query);
        const results = [];

        // Rechercher dans les catégories
        allCategories.forEach(cat => {
            const score = getMatchScore(cat, normalizedQuery);
            if (score > 0) {
                results.push({ ...cat, score });
            }
        });

        // Rechercher dans les produits
        allProducts.forEach(prod => {
            const score = getMatchScore(prod, normalizedQuery);
            if (score > 0) {
                results.push({ ...prod, score });
            }
        });

        // Trier par score (meilleurs résultats en premier)
        results.sort((a, b) => b.score - a.score);

        // Limiter à 8 résultats
        displayResults(results.slice(0, 8), query);
    }

    // Normaliser le texte (accents, minuscules)
    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    // Calculer le score de correspondance
    function getMatchScore(item, query) {
        let score = 0;
        const name = normalizeText(item.name || '');
        const description = normalizeText(item.description || '');
        const keywords = normalizeText(item.keywords || '');

        // Correspondance exacte du nom
        if (name === query) {
            score += 100;
        }
        // Le nom commence par la requête
        else if (name.startsWith(query)) {
            score += 80;
        }
        // Le nom contient la requête
        else if (name.includes(query)) {
            score += 60;
        }

        // Description contient la requête
        if (description.includes(query)) {
            score += 30;
        }

        // Keywords contiennent la requête
        if (keywords.includes(query)) {
            score += 40;
        }

        // Recherche par mots individuels
        const queryWords = query.split(' ').filter(w => w.length > 1);
        queryWords.forEach(word => {
            if (name.includes(word)) score += 20;
            if (description.includes(word)) score += 10;
        });

        return score;
    }

    // Afficher les résultats
    function displayResults(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>Aucun résultat pour "<strong>${escapeHtml(query)}</strong>"</p>
                </div>
            `;
            showResults();
            return;
        }

        const html = results.map((item, index) => {
            const isCategory = item.type === 'category';
            const url = isCategory 
                ? `categorie.html?id=${item.id}` 
                : `produit.html?id=${item.id}`;
            const icon = isCategory 
                ? (item.icon || 'fa-folder') 
                : 'fa-cube';
            const typeLabel = isCategory ? 'Catégorie' : 'Produit';
            const image = item.image || null;

            return `
                <a href="${url}" class="search-result-item ${index === 0 ? 'active' : ''}" data-type="${item.type}">
                    <div class="result-image">
                        ${image 
                            ? `<img src="${image}" alt="${escapeHtml(item.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                               <i class="fas ${icon}" style="display:none;"></i>` 
                            : `<i class="fas ${icon}"></i>`
                        }
                    </div>
                    <div class="result-info">
                        <span class="result-name">${highlightMatch(item.name, query)}</span>
                        <span class="result-type">${typeLabel}</span>
                    </div>
                    ${item.price ? `<span class="result-price">${item.price}</span>` : ''}
                    <i class="fas fa-chevron-right result-arrow"></i>
                </a>
            `;
        }).join('');

        searchResults.innerHTML = html;
        showResults();
    }

    // Surligner les correspondances
    function highlightMatch(text, query) {
        if (!text) return '';
        const escaped = escapeHtml(text);
        const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    // Échapper HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Échapper Regex
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Afficher les résultats
    function showResults() {
        searchResults.classList.add('active');
    }

    // Masquer les résultats
    function hideResults() {
        searchResults.classList.remove('active');
    }

    // Effacer la recherche
    function clearSearch() {
        searchInput.value = '';
        searchClear.style.display = 'none';
        hideResults();
        searchInput.focus();
    }

    // Initialiser au chargement
    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        clearSearch
    };
})();
