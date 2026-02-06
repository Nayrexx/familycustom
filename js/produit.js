/* ============================================
   FAMILY CUSTOM - Product Detail Page JS
   ============================================ */

(function() {
    'use strict';

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id') || urlParams.get('product');

    if (!productId) {
        window.location.href = 'index.html#categories';
        return;
    }

    let product = null;

    document.addEventListener('DOMContentLoaded', async function() {
        const db = window.FirebaseDB;
        if (!db) { showError(); return; }

        try {
            const doc = await db.collection('products').doc(productId).get();
            if (!doc.exists) { showError(); return; }

            product = { id: doc.id, ...doc.data() };
            renderPDP();

            // Track view
            if (window.FCTracking) {
                const priceNum = parseFloat((product.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                FCTracking.viewProduct({ id: product.id, name: product.name, price: priceNum });
            }

            // Analytics - track product click
            if (window.FCAnalytics && FCAnalytics.trackProductClick) {
                FCAnalytics.trackProductClick(product.id, product.name);
            }

            // Recently viewed
            if (typeof FCRecentlyViewed !== 'undefined') {
                FCRecentlyViewed.addProduct(product);
            }

            // Reviews
            if (typeof FCReviews !== 'undefined') {
                FCReviews.displayProductReviews(productId);
            }
        } catch (e) {
            console.error('Error loading product:', e);
            showError();
        }
    });

    function showError() {
        const main = document.querySelector('.pdp-page .container');
        if (main) {
            main.innerHTML = '<div style="text-align:center;padding:4rem 1rem"><i class="fas fa-exclamation-circle" style="font-size:2.5rem;color:var(--gray-400);margin-bottom:1rem;display:block"></i><p style="font-size:1.1rem;margin-bottom:1rem">Produit non trouv\u00e9</p><a href="index.html#categories" style="color:var(--color-accent)">Retour aux cr\u00e9ations</a></div>';
        }
    }

    function renderPDP() {
        // Breadcrumb
        const breadcrumbEl = document.getElementById('pdp-breadcrumb-name');
        if (breadcrumbEl) breadcrumbEl.textContent = product.name;

        // Page title & meta
        document.title = product.name + ' - Family Custom';

        // Update OG tags dynamically
        updateMeta('og:title', product.name + ' - Family Custom');
        updateMeta('og:description', (product.description || '').substring(0, 160));
        if (product.image) updateMeta('og:image', product.image);

        renderGallery();
        renderInfo();
        renderTrust();
        renderDetails();
        renderShare();
        setupZoom();
        injectProductSchema();
    }

    function updateMeta(property, content) {
        let tag = document.querySelector('meta[property="' + property + '"]');
        if (tag) tag.setAttribute('content', content);
    }

    // ===== Gallery =====
    function renderGallery() {
        const mainImg = document.getElementById('pdp-main-img');
        const thumbsContainer = document.getElementById('pdp-thumbs');
        const badgeEl = document.getElementById('pdp-badge');

        let images = [];
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images;
        } else if (product.image) {
            images = [product.image];
        }

        if (images.length === 0) {
            mainImg.src = 'https://via.placeholder.com/600x600/f5f0e8/c9a87c?text=' + encodeURIComponent(product.name || 'Produit');
            mainImg.alt = product.name;
        } else {
            mainImg.src = images[0];
            mainImg.alt = product.name;
        }

        // Badge
        if (product.badge) {
            badgeEl.textContent = product.badge;
            badgeEl.style.display = 'block';
        }

        // Sale badge
        if (product.originalPrice && !product.badge) {
            const orig = parseFloat((product.originalPrice || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            const curr = parseFloat((product.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            if (orig > curr && orig > 0) {
                const pct = Math.round((1 - curr / orig) * 100);
                badgeEl.textContent = '-' + pct + '%';
                badgeEl.style.display = 'block';
            }
        }

        // Thumbnails
        if (images.length > 1 && thumbsContainer) {
            thumbsContainer.innerHTML = images.map(function(img, i) {
                return '<div class="pdp-thumb ' + (i === 0 ? 'active' : '') + '" data-src="' + img + '"><img src="' + img + '" alt="Vue ' + (i + 1) + '"></div>';
            }).join('');

            thumbsContainer.addEventListener('click', function(e) {
                var thumb = e.target.closest('.pdp-thumb');
                if (!thumb) return;
                mainImg.src = thumb.dataset.src;
                thumbsContainer.querySelectorAll('.pdp-thumb').forEach(function(t) { t.classList.remove('active'); });
                thumb.classList.add('active');
            });
        }
    }

    // ===== Info =====
    function renderInfo() {
        // Title
        var titleEl = document.getElementById('pdp-title');
        titleEl.textContent = product.name;

        // Wishlist button
        if (typeof FCWishlist !== 'undefined') {
            var wBtn = document.createElement('button');
            wBtn.className = 'wishlist-btn-inline ' + (FCWishlist.isInWishlist(product.id) ? 'active' : '');
            wBtn.innerHTML = '<i class="fas fa-heart"></i>';
            wBtn.title = FCWishlist.isInWishlist(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris';
            wBtn.onclick = function() {
                FCWishlist.toggle(product);
                this.classList.toggle('active');
                this.title = this.classList.contains('active') ? 'Retirer des favoris' : 'Ajouter aux favoris';
            };
            titleEl.appendChild(wBtn);
        }

        // Rating summary
        renderRatingSummary();

        // Price
        var priceContainer = document.getElementById('pdp-price');
        if (product.originalPrice) {
            priceContainer.innerHTML = '<span class="pdp-current-price">' + (product.price || '') + '</span><span class="pdp-original-price">' + product.originalPrice + '</span>';
            // Discount badge
            var orig = parseFloat((product.originalPrice || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            var curr = parseFloat((product.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            if (orig > curr && orig > 0) {
                var pct = Math.round((1 - curr / orig) * 100);
                priceContainer.innerHTML += '<span class="pdp-discount-badge">-' + pct + '%</span>';
            }
        } else {
            priceContainer.innerHTML = '<span class="pdp-current-price">' + (product.price || '') + '</span>';
        }

        // Description
        var descEl = document.getElementById('pdp-description');
        var descText = (product.description || '').replace(/\n/g, '<br>');
        descEl.innerHTML = descText;

        // Variants preview
        renderVariantsPreview();

        // CTA link
        var ctaLink = document.getElementById('pdp-cta');
        ctaLink.href = 'personnaliser.html?id=' + product.id;
    }

    async function renderRatingSummary() {
        var container = document.getElementById('pdp-rating');
        if (!container) return;
        try {
            var db = window.FirebaseDB;
            if (!db) return;
            var doc = await db.collection('reviewStats').doc(productId).get();
            if (!doc.exists || !doc.data().count) {
                container.innerHTML = '<span class="pdp-stars">\u2b50\u2b50\u2b50\u2b50\u2b50</span><span class="pdp-rating-count" onclick="document.getElementById(\'product-reviews-section\').scrollIntoView({behavior:\'smooth\'})">Soyez le premier \u00e0 donner votre avis</span>';
                return;
            }
            var data = doc.data();
            var avg = data.avg || 0;
            var count = data.count || 0;
            var starsHtml = '';
            for (var i = 1; i <= 5; i++) {
                if (i <= Math.floor(avg)) starsHtml += '<i class="fas fa-star"></i>';
                else if (i - avg < 1) starsHtml += '<i class="fas fa-star-half-alt"></i>';
                else starsHtml += '<i class="far fa-star"></i>';
            }
            container.innerHTML = '<span class="pdp-stars">' + starsHtml + '</span><span style="font-weight:600">' + avg.toFixed(1) + '</span><span class="pdp-rating-count" onclick="document.getElementById(\'product-reviews-section\').scrollIntoView({behavior:\'smooth\'})">' + count + ' avis</span>';
        } catch (e) {
            console.error('Rating summary error:', e);
        }
    }

    function renderVariantsPreview() {
        var container = document.getElementById('pdp-variants');
        if (!container) return;
        var html = '';

        if (product.colors && product.colors.length > 0) {
            html += '<div class="pdp-variant-group"><span class="pdp-variant-label"><i class="fas fa-palette"></i> Couleurs</span>';
            product.colors.forEach(function(c) {
                var hex = typeof c === 'object' ? (c.hex || c.value || '#ccc') : c;
                html += '<span class="pdp-color-dot" style="background:' + hex + '" title="' + (typeof c === 'object' ? (c.name || '') : c) + '"></span>';
            });
            html += '</div>';
        }

        if (product.sizes && product.sizes.length > 0) {
            html += '<div class="pdp-variant-group"><span class="pdp-variant-label"><i class="fas fa-ruler"></i> Tailles</span>';
            product.sizes.forEach(function(s) {
                var label = typeof s === 'object' ? (s.value || s.name || s.label || JSON.stringify(s)) : s;
                html += '<span class="pdp-size-tag">' + label + '</span>';
            });
            html += '</div>';
        }

        if (product.materials && product.materials.length > 0) {
            html += '<div class="pdp-variant-group"><span class="pdp-variant-label"><i class="fas fa-tree"></i> Mat\u00e9riaux</span>';
            product.materials.forEach(function(m) {
                var label = typeof m === 'object' ? (m.value || m.name || m.label || JSON.stringify(m)) : m;
                html += '<span class="pdp-material-tag">' + label + '</span>';
            });
            html += '</div>';
        }

        container.innerHTML = html;
    }

    // ===== Trust badges =====
    function renderTrust() {
        // Static content already in HTML
    }

    // ===== Details tabs =====
    function renderDetails() {
        // Features tab
        var featuresPanel = document.getElementById('pdp-panel-features');
        if (featuresPanel) {
            var features = [
                { icon: 'fa-pencil-ruler', text: '100% personnalis\u00e9 selon vos envies' },
                { icon: 'fa-hand-holding-heart', text: 'Fait main en France' },
                { icon: 'fa-gem', text: 'Mat\u00e9riaux de qualit\u00e9 premium' },
                { icon: 'fa-gift', text: 'Id\u00e9al pour un cadeau unique' }
            ];
            if (product.requiresImage) features.push({ icon: 'fa-camera', text: 'Ajoutez votre propre photo' });
            if (product.hasText !== false) features.push({ icon: 'fa-font', text: 'Texte personnalisable' });
            if (product.colors && product.colors.length > 0) features.push({ icon: 'fa-palette', text: product.colors.length + ' couleurs disponibles' });
            if (product.sizes && product.sizes.length > 0) features.push({ icon: 'fa-ruler', text: product.sizes.length + ' tailles disponibles' });

            featuresPanel.innerHTML = '<ul class="pdp-features-list">' + features.map(function(f) {
                return '<li><i class="fas ' + f.icon + '"></i> ' + f.text + '</li>';
            }).join('') + '</ul>';
        }

        // Shipping tab
        var shippingPanel = document.getElementById('pdp-panel-shipping');
        if (shippingPanel) {
            shippingPanel.innerHTML = '<div class="pdp-shipping-info">' +
                '<div class="pdp-shipping-row"><i class="fas fa-truck"></i> Livraison en France m\u00e9tropolitaine et Europe</div>' +
                '<div class="pdp-shipping-row"><i class="fas fa-clock"></i> Exp\u00e9dition sous 3-5 jours ouvr\u00e9s</div>' +
                '<div class="pdp-shipping-row"><i class="fas fa-map-marker-alt"></i> Livraison en point relais ou \u00e0 domicile</div>' +
                '<div class="pdp-shipping-row"><i class="fas fa-undo"></i> Satisfait ou refait</div>' +
                '<div class="pdp-shipping-row"><i class="fas fa-lock"></i> Paiement 100% s\u00e9curis\u00e9 (Stripe)</div>' +
                '</div>';
        }

        // Tabs interaction
        document.querySelectorAll('.pdp-tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var target = this.dataset.tab;
                document.querySelectorAll('.pdp-tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelectorAll('.pdp-tab-panel').forEach(function(p) { p.classList.remove('active'); });
                this.classList.add('active');
                var panel = document.getElementById('pdp-panel-' + target);
                if (panel) panel.classList.add('active');
            });
        });
    }

    // ===== Share =====
    function renderShare() {
        var shareContainer = document.getElementById('pdp-share');
        if (!shareContainer) return;
        var url = encodeURIComponent(window.location.href);
        var title = encodeURIComponent(product.name + ' - Family Custom');

        shareContainer.innerHTML = '<span class="pdp-share-label">Partager :</span>' +
            '<button class="pdp-share-btn" onclick="window.open(\'https://www.facebook.com/sharer/sharer.php?u=' + url + '\',\'_blank\',\'width=600,height=400\')" title="Facebook"><i class="fab fa-facebook-f"></i></button>' +
            '<button class="pdp-share-btn" onclick="window.open(\'https://twitter.com/intent/tweet?url=' + url + '&text=' + title + '\',\'_blank\',\'width=600,height=400\')" title="Twitter"><i class="fab fa-twitter"></i></button>' +
            '<button class="pdp-share-btn" onclick="window.open(\'https://wa.me/?text=' + title + ' ' + url + '\',\'_blank\')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>' +
            '<button class="pdp-share-btn" onclick="navigator.clipboard.writeText(window.location.href).then(function(){alert(\'Lien copi\u00e9 !\');})" title="Copier le lien"><i class="fas fa-link"></i></button>';
    }

    // ===== Zoom =====
    function setupZoom() {
        var mainImage = document.getElementById('pdp-main-img');
        var overlay = document.getElementById('pdp-zoom-overlay');
        var zoomImg = document.getElementById('pdp-zoom-img');
        var closeBtn = document.getElementById('pdp-zoom-close');
        if (!mainImage || !overlay) return;

        mainImage.addEventListener('click', function() {
            zoomImg.src = this.src;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        function closeZoom() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay || e.target === closeBtn || e.target.closest('.pdp-zoom-close')) closeZoom();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeZoom();
        });
    }

    // ===== Dynamic Product Schema (JSON-LD) =====
    async function injectProductSchema() {
        // Remove static placeholder schema
        var oldSchema = document.querySelector('script[type="application/ld+json"]');
        if (oldSchema) oldSchema.remove();

        var priceNum = parseFloat((product.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
        var imageUrl = product.image || 'https://www.family-custom.com/images/IMG_3402.jpeg';
        var images = (product.images && product.images.length > 0) ? product.images : [imageUrl];

        var schema = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            'name': product.name,
            'description': (product.description || 'Création personnalisée Family Custom').substring(0, 5000),
            'image': images,
            'url': 'https://www.family-custom.com/produit.html?id=' + product.id,
            'brand': { '@type': 'Brand', 'name': 'Family Custom' },
            'sku': product.id,
            'offers': {
                '@type': 'Offer',
                'url': 'https://www.family-custom.com/produit.html?id=' + product.id,
                'priceCurrency': 'EUR',
                'price': priceNum.toFixed(2),
                'availability': product.stock === 0 ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
                'seller': { '@type': 'Organization', 'name': 'Family Custom' },
                'shippingDetails': {
                    '@type': 'OfferShippingDetails',
                    'shippingDestination': { '@type': 'DefinedRegion', 'addressCountry': 'FR' },
                    'deliveryTime': {
                        '@type': 'ShippingDeliveryTime',
                        'handlingTime': { '@type': 'QuantitativeValue', 'minValue': 3, 'maxValue': 5, 'unitCode': 'DAY' },
                        'transitTime': { '@type': 'QuantitativeValue', 'minValue': 2, 'maxValue': 5, 'unitCode': 'DAY' }
                    }
                }
            }
        };

        // Add original price if on sale
        if (product.originalPrice) {
            var origNum = parseFloat((product.originalPrice).toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            if (origNum > priceNum) {
                schema.offers.priceValidUntil = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
            }
        }

        // Add review / rating data
        try {
            var db = window.FirebaseDB;
            if (db) {
                var statsDoc = await db.collection('reviewStats').doc(product.id).get();
                if (statsDoc.exists && statsDoc.data().count > 0) {
                    var stats = statsDoc.data();
                    schema.aggregateRating = {
                        '@type': 'AggregateRating',
                        'ratingValue': stats.avg.toFixed(1),
                        'reviewCount': stats.count,
                        'bestRating': '5',
                        'worstRating': '1'
                    };
                }
            }
        } catch (e) { /* silent */ }

        var script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);

        // Breadcrumb Schema
        var breadcrumb = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            'itemListElement': [
                { '@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': 'https://www.family-custom.com/' },
                { '@type': 'ListItem', 'position': 2, 'name': 'Créations', 'item': 'https://www.family-custom.com/categorie.html' },
                { '@type': 'ListItem', 'position': 3, 'name': product.name, 'item': 'https://www.family-custom.com/produit.html?id=' + product.id }
            ]
        };
        var bcScript = document.createElement('script');
        bcScript.type = 'application/ld+json';
        bcScript.textContent = JSON.stringify(breadcrumb);
        document.head.appendChild(bcScript);

        // Also update canonical URL
        var canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) canonical.href = 'https://www.family-custom.com/produit.html?id=' + product.id;
    }

})();
