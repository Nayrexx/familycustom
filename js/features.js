/* ============================================
   FAMILY CUSTOM - Features JavaScript
   Animations, Newsletter, Promo, etc.
   ============================================ */

(function() {
    'use strict';
    
    // ==========================================
    // 1. ANIMATIONS AU SCROLL
    // ==========================================
    
    function initScrollAnimations() {
        const reveals = document.querySelectorAll('.scroll-reveal');
        
        if (reveals.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    // Optionally unobserve after revealed
                    // observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        reveals.forEach(el => observer.observe(el));
    }
    
    // Auto-add scroll-reveal to common elements
    function autoAddScrollReveal() {
        const selectors = [
            '.feature-card',
            '.trust-item',
            '.category-card',
            '.footer-col',
            '.guarantee-item'
        ];
        
        selectors.forEach((selector, selectorIndex) => {
            document.querySelectorAll(selector).forEach((el, index) => {
                if (!el.classList.contains('scroll-reveal')) {
                    el.classList.add('scroll-reveal');
                    el.classList.add(`delay-${(index % 4) + 1}`);
                }
            });
        });
    }
    
    // ==========================================
    // 2. NEWSLETTER
    // ==========================================
    
    function initNewsletter() {
        const form = document.getElementById('newsletter-form');
        if (!form) return;
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = form.querySelector('input[type="email"]').value;
            const button = form.querySelector('button');
            const originalText = button.innerHTML;
            
            // Validate email
            if (!isValidEmail(email)) {
                showNewsletterMessage('Veuillez entrer une adresse email valide', 'error');
                return;
            }
            
            // Show loading
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;
            
            try {
                // Store in Firebase if available
                if (window.FirebaseDB) {
                    try {
                        await window.FirebaseDB.collection('newsletter').add({
                            email: email,
                            subscribedAt: new Date().toISOString(),
                            source: window.location.pathname
                        });
                    } catch (firebaseError) {
                        console.warn('Firebase non disponible, stockage local uniquement:', firebaseError);
                    }
                }
                
                // Store locally
                const subscribers = JSON.parse(localStorage.getItem('fc_newsletter_emails') || '[]');
                if (!subscribers.includes(email)) {
                    subscribers.push(email);
                    localStorage.setItem('fc_newsletter_emails', JSON.stringify(subscribers));
                }
                
                // Success
                form.classList.add('success');
                showNewsletterMessage('🎉 Merci ! Vous recevrez bientôt nos offres exclusives.', 'success');
                form.querySelector('input').value = '';
                
                // Store locally to not show popup again
                localStorage.setItem('fc_newsletter_subscribed', 'true');
                
            } catch (error) {
                console.error('Newsletter error:', error);
                showNewsletterMessage('Une erreur est survenue. Réessayez.', 'error');
            } finally {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        });
    }
    
    function showNewsletterMessage(text, type) {
        let msg = document.querySelector('.newsletter-success-msg');
        if (!msg) {
            msg = document.createElement('p');
            msg.className = 'newsletter-success-msg';
            document.querySelector('.newsletter-form')?.after(msg);
        }
        msg.textContent = text;
        msg.className = `newsletter-success-msg show ${type}`;
        msg.style.color = type === 'error' ? '#ff6b6b' : '#4caf50';
    }
    
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // ==========================================
    // 3. PARTAGE SOCIAL
    // ==========================================
    
    window.shareOnSocial = function(platform) {
        const url = encodeURIComponent(window.location.href);
        const title = encodeURIComponent(document.title);
        const text = encodeURIComponent('Découvrez cette création personnalisée chez Family Custom !');
        
        let shareUrl = '';
        
        switch(platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${text}%20${url}`;
                break;
            case 'pinterest':
                const image = document.querySelector('.product-image, .mockup-background')?.src || '';
                shareUrl = `https://pinterest.com/pin/create/button/?url=${url}&media=${encodeURIComponent(image)}&description=${text}`;
                break;
            case 'copy':
                copyToClipboard(window.location.href);
                return;
        }
        
        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    };
    
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector('.social-share-btn.copy-link');
            if (btn) {
                btn.classList.add('copied');
                btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<i class="fas fa-link"></i>';
                }, 2000);
            }
        });
    }
    
    // ==========================================
    // 4. ESTIMATION DE LIVRAISON
    // ==========================================
    
    window.getDeliveryEstimate = function() {
        const today = new Date();
        const productionDays = 5; // Jours de production
        const shippingDays = 3;   // Jours de livraison
        
        let deliveryDate = new Date(today);
        let daysAdded = 0;
        
        // Add business days (skip weekends)
        while (daysAdded < productionDays + shippingDays) {
            deliveryDate.setDate(deliveryDate.getDate() + 1);
            const dayOfWeek = deliveryDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                daysAdded++;
            }
        }
        
        // Format date
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const formattedDate = deliveryDate.toLocaleDateString('fr-FR', options);
        
        // Calculate date range (delivery window of 2 days)
        let endDate = new Date(deliveryDate);
        endDate.setDate(endDate.getDate() + 2);
        const formattedEndDate = endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        
        return {
            date: formattedDate,
            endDate: formattedEndDate,
            text: `Livraison estimée : ${formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)}`
        };
    };
    
    function renderDeliveryEstimate() {
        const container = document.querySelector('.delivery-estimate-date');
        if (!container) return;
        
        const estimate = window.getDeliveryEstimate();
        container.innerHTML = `<span>${estimate.date}</span>`;
    }
    
    // ==========================================
    // 5. SYSTÈME DE CODE PROMO
    // ==========================================
    
    // Valid promo codes (in production, validate server-side)
    const PROMO_CODES = {
        'BIENVENUE10': { discount: 10, type: 'percent', description: '-10% de réduction' },
        'FAMILY15': { discount: 15, type: 'percent', description: '-15% de réduction' },
        'PROMO20': { discount: 20, type: 'percent', description: '-20% de réduction' },
        'LIVRAISON': { discount: 9.90, type: 'shipping', description: 'Livraison offerte' }
    };
    
    window.FCPromo = {
        currentPromo: null,
        
        init: function() {
            // Load saved promo from localStorage
            const saved = localStorage.getItem('fc_promo_code');
            if (saved) {
                const promo = JSON.parse(saved);
                if (PROMO_CODES[promo.code]) {
                    this.currentPromo = { code: promo.code, ...PROMO_CODES[promo.code] };
                }
            }
            
            this.setupUI();
        },
        
        setupUI: function() {
            const toggle = document.querySelector('.promo-code-toggle');
            const form = document.querySelector('.promo-code-form');
            
            if (toggle && form) {
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('open');
                    form.classList.toggle('show');
                });
                
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const input = form.querySelector('input');
                    this.applyCode(input.value.trim().toUpperCase());
                });
            }
            
            // Render if already has promo
            if (this.currentPromo) {
                this.renderAppliedPromo();
            }
        },
        
        applyCode: function(code) {
            const msgEl = document.querySelector('.promo-code-message');
            
            if (!code) {
                this.showMessage('Veuillez entrer un code promo', 'error');
                return;
            }
            
            if (PROMO_CODES[code]) {
                this.currentPromo = { code: code, ...PROMO_CODES[code] };
                localStorage.setItem('fc_promo_code', JSON.stringify({ code: code }));
                
                this.showMessage(`Code ${code} appliqué ! ${PROMO_CODES[code].description}`, 'success');
                this.renderAppliedPromo();
                
                // Refresh cart display
                if (typeof renderCart === 'function') {
                    renderCart();
                }
            } else {
                this.showMessage('Code promo invalide ou expiré', 'error');
            }
        },
        
        removeCode: function() {
            this.currentPromo = null;
            localStorage.removeItem('fc_promo_code');
            
            const applied = document.querySelector('.promo-applied');
            if (applied) applied.remove();
            
            // Refresh cart
            if (typeof renderCart === 'function') {
                renderCart();
            }
        },
        
        calculateDiscount: function(subtotal, shipping) {
            if (!this.currentPromo) return { subtotal: 0, shipping: 0 };
            
            if (this.currentPromo.type === 'percent') {
                return {
                    subtotal: subtotal * (this.currentPromo.discount / 100),
                    shipping: 0
                };
            } else if (this.currentPromo.type === 'shipping') {
                return {
                    subtotal: 0,
                    shipping: Math.min(this.currentPromo.discount, shipping)
                };
            }
            
            return { subtotal: 0, shipping: 0 };
        },
        
        showMessage: function(text, type) {
            let msg = document.querySelector('.promo-code-message');
            if (!msg) return;
            
            msg.textContent = text;
            msg.className = `promo-code-message show ${type}`;
            
            if (type === 'success') {
                setTimeout(() => msg.classList.remove('show'), 3000);
            }
        },
        
        renderAppliedPromo: function() {
            const section = document.querySelector('.promo-code-section');
            if (!section || !this.currentPromo) return;
            
            // Remove existing
            const existing = section.querySelector('.promo-applied');
            if (existing) existing.remove();
            
            const html = `
                <div class="promo-applied">
                    <div class="promo-info">
                        <i class="fas fa-check-circle"></i>
                        <span class="promo-code">${this.currentPromo.code}</span>
                        <span class="promo-discount">${this.currentPromo.description}</span>
                    </div>
                    <button class="remove-promo" onclick="FCPromo.removeCode()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            section.insertAdjacentHTML('beforeend', html);
            
            // Hide form
            const form = section.querySelector('.promo-code-form');
            const toggle = section.querySelector('.promo-code-toggle');
            if (form) form.classList.remove('show');
            if (toggle) toggle.classList.remove('open');
        }
    };
    
    // ==========================================
    // INITIALIZE
    // ==========================================
    
    document.addEventListener('DOMContentLoaded', function() {
        autoAddScrollReveal();
        initScrollAnimations();
        initNewsletter();
        renderDeliveryEstimate();
        
        if (window.FCPromo) {
            window.FCPromo.init();
        }
    });
    
})();
