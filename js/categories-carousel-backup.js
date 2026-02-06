/* ============================================
   FAMILY CUSTOM - Catégories Carrousel (Firebase)
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('Categories.js started');
    console.log('FirebaseDB available:', !!window.FirebaseDB);
    
    // State
    let categories = [];
    let products = [];
    
    // DOM Elements
    var categoriesGrid = document.getElementById('categories-grid');
    var carouselPrev = document.querySelector('.carousel-prev');
    var carouselNext = document.querySelector('.carousel-next');
    var carouselDots = document.getElementById('carousel-dots');
    var popup = document.getElementById('category-popup');
    var popupOverlay = popup ? popup.querySelector('.popup-overlay') : null;
    var popupClose = popup ? popup.querySelector('.popup-close') : null;
    var popupTitle = popup ? popup.querySelector('.popup-header h2') : null;
    var popupBody = popup ? popup.querySelector('.popup-body') : null;
    
    // Show loading state
    if (categoriesGrid) {
        categoriesGrid.innerHTML = '<div class="loading-categories"><i class="fas fa-spinner fa-spin"></i><p>Chargement...</p></div>';
    }
    
    // Load data from Firebase
    async function loadData() {
        const db = window.FirebaseDB;
        
        console.log('loadData called, db:', !!db);
        
        if (!db) {
            console.error('Firebase DB not available');
            renderCategories();
            return;
        }
        
        try {
            console.log('Fetching categories...');
            // Load categories
            const catSnapshot = await db.collection('categories').get();
            console.log('Categories snapshot:', catSnapshot.size, 'docs');
            
            if (!catSnapshot.empty) {
                categories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('Categories loaded:', categories);
            } else {
                categories = [];
                console.log('No categories found');
            }
            
            // Load products
            const prodSnapshot = await db.collection('products').get();
            console.log('Products snapshot:', prodSnapshot.size, 'docs');
            
            if (!prodSnapshot.empty) {
                products = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                products = [];
            }
            
            console.log('Data loaded:', categories.length, 'categories,', products.length, 'products');
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
            categories = [];
            products = [];
        }
        
        renderCategories();
        // Attendre que le DOM soit mis à jour avant d'initialiser le carrousel
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initCarousel();
                
                // Si le contenu est caché (compte à rebours), réinitialiser le carrousel quand il sera visible
                if (categoriesGrid && categoriesGrid.offsetWidth === 0) {
                    console.log('Carousel hidden, waiting for reveal...');
                    
                    // Observer les changements de style pour réinitialiser quand visible
                    const observer = new MutationObserver(() => {
                        if (categoriesGrid.offsetWidth > 0) {
                            console.log('Carousel now visible, reinitializing...');
                            setTimeout(() => {
                                initCarousel();
                                updateCarouselState();
                            }, 100);
                            observer.disconnect();
                        }
                    });
                    
                    observer.observe(document.body, { 
                        childList: true, 
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['style', 'class']
                    });
                    
                    // Aussi écouter l'événement resize déclenché par le coming-soon
                    const resizeHandler = () => {
                        if (categoriesGrid.offsetWidth > 0) {
                            console.log('Resize detected, reinitializing carousel...');
                            setTimeout(() => {
                                initCarousel();
                                updateCarouselState();
                            }, 100);
                            window.removeEventListener('resize', resizeHandler);
                        }
                    };
                    window.addEventListener('resize', resizeHandler);
                }
            });
        });
    }
    
    // Render category tiles
    function renderCategories() {
        if (!categoriesGrid) return;
        
        if (categories.length === 0) {
            var emptyMsg = window.I18n ? I18n.t('common.loading') : 'Aucune catégorie disponible';
            categoriesGrid.innerHTML = '<div class="empty-state"><p>' + emptyMsg + '</p></div>';
            return;
        }
        
        // Trier les catégories par ordre
        var sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        var html = '';
        
        // ===== CATÉGORIE SPÉCIALE: FÊTE DES GRANDS-MÈRES =====
        // Date de lancement de la catégorie
        var now = new Date();
        var launchDate = new Date('2026-02-06T12:00:00'); // Disponible dans ~24h
        var endDate = new Date('2026-03-02T23:59:59');
        var isComingSoon = now < launchDate;
        
        if (now < endDate) {
            html += '<div class="category-tile mamie-special-tile' + (isComingSoon ? ' coming-soon-tile' : '') + '" data-category="fete-mamies"' + (isComingSoon ? ' data-launch="' + launchDate.toISOString() + '"' : '') + '>';
            html += '<div class="category-tile-content">';
            
            if (isComingSoon) {
                // Coming Soon avec countdown centré
                html += '<div class="coming-soon-wrapper">';
                html += '<div class="coming-soon-badge"><i class="fas fa-clock"></i> BIENTÔT DISPONIBLE</div>';
                html += '<div class="category-tile-icon mamie-icon"><span style="font-size: 2.5rem;">👵</span></div>';
                html += '<h3 class="category-name">Fête des Grands-Mères</h3>';
                html += '<p class="coming-soon-hook">Préparez-vous à faire craquer Mamie... ❤️</p>';
                html += '<div class="coming-soon-countdown" id="mamie-launch-countdown">';
                html += '<div class="countdown-item"><span class="countdown-value" id="cs-hours">00</span><span class="countdown-label">heures</span></div>';
                html += '<div class="countdown-sep">:</div>';
                html += '<div class="countdown-item"><span class="countdown-value" id="cs-mins">00</span><span class="countdown-label">min</span></div>';
                html += '<div class="countdown-sep">:</div>';
                html += '<div class="countdown-item"><span class="countdown-value" id="cs-secs">00</span><span class="countdown-label">sec</span></div>';
                html += '</div>';
                html += '<span class="category-tile-btn coming-soon-btn"><i class="fas fa-bell"></i> Me prévenir</span>';
                html += '</div>';
            } else {
                html += '<div class="category-tile-icon mamie-icon"><span style="font-size: 2rem;">👵</span></div>';
                html += '<h3 class="category-name">Fête des Grands-Mères</h3>';
                html += '<p>Cadeaux personnalisés pour mamie</p>';
                html += '<span class="category-tile-btn">-15% MAMIE15 <i class="fas fa-arrow-right"></i></span>';
            }
            
            html += '</div>';
            html += '</div>';
        }
        // ===== FIN CATÉGORIE SPÉCIALE =====
        
        sortedCategories.forEach(function(cat) {
            // Ne construire le style personnalisé que si les champs sont explicitement définis
            var customStyle = '';
            var iconStyle = '';
            var textClass = '';
            
            // Vérifier si la catégorie a des styles personnalisés définis
            var hasCustomStyles = cat.gradient1 || cat.gradient2 || cat.imageUrl;
            
            if (hasCustomStyles) {
                if (cat.imageUrl) {
                    customStyle = 'background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(' + cat.imageUrl + '); background-size: cover; background-position: center;';
                } else if (cat.gradient1 && cat.gradient2) {
                    customStyle = 'background: linear-gradient(145deg, ' + cat.gradient1 + ' 0%, ' + cat.gradient2 + ' 100%);';
                }
                
                if (cat.iconColor) {
                    iconStyle = 'color: ' + cat.iconColor + ';';
                }
                
                if (cat.textStyle === 'dark') {
                    textClass = 'text-dark';
                }
            }
            
            var catName = cat.name;
            
            html += '<div class="category-tile ' + textClass + '" data-category="' + cat.id + '" data-slug="' + cat.slug + '"' + (customStyle ? ' style="' + customStyle + '"' : '') + '>';
            html += '<div class="category-tile-content">';
            html += '<div class="category-tile-icon"' + (iconStyle ? ' style="' + iconStyle + '"' : '') + '>';
            html += '<i class="fas ' + (cat.icon || 'fa-cube') + '"></i>';
            html += '</div>';
            html += '<h3 class="category-name">' + catName + '</h3>';
            html += '<p>' + (cat.description || '') + '</p>';
            html += '<span class="category-tile-btn">Découvrir <i class="fas fa-arrow-right"></i></span>';
            html += '</div>';
            html += '</div>';
        });
        
        // Ajouter la carte cadeau comme catégorie spéciale
        var giftTitle = 'Cartes Cadeaux';
        var giftDesc = 'Offrez une création personnalisée';
        
        html += '<div class="category-tile gift-card-tile" data-category="gift-card">';
        html += '<div class="category-tile-content">';
        html += '<div class="category-tile-icon gift-icon">';
        html += '<i class="fas fa-gift"></i>';
        html += '</div>';
        html += '<h3>' + giftTitle + '</h3>';
        html += '<p>' + giftDesc + '</p>';
        html += '<span class="category-tile-btn">Découvrir <i class="fas fa-arrow-right"></i></span>';
        html += '</div>';
        html += '</div>';
        
        categoriesGrid.innerHTML = html;
        
        // Add click listeners to new tiles - redirect to category page
        categoriesGrid.querySelectorAll('.category-tile').forEach(function(tile) {
            tile.addEventListener('click', function(e) {
                // Bloquer le clic sur les tuiles "coming soon"
                if (this.classList.contains('coming-soon-tile')) {
                    e.preventDefault();
                    e.stopPropagation();
                    showComingSoonNotification();
                    return;
                }
                
                var categoryId = this.getAttribute('data-category');
                // Redirect to gift card page or category page
                if (categoryId === 'gift-card') {
                    window.location.href = 'carte-cadeau.html';
                } else {
                    window.location.href = 'categorie.html?id=' + categoryId;
                }
            });
        });
        
        // Initialiser le countdown Coming Soon
        initComingSoonCountdown();
    }
    
    // ===== COMING SOON COUNTDOWN =====
    function initComingSoonCountdown() {
        var countdownEl = document.getElementById('mamie-launch-countdown');
        if (!countdownEl) return;
        
        var tile = document.querySelector('.coming-soon-tile');
        if (!tile) return;
        
        var launchDate = new Date(tile.getAttribute('data-launch'));
        
        function updateCountdown() {
            var now = new Date();
            var diff = launchDate - now;
            
            if (diff <= 0) {
                // La catégorie est disponible! Recharger la page
                location.reload();
                return;
            }
            
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            var secs = Math.floor((diff % (1000 * 60)) / 1000);
            
            var hoursEl = document.getElementById('cs-hours');
            var minsEl = document.getElementById('cs-mins');
            var secsEl = document.getElementById('cs-secs');
            
            if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
            if (minsEl) minsEl.textContent = mins.toString().padStart(2, '0');
            if (secsEl) secsEl.textContent = secs.toString().padStart(2, '0');
        }
        
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }
    
    function showComingSoonNotification() {
        // Supprimer notification existante
        var existing = document.querySelector('.coming-soon-notif');
        if (existing) existing.remove();
        
        var notif = document.createElement('div');
        notif.className = 'coming-soon-notif';
        notif.innerHTML = '<i class="fas fa-clock"></i> Cette catégorie sera disponible très bientôt !';
        document.body.appendChild(notif);
        
        setTimeout(function() { notif.classList.add('show'); }, 10);
        setTimeout(function() {
            notif.classList.remove('show');
            setTimeout(function() { notif.remove(); }, 300);
        }, 3000);
    }
    
    // ===== CARROUSEL =====
    function initCarousel() {
        if (!categoriesGrid || !carouselPrev || !carouselNext) {
            console.warn('Carousel elements not found:', { grid: !!categoriesGrid, prev: !!carouselPrev, next: !!carouselNext });
            return;
        }
        
        const tiles = categoriesGrid.querySelectorAll('.category-tile');
        console.log('Carousel init:', tiles.length, 'tiles');
        
        if (tiles.length === 0) {
            console.warn('No tiles found in carousel');
            return;
        }
        
        // Debug: afficher les dimensions
        console.log('Carousel dimensions:', {
            scrollWidth: categoriesGrid.scrollWidth,
            clientWidth: categoriesGrid.clientWidth,
            overflow: categoriesGrid.scrollWidth - categoriesGrid.clientWidth
        });
        
        // Créer les dots
        if (carouselDots) {
            let dotsHtml = '';
            const visibleTiles = getVisibleTiles();
            const totalDots = Math.ceil(tiles.length / visibleTiles);
            
            for (let i = 0; i < totalDots; i++) {
                dotsHtml += '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></button>';
            }
            carouselDots.innerHTML = dotsHtml;
            
            // Événements des dots
            carouselDots.querySelectorAll('.carousel-dot').forEach(function(dot) {
                dot.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    scrollToIndex(index);
                });
            });
        }
        
        // Flèche précédente
        carouselPrev.addEventListener('click', function() {
            scrollCarousel(-1);
        });
        
        // Flèche suivante
        carouselNext.addEventListener('click', function() {
            scrollCarousel(1);
        });
        
        // Mise à jour des flèches au scroll (avec debounce pour mobile)
        let scrollTimeout;
        categoriesGrid.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateCarouselState, 50);
        }, { passive: true });
        
        // Initial state
        updateCarouselState();
        
        // Note: On mobile, le scroll natif avec CSS scroll-snap gère déjà le swipe
        // Pas besoin de JS supplémentaire pour le touch, ça causait des double-scrolls
    }
    
    function getVisibleTiles() {
        const width = window.innerWidth;
        if (width <= 480) return 1;
        if (width <= 768) return 2;
        if (width <= 1024) return 3;
        return 4;
    }
    
    function scrollCarousel(direction) {
        if (!categoriesGrid) return;
        
        const tile = categoriesGrid.querySelector('.category-tile');
        if (!tile) return;
        
        const tileWidth = tile.offsetWidth + 24; // width + gap
        const scrollAmount = tileWidth * direction;
        
        categoriesGrid.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    }
    
    function scrollToIndex(index) {
        if (!categoriesGrid) return;
        
        const tile = categoriesGrid.querySelector('.category-tile');
        if (!tile) return;
        
        const visibleTiles = getVisibleTiles();
        const tileWidth = tile.offsetWidth + 24;
        const scrollPosition = index * visibleTiles * tileWidth;
        
        categoriesGrid.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }
    
    function updateCarouselState() {
        if (!categoriesGrid || !carouselPrev || !carouselNext) return;
        
        const scrollLeft = Math.round(categoriesGrid.scrollLeft);
        const scrollWidth = categoriesGrid.scrollWidth;
        const clientWidth = categoriesGrid.clientWidth;
        
        // Debug log (peut être retiré en production)
        console.log('updateCarouselState:', { scrollLeft, scrollWidth, clientWidth, overflow: scrollWidth - clientWidth });
        
        // Calcul de s'il y a du contenu à scroller
        const hasOverflow = scrollWidth > clientWidth + 5; // 5px de tolérance
        
        // Désactiver/activer les flèches
        // Précédent : désactivé si on est au début
        carouselPrev.disabled = scrollLeft <= 5;
        
        // Suivant : désactivé si on est à la fin OU s'il n'y a pas de débordement
        carouselNext.disabled = !hasOverflow || scrollLeft >= scrollWidth - clientWidth - 5;
        
        console.log('Arrow states:', { prevDisabled: carouselPrev.disabled, nextDisabled: carouselNext.disabled, hasOverflow });
        
        // Mettre à jour les dots
        if (carouselDots) {
            const tiles = categoriesGrid.querySelectorAll('.category-tile');
            const tile = tiles[0];
            if (!tile) return;
            
            const tileWidth = tile.offsetWidth + 24;
            const visibleTiles = getVisibleTiles();
            const currentIndex = Math.round(scrollLeft / (tileWidth * visibleTiles));
            
            carouselDots.querySelectorAll('.carousel-dot').forEach(function(dot, i) {
                dot.classList.toggle('active', i === currentIndex);
            });
        }
    }
    
    // Recalculer l'état du carrousel au redimensionnement
    window.addEventListener('resize', function() {
        clearTimeout(window.carouselResizeTimeout);
        window.carouselResizeTimeout = setTimeout(function() {
            if (carouselDots && categoriesGrid) {
                // Recréer les dots
                const tiles = categoriesGrid.querySelectorAll('.category-tile');
                if (tiles.length > 0) {
                    const visibleTiles = getVisibleTiles();
                    const totalDots = Math.ceil(tiles.length / visibleTiles);
                    
                    let dotsHtml = '';
                    for (let i = 0; i < totalDots; i++) {
                        dotsHtml += '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></button>';
                    }
                    carouselDots.innerHTML = dotsHtml;
                    
                    // Réattacher les événements des dots
                    carouselDots.querySelectorAll('.carousel-dot').forEach(function(dot) {
                        dot.addEventListener('click', function() {
                            const index = parseInt(this.getAttribute('data-index'));
                            scrollToIndex(index);
                        });
                    });
                }
            }
            updateCarouselState();
        }, 150);
    });
    
    // Get category info
    function getCategoryInfo(categoryId) {
        const cat = categories.find(c => c.id === categoryId);
        if (cat) {
            return { name: cat.name, icon: cat.icon || 'fa-cube' };
        }
        return { name: 'Produits', icon: 'fa-th' };
    }
    
    // Get products by category
    function getProductsByCategory(categoryId) {
        return products.filter(p => {
            // Support ancien format (categoryId) et nouveau format (categoryIds)
            if (p.categoryIds && Array.isArray(p.categoryIds)) {
                return p.categoryIds.includes(categoryId);
            }
            return p.categoryId === categoryId;
        });
    }
    
    // Open popup
    function openPopup(categoryId) {
        if (!popup) return;
        
        var info = getCategoryInfo(categoryId);
        popupTitle.innerHTML = '<i class="fas ' + info.icon + '"></i> ' + info.name;
        
        // Track category click
        if (window.FCAnalytics) {
            window.FCAnalytics.trackCategoryClick(categoryId, info.name);
        }
        
        var categoryProducts = getProductsByCategory(categoryId);
        
        if (categoryProducts.length > 0) {
            var html = '<div class="products-grid">';
            for (var i = 0; i < categoryProducts.length; i++) {
                var product = categoryProducts[i];
                
                html += '<div class="product-card" data-product-id="' + product.id + '" data-product-name="' + product.name + '">';
                html += '<div class="product-image">';
                if (product.image) {
                    html += '<img src="' + product.image + '" alt="' + product.name + '">';
                } else {
                    html += '<i class="fas fa-cube placeholder-icon"></i>';
                }
                if (product.badge) {
                    html += '<span class="product-badge">' + product.badge + '</span>';
                }
                html += '</div>';
                html += '<div class="product-info">';
                html += '<h4>' + product.name;
                // Wishlist button inline
                if (typeof FCWishlist !== 'undefined') {
                    var isActive = FCWishlist.isInWishlist(product.id);
                    html += ' <button class="wishlist-btn-title ' + (isActive ? 'active' : '') + '" data-wishlist-btn data-product-id="' + product.id + '" onclick="FCWishlist.handleClick(event, \'' + product.id + '\')" title="' + (isActive ? 'Retirer des favoris' : 'Ajouter aux favoris') + '">';
                    html += '<i class="fas fa-heart"></i>';
                    html += '</button>';
                }
                html += '</h4>';
                html += '<p>' + (product.description || '').replace(/\n/g, ' ') + '</p>';
                
                // Affichage du prix avec promo
                if (product.originalPrice) {
                    html += '<div class="product-price promo-price">';
                    html += '<span class="old-price">' + product.originalPrice + '</span>';
                    html += '<span class="new-price">' + (product.price || '') + '</span>';
                    html += '</div>';
                } else {
                    html += '<div class="product-price">' + (product.price || '') + '</div>';
                }
                
                html += '<div class="product-actions">';;
                html += '<a href="produit.html?id=' + product.id + '" class="btn-personnaliser">';
                html += '<i class="fas fa-magic"></i> Personnaliser mon objet';
                html += '</a>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
                
                // Cache product data for wishlist
                if (typeof window.FCProductsCache === 'undefined') {
                    window.FCProductsCache = {};
                }
                window.FCProductsCache[product.id] = product;
            }
            html += '</div>';
            popupBody.innerHTML = html;
            
            // Add click listeners to product cards for tracking
            popupBody.querySelectorAll('.product-card').forEach(function(card) {
                card.addEventListener('click', function(e) {
                    // Don't track if clicking on button
                    if (e.target.closest('.btn-personnaliser')) {
                        return;
                    }
                    var productId = this.getAttribute('data-product-id');
                    var productName = this.getAttribute('data-product-name');
                    if (window.FCAnalytics && productId) {
                        window.FCAnalytics.trackProductClick(productId, productName);
                    }
                });
            });
        } else {
            popupBody.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>Produits à venir...</p></div>';
        }
        
        popup.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    // Close popup
    function closePopup() {
        if (!popup) return;
        popup.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // Close popup events
    if (popupClose) {
        popupClose.addEventListener('click', closePopup);
    }
    if (popupOverlay) {
        popupOverlay.addEventListener('click', closePopup);
    }
    
    // Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && popup && popup.classList.contains('active')) {
            closePopup();
        }
    });
    
    // Initialize
    console.log('Initializing...');
    loadData();
});
