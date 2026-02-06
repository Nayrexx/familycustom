/* ============================================
   FAMILY CUSTOM - Shopping Cart System
   ============================================ */

(function() {
    'use strict';
    
    const CART_KEY = 'fc_cart';
    
    // Get cart from localStorage
    function getCart() {
        const cart = localStorage.getItem(CART_KEY);
        return cart ? JSON.parse(cart) : [];
    }
    
    // Save cart to localStorage
    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartBadge();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
    }
    
    // Add item to cart
    function addToCart(product, quantity = 1, customization = '', customerImage = null, textPosition = null) {
        console.log('🛒 addToCart appelé:', { product, quantity, customization, customerImage, textPosition });
        
        const cart = getCart();
        console.log('🛒 Panier actuel:', cart);
        
        // Check if product already in cart with same customization, image and variants
        const existingIndex = cart.findIndex(item => 
            item.id === product.id && 
            item.customization === customization &&
            JSON.stringify(item.customerImage) === JSON.stringify(customerImage) &&
            JSON.stringify(item.textPosition) === JSON.stringify(textPosition) &&
            JSON.stringify(item.variants) === JSON.stringify(product.variants)
        );
        
        if (existingIndex > -1) {
            cart[existingIndex].quantity += quantity;
            console.log('🛒 Quantité augmentée pour item existant');
        } else {
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                priceValue: extractPrice(product.price),
                image: product.image || null,
                quantity: quantity,
                customization: customization,
                customerImage: customerImage,
                textPosition: textPosition,
                variants: product.variants || null,
                deliveryDays: product.deliveryDays || '8-14',
                categoryId: product.categoryId || null,
                categoryIds: product.categoryIds || [],
                addedAt: new Date().toISOString()
            };
            cart.push(newItem);
            console.log('🛒 Nouvel item ajouté:', newItem);
        }
        
        saveCart(cart);
        console.log('🛒 Panier sauvegardé:', cart);
        showCartNotification(product.name);
        return cart;
    }
    
    // Extract numeric price from string like "À partir de 59€" or "53.99€", or return number as-is
    function extractPrice(priceStr) {
        if (!priceStr) return 0;
        // If already a number, return it
        if (typeof priceStr === 'number') return priceStr;
        // Convert to string if needed
        const str = String(priceStr);
        // Match decimals with . or , (e.g., 53.99, 0.5, 59,90)
        const match = str.match(/(\d+(?:[.,]\d+)?)/);
        if (match) {
            // Replace comma with dot for parseFloat
            return parseFloat(match[1].replace(',', '.'));
        }
        return 0;
    }

    // Remove item from cart
    function removeFromCart(index) {
        const cart = getCart();
        cart.splice(index, 1);
        saveCart(cart);
        return cart;
    }
    
    // Update item quantity
    function updateQuantity(index, quantity) {
        const cart = getCart();
        if (quantity <= 0) {
            cart.splice(index, 1);
        } else {
            cart[index].quantity = quantity;
        }
        saveCart(cart);
        return cart;
    }
    
    // Clear cart
    function clearCart() {
        localStorage.removeItem(CART_KEY);
        updateCartBadge();
        window.dispatchEvent(new CustomEvent('cartUpdated', { detail: [] }));
    }
    
    // Get cart total
    function getCartTotal() {
        const cart = getCart();
        return cart.reduce((total, item) => {
            // Use priceValue if valid, otherwise extract from price
            const price = item.priceValue || extractPrice(item.price);
            return total + (price * item.quantity);
        }, 0);
    }
    
    // Get cart count
    function getCartCount() {
        const cart = getCart();
        return cart.reduce((count, item) => count + item.quantity, 0);
    }
    
    // Update cart badge in header
    function updateCartBadge() {
        const count = getCartCount();
        const badges = document.querySelectorAll('.cart-badge');
        badges.forEach(badge => {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        });
    }
    
    // Show notification when item added
    function showCartNotification(productName) {
        const notification = document.createElement('div');
        notification.className = 'cart-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${productName} ajouté au panier</span>
            <a href="panier.html">Voir le panier</a>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Initialize
    document.addEventListener('DOMContentLoaded', updateCartBadge);
    
    // Expose globally
    window.FCCart = {
        getCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        updateCartBadge
    };
    
})();
