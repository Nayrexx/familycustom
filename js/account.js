/* ============================================
   FAMILY CUSTOM - Account Page JavaScript
   ============================================ */

(function() {
    'use strict';
    
    // Elements
    const authSection = document.getElementById('auth-section');
    const accountSection = document.getElementById('account-section');
    
    // Auth forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    
    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', function() {
        checkAuthState();
        setupAuthForms();
        setupAccountTabs();
        setupAddressModal();
        setupProfileForm();
    });
    
    // Listen for auth changes
    window.addEventListener('fcAuthStateChanged', function(e) {
        if (e.detail.customer) {
            showAccountSection();
        } else {
            showAuthSection();
        }
    });
    
    // ==========================================
    // AUTH STATE CHECK
    // ==========================================
    function checkAuthState() {
        if (typeof FCCustomer !== 'undefined' && FCCustomer.isLoggedIn()) {
            showAccountSection();
        } else {
            showAuthSection();
        }
    }
    
    function showAuthSection() {
        authSection.style.display = 'flex';
        accountSection.style.display = 'none';
    }
    
    function showAccountSection() {
        authSection.style.display = 'none';
        accountSection.style.display = 'block';
        loadAccountData();
    }
    
    // ==========================================
    // AUTH FORMS SETUP
    // ==========================================
    function setupAuthForms() {
        // Toggle forms
        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            showForm('register');
        });
        
        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            showForm('login');
        });
        
        document.getElementById('forgot-password-link').addEventListener('click', (e) => {
            e.preventDefault();
            showForm('forgot');
        });
        
        document.getElementById('back-to-login').addEventListener('click', (e) => {
            e.preventDefault();
            showForm('login');
        });
        
        // Login form
        document.getElementById('login-form-element').addEventListener('submit', handleLogin);
        
        // Register form
        document.getElementById('register-form-element').addEventListener('submit', handleRegister);
        
        // Forgot password form
        document.getElementById('forgot-form-element').addEventListener('submit', handleForgotPassword);
        
        // Logout
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
    }
    
    function showForm(formName) {
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        forgotForm.classList.remove('active');
        
        document.getElementById(`${formName}-form`).classList.add('active');
    }
    
    // ==========================================
    // AUTH HANDLERS
    // ==========================================
    async function handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const btn = e.target.querySelector('button');
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
        errorEl.textContent = '';
        
        try {
            await FCCustomer.login(email, password);
            showAccountSection();
        } catch (error) {
            errorEl.textContent = error.message;
        }
        
        btn.disabled = false;
        btn.innerHTML = '<span>Se connecter</span><i class="fas fa-arrow-right"></i>';
    }
    
    async function handleRegister(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('register-firstname').value;
        const lastName = document.getElementById('register-lastname').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const passwordConfirm = document.getElementById('register-password-confirm').value;
        const errorEl = document.getElementById('register-error');
        const btn = e.target.querySelector('button');
        
        // Validate
        if (password !== passwordConfirm) {
            errorEl.textContent = 'Les mots de passe ne correspondent pas';
            return;
        }
        
        if (password.length < 6) {
            errorEl.textContent = 'Le mot de passe doit contenir au moins 6 caractères';
            return;
        }
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
        errorEl.textContent = '';
        
        try {
            await FCCustomer.register(email, password, {
                firstName,
                lastName,
                phone
            });
            showAccountSection();
        } catch (error) {
            errorEl.textContent = error.message;
        }
        
        btn.disabled = false;
        btn.innerHTML = '<span>Créer mon compte</span><i class="fas fa-arrow-right"></i>';
    }
    
    async function handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgot-email').value;
        const errorEl = document.getElementById('forgot-error');
        const successEl = document.getElementById('forgot-success');
        const btn = e.target.querySelector('button');
        
        btn.disabled = true;
        errorEl.textContent = '';
        successEl.textContent = '';
        
        try {
            await FCCustomer.resetPassword(email);
            successEl.textContent = 'Email envoyé ! Vérifiez votre boîte de réception.';
        } catch (error) {
            errorEl.textContent = error.message;
        }
        
        btn.disabled = false;
    }
    
    async function handleLogout(e) {
        e.preventDefault();
        await FCCustomer.logout();
        showAuthSection();
    }
    
    // ==========================================
    // ACCOUNT TABS
    // ==========================================
    function setupAccountTabs() {
        const navItems = document.querySelectorAll('.account-nav .nav-item:not(.logout)');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.dataset.tab;
                switchTab(tab);
            });
        });
        
        // View all links
        document.querySelectorAll('[data-goto]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(link.dataset.goto);
            });
        });
    }
    
    function switchTab(tabName) {
        // Update nav
        document.querySelectorAll('.account-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabName) {
                item.classList.add('active');
            }
        });
        
        // Update content
        document.querySelectorAll('.account-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        // Load tab-specific data
        if (tabName === 'orders') loadOrders();
        if (tabName === 'addresses') loadAddresses();
        if (tabName === 'wishlist') loadWishlist();
    }
    
    // ==========================================
    // LOAD ACCOUNT DATA
    // ==========================================
    async function loadAccountData() {
        const customer = FCCustomer.getCurrentCustomer();
        if (!customer) return;
        
        // Update user info
        document.getElementById('user-name').textContent = 
            `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Mon compte';
        document.getElementById('user-email').textContent = customer.email;
        document.getElementById('welcome-name').textContent = customer.firstName || 'vous';
        
        // Update profile form
        document.getElementById('profile-firstname').value = customer.firstName || '';
        document.getElementById('profile-lastname').value = customer.lastName || '';
        document.getElementById('profile-email').value = customer.email || '';
        document.getElementById('profile-phone').value = customer.phone || '';
        
        // Load dashboard stats
        loadDashboardStats();
    }
    
    async function loadDashboardStats() {
        const customer = FCCustomer.getCurrentCustomer();
        if (!customer) return;
        
        // Get orders
        const orders = await FCCustomer.getOrders();
        document.getElementById('dash-orders-count').textContent = orders.length;
        
        // Wishlist count (from local + sync)
        const wishlistCount = typeof FCWishlist !== 'undefined' ? FCWishlist.count() : (customer.wishlist || []).length;
        document.getElementById('dash-wishlist-count').textContent = wishlistCount;
        
        // Points
        document.getElementById('dash-points').textContent = 
            customer.loyaltyPoints || 0;
        
        // Recent orders
        renderRecentOrders(orders.slice(0, 3));
        
        // Load loyalty program
        renderLoyaltySection(customer, orders);
    }
    
    // ==========================================
    // LOYALTY PROGRAM
    // ==========================================
    function renderLoyaltySection(customer, orders) {
        const container = document.getElementById('loyalty-container');
        if (!container) return;
        
        // Mode maintenance
        container.innerHTML = `
            <div class="loyalty-maintenance">
                <div class="maintenance-icon">
                    <i class="fas fa-tools"></i>
                </div>
                <h4>Programme de fidélité en maintenance</h4>
                <p>Nous améliorons votre expérience ! Le programme de fidélité sera bientôt disponible avec de nouvelles récompenses.</p>
                <div class="maintenance-features">
                    <span><i class="fas fa-check"></i> Cumul de points</span>
                    <span><i class="fas fa-check"></i> Niveaux exclusifs</span>
                    <span><i class="fas fa-check"></i> Récompenses</span>
                </div>
            </div>
        `;
    }

    // ==========================================
    // ORDERS
    // ==========================================
    async function loadOrders() {
        const orders = await FCCustomer.getOrders();
        renderOrdersList(orders);
    }
    
    function renderRecentOrders(orders) {
        const container = document.getElementById('recent-orders');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-state">Aucune commande pour le moment</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => createOrderCard(order, true)).join('');
    }
    
    function renderOrdersList(orders) {
        const container = document.getElementById('orders-list');
        
        if (orders.length === 0) {
            container.innerHTML = '<p class="empty-state"><i class="fas fa-box-open"></i> Aucune commande</p>';
            return;
        }
        
        container.innerHTML = orders.map(order => createOrderCard(order, false)).join('');
    }
    
    function createOrderCard(order, compact = false) {
        const date = new Date(order.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        const statusLabels = {
            'pending': { label: 'En attente', class: 'pending' },
            'paid': { label: 'Payée', class: 'paid' },
            'processing': { label: 'En préparation', class: 'processing' },
            'shipped': { label: 'Expédiée', class: 'shipped' },
            'delivered': { label: 'Livrée', class: 'delivered' },
            'cancelled': { label: 'Annulée', class: 'cancelled' }
        };
        
        const status = statusLabels[order.status] || statusLabels['pending'];
        const itemCount = order.items ? order.items.length : 0;
        
        if (compact) {
            return `
                <div class="order-card compact">
                    <div class="order-info">
                        <span class="order-number">${order.orderNumber}</span>
                        <span class="order-date">${date}</span>
                    </div>
                    <div class="order-meta">
                        <span class="order-total">${order.total?.toFixed(2) || '0.00'}€</span>
                        <span class="status-badge ${status.class}">${status.label}</span>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="order-card">
                <div class="order-header">
                    <div class="order-info">
                        <span class="order-number">${order.orderNumber}</span>
                        <span class="order-date">${date}</span>
                    </div>
                    <span class="status-badge ${status.class}">${status.label}</span>
                </div>
                <div class="order-items-preview">
                    ${itemCount} article${itemCount > 1 ? 's' : ''}
                </div>
                <div class="order-footer">
                    <span class="order-total">Total: <strong>${order.total?.toFixed(2) || '0.00'}€</strong></span>
                    <a href="suivi-commande.html?order=${order.orderNumber}" class="btn-track-order">
                        <i class="fas fa-truck"></i> Suivre
                    </a>
                </div>
            </div>
        `;
    }
    
    // ==========================================
    // ADDRESSES
    // ==========================================
    function setupAddressModal() {
        const modal = document.getElementById('address-modal');
        const btn = document.getElementById('btn-add-address');
        const closeBtn = modal.querySelector('.modal-close');
        
        btn.addEventListener('click', () => {
            modal.classList.add('active');
        });
        
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Form submit
        document.getElementById('address-form').addEventListener('submit', handleAddAddress);
    }
    
    async function handleAddAddress(e) {
        e.preventDefault();
        
        const address = {
            firstName: document.getElementById('addr-firstname').value,
            lastName: document.getElementById('addr-lastname').value,
            street: document.getElementById('addr-street').value,
            postalCode: document.getElementById('addr-postal').value,
            city: document.getElementById('addr-city').value,
            phone: document.getElementById('addr-phone').value,
            isDefault: document.getElementById('addr-default').checked
        };
        
        try {
            await FCCustomer.addAddress(address);
            document.getElementById('address-modal').classList.remove('active');
            document.getElementById('address-form').reset();
            loadAddresses();
        } catch (error) {
            alert(error.message);
        }
    }
    
    function loadAddresses() {
        const customer = FCCustomer.getCurrentCustomer();
        const addresses = customer?.addresses || [];
        const container = document.getElementById('addresses-list');
        
        if (addresses.length === 0) {
            container.innerHTML = '<p class="empty-state"><i class="fas fa-map"></i> Aucune adresse enregistrée</p>';
            return;
        }
        
        container.innerHTML = addresses.map(addr => `
            <div class="address-card ${addr.isDefault ? 'default' : ''}">
                ${addr.isDefault ? '<span class="default-badge"><i class="fas fa-check"></i> Par défaut</span>' : ''}
                <p class="addr-name"><strong>${addr.firstName} ${addr.lastName}</strong></p>
                <p class="addr-street">${addr.street}</p>
                <p class="addr-city">${addr.postalCode} ${addr.city}</p>
                ${addr.phone ? `<p class="addr-phone"><i class="fas fa-phone"></i> ${addr.phone}</p>` : ''}
                <button class="btn-delete-addr" onclick="deleteAddress('${addr.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    window.deleteAddress = async function(id) {
        if (!confirm('Supprimer cette adresse ?')) return;
        
        try {
            await FCCustomer.deleteAddress(id);
            loadAddresses();
        } catch (error) {
            alert(error.message);
        }
    };
    
    // ==========================================
    // WISHLIST
    // ==========================================
    function loadWishlist() {
        // Use FCWishlist module if available
        if (typeof FCWishlist !== 'undefined') {
            FCWishlist.renderWishlistPage('wishlist-container');
        } else {
            // Fallback
            const wishlist = FCCustomer.getWishlist();
            const container = document.getElementById('wishlist-container');
            
            if (!wishlist || wishlist.length === 0) {
                container.innerHTML = `
                    <div class="wishlist-empty">
                        <i class="fas fa-heart"></i>
                        <h3>Votre liste de favoris est vide</h3>
                        <p>Parcourez nos produits et ajoutez vos coups de cœur !</p>
                        <a href="index.html#categories" class="btn-primary">
                            <i class="fas fa-shopping-bag"></i> Découvrir nos produits
                        </a>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = `<p class="info-text">${wishlist.length} article(s) dans votre liste</p>`;
        }
    }
    
    // ==========================================
    // PROFILE
    // ==========================================
    function setupProfileForm() {
        document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
        document.getElementById('btn-change-password').addEventListener('click', handleChangePassword);
    }
    
    async function handleProfileUpdate(e) {
        e.preventDefault();
        
        const updates = {
            firstName: document.getElementById('profile-firstname').value,
            lastName: document.getElementById('profile-lastname').value,
            phone: document.getElementById('profile-phone').value
        };
        
        try {
            await FCCustomer.updateProfile(updates);
            document.getElementById('profile-success').textContent = 'Profil mis à jour !';
            
            // Update displayed name
            document.getElementById('user-name').textContent = 
                `${updates.firstName} ${updates.lastName}`.trim();
            document.getElementById('welcome-name').textContent = updates.firstName;
            
            setTimeout(() => {
                document.getElementById('profile-success').textContent = '';
            }, 3000);
        } catch (error) {
            alert(error.message);
        }
    }
    
    async function handleChangePassword() {
        const customer = FCCustomer.getCurrentCustomer();
        if (!customer) return;
        
        try {
            await FCCustomer.resetPassword(customer.email);
            alert('Email de réinitialisation envoyé !');
        } catch (error) {
            alert(error.message);
        }
    }
    
})();
