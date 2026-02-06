/* ============================================
   FAMILY CUSTOM - Catégories Carrousel (Firebase)
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // State
    let categories = [];
    
    // DOM Elements
    var categoriesGrid = document.getElementById('categories-grid');
    var carouselPrev = document.querySelector('.carousel-prev');
    var carouselNext = document.querySelector('.carousel-next');
    var carouselDots = document.getElementById('carousel-dots');
    
    // Show loading state (skeleton)
    if (categoriesGrid) {
        var skeletonHTML = '';
        for (var s = 0; s < 4; s++) {
            skeletonHTML += '<div class="category-skeleton"><div class="skeleton-icon"></div><div class="skeleton-title"></div><div class="skeleton-desc"></div><div class="skeleton-btn"></div></div>';
        }
        categoriesGrid.innerHTML = skeletonHTML;
    }
    
    // Load data from Firebase
    async function loadData() {
        const db = window.FirebaseDB;
        
        if (!db) {
            console.error('Firebase DB not available');
            renderCategories();
            return;
        }
        
        try {
            // Load categories
            const catSnapshot = await db.collection('categories').get();
            
            if (!catSnapshot.empty) {
                categories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } else {
                categories = [];
            }
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
            categories = [];
        }
        
        renderCategories();
        // Attendre que le DOM soit mis à jour avant d'initialiser le carrousel
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                initCarousel();
                
                // Si le contenu est caché (compte à rebours), réinitialiser le carrousel quand il sera visible
                if (categoriesGrid && categoriesGrid.offsetWidth === 0) {
                    
                    // Observer les changements de style pour réinitialiser quand visible
                    const observer = new MutationObserver(() => {
                        if (categoriesGrid.offsetWidth > 0) {
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
        var launchDate = new Date('2026-02-07T12:00:00'); // 24h countdown
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
            
            html += '<div class="category-tile ' + textClass + '" role="link" tabindex="0" aria-label="' + catName + '" data-category="' + cat.id + '" data-slug="' + cat.slug + '"' + (customStyle ? ' style="' + customStyle + '"' : '') + '>';
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
        
        html += '<div class="category-tile gift-card-tile" role="link" tabindex="0" aria-label="Cartes Cadeaux" data-category="gift-card">';
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
        // Bouton "Me prévenir" — intercepter avant le clic tuile
        categoriesGrid.querySelectorAll('.coming-soon-btn').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showNotifyPopup();
            });
            btn.style.cursor = 'pointer';
        });

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
            
            // Keyboard navigation (Enter / Space)
            tile.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
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

    // ===== ME PRÉVENIR — INSCRIPTION NEWSLETTER =====
    function showNotifyPopup() {
        // Supprimer popup existant
        var existing = document.querySelector('.notify-popup-overlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'notify-popup-overlay';
        overlay.innerHTML = 
            '<div class="notify-popup">' +
                '<button class="notify-popup-close" aria-label="Fermer">&times;</button>' +
                '<div class="notify-popup-icon">🔔</div>' +
                '<h3>Soyez prévenu(e) !</h3>' +
                '<p>Recevez une alerte dès que la collection Fête des Grands-Mères sera disponible.</p>' +
                '<form class="notify-popup-form">' +
                    '<input type="email" placeholder="Votre adresse email" required autocomplete="email">' +
                    '<button type="submit"><i class="fas fa-bell"></i> Me prévenir</button>' +
                '</form>' +
                '<p class="notify-popup-hint">Pas de spam, promis 🤞</p>' +
            '</div>';

        document.body.appendChild(overlay);
        setTimeout(function() { overlay.classList.add('show'); }, 10);

        // Focus sur l'input
        var input = overlay.querySelector('input[type="email"]');
        setTimeout(function() { input.focus(); }, 100);

        // Fermer
        overlay.querySelector('.notify-popup-close').addEventListener('click', function() { closeNotifyPopup(overlay); });
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeNotifyPopup(overlay);
        });

        // Submit
        overlay.querySelector('.notify-popup-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            var email = input.value.trim();
            if (!email) return;

            var btn = this.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';

            try {
                var db = window.FirebaseDB || firebase.firestore();
                // Vérifier doublon
                var snap = await db.collection('newsletter').where('email', '==', email).get();
                if (snap.empty) {
                    await db.collection('newsletter').add({
                        email: email,
                        source: 'mamie-notify',
                        subscribedAt: new Date().toISOString()
                    });
                }
                // Succès
                overlay.querySelector('.notify-popup').innerHTML = 
                    '<div class="notify-popup-icon">✅</div>' +
                    '<h3>C\'est noté !</h3>' +
                    '<p>Vous serez prévenu(e) par email dès l\'ouverture de la collection.</p>';
                setTimeout(function() { closeNotifyPopup(overlay); }, 2500);
            } catch (err) {
                console.error('Newsletter error:', err);
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bell"></i> Me prévenir';
                input.style.borderColor = '#dc3545';
                input.placeholder = 'Erreur, réessayez...';
            }
        });
    }

    function closeNotifyPopup(overlay) {
        overlay.classList.remove('show');
        setTimeout(function() { overlay.remove(); }, 300);
    }
    
    // ===== CARROUSEL =====
    function initCarousel() {
        if (!categoriesGrid || !carouselPrev || !carouselNext) {
            return;
        }
        
        const tiles = categoriesGrid.querySelectorAll('.category-tile');
        
        if (tiles.length === 0) {
            return;
        }
        
        // Créer les dots
        if (carouselDots) {
            let dotsHtml = '';
            const visibleTiles = getVisibleTiles();
            const totalDots = Math.ceil(tiles.length / visibleTiles);
            
            for (let i = 0; i < totalDots; i++) {
                dotsHtml += '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="Page ' + (i + 1) + ' sur ' + totalDots + '"></button>';
            }
            carouselDots.setAttribute('role', 'tablist');
            carouselDots.setAttribute('aria-label', 'Navigation catégories');
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
        
        // Calcul de s'il y a du contenu à scroller
        const hasOverflow = scrollWidth > clientWidth + 5; // 5px de tolérance
        
        // Désactiver/activer les flèches
        // Précédent : désactivé si on est au début
        carouselPrev.disabled = scrollLeft <= 5;
        
        // Suivant : désactivé si on est à la fin OU s'il n'y a pas de débordement
        carouselNext.disabled = !hasOverflow || scrollLeft >= scrollWidth - clientWidth - 5;
        
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
                        dotsHtml += '<button class="carousel-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '" aria-label="Page ' + (i + 1) + ' sur ' + totalDots + '"></button>';
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
    
    // Initialize
    loadData();
});
