/* ============================================
   FAMILY CUSTOM - Checkout System
   ============================================ */

(function() {
    'use strict';
    
    // ===========================================
    // STRIPE CONFIGURATION
    // ===========================================
    const STRIPE_PUBLIC_KEY = 'pk_live_51SskIW8pjDgglWAl2u4zPO4mNQuDH2n3v08TsMnKgUdzjlBOYQgWA5yW044zW8eodLhrd16cTvHcotAp8NcrpHhR006U7DJIY7';
    
    // URL de l'API Vercel
    const PAYMENT_API_URL = 'https://api-two-pi-35.vercel.app/api/create-payment';
    
    // ===========================================
    
    let stripe;
    let cardElement;
    let orderTotal = 0;
    let originalTotal = 0;
    let customerType = 'particulier';
    let appliedGiftCard = null; // Store applied gift card info
    let appliedPromoCode = null; // Store applied promo code info
    let discountAmount = 0;
    let isFreeShipping = false;
    
    // Delivery method
    let deliveryMethod = 'home'; // 'home' or 'relay'
    let selectedRelayPoint = null;
    const HOME_SHIPPING_COST = 6.90;
    const RELAY_SHIPPING_COST = 4.50;
    const FREE_SHIPPING_THRESHOLD = 69;
    
    // API Vercel URL for Mondial Relay
    const MONDIAL_RELAY_API_URL = 'https://api-two-pi-35.vercel.app/api';
    
    document.addEventListener('DOMContentLoaded', function() {
        // Check if cart is empty
        const cart = FCCart.getCart();
        if (cart.length === 0) {
            window.location.href = 'panier.html';
            return;
        }
        
        // Tracking pixel: Begin Checkout
        if (window.FCTracking) {
            var total = cart.reduce(function(s, i) { return s + (i.price || 0) * (i.quantity || 1); }, 0);
            FCTracking.beginCheckout({ total: total, items: cart.map(function(i) { return { id: i.id, name: i.name, price: i.price, quantity: i.quantity }; }) });
        }
        
        renderOrderSummary();
        initStripe();
        setupForm();
        setupCustomerTypeSelector();
        setupDeliverySelector();
        setupPromoCode();
        setupProgressBar();
        setupMultiStepCheckout();
    });
    
    // ===== Progress Bar =====
    function setupProgressBar() {
        const steps = document.querySelectorAll('.progress-step');
        if (!steps.length) return;
        
        // Form field groups for each step
        const step2Fields = ['firstName', 'lastName', 'email', 'phone'];
        const step3Indicator = () => {
            // Step 3 is complete when delivery address is filled or relay point selected
            const homeDelivery = document.querySelector('input[name="deliveryMethod"][value="home"]');
            if (homeDelivery && homeDelivery.checked) {
                const address = document.getElementById('address');
                const city = document.getElementById('city');
                const postalCode = document.getElementById('postalCode');
                return address?.value && city?.value && postalCode?.value;
            } else {
                // Relay point selected
                const selectedRelay = document.querySelector('.mr-point-item.selected');
                return !!selectedRelay;
            }
        };
        
        function updateProgressBar() {
            // Check step 2 (Informations)
            const step2Complete = step2Fields.every(fieldId => {
                const field = document.getElementById(fieldId);
                return field && field.value.trim() !== '';
            });
            
            // Check step 3 (Livraison)
            const step3Complete = step3Indicator();
            
            // Update visual states
            const step2El = document.querySelector('.progress-step[data-step="2"]');
            const step3El = document.querySelector('.progress-step[data-step="3"]');
            const step4El = document.querySelector('.progress-step[data-step="4"]');
            
            if (step2Complete) {
                step2El.classList.remove('active');
                step2El.classList.add('completed');
                step2El.querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
                
                if (!step3Complete) {
                    step3El.classList.add('active');
                    step3El.classList.remove('completed');
                }
            } else {
                step2El.classList.add('active');
                step2El.classList.remove('completed');
                step2El.querySelector('.step-icon').textContent = '2';
                step3El.classList.remove('active', 'completed');
                step3El.querySelector('.step-icon').textContent = '3';
            }
            
            if (step3Complete && step2Complete) {
                step3El.classList.remove('active');
                step3El.classList.add('completed');
                step3El.querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
                step4El.classList.add('active');
            } else if (step3Complete) {
                step3El.classList.remove('active', 'completed');
                step3El.querySelector('.step-icon').textContent = '3';
                step4El.classList.remove('active');
            } else {
                step4El.classList.remove('active');
            }
        }
        
        // Listen to all relevant form changes
        step2Fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', updateProgressBar);
                field.addEventListener('blur', updateProgressBar);
            }
        });
        
        // Listen to address fields
        ['address', 'city', 'postalCode'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', updateProgressBar);
                field.addEventListener('blur', updateProgressBar);
            }
        });
        
        // Listen to delivery method changes
        document.querySelectorAll('input[name="deliveryMethod"]').forEach(radio => {
            radio.addEventListener('change', () => setTimeout(updateProgressBar, 100));
        });
        
        // Observe relay point selection (MutationObserver for dynamic content)
        const mrResultsList = document.querySelector('.mr-results-list');
        if (mrResultsList) {
            const observer = new MutationObserver(updateProgressBar);
            observer.observe(mrResultsList, { childList: true, subtree: true, attributes: true });
        }
        
        // Also observe clicks on relay points
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mr-point-item')) {
                setTimeout(updateProgressBar, 100);
            }
        });
        
        // Initial check
        updateProgressBar();
    }
    
    // ===== Multi-Step Checkout =====
    function setupMultiStepCheckout() {
        const steps = {
            info: document.getElementById('step-info'),
            delivery: document.getElementById('step-delivery'),
            payment: document.getElementById('step-payment')
        };
        
        // Check if elements exist
        if (!steps.info || !steps.delivery || !steps.payment) return;
        
        // Initially lock delivery and payment steps
        steps.delivery.classList.add('locked');
        steps.payment.classList.add('locked');
        
        // Make step headers clickable for completed steps
        Object.keys(steps).forEach(stepName => {
            const header = steps[stepName].querySelector('.step-header');
            if (header) {
                header.addEventListener('click', () => toggleStep(stepName));
            }
        });
    }
    
    // Expose validateStep to global scope for onclick handlers
    window.validateStep = function(stepName) {
        const steps = {
            info: document.getElementById('step-info'),
            delivery: document.getElementById('step-delivery'),
            payment: document.getElementById('step-payment')
        };
        
        let isValid = true;
        let errorMessage = '';
        
        if (stepName === 'info') {
            // Validate customer info
            const firstName = document.getElementById('firstName');
            const lastName = document.getElementById('lastName');
            const email = document.getElementById('email');
            const phone = document.getElementById('phone');
            
            const fields = [
                { el: firstName, name: 'Prénom' },
                { el: lastName, name: 'Nom' },
                { el: email, name: 'Email' },
                { el: phone, name: 'Téléphone' }
            ];
            
            fields.forEach(field => {
                if (!field.el.value.trim()) {
                    field.el.classList.add('error');
                    isValid = false;
                } else {
                    field.el.classList.remove('error');
                }
            });
            
            // Validate email format
            if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
                email.classList.add('error');
                isValid = false;
                errorMessage = 'Veuillez entrer une adresse email valide';
            }
            
            // Validate phone format
            if (phone.value && !/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(phone.value.replace(/\s/g, ''))) {
                phone.classList.add('error');
                isValid = false;
                errorMessage = 'Veuillez entrer un numéro de téléphone valide';
            }
            
            // If Pro, validate company fields
            if (customerType === 'professionnel') {
                const companyName = document.getElementById('companyName');
                const siret = document.getElementById('siret');
                
                if (!companyName.value.trim()) {
                    companyName.classList.add('error');
                    isValid = false;
                } else {
                    companyName.classList.remove('error');
                }
                
                if (!siret.value.trim()) {
                    siret.classList.add('error');
                    isValid = false;
                } else {
                    siret.classList.remove('error');
                }
            }
            
            if (isValid) {
                // Mark step as completed
                steps.info.classList.add('completed');
                steps.info.classList.remove('active');
                
                // Update step header
                const statusIcon = steps.info.querySelector('.status-icon');
                if (statusIcon) statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                
                // Update summary
                const summary = steps.info.querySelector('.step-summary');
                if (summary) {
                    summary.innerHTML = `
                        <p><strong>${firstName.value} ${lastName.value}</strong></p>
                        <p>${email.value} • ${phone.value}</p>
                        ${customerType === 'professionnel' ? '<p><i class="fas fa-building"></i> Professionnel</p>' : ''}
                    `;
                }
                
                // === ABANDONED CART CAPTURE ===
                saveAbandonedCart(email.value, firstName.value, lastName.value, phone.value);
                
                // Unlock next step
                steps.delivery.classList.remove('locked');
                steps.delivery.classList.add('active');
                
                // Scroll to next step
                steps.delivery.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Update progress bar
                updateProgressBarStep(2);
            } else {
                if (!errorMessage) errorMessage = 'Veuillez remplir tous les champs obligatoires';
                showNotification(errorMessage, 'error');
            }
        }
        
        if (stepName === 'delivery') {
            // Check delivery method
            const homeDelivery = document.querySelector('input[name="deliveryMethod"][value="home"]');
            const relayDelivery = document.querySelector('input[name="deliveryMethod"][value="relay"]');
            
            if (homeDelivery && homeDelivery.checked) {
                // Validate home address
                const address = document.getElementById('address');
                const city = document.getElementById('city');
                const postalCode = document.getElementById('postalCode');
                
                const fields = [
                    { el: address, name: 'Adresse' },
                    { el: city, name: 'Ville' },
                    { el: postalCode, name: 'Code postal' }
                ];
                
                fields.forEach(field => {
                    if (!field.el.value.trim()) {
                        field.el.classList.add('error');
                        isValid = false;
                    } else {
                        field.el.classList.remove('error');
                    }
                });
                
                // Validate postal code format
                if (postalCode.value && !/^\d{5}$/.test(postalCode.value)) {
                    postalCode.classList.add('error');
                    isValid = false;
                    errorMessage = 'Veuillez entrer un code postal valide (5 chiffres)';
                }
                
                if (isValid) {
                    const summaryText = `
                        <p><i class="fas fa-home"></i> Livraison à domicile</p>
                        <p>${address.value}, ${postalCode.value} ${city.value}</p>
                    `;
                    markDeliveryComplete(steps, summaryText);
                }
                
            } else if (relayDelivery && relayDelivery.checked) {
                // Check if relay point is selected
                if (!selectedRelayPoint) {
                    isValid = false;
                    errorMessage = 'Veuillez sélectionner un point relais';
                } else {
                    const summaryText = `
                        <p><i class="fas fa-store"></i> Point Relais Mondial Relay</p>
                        <p>${selectedRelayPoint.Nom || selectedRelayPoint.name}</p>
                        <p>${selectedRelayPoint.Adresse || selectedRelayPoint.address}, ${selectedRelayPoint.CP || selectedRelayPoint.postalCode} ${selectedRelayPoint.Ville || selectedRelayPoint.city}</p>
                    `;
                    markDeliveryComplete(steps, summaryText);
                }
            } else {
                isValid = false;
                errorMessage = 'Veuillez choisir une méthode de livraison';
            }
            
            if (!isValid) {
                if (!errorMessage) errorMessage = 'Veuillez compléter les informations de livraison';
                showNotification(errorMessage, 'error');
            }
        }
    };
    
    function markDeliveryComplete(steps, summaryText) {
        // Mark step as completed
        steps.delivery.classList.add('completed');
        steps.delivery.classList.remove('active');
        
        // Update step header
        const statusIcon = steps.delivery.querySelector('.status-icon');
        if (statusIcon) statusIcon.innerHTML = '<i class="fas fa-check"></i>';
        
        // Update summary
        const summary = steps.delivery.querySelector('.step-summary');
        if (summary) {
            summary.innerHTML = summaryText;
        }
        
        // Unlock payment step
        steps.payment.classList.remove('locked');
        steps.payment.classList.add('active');
        
        // Scroll to payment step
        steps.payment.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Update progress bar
        updateProgressBarStep(3);
    }
    
    // Expose toggleStep to global scope for onclick handlers
    window.toggleStep = function(stepName) {
        const steps = {
            info: document.getElementById('step-info'),
            delivery: document.getElementById('step-delivery'),
            payment: document.getElementById('step-payment')
        };
        
        const step = steps[stepName];
        if (!step) return;
        
        // Only allow toggling if step is completed
        if (!step.classList.contains('completed')) return;
        
        // Toggle expanded/collapsed state
        if (step.classList.contains('collapsed')) {
            step.classList.remove('collapsed');
        } else {
            step.classList.add('collapsed');
        }
    };
    
    // Expose togglePromoSection to global scope for onclick handlers
    window.togglePromoSection = function() {
        const content = document.getElementById('promo-content');
        const chevron = document.querySelector('.promo-chevron');
        
        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    };
    
    function updateProgressBarStep(stepNumber) {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            const stepNum = index + 1;
            if (stepNum < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
                step.querySelector('.step-icon').innerHTML = '<i class="fas fa-check"></i>';
            } else if (stepNum === stepNumber) {
                step.classList.add('active');
                step.classList.remove('completed');
            }
        });
    }

    // Setup customer type selector (Particulier/Pro)
    function setupCustomerTypeSelector() {
        const typeOptions = document.querySelectorAll('.type-option');
        const proFields = document.getElementById('pro-fields');
        const contactTitle = document.getElementById('contact-title');
        
        // New checkbox-based pro toggle
        const proCheckbox = document.getElementById('is-pro-checkbox');
        if (proCheckbox) {
            proCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    customerType = 'professionnel';
                    if (proFields) proFields.style.display = 'block';
                    const companyName = document.getElementById('companyName');
                    const siret = document.getElementById('siret');
                    if (companyName) companyName.required = true;
                    if (siret) siret.required = true;
                } else {
                    customerType = 'particulier';
                    if (proFields) proFields.style.display = 'none';
                    const companyName = document.getElementById('companyName');
                    const siret = document.getElementById('siret');
                    if (companyName) companyName.required = false;
                    if (siret) siret.required = false;
                }
            });
        }
        
        // Legacy radio-based selector (keep for compatibility)
        typeOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Update selection UI
                typeOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                // Get type
                customerType = this.dataset.type;
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                // Toggle pro fields
                if (customerType === 'professionnel') {
                    proFields.style.display = 'block';
                    document.getElementById('companyName').required = true;
                    document.getElementById('siret').required = true;
                    if (contactTitle) contactTitle.textContent = 'Contact';
                } else {
                    proFields.style.display = 'none';
                    document.getElementById('companyName').required = false;
                    document.getElementById('siret').required = false;
                    if (contactTitle) contactTitle.textContent = 'Vos informations';
                }
            });
        });
        
        // Format SIRET input
        const siretInput = document.getElementById('siret');
        if (siretInput) {
            siretInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                if (value.length > 14) value = value.slice(0, 14);
                // Format: XXX XXX XXX XXXXX
                let formatted = '';
                for (let i = 0; i < value.length; i++) {
                    if (i === 3 || i === 6 || i === 9) formatted += ' ';
                    formatted += value[i];
                }
                e.target.value = formatted;
            });
        }
    }
    
    // ===== DELIVERY METHOD SELECTOR =====
    function setupDeliverySelector() {
        const deliveryOptions = document.querySelectorAll('.delivery-option');
        const homeSection = document.getElementById('home-delivery-section');
        const relaySection = document.getElementById('relay-delivery-section');
        const addressInput = document.getElementById('address');
        const postalCodeInput = document.getElementById('postalCode');
        const cityInput = document.getElementById('city');
        
        if (!deliveryOptions.length) return;
        
        // Listen for relay point selection from MR Widget
        window.addEventListener('relayPointSelected', function(e) {
            const data = e.detail;
            selectedRelayPoint = {
                id: data.ID,
                name: data.Nom,
                address: data.Adresse1,
                postalCode: data.CP,
                city: data.Ville,
                country: data.Pays
            };
            console.log('Relay point selected via widget:', selectedRelayPoint);
        });
        
        // Handle delivery method selection
        deliveryOptions.forEach(option => {
            option.addEventListener('click', function() {
                deliveryOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                
                const radio = this.querySelector('input[type="radio"]');
                radio.checked = true;
                
                deliveryMethod = this.dataset.method;
                
                if (deliveryMethod === 'home') {
                    homeSection.style.display = 'block';
                    relaySection.style.display = 'none';
                    addressInput.required = true;
                    postalCodeInput.required = true;
                    cityInput.required = true;
                    selectedRelayPoint = null;
                } else {
                    homeSection.style.display = 'none';
                    relaySection.style.display = 'block';
                    addressInput.required = false;
                    postalCodeInput.required = false;
                    cityInput.required = false;
                }
                
                // Recalculate order total
                renderOrderSummary();
            });
        });

        // Update home delivery price display
        updateHomeDeliveryPrice();
    }
    
    function updateHomeDeliveryPrice() {
        const subtotal = FCCart.getCartTotal();
        const priceEl = document.getElementById('home-delivery-price');
        if (priceEl) {
            if (subtotal >= FREE_SHIPPING_THRESHOLD || isFreeShipping) {
                priceEl.textContent = 'Gratuit';
                priceEl.classList.add('free');
            } else {
                priceEl.textContent = HOME_SHIPPING_COST.toFixed(2).replace('.', ',') + '€';
                priceEl.classList.remove('free');
            }
        }
    }
    
    // Validate relay point is selected before payment
    function validateRelaySelection() {
        if (deliveryMethod === 'relay') {
            const relayId = document.getElementById('selected-relay-id')?.value;
            if (!relayId) {
                alert('Veuillez sélectionner un point relais sur la carte');
                return false;
            }
            // Set selectedRelayPoint from hidden field if not already set
            if (!selectedRelayPoint) {
                const relayData = document.getElementById('selected-relay-data')?.value;
                if (relayData) {
                    selectedRelayPoint = JSON.parse(relayData);
                }
            }
        }
        return true;
    }
    
    // Vérifier et appliquer automatiquement le code de la roue
    function checkAndApplyWheelCode() {
        // Vérifier si FCWheel est disponible et a un code gagné
        if (typeof window.FCWheel !== 'undefined' && window.FCWheel.getWonCode) {
            const wonCode = window.FCWheel.getWonCode();
            
            if (wonCode && wonCode.code) {
                const promoInput = document.getElementById('promo-code');
                const applyBtn = document.getElementById('apply-promo-btn');
                
                // Pré-remplir le code
                if (promoInput && applyBtn) {
                    promoInput.value = wonCode.code;
                    
                    // Afficher une notification
                    showWheelCodeNotification(wonCode);
                    
                    // Appliquer automatiquement après un court délai
                    setTimeout(() => {
                        applyBtn.click();
                    }, 800);
                }
            }
        } else {
            // Fallback: vérifier directement le localStorage
            try {
                const data = localStorage.getItem('fc_wheel_won_code');
                if (data) {
                    const wonCode = JSON.parse(data);
                    
                    // Vérifier expiration
                    if (new Date(wonCode.expiresAt) > new Date()) {
                        const promoInput = document.getElementById('promo-code');
                        const applyBtn = document.getElementById('apply-promo-btn');
                        
                        if (promoInput && applyBtn) {
                            promoInput.value = wonCode.code;
                            showWheelCodeNotification(wonCode);
                            
                            setTimeout(() => {
                                applyBtn.click();
                            }, 800);
                        }
                    }
                }
            } catch (e) {
                console.log('Pas de code de roue à appliquer');
            }
        }
    }
    
    // Afficher une notification pour le code de la roue
    function showWheelCodeNotification(wonCode) {
        const notification = document.createElement('div');
        notification.className = 'wheel-code-notification';
        
        let discountText = '';
        if (wonCode.type === 'free_shipping') {
            discountText = 'Livraison gratuite';
        } else {
            discountText = `-${wonCode.discount}%`;
        }
        
        notification.innerHTML = `
            <div class="wheel-notification-content">
                <span class="wheel-notification-icon">🎡</span>
                <div class="wheel-notification-text">
                    <strong>Code de la Roue détecté !</strong>
                    <span>Votre réduction ${discountText} va être appliquée automatiquement</span>
                </div>
            </div>
        `;
        
        // Ajouter les styles si pas déjà présents
        if (!document.getElementById('wheel-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'wheel-notification-styles';
            style.textContent = `
                .wheel-code-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    border: 2px solid #d4af37;
                    border-radius: 12px;
                    padding: 15px 20px;
                    z-index: 10000;
                    box-shadow: 0 10px 40px rgba(212, 175, 55, 0.3);
                    animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-out 4.5s forwards;
                    max-width: 350px;
                }
                
                .wheel-notification-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .wheel-notification-icon {
                    font-size: 28px;
                    animation: spin 2s linear infinite;
                }
                
                .wheel-notification-text {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                
                .wheel-notification-text strong {
                    color: #d4af37;
                    font-size: 14px;
                }
                
                .wheel-notification-text span {
                    color: #fff;
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes fadeOut {
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // Supprimer après 5 secondes
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Setup Promo Code / Gift Card
    function setupPromoCode() {
        const promoInput = document.getElementById('promo-code');
        const applyBtn = document.getElementById('apply-promo-btn');
        const removeBtn = document.getElementById('remove-promo-btn');
        const promoMessage = document.getElementById('promo-message');
        const promoApplied = document.getElementById('promo-applied');
        const appliedCode = document.getElementById('applied-code');
        const appliedAmount = document.getElementById('applied-amount');
        
        if (!applyBtn) return;
        
        // Check for wheel code and auto-apply
        checkAndApplyWheelCode();
        
        // Apply promo code or gift card
        applyBtn.addEventListener('click', async function() {
            const code = promoInput.value.trim().toUpperCase();
            
            if (!code) {
                showPromoMessage('Veuillez entrer un code', 'error');
                return;
            }
            
            applyBtn.disabled = true;
            applyBtn.textContent = '...';
            
            // Calculate current subtotal for promo validation
            const cart = FCCart.getCart();
            const subtotal = FCCart.getCartTotal();
            
            // First, try gift card
            let applied = false;
            
            if (typeof FCGiftCard !== 'undefined') {
                const giftResult = await FCGiftCard.validateCode(code);
                
                if (giftResult.valid) {
                    // Apply gift card discount
                    appliedGiftCard = giftResult.giftCard;
                    appliedPromoCode = null;
                    discountAmount = Math.min(giftResult.balance, subtotal + 9.90);
                    isFreeShipping = false;
                    
                    showAppliedCode(code, `-${discountAmount.toFixed(2)}€`, 'gift');
                    showPromoMessage(`Carte cadeau appliquée ! Solde: ${giftResult.balance.toFixed(2)}€`, 'success');
                    applied = true;
                }
            }
            
            // If not a gift card, try promo code
            if (!applied && typeof FCPromoCode !== 'undefined') {
                const promoResult = await FCPromoCode.validateCode(code, subtotal, null, cart);
                
                if (promoResult.valid) {
                    // Apply promo code discount
                    appliedPromoCode = promoResult.promo;
                    appliedGiftCard = null;
                    discountAmount = promoResult.discount;
                    isFreeShipping = promoResult.promo.discountType === 'free_shipping';
                    
                    let displayAmount = '';
                    if (isFreeShipping) {
                        displayAmount = 'Livraison gratuite';
                    } else if (promoResult.promo.discountType === 'percentage') {
                        displayAmount = `-${promoResult.promo.discountValue}%`;
                    } else {
                        displayAmount = `-${discountAmount.toFixed(2)}€`;
                    }
                    
                    showAppliedCode(code, displayAmount, 'promo');
                    showPromoMessage(promoResult.message, 'success');
                    applied = true;
                } else {
                    // Show the specific error from promo validation
                    showPromoMessage(promoResult.error || 'Code invalide', 'error');
                }
            }
            
            if (!applied && typeof FCPromoCode === 'undefined' && typeof FCGiftCard === 'undefined') {
                showPromoMessage('Service indisponible', 'error');
            }
            
            if (applied) {
                renderOrderSummary();
            }
            
            applyBtn.disabled = false;
            applyBtn.textContent = 'Appliquer';
        });
        
        function showAppliedCode(code, amount, type) {
            promoInput.style.display = 'none';
            applyBtn.style.display = 'none';
            promoMessage.className = 'promo-message';
            
            const icon = type === 'gift' ? 'fa-gift' : 'fa-percent';
            appliedCode.innerHTML = `<i class="fas ${icon}"></i> ${code}`;
            appliedAmount.textContent = amount;
            promoApplied.style.display = 'flex';
        }
        
        // Remove promo code
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                appliedGiftCard = null;
                appliedPromoCode = null;
                discountAmount = 0;
                isFreeShipping = false;
                
                promoInput.value = '';
                promoInput.style.display = 'block';
                applyBtn.style.display = 'block';
                promoApplied.style.display = 'none';
                promoMessage.innerHTML = '';
                promoMessage.className = 'promo-message';
                
                renderOrderSummary();
            });
        }
        
        // Enter key to apply
        promoInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyBtn.click();
            }
        });
        
        function showPromoMessage(message, type) {
            promoMessage.textContent = message;
            promoMessage.className = `promo-message ${type}`;
            
            if (type === 'error') {
                setTimeout(() => {
                    promoMessage.textContent = '';
                    promoMessage.className = 'promo-message';
                }, 4000);
            }
        }
    }
    
    function renderOrderSummary() {
        const container = document.getElementById('order-summary');
        const cart = FCCart.getCart();
        
        const subtotal = FCCart.getCartTotal();
        
        // Calculate shipping based on delivery method
        let shipping = 0;
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            shipping = 0;
        } else if (isFreeShipping) {
            shipping = 0;
        } else if (deliveryMethod === 'relay') {
            shipping = RELAY_SHIPPING_COST;
        } else {
            shipping = HOME_SHIPPING_COST;
        }
        
        originalTotal = subtotal + (isFreeShipping ? 0 : (subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : (deliveryMethod === 'relay' ? RELAY_SHIPPING_COST : HOME_SHIPPING_COST)));
        
        // Calculate discount (not applied to free shipping type)
        let actualDiscount = discountAmount;
        if (isFreeShipping) {
            actualDiscount = 0; // Free shipping is handled via shipping calculation
        }
        
        orderTotal = subtotal + shipping - actualDiscount;
        if (orderTotal < 0) orderTotal = 0;
        
        const itemsHTML = cart.map(item => `
            <div class="order-item">
                <span class="order-item-name">
                    ${item.name} x${item.quantity}
                    ${item.customization ? `<small style="color: var(--gold);"> - "${item.customization}"</small>` : ''}
                </span>
                <span class="order-item-price">${(item.priceValue * item.quantity).toFixed(2)}€</span>
            </div>
        `).join('');
        
        let discountHTML = '';
        if (appliedGiftCard && discountAmount > 0) {
            discountHTML = `
                <div class="order-item order-discount">
                    <span class="order-item-name">
                        <i class="fas fa-gift"></i> Carte cadeau (${appliedGiftCard.code})
                    </span>
                    <span class="order-item-price">-${discountAmount.toFixed(2)}€</span>
                </div>
            `;
        } else if (appliedPromoCode && discountAmount > 0 && !isFreeShipping) {
            discountHTML = `
                <div class="order-item order-discount">
                    <span class="order-item-name">
                        <i class="fas fa-percent"></i> Code promo (${appliedPromoCode.code})
                    </span>
                    <span class="order-item-price">-${discountAmount.toFixed(2)}€</span>
                </div>
            `;
        }
        
        // Shipping display with delivery method info
        let shippingDisplay = '';
        let shippingLabel = deliveryMethod === 'relay' ? 'Point Relais' : 'Livraison domicile';
        if (subtotal >= FREE_SHIPPING_THRESHOLD || isFreeShipping) {
            shippingDisplay = `<span class="order-item-price" style="color: #2ecc71;">Gratuite${isFreeShipping && subtotal < FREE_SHIPPING_THRESHOLD ? ' <small>(promo)</small>' : ''}</span>`;
        } else {
            shippingDisplay = `<span class="order-item-price">${shipping.toFixed(2)}€</span>`;
        }
        
        container.innerHTML = `
            <h2><i class="fas fa-receipt"></i> Votre commande</h2>
            <div class="order-items">
                ${itemsHTML}
            </div>
            <div class="order-item">
                <span class="order-item-name">
                    ${shippingLabel}
                    ${deliveryMethod === 'relay' ? '<small style="color: var(--gold);"> <i class="fas fa-map-marker-alt"></i> Mondial Relay</small>' : ''}
                </span>
                ${shippingDisplay}
            </div>
            ${discountHTML}
            <div class="order-total">
                <span>Total</span>
                <span>${orderTotal.toFixed(2)}€</span>
            </div>
        `;
        
        document.getElementById('total-amount').textContent = orderTotal.toFixed(2);
        
        // Update inline summary in payment section
        updateInlineSummary(subtotal, shipping, actualDiscount);
        
        // Update home delivery price in selector
        updateHomeDeliveryPrice();
        
        // Gérer l'affichage du formulaire de paiement si commande gratuite
        updatePaymentFormVisibility();
    }
    
    // Update the inline checkout summary
    function updateInlineSummary(subtotal, shipping, discount) {
        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryDiscount = document.getElementById('summary-discount');
        const discountRow = document.getElementById('summary-discount-row');
        const discountLabel = document.getElementById('discount-label');
        const summaryShipping = document.getElementById('summary-shipping');
        const summaryTotal = document.getElementById('summary-total');
        const freeShippingNotice = document.getElementById('free-shipping-notice');
        
        if (summarySubtotal) {
            summarySubtotal.textContent = subtotal.toFixed(2).replace('.', ',') + '€';
        }
        
        if (discountRow && summaryDiscount) {
            if (discount > 0) {
                discountRow.style.display = 'flex';
                summaryDiscount.textContent = '-' + discount.toFixed(2).replace('.', ',') + '€';
                if (discountLabel) {
                    if (appliedGiftCard) {
                        discountLabel.textContent = 'Carte cadeau';
                    } else if (appliedPromoCode) {
                        discountLabel.textContent = 'Code promo';
                    }
                }
            } else {
                discountRow.style.display = 'none';
            }
        }
        
        if (summaryShipping) {
            if (subtotal >= FREE_SHIPPING_THRESHOLD || isFreeShipping) {
                summaryShipping.textContent = 'Gratuit';
                summaryShipping.style.color = '#4caf50';
                if (freeShippingNotice) freeShippingNotice.style.display = 'block';
            } else {
                summaryShipping.textContent = shipping.toFixed(2).replace('.', ',') + '€';
                summaryShipping.style.color = '';
                if (freeShippingNotice) freeShippingNotice.style.display = 'none';
            }
        }
        
        if (summaryTotal) {
            summaryTotal.textContent = orderTotal.toFixed(2).replace('.', ',') + '€';
        }
    }
    
    // Afficher/Masquer le formulaire de paiement selon le total
    function updatePaymentFormVisibility() {
        const paymentSection = document.getElementById('payment-section');
        const payBtn = document.getElementById('pay-btn');
        const btnText = document.getElementById('btn-text');
        const cardErrors = document.getElementById('card-errors');
        
        console.log('💰 Total commande:', orderTotal, '- Gratuit:', orderTotal <= 0);
        
        if (orderTotal <= 0) {
            // Commande gratuite - cacher le formulaire de carte
            console.log('🎁 Commande gratuite détectée, mise à jour UI...');
            
            if (paymentSection) {
                paymentSection.innerHTML = `
                    <h2><i class="fas fa-check-circle" style="color: #27ae60;"></i> Commande gratuite</h2>
                    <div style="background: rgba(39, 174, 96, 0.1); border: 1px solid #27ae60; border-radius: 10px; padding: 20px; text-align: center;">
                        <i class="fas fa-gift" style="font-size: 3rem; color: #27ae60; margin-bottom: 15px; display: block;"></i>
                        <p style="color: #27ae60; font-weight: 600; font-size: 1.1rem; margin-bottom: 10px;">
                            Votre commande est gratuite !
                        </p>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 20px;">
                            Aucun paiement requis. Cliquez sur le bouton ci-dessous pour valider.
                        </p>
                    </div>
                    <button type="submit" class="pay-btn" id="pay-btn" style="margin-top: 20px;">
                        <i class="fas fa-check"></i>
                        <span id="btn-text">Confirmer la commande gratuite</span>
                        <div class="spinner" style="display: none;" id="spinner"></div>
                    </button>
                `;
            }
        }
    }
    
    function initStripe() {
        // Check if Stripe key is configured
        if (STRIPE_PUBLIC_KEY === 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX') {
            console.warn('Stripe n\'est pas configuré. Utilise ton mode de paiement de secours.');
            showFallbackPayment();
            return;
        }
        
        try {
            stripe = Stripe(STRIPE_PUBLIC_KEY);
            
            // Créer Elements avec le style sombre
            const elements = stripe.elements({
                locale: 'fr',
                appearance: {
                    theme: 'night',
                    variables: {
                        colorPrimary: '#D4AF37',
                        colorBackground: '#1a1a24',
                        colorText: '#ffffff',
                        colorDanger: '#ff4444',
                        fontFamily: 'Inter, sans-serif',
                        borderRadius: '8px',
                        spacingUnit: '4px'
                    },
                    rules: {
                        '.Input': {
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        },
                        '.Input:focus': {
                            border: '1px solid #D4AF37',
                            boxShadow: '0 0 0 3px rgba(212, 175, 55, 0.1)'
                        },
                        '.Label': {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                }
            });
            
            // Créer le Card Element
            cardElement = elements.create('card', {
                style: {
                    base: {
                        color: '#ffffff',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '16px',
                        '::placeholder': {
                            color: 'rgba(255,255,255,0.4)'
                        }
                    },
                    invalid: {
                        color: '#ff4444',
                        iconColor: '#ff4444'
                    }
                },
                hidePostalCode: true
            });
            
            cardElement.mount('#card-element');
            
            // Handle errors
            cardElement.on('change', function(event) {
                const displayError = document.getElementById('card-errors');
                if (event.error) {
                    displayError.textContent = event.error.message;
                } else {
                    displayError.textContent = '';
                }
            });
            
        } catch (error) {
            console.error('Erreur Stripe:', error);
            showFallbackPayment();
        }
    }
    
    function showFallbackPayment() {
        // If Stripe is not configured, show alternative payment method
        const cardContainer = document.getElementById('card-element');
        cardContainer.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p style="color: var(--gold); margin-bottom: 15px;">
                    <i class="fas fa-info-circle"></i> Paiement par virement ou PayPal
                </p>
                <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem;">
                    Après validation, vous recevrez un email avec les instructions de paiement.
                </p>
            </div>
        `;
        
        document.getElementById('btn-text').innerHTML = 'Confirmer la commande';
    }
    
    function setupForm() {
        const form = document.getElementById('checkout-form');
        
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const submitBtn = document.getElementById('pay-btn');
            const btnText = document.getElementById('btn-text');
            const spinner = document.getElementById('spinner');
            
            // Validate relay point if delivery method is relay
            if (deliveryMethod === 'relay') {
                if (!validateRelaySelection()) {
                    submitBtn.disabled = false;
                    btnText.style.display = 'block';
                    spinner.style.display = 'none';
                    return;
                }
            }
            
            // Disable button
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            spinner.style.display = 'block';
            
            // Collect form data
            const formData = {
                customerType: customerType,
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                deliveryMethod: deliveryMethod,
                address: deliveryMethod === 'home' ? document.getElementById('address').value : '',
                postalCode: deliveryMethod === 'home' ? document.getElementById('postalCode').value : '',
                city: deliveryMethod === 'home' ? document.getElementById('city').value : '',
                notes: document.getElementById('notes')?.value || ''
            };
            
            // Add relay point info if applicable
            if (deliveryMethod === 'relay' && selectedRelayPoint) {
                formData.relayPoint = {
                    id: selectedRelayPoint.id,
                    name: selectedRelayPoint.name,
                    address: selectedRelayPoint.address,
                    postalCode: selectedRelayPoint.postalCode,
                    city: selectedRelayPoint.city
                };
                // Use relay point address for shipping
                formData.address = selectedRelayPoint.address;
                formData.postalCode = selectedRelayPoint.postalCode;
                formData.city = selectedRelayPoint.city;
            }
            
            // Add pro fields if professional
            if (customerType === 'professionnel') {
                formData.companyName = document.getElementById('companyName').value;
                formData.siret = document.getElementById('siret').value.replace(/\s/g, '');
                formData.vatNumber = document.getElementById('vatNumber').value || null;
            }
            
            try {
                // Vérifier si la commande est gratuite (0€)
                if (orderTotal <= 0) {
                    // Commande gratuite - pas de paiement Stripe nécessaire
                    await processFreeOrder(formData);
                } else if (stripe) {
                    // Process Stripe Checkout
                    await processStripePayment(formData);
                } else {
                    // Fallback: save order without payment
                    await saveOrderWithoutPayment(formData);
                }
            } catch (error) {
                console.error('Erreur:', error);
                document.getElementById('card-errors').textContent = error.message || 'Une erreur est survenue';
                submitBtn.disabled = false;
                btnText.style.display = 'block';
                spinner.style.display = 'none';
            }
        });
    }
    
    async function processStripePayment(formData) {
        const errorDisplay = document.getElementById('card-errors');
        const submitBtn = document.getElementById('pay-btn');
        const btnText = document.getElementById('btn-text');
        const spinner = document.getElementById('spinner');
        
        try {
            // 1. Sauvegarder la commande avec status "pending" (sans envoyer d'email)
            const pendingOrder = await saveOrder(formData, 'pending', null, false);
            
            // 2. Créer le PaymentIntent via l'API Vercel
            const response = await fetch(PAYMENT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: Math.round(orderTotal * 100), // en centimes
                    email: formData.email,
                    orderNumber: pendingOrder.orderNumber,
                    customerName: `${formData.firstName} ${formData.lastName}`
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la création du paiement');
            }
            
            const { clientSecret } = await response.json();
            
            // 3. Confirmer le paiement avec la carte
            const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: `${formData.firstName} ${formData.lastName}`,
                        email: formData.email,
                        phone: formData.phone,
                        address: {
                            line1: formData.address,
                            postal_code: formData.postalCode,
                            city: formData.city,
                            country: 'FR'
                        }
                    }
                }
            });
            
            if (error) {
                throw new Error(error.message);
            }
            
            if (paymentIntent.status === 'succeeded') {
                // 4. Mettre à jour la commande comme payée
                if (typeof FirebaseDB !== 'undefined' && pendingOrder.id) {
                    try {
                        await FirebaseDB.collection('orders').doc(pendingOrder.id).update({
                            status: 'paid',
                            paymentId: paymentIntent.id,
                            paymentMethod: 'stripe',
                            paidAt: new Date().toISOString()
                        });
                    } catch (err) {
                        console.error('Erreur mise à jour commande:', err);
                    }
                }
                
                // 5. Envoyer les emails de confirmation SEULEMENT après paiement réussi
                pendingOrder.status = 'paid';
                pendingOrder.paymentId = paymentIntent.id;
                if (typeof FCEmail !== 'undefined') {
                    try {
                        const emailResults = await FCEmail.sendOrderEmails(pendingOrder);
                        console.log('Emails envoyés après paiement:', emailResults);
                    } catch (error) {
                        console.error('Erreur envoi emails:', error);
                    }
                }
                
                // 6. Mark abandoned cart as converted
                markCartConverted();
                
                // 7. Rediriger vers la page de succès
                window.location.href = `success.html?order=${pendingOrder.id || pendingOrder.orderNumber}`;
            }
            
        } catch (error) {
            console.error('Erreur paiement:', error);
            errorDisplay.textContent = error.message || 'Une erreur est survenue lors du paiement';
            submitBtn.disabled = false;
            btnText.style.display = 'block';
            spinner.style.display = 'none';
        }
    }
    
    async function saveOrderWithoutPayment(formData) {
        const order = await saveOrder(formData, 'pending', null);
        window.location.href = `success.html?order=${order.id}`;
    }
    
    // Traiter les commandes gratuites (0€) - automatiquement validées
    async function processFreeOrder(formData) {
        try {
            // Sauvegarder la commande comme "paid" directement
            const order = await saveOrder(formData, 'free', 'FREE_ORDER', true);
            
            // Mettre à jour le statut dans Firebase
            if (typeof FirebaseDB !== 'undefined' && order.id) {
                try {
                    await FirebaseDB.collection('orders').doc(order.id).update({
                        status: 'paid',
                        paymentMethod: 'free',
                        paymentNote: 'Commande gratuite - validée automatiquement',
                        paidAt: new Date().toISOString()
                    });
                } catch (err) {
                    console.error('Erreur mise à jour commande gratuite:', err);
                }
            }
            
            console.log('✅ Commande gratuite validée:', order.orderNumber);
            
            // Rediriger vers la page de succès
            window.location.href = `success.html?order=${order.id || order.orderNumber}`;
            
        } catch (error) {
            console.error('Erreur commande gratuite:', error);
            throw error;
        }
    }
    
    async function saveOrder(customerData, paymentMethod, paymentRef, sendEmails = true) {
        const cart = FCCart.getCart();
        const subtotal = FCCart.getCartTotal();
        
        // Calculate shipping based on delivery method
        let shipping = 0;
        if (subtotal >= FREE_SHIPPING_THRESHOLD) {
            shipping = 0;
        } else if (isFreeShipping) {
            shipping = 0;
        } else if (deliveryMethod === 'relay') {
            shipping = RELAY_SHIPPING_COST;
        } else {
            shipping = HOME_SHIPPING_COST;
        }
        
        const totalBeforeDiscount = subtotal + shipping;
        const actualDiscount = isFreeShipping ? 0 : discountAmount;
        const finalTotal = totalBeforeDiscount - actualDiscount;
        
        // Prepare discount info
        let discountInfo = null;
        if (appliedGiftCard) {
            discountInfo = {
                amount: discountAmount,
                type: 'giftCard',
                code: appliedGiftCard.code
            };
        } else if (appliedPromoCode) {
            discountInfo = {
                amount: isFreeShipping ? 9.90 : discountAmount,
                type: appliedPromoCode.discountType,
                code: appliedPromoCode.code,
                description: appliedPromoCode.description || ''
            };
        }
        
        const order = {
            orderNumber: generateOrderNumber(),
            customer: customerData,
            items: cart,
            subtotal: subtotal,
            shipping: shipping,
            shippingMethod: deliveryMethod,
            relayPoint: customerData.relayPoint || null,
            discount: discountInfo,
            total: finalTotal,
            paymentMethod: paymentMethod,
            paymentRef: paymentRef,
            status: (paymentMethod === 'stripe' || paymentMethod === 'free') ? 'paid' : 'pending',
            createdAt: new Date().toISOString()
        };
        
        // Mark gift card as used
        if (appliedGiftCard && typeof FCGiftCard !== 'undefined') {
            try {
                await FCGiftCard.useGiftCard(appliedGiftCard.code, discountAmount);
                console.log('Carte cadeau utilisée:', appliedGiftCard.code);
            } catch (error) {
                console.error('Erreur utilisation carte cadeau:', error);
            }
        }
        
        // Mark promo code as used
        if (appliedPromoCode && typeof FCPromoCode !== 'undefined') {
            try {
                await FCPromoCode.usePromoCode(appliedPromoCode.code, order.orderNumber || order.id);
                console.log('Code promo utilisé:', appliedPromoCode.code);
                
                // Clear wheel code from localStorage if it's a wheel code
                if (appliedPromoCode.code && appliedPromoCode.code.startsWith('WHEEL-')) {
                    localStorage.removeItem('fc_wheel_won_code');
                    console.log('Code roue effacé du localStorage');
                }
            } catch (error) {
                console.error('Erreur utilisation code promo:', error);
            }
        }
        
        // Generate invoice for professional customers
        if (customerData.customerType === 'professionnel' && typeof FCInvoice !== 'undefined') {
            try {
                await FCInvoice.generateInvoice(order);
                console.log('Facture générée:', order.invoice);
            } catch (error) {
                console.error('Erreur génération facture:', error);
            }
        }
        
        // Save to Firebase
        if (typeof FirebaseDB !== 'undefined') {
            try {
                const docRef = await FirebaseDB.collection('orders').add(order);
                order.id = docRef.id;
                console.log('Commande enregistrée:', order);
            } catch (error) {
                console.error('Erreur Firebase:', error);
            }
        }
        
        // Save purchased gift cards to Firebase
        if (typeof FCGiftCard !== 'undefined') {
            const giftCardItems = cart.filter(item => item.isGiftCard && item.giftCard);
            for (const item of giftCardItems) {
                try {
                    const giftCardData = {
                        code: item.giftCard.code,
                        amount: item.giftCard.amount,
                        recipientEmail: item.giftCard.recipientEmail,
                        recipientName: item.giftCard.recipientName,
                        senderName: item.giftCard.senderName,
                        message: item.giftCard.message,
                        deliveryOption: item.giftCard.deliveryOption,
                        scheduledDate: item.giftCard.scheduledDate,
                        orderId: order.id || order.orderNumber
                    };
                    await FCGiftCard.saveGiftCard(giftCardData);
                    console.log('Carte cadeau enregistrée:', giftCardData.code);
                } catch (error) {
                    console.error('Erreur enregistrement carte cadeau:', error);
                }
            }
        }
        
        // Send confirmation emails (only if sendEmails is true)
        if (sendEmails && typeof FCEmail !== 'undefined') {
            try {
                const emailResults = await FCEmail.sendOrderEmails(order);
                console.log('Emails envoyés:', emailResults);
            } catch (error) {
                console.error('Erreur envoi emails:', error);
                // Continue anyway, order is saved
            }
        }
        
        // Store order in sessionStorage (cleared when tab closes)
        sessionStorage.setItem('lastOrder', JSON.stringify(order));
        
        // Clear cart
        FCCart.clearCart();
        
        return order;
    }
    
    function generateOrderNumber() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `FC${year}${month}${day}-${random}`;
    }
    
    // ===== Notification Helper =====
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.querySelector('.checkout-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `checkout-notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // ===== ABANDONED CART RECOVERY =====
    let abandonedCartId = null;
    
    async function saveAbandonedCart(email, firstName, lastName, phone) {
        try {
            const db = window.FirebaseDB;
            if (!db) return;
            
            const cart = FCCart.getCart();
            if (!cart || cart.length === 0) return;
            
            const total = cart.reduce(function(s, item) {
                var price = item.priceValue || parseFloat((item.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
                return s + price * (item.quantity || 1);
            }, 0);
            
            const data = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: phone || '',
                items: cart.map(function(item) {
                    return {
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image || null,
                        variants: item.variants || null
                    };
                }),
                total: total,
                status: 'abandoned', // abandoned | recovered | converted
                reminderSent: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (abandonedCartId) {
                // Update existing record
                await db.collection('abandonedCarts').doc(abandonedCartId).update({
                    ...data,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Check if there's already one for this email in last 24h
                var existing = await db.collection('abandonedCarts')
                    .where('email', '==', email)
                    .where('status', '==', 'abandoned')
                    .orderBy('createdAt', 'desc')
                    .limit(1)
                    .get();
                
                if (!existing.empty) {
                    abandonedCartId = existing.docs[0].id;
                    await db.collection('abandonedCarts').doc(abandonedCartId).update({
                        ...data,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    var docRef = await db.collection('abandonedCarts').add(data);
                    abandonedCartId = docRef.id;
                }
            }
            
            console.log('Abandoned cart saved:', abandonedCartId);
        } catch (e) {
            console.error('Error saving abandoned cart:', e);
        }
    }
    
    async function markCartConverted() {
        try {
            var db = window.FirebaseDB;
            if (!db || !abandonedCartId) return;
            
            await db.collection('abandonedCarts').doc(abandonedCartId).update({
                status: 'converted',
                convertedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { /* silent */ }
    }
    
})();
