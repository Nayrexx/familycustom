/* ============================================
   FAMILY CUSTOM - Real Customer Reviews System
   Firebase-based, verified purchases, moderated
   ============================================ */

window.FCReviews = (function() {
    'use strict';

    const db = window.FirebaseDB;

    // === DISPLAY REVIEWS ON PRODUCT PAGE ===
    async function displayProductReviews(productId) {
        // On PDP page, inject inside the reviews tab panel
        const pdpTarget = document.getElementById('product-reviews-section');
        const container = pdpTarget || document.querySelector('.product-detail, .product-page, .personnaliser-page, .pdp-page');
        if (!container || !productId || !db) return;

        // Don't duplicate
        if (document.querySelector('.fc-reviews-section')) return;

        let reviews = [];
        try {
            const snap = await db.collection('reviews')
                .where('productId', '==', productId)
                .where('approved', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            snap.forEach(doc => reviews.push({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.log('Reviews index needed or no reviews yet:', e.message);
        }

        // Also load global stats
        let stats = { count: 0, avg: 0, breakdown: [0,0,0,0,0] };
        try {
            const statsDoc = await db.collection('reviewStats').doc(productId).get();
            if (statsDoc.exists) stats = statsDoc.data();
        } catch (e) { /* no stats yet */ }

        const section = document.createElement('div');
        section.className = 'fc-reviews-section';

        const avgRating = stats.avg ? stats.avg.toFixed(1) : (reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0');
        const totalCount = stats.count || reviews.length;

        section.innerHTML = `
            <div class="fc-reviews-header">
                <h3><i class="fas fa-star"></i> Avis clients</h3>
                ${totalCount > 0 ? `
                <div class="fc-reviews-summary">
                    <div class="fc-reviews-score">
                        <span class="fc-score-number">${avgRating}</span>
                        <span class="fc-score-stars">${renderStars(parseFloat(avgRating))}</span>
                    </div>
                    <span class="fc-reviews-total">${totalCount} avis vérifiés</span>
                </div>
                ${renderBreakdown(stats.breakdown || [0,0,0,0,0], totalCount)}
                ` : ''}
            </div>

            <div class="fc-review-form-container">
                <button class="fc-btn-write-review" id="btn-write-review">
                    <i class="fas fa-pen"></i> Écrire un avis
                </button>
                <div class="fc-review-form" id="review-form" style="display:none">
                    <h4>Votre avis</h4>
                    <div class="fc-star-selector" id="star-selector">
                        ${[1,2,3,4,5].map(i => `<span class="fc-star-select" data-rating="${i}"><i class="far fa-star"></i></span>`).join('')}
                    </div>
                    <textarea id="review-text" placeholder="Partagez votre expérience..." rows="4" maxlength="500"></textarea>
                    <div class="fc-review-form-row">
                        <input type="text" id="review-name" placeholder="Votre prénom" maxlength="30" required>
                        <input type="email" id="review-email" placeholder="Email (non affiché)" required>
                    </div>
                    <div class="fc-review-form-row">
                        <input type="text" id="review-order" placeholder="N° de commande (optionnel)" maxlength="20">
                    </div>
                    <button class="fc-btn-submit-review" id="btn-submit-review">
                        <i class="fas fa-paper-plane"></i> Publier mon avis
                    </button>
                    <p class="fc-review-notice">Votre avis sera publié après vérification.</p>
                </div>
            </div>

            <div class="fc-reviews-list" id="reviews-list">
                ${reviews.length > 0 ? reviews.map(r => renderReview(r)).join('') : '<p class="fc-no-reviews">Soyez le premier à donner votre avis !</p>'}
            </div>
        `;

        // Insert before recommendations or at end
        const insertBefore = container.querySelector('.recommendations-section, .recently-viewed-section, footer');
        if (insertBefore) {
            container.insertBefore(section, insertBefore);
        } else {
            container.appendChild(section);
        }

        // Setup form interactions
        setupReviewForm(productId);
    }

    function renderStars(rating) {
        let html = '';
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) html += '<i class="fas fa-star"></i>';
            else if (rating >= i - 0.5) html += '<i class="fas fa-star-half-alt"></i>';
            else html += '<i class="far fa-star"></i>';
        }
        return html;
    }

    function renderBreakdown(breakdown, total) {
        if (!total) return '';
        return `<div class="fc-rating-breakdown">
            ${[5,4,3,2,1].map(stars => {
                const count = breakdown[stars - 1] || 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return `<div class="fc-breakdown-row">
                    <span class="fc-breakdown-label">${stars} <i class="fas fa-star"></i></span>
                    <div class="fc-breakdown-bar"><div class="fc-breakdown-fill" style="width:${pct}%"></div></div>
                    <span class="fc-breakdown-pct">${pct}%</span>
                </div>`;
            }).join('')}
        </div>`;
    }

    function renderReview(review) {
        const date = review.createdAt ? new Date(typeof review.createdAt === 'string' ? review.createdAt : review.createdAt.toDate()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
        const initial = (review.customerName || 'A').charAt(0).toUpperCase();

        return `<div class="fc-review-item">
            <div class="fc-review-top">
                <div class="fc-review-author">
                    <span class="fc-review-avatar">${initial}</span>
                    <div>
                        <span class="fc-review-name">${escapeHtml(review.customerName || 'Anonyme')}</span>
                        ${review.verified ? '<span class="fc-verified"><i class="fas fa-check-circle"></i> Achat vérifié</span>' : ''}
                    </div>
                </div>
                <div class="fc-review-meta">
                    <span class="fc-review-stars">${renderStars(review.rating)}</span>
                    <span class="fc-review-date">${date}</span>
                </div>
            </div>
            <p class="fc-review-text">${escapeHtml(review.text || '')}</p>
            ${review.response ? `<div class="fc-review-response"><strong><i class="fas fa-reply"></i> Family Custom :</strong> ${escapeHtml(review.response)}</div>` : ''}
        </div>`;
    }

    // === REVIEW FORM ===
    function setupReviewForm(productId) {
        let selectedRating = 0;

        const btnWrite = document.getElementById('btn-write-review');
        const form = document.getElementById('review-form');
        const stars = document.querySelectorAll('.fc-star-select');
        const btnSubmit = document.getElementById('btn-submit-review');

        if (btnWrite && form) {
            btnWrite.addEventListener('click', () => {
                form.style.display = form.style.display === 'none' ? 'block' : 'none';
                btnWrite.style.display = 'none';
            });
        }

        // Star selection
        stars.forEach(star => {
            star.addEventListener('mouseenter', () => {
                const rating = parseInt(star.dataset.rating);
                highlightStars(rating);
            });
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.rating);
                highlightStars(selectedRating);
                stars.forEach(s => s.classList.remove('selected'));
                star.classList.add('selected');
            });
        });

        const selector = document.getElementById('star-selector');
        if (selector) {
            selector.addEventListener('mouseleave', () => {
                highlightStars(selectedRating);
            });
        }

        // Submit
        if (btnSubmit) {
            btnSubmit.addEventListener('click', async () => {
                const text = (document.getElementById('review-text').value || '').trim();
                const name = (document.getElementById('review-name').value || '').trim();
                const email = (document.getElementById('review-email').value || '').trim();
                const orderNum = (document.getElementById('review-order').value || '').trim();

                if (!selectedRating) return showFormError('Sélectionnez une note');
                if (!text || text.length < 10) return showFormError('Votre avis doit faire au moins 10 caractères');
                if (!name) return showFormError('Entrez votre prénom');
                if (!email || !email.includes('@')) return showFormError('Entrez un email valide');

                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

                try {
                    // Check if order number exists and is paid
                    let verified = false;
                    if (orderNum && db) {
                        const orderSnap = await db.collection('orders')
                            .where('orderNumber', '==', orderNum)
                            .where('status', '==', 'paid')
                            .limit(1)
                            .get();
                        verified = !orderSnap.empty;
                    }

                    await db.collection('reviews').add({
                        productId: productId,
                        customerName: name,
                        customerEmail: email,
                        orderNumber: orderNum || null,
                        rating: selectedRating,
                        text: text,
                        verified: verified,
                        approved: false, // Needs admin approval
                        createdAt: new Date().toISOString(),
                        response: null
                    });

                    form.innerHTML = `
                        <div class="fc-review-success">
                            <i class="fas fa-check-circle"></i>
                            <p>Merci pour votre avis ! Il sera publié après vérification.</p>
                        </div>
                    `;
                } catch (e) {
                    console.error('Review submit error:', e);
                    showFormError('Erreur lors de l\'envoi. Réessayez.');
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<i class="fas fa-paper-plane"></i> Publier mon avis';
                }
            });
        }
    }

    function highlightStars(rating) {
        document.querySelectorAll('.fc-star-select').forEach(star => {
            const val = parseInt(star.dataset.rating);
            star.querySelector('i').className = val <= rating ? 'fas fa-star' : 'far fa-star';
        });
    }

    function showFormError(msg) {
        let err = document.querySelector('.fc-review-error');
        if (!err) {
            err = document.createElement('p');
            err.className = 'fc-review-error';
            document.getElementById('btn-submit-review').parentNode.insertBefore(err, document.getElementById('btn-submit-review'));
        }
        err.textContent = msg;
        setTimeout(() => err.remove(), 3000);
    }

    // === POST-PURCHASE REVIEW PROMPT (success page) ===
    function showPostPurchasePrompt(order) {
        if (!order || !order.items || !order.items.length) return;

        // Save order info for later review
        const pending = JSON.parse(localStorage.getItem('fc_pending_reviews') || '[]');
        order.items.forEach(item => {
            if (!pending.find(p => p.orderNumber === order.orderNumber && p.productName === item.name)) {
                pending.push({
                    productId: item.id || null,
                    productName: item.name,
                    orderNumber: order.orderNumber,
                    customerName: order.customer ? order.customer.firstName : '',
                    customerEmail: order.customer ? order.customer.email : '',
                    date: new Date().toISOString()
                });
            }
        });
        localStorage.setItem('fc_pending_reviews', JSON.stringify(pending));

        // Show review reminder banner
        const banner = document.createElement('div');
        banner.className = 'fc-review-reminder';
        banner.innerHTML = `
            <div class="fc-reminder-content">
                <i class="fas fa-star fc-reminder-icon"></i>
                <div>
                    <strong>Votre avis compte !</strong>
                    <p>Une fois votre produit reçu, n'hésitez pas à laisser un avis sur la page du produit.</p>
                </div>
            </div>
        `;
        const details = document.getElementById('order-details');
        if (details) {
            details.parentNode.insertBefore(banner, details.nextSibling);
        }
    }

    // === RATING BADGES ON PRODUCT CARDS ===
    async function displayRatingBadges() {
        const cards = document.querySelectorAll('.product-card[data-product-id], .category-card[data-product-id]');
        if (!cards.length || !db) return;

        // Collect unique product IDs
        const productIds = new Set();
        cards.forEach(card => {
            const id = card.dataset.productId;
            if (id) productIds.add(id);
        });

        // Fetch stats for all products
        const statsMap = {};
        for (const pid of productIds) {
            try {
                const doc = await db.collection('reviewStats').doc(pid).get();
                if (doc.exists) statsMap[pid] = doc.data();
            } catch (e) { /* no stats */ }
        }

        cards.forEach(card => {
            if (card.querySelector('.fc-rating-badge')) return;
            const pid = card.dataset.productId;
            const stats = statsMap[pid];
            if (!stats || !stats.count) return;

            const badge = document.createElement('div');
            badge.className = 'fc-rating-badge';
            badge.innerHTML = `${renderStars(stats.avg)} <span class="fc-badge-count">(${stats.count})</span>`;
            card.appendChild(badge);
        });
    }

    // === HELPERS ===
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // === PUBLIC API ===
    return {
        displayProductReviews: displayProductReviews,
        showPostPurchasePrompt: showPostPurchasePrompt,
        displayRatingBadges: displayRatingBadges
    };
})();
