/* ============================================
   FAMILY CUSTOM - JavaScript Principal
   Interactions modernes et fluides
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    
    // ===== Page Loader =====
    const loader = document.querySelector('.page-loader');
    if (loader) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('hidden');
            }, 500);
        });
    }
    
    // ===== Header Scroll Effect =====
    const header = document.querySelector('.header');
    let lastScroll = 0;
    
    const handleScroll = () => {
        const currentScroll = window.pageYOffset;
        
        // Add/remove scrolled class
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        lastScroll = currentScroll;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // ===== Mobile Menu Toggle =====
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    const navLinks = document.querySelector('.nav-links');
    const navCta = document.querySelector('.nav-cta');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            
            // Toggle mobile menu visibility
            if (navLinks) {
                navLinks.classList.toggle('mobile-visible');
            }
            
            // Empêcher le scroll du body quand le menu est ouvert
            document.body.classList.toggle('menu-open');
        });
        
        // Fermer le menu quand on clique sur un lien (sauf la recherche)
        if (navLinks) {
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    navLinks.classList.remove('mobile-visible');
                    document.body.classList.remove('menu-open');
                });
            });
        }
        
        // Fermer le menu avec la touche Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks?.classList.contains('mobile-visible')) {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-visible');
                document.body.classList.remove('menu-open');
            }
        });
    }
    
    // ===== Mobile Search =====
    const mobileSearchInput = document.querySelector('.mobile-search-input');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = mobileSearchInput.value.trim();
                if (query) {
                    // Fermer le menu et rediriger vers la recherche
                    menuToggle?.classList.remove('active');
                    navLinks?.classList.remove('mobile-visible');
                    document.body.classList.remove('menu-open');
                    
                    // Utiliser la même logique de recherche que desktop
                    window.location.href = `categorie.html?search=${encodeURIComponent(query)}`;
                }
            }
        });
    }
    
    // ===== Smooth Scroll for Anchor Links =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || href.length < 2 || href.includes('?') || href.includes('/')) return;
            e.preventDefault();
            try {
                const target = document.querySelector(href);
            
                if (target) {
                    const headerHeight = header ? header.offsetHeight : 0;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            } catch (err) { /* invalid selector, ignore */ }
        });
    });
    
    // ===== Intersection Observer for Animations =====
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-visible');
                
                // Stagger children if they exist
                const children = entry.target.querySelectorAll('.animate-child');
                children.forEach((child, index) => {
                    child.style.animationDelay = `${index * 0.1}s`;
                    child.classList.add('animate-visible');
                });
            }
        });
    }, observerOptions);
    
    // Observe elements with animation class
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observerOnScroll.observe(el);
    });
    
    // ===== Hero Cards Parallax Effect =====
    const heroCards = document.querySelectorAll('.hero-card');
    
    if (heroCards.length > 0 && window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
            
            heroCards.forEach((card, index) => {
                const factor = (index === 0) ? 1 : -1;
                const rotateY = mouseX * 5 * factor;
                const rotateX = mouseY * -3;
                const translateZ = Math.abs(mouseX * 10);
                
                card.style.transform = `
                    perspective(1000px)
                    rotateY(${rotateY}deg)
                    rotateX(${rotateX}deg)
                    translateZ(${translateZ}px)
                    ${index === 0 ? 'rotate(-6deg)' : 'rotate(6deg)'}
                `;
            });
        });
        
        // Reset on mouse leave
        document.querySelector('.hero-visual')?.addEventListener('mouseleave', () => {
            heroCards.forEach((card, index) => {
                card.style.transform = index === 0 
                    ? 'rotate(-6deg) translateY(20px)' 
                    : 'rotate(6deg) translateY(20px)';
            });
        });
    }
    
    // ===== Category Cards Hover Effect =====
    const categoryCards = document.querySelectorAll('.category-card');
    
    categoryCards.forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function(e) {
            this.style.transform = '';
        });
        
        // Tilt effect
        card.addEventListener('mousemove', function(e) {
            if (window.innerWidth <= 768) return;
            
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            this.style.transform = `
                translateY(-8px)
                perspective(1000px)
                rotateX(${rotateX}deg)
                rotateY(${rotateY}deg)
            `;
        });
    });
    
    // ===== Feature Cards Counter Animation =====
    const animateValue = (element, start, end, duration) => {
        let startTimestamp = null;
        
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            element.textContent = value;
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        
        window.requestAnimationFrame(step);
    };
    
    // ===== Cursor Custom (optional, pour un effet premium) =====
    const createCustomCursor = () => {
        if (window.innerWidth <= 768) return;
        
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        cursor.innerHTML = '<div class="cursor-dot"></div><div class="cursor-ring"></div>';
        document.body.appendChild(cursor);
        
        const dot = cursor.querySelector('.cursor-dot');
        const ring = cursor.querySelector('.cursor-ring');
        
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;
        
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
        });
        
        // Smooth ring follow
        const animateRing = () => {
            ringX += (mouseX - ringX) * 0.15;
            ringY += (mouseY - ringY) * 0.15;
            
            ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
            
            requestAnimationFrame(animateRing);
        };
        
        animateRing();
        
        // Hover effects
        document.querySelectorAll('a, button, .category-card, .hero-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                ring.style.width = '60px';
                ring.style.height = '60px';
                ring.style.borderColor = 'var(--color-accent)';
            });
            
            el.addEventListener('mouseleave', () => {
                ring.style.width = '40px';
                ring.style.height = '40px';
                ring.style.borderColor = 'var(--color-text)';
            });
        });
    };
    
    // Uncomment to enable custom cursor
    // createCustomCursor();
    
    // ===== Newsletter Form =====
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            const email = emailInput.value;
            const button = newsletterForm.querySelector('button');
            
            if (email) {
                button.disabled = true;
                button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                try {
                    // Save to Firebase
                    if (typeof FirebaseDB !== 'undefined') {
                        await FirebaseDB.collection('newsletter').add({
                            email: email,
                            subscribedAt: new Date().toISOString(),
                            source: 'website'
                        });
                    }
                    
                    button.textContent = 'Merci ! ✓';
                    button.style.background = '#4CAF50';
                    emailInput.style.borderColor = '#4CAF50';
                    
                    setTimeout(() => {
                        button.innerHTML = "<i class='fas fa-paper-plane'></i> S'inscrire";
                        button.style.background = '';
                        button.disabled = false;
                        emailInput.style.borderColor = '';
                        newsletterForm.reset();
                    }, 3000);
                } catch (error) {
                    console.error('Erreur newsletter:', error);
                    button.textContent = 'Erreur';
                    button.style.background = '#e74c3c';
                    button.disabled = false;
                    
                    setTimeout(() => {
                        button.innerHTML = "<i class='fas fa-paper-plane'></i> S'inscrire";
                        button.style.background = '';
                    }, 2000);
                }
            }
        });
    }
    
    // ===== Lazy Loading Images =====
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        lazyImages.forEach(img => imageObserver.observe(img));
    }
    
    // ===== Performance: Throttle scroll events =====
    const throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };
    
    // Apply throttle to scroll handler
    window.removeEventListener('scroll', handleScroll);
    window.addEventListener('scroll', throttle(handleScroll, 100), { passive: true });
    
    // ===== Console Welcome Message =====
    console.log(
        '%c🏠 Family Custom',
        'font-size: 24px; font-weight: bold; color: #e07a5f;'
    );
    console.log(
        '%cCréations personnalisées avec amour ❤️',
        'font-size: 14px; color: #6b6560;'
    );
});

// ===== Export functions for external use =====
window.FamilyCustom = {
    // Show toast notification
    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('visible'), 100);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    // Track analytics event
    trackEvent: (category, action, label) => {
        if (window.gtag) {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
    }
};

// ===== COUNTDOWN FÊTE DES MAMIES =====
(function() {
    const countdownEl = document.getElementById('mamie-countdown');
    if (!countdownEl) return;
    
    const targetDate = new Date('2026-03-01T00:00:00');
    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minsEl = document.getElementById('countdown-mins');
    const daysTextEl = document.getElementById('countdown-days-text');
    
    function updateCountdown() {
        const now = new Date();
        const diff = targetDate - now;
        
        // Si la date est passée, cacher le countdown
        if (diff <= 0) {
            countdownEl.style.display = 'none';
            return;
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (daysEl) daysEl.textContent = days;
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minsEl) minsEl.textContent = mins.toString().padStart(2, '0');
        
        // Texte dynamique selon le nombre de jours
        if (daysTextEl) {
            if (days <= 1) {
                daysTextEl.textContent = 'quelques heures';
            } else if (days <= 3) {
                daysTextEl.textContent = days + ' jours';
            } else if (days <= 7) {
                daysTextEl.textContent = 'une semaine';
            } else {
                daysTextEl.textContent = days + ' jours';
            }
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 60000); // Update every minute
})();