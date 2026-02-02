// ============================================
// FAMILY CUSTOM - Gift Card JS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    let selectedAmount = 50;
    
    // Elements
    const amountBtns = document.querySelectorAll('.amount-btn');
    const customAmountDiv = document.getElementById('custom-amount');
    const customAmountInput = document.getElementById('custom-amount-input');
    const recipientName = document.getElementById('recipient-name');
    const recipientEmail = document.getElementById('recipient-email');
    const giftMessage = document.getElementById('gift-message');
    const senderName = document.getElementById('sender-name');
    const charCount = document.getElementById('char-count');
    const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
    const scheduledDate = document.getElementById('scheduled-date');
    const addGiftBtn = document.getElementById('add-gift-btn');
    
    // Preview elements
    const previewAmount = document.getElementById('preview-amount');
    const previewMessage = document.getElementById('preview-message');
    
    // Summary elements
    const summaryAmount = document.getElementById('summary-amount');
    const summaryTotal = document.getElementById('summary-total');

    // Set minimum date for scheduled delivery
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    scheduledDate.setAttribute('min', minDate);

    // Amount selection
    amountBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            amountBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const amount = this.dataset.amount;
            
            if (amount === 'custom') {
                customAmountDiv.style.display = 'flex';
                customAmountInput.focus();
            } else {
                customAmountDiv.style.display = 'none';
                selectedAmount = parseInt(amount);
                updatePreview();
            }
        });
    });

    // Custom amount input
    customAmountInput.addEventListener('input', function() {
        let value = parseInt(this.value);
        if (value < 10) value = 10;
        if (value > 500) value = 500;
        selectedAmount = value || 0;
        updatePreview();
    });

    // Message input
    giftMessage.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        updatePreview();
    });

    // Delivery options
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'scheduled') {
                scheduledDate.style.display = 'block';
            } else {
                scheduledDate.style.display = 'none';
            }
        });
    });

    // Update preview
    function updatePreview() {
        previewAmount.textContent = selectedAmount + ' €';
        previewMessage.textContent = giftMessage.value || 'Pour toi avec amour ❤️';
        summaryAmount.textContent = selectedAmount.toFixed(2) + ' €';
        summaryTotal.textContent = selectedAmount.toFixed(2) + ' €';
    }

    // Add to cart
    addGiftBtn.addEventListener('click', function() {
        // Validation
        if (!recipientEmail.value || !isValidEmail(recipientEmail.value)) {
            showNotification('Veuillez entrer un email valide', 'error');
            recipientEmail.focus();
            return;
        }

        if (selectedAmount < 10) {
            showNotification('Le montant minimum est de 10€', 'error');
            return;
        }

        // Check scheduled date if selected
        const deliveryOption = document.querySelector('input[name="delivery"]:checked').value;
        if (deliveryOption === 'scheduled' && !scheduledDate.value) {
            showNotification('Veuillez choisir une date d\'envoi', 'error');
            scheduledDate.focus();
            return;
        }

        // Generate gift card code
        const giftCode = generateGiftCode();

        // Create gift card item
        const giftCardItem = {
            id: 'gift-card-' + Date.now(),
            name: 'Carte Cadeau Family Custom',
            price: selectedAmount,
            quantity: 1,
            type: 'gift-card',
            isGiftCard: true,
            giftCard: {
                code: giftCode,
                amount: selectedAmount,
                recipientName: recipientName.value || 'Ami(e)',
                recipientEmail: recipientEmail.value,
                message: giftMessage.value || 'Pour toi avec amour ❤️',
                senderName: senderName.value || 'Un ami',
                deliveryOption: deliveryOption,
                scheduledDate: deliveryOption === 'scheduled' ? scheduledDate.value : null
            },
            image: null,
            customization: `Pour: ${recipientName.value || 'Destinataire'} | ${selectedAmount}€`
        };

        // Add to cart
        addToCart(giftCardItem);

        // Show success
        showNotification('Carte cadeau ajoutée au panier !', 'success');

        // Update preview with generated code
        document.getElementById('preview-code').textContent = giftCode;
    });

    // Generate gift card code
    function generateGiftCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Email validation
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Add to cart function
    function addToCart(item) {
        let cart = JSON.parse(localStorage.getItem('familyCustomCart')) || [];
        cart.push(item);
        localStorage.setItem('familyCustomCart', JSON.stringify(cart));
        updateCartBadge();
    }

    // Update cart badge
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('familyCustomCart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(badge => {
            badge.textContent = totalItems;
            badge.style.display = totalItems > 0 ? 'flex' : 'none';
        });
    }

    // Notification
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `gift-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #4caf50, #6eff6e)' : 'linear-gradient(135deg, #f44336, #ff6b6b)'};
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Initial update
    updatePreview();
    updateCartBadge();
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
