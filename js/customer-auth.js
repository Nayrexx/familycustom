/* ============================================
   FAMILY CUSTOM - Customer Authentication System
   Gestion des comptes clients
   ============================================ */

const FCCustomer = (function() {
    'use strict';
    
    const db = window.FirebaseDB;
    const auth = window.FirebaseAuth;
    
    // Current customer state
    let currentCustomer = null;
    
    // ==========================================
    // REGISTER NEW CUSTOMER
    // ==========================================
    async function register(email, password, userData) {
        if (!auth || !db) {
            throw new Error('Service indisponible');
        }
        
        try {
            // Create Firebase auth user
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Create customer profile in Firestore
            const customerData = {
                uid: user.uid,
                email: email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                phone: userData.phone || '',
                addresses: [],
                defaultAddress: null,
                wishlist: [],
                loyaltyPoints: 0,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            await db.collection('customers').doc(user.uid).set(customerData);
            
            currentCustomer = customerData;
            saveCustomerToLocal(customerData);
            
            return { success: true, customer: customerData };
            
        } catch (error) {
            console.error('Erreur inscription:', error);
            let message = 'Erreur lors de l\'inscription';
            
            if (error.code === 'auth/email-already-in-use') {
                message = 'Cet email est déjà utilisé';
            } else if (error.code === 'auth/weak-password') {
                message = 'Le mot de passe doit contenir au moins 6 caractères';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Email invalide';
            }
            
            throw new Error(message);
        }
    }
    
    // ==========================================
    // LOGIN CUSTOMER
    // ==========================================
    async function login(email, password) {
        if (!auth || !db) {
            throw new Error('Service indisponible');
        }
        
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get customer profile
            const doc = await db.collection('customers').doc(user.uid).get();
            
            if (doc.exists) {
                currentCustomer = { id: doc.id, ...doc.data() };
                
                // Update last login
                await db.collection('customers').doc(user.uid).update({
                    lastLogin: new Date().toISOString()
                });
                
                saveCustomerToLocal(currentCustomer);
                return { success: true, customer: currentCustomer };
            } else {
                // Déconnecter l'utilisateur et demander de créer un compte
                await auth.signOut();
                throw new Error('Compte introuvable, veuillez en créer un');
            }
            
        } catch (error) {
            console.error('Erreur connexion:', error);
            let message = 'Erreur de connexion';
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                message = 'Email ou mot de passe incorrect';
            } else if (error.code === 'auth/too-many-requests') {
                message = 'Trop de tentatives, réessayez plus tard';
            }
            
            throw new Error(message);
        }
    }
    
    // ==========================================
    // LOGOUT
    // ==========================================
    async function logout() {
        if (auth) {
            await auth.signOut();
        }
        currentCustomer = null;
        localStorage.removeItem('fcCustomer');
        return { success: true };
    }
    
    // ==========================================
    // PASSWORD RESET
    // ==========================================
    async function resetPassword(email) {
        if (!auth) {
            throw new Error('Service indisponible');
        }
        
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true, message: 'Email de réinitialisation envoyé' };
        } catch (error) {
            console.error('Erreur reset password:', error);
            throw new Error('Impossible d\'envoyer l\'email de réinitialisation');
        }
    }
    
    // ==========================================
    // GET CURRENT CUSTOMER
    // ==========================================
    function getCurrentCustomer() {
        if (currentCustomer) return currentCustomer;
        
        const stored = localStorage.getItem('fcCustomer');
        if (stored) {
            currentCustomer = JSON.parse(stored);
            return currentCustomer;
        }
        
        return null;
    }
    
    // ==========================================
    // CHECK IF LOGGED IN
    // ==========================================
    function isLoggedIn() {
        return getCurrentCustomer() !== null;
    }
    
    // ==========================================
    // UPDATE PROFILE
    // ==========================================
    async function updateProfile(updates) {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            throw new Error('Non connecté');
        }
        
        try {
            await db.collection('customers').doc(customer.id).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
            
            // Update local state
            Object.assign(currentCustomer, updates);
            saveCustomerToLocal(currentCustomer);
            
            return { success: true, customer: currentCustomer };
        } catch (error) {
            console.error('Erreur mise à jour profil:', error);
            throw new Error('Impossible de mettre à jour le profil');
        }
    }
    
    // ==========================================
    // ADD ADDRESS
    // ==========================================
    async function addAddress(address) {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            throw new Error('Non connecté');
        }
        
        const newAddress = {
            id: Date.now().toString(),
            label: address.label || 'Adresse',
            firstName: address.firstName,
            lastName: address.lastName,
            street: address.street,
            city: address.city,
            postalCode: address.postalCode,
            country: address.country || 'France',
            phone: address.phone || '',
            isDefault: address.isDefault || false
        };
        
        try {
            const addresses = customer.addresses || [];
            
            // If setting as default, unset others
            if (newAddress.isDefault) {
                addresses.forEach(a => a.isDefault = false);
            }
            
            addresses.push(newAddress);
            
            // Préparer les données de mise à jour (éviter les valeurs undefined)
            const updateData = {
                addresses: addresses
            };
            
            // Ne définir defaultAddress que si une valeur valide existe
            if (newAddress.isDefault) {
                updateData.defaultAddress = newAddress.id;
            } else if (customer.defaultAddress) {
                updateData.defaultAddress = customer.defaultAddress;
            }
            
            await db.collection('customers').doc(customer.id).update(updateData);
            
            currentCustomer.addresses = addresses;
            if (newAddress.isDefault) {
                currentCustomer.defaultAddress = newAddress.id;
            }
            saveCustomerToLocal(currentCustomer);
            
            return { success: true, address: newAddress };
        } catch (error) {
            console.error('Erreur ajout adresse:', error);
            throw new Error('Impossible d\'ajouter l\'adresse');
        }
    }
    
    // ==========================================
    // DELETE ADDRESS
    // ==========================================
    async function deleteAddress(addressId) {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            throw new Error('Non connecté');
        }
        
        try {
            const addresses = (customer.addresses || []).filter(a => a.id !== addressId);
            
            await db.collection('customers').doc(customer.id).update({
                addresses: addresses
            });
            
            currentCustomer.addresses = addresses;
            saveCustomerToLocal(currentCustomer);
            
            return { success: true };
        } catch (error) {
            console.error('Erreur suppression adresse:', error);
            throw new Error('Impossible de supprimer l\'adresse');
        }
    }
    
    // ==========================================
    // GET CUSTOMER ORDERS
    // ==========================================
    async function getOrders() {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            return [];
        }
        
        try {
            const snapshot = await db.collection('orders')
                .where('customer.email', '==', customer.email)
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur chargement commandes:', error);
            return [];
        }
    }
    
    // ==========================================
    // GET SINGLE ORDER
    // ==========================================
    async function getOrder(orderId) {
        if (!db) return null;
        
        try {
            const doc = await db.collection('orders').doc(orderId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erreur chargement commande:', error);
            return null;
        }
    }
    
    // ==========================================
    // GET ORDER BY NUMBER
    // ==========================================
    async function getOrderByNumber(orderNumber) {
        if (!db) return null;
        
        try {
            const snapshot = await db.collection('orders')
                .where('orderNumber', '==', orderNumber)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Erreur recherche commande:', error);
            return null;
        }
    }
    
    // ==========================================
    // WISHLIST MANAGEMENT
    // ==========================================
    async function addToWishlist(productId) {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            throw new Error('Non connecté');
        }
        
        try {
            const wishlist = customer.wishlist || [];
            if (!wishlist.includes(productId)) {
                wishlist.push(productId);
                
                await db.collection('customers').doc(customer.id).update({
                    wishlist: wishlist
                });
                
                currentCustomer.wishlist = wishlist;
                saveCustomerToLocal(currentCustomer);
            }
            
            return { success: true, wishlist };
        } catch (error) {
            console.error('Erreur wishlist:', error);
            throw new Error('Impossible d\'ajouter à la liste de souhaits');
        }
    }
    
    async function removeFromWishlist(productId) {
        const customer = getCurrentCustomer();
        if (!customer || !db) {
            throw new Error('Non connecté');
        }
        
        try {
            const wishlist = (customer.wishlist || []).filter(id => id !== productId);
            
            await db.collection('customers').doc(customer.id).update({
                wishlist: wishlist
            });
            
            currentCustomer.wishlist = wishlist;
            saveCustomerToLocal(currentCustomer);
            
            return { success: true, wishlist };
        } catch (error) {
            console.error('Erreur wishlist:', error);
            throw new Error('Impossible de retirer de la liste de souhaits');
        }
    }
    
    function getWishlist() {
        const customer = getCurrentCustomer();
        return customer ? (customer.wishlist || []) : [];
    }
    
    // ==========================================
    // LOYALTY POINTS
    // ==========================================
    async function addLoyaltyPoints(points, reason) {
        const customer = getCurrentCustomer();
        if (!customer || !db) return;
        
        try {
            const newPoints = (customer.loyaltyPoints || 0) + points;
            
            await db.collection('customers').doc(customer.id).update({
                loyaltyPoints: newPoints
            });
            
            // Log points history
            await db.collection('customers').doc(customer.id)
                .collection('pointsHistory').add({
                    points: points,
                    reason: reason,
                    date: new Date().toISOString()
                });
            
            currentCustomer.loyaltyPoints = newPoints;
            saveCustomerToLocal(currentCustomer);
            
        } catch (error) {
            console.error('Erreur ajout points:', error);
        }
    }
    
    function getLoyaltyPoints() {
        const customer = getCurrentCustomer();
        return customer ? (customer.loyaltyPoints || 0) : 0;
    }
    
    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
    function saveCustomerToLocal(customer) {
        localStorage.setItem('fcCustomer', JSON.stringify(customer));
    }
    
    // Listen to auth state changes
    function initAuthListener() {
        if (auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    // User is signed in
                    try {
                        const doc = await db.collection('customers').doc(user.uid).get();
                        if (doc.exists) {
                            currentCustomer = { id: doc.id, ...doc.data() };
                            saveCustomerToLocal(currentCustomer);
                        }
                    } catch (error) {
                        console.error('Erreur chargement profil:', error);
                    }
                } else {
                    // User is signed out
                    currentCustomer = null;
                    localStorage.removeItem('fcCustomer');
                }
                
                // Trigger custom event
                window.dispatchEvent(new CustomEvent('fcAuthStateChanged', {
                    detail: { customer: currentCustomer }
                }));
            });
        }
    }
    
    // Initialize
    initAuthListener();
    
    // Public API
    return {
        register,
        login,
        logout,
        resetPassword,
        getCurrentCustomer,
        isLoggedIn,
        updateProfile,
        addAddress,
        deleteAddress,
        getOrders,
        getOrder,
        getOrderByNumber,
        addToWishlist,
        removeFromWishlist,
        getWishlist,
        addLoyaltyPoints,
        getLoyaltyPoints
    };
    
})();

// Make available globally
window.FCCustomer = FCCustomer;
