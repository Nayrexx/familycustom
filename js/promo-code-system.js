/* ============================================
   FAMILY CUSTOM - Promo Code System
   Gestion des codes promo avec Firebase
   ============================================ */

const FCPromoCode = (function() {
    'use strict';
    
    // Fonction pour obtenir db dynamiquement (évite les problèmes de timing)
    function getDB() {
        return window.FirebaseDB;
    }
    
    // Types de réduction
    const DISCOUNT_TYPES = {
        PERCENTAGE: 'percentage',      // Ex: 10% de réduction
        FIXED_AMOUNT: 'fixed',         // Ex: 5€ de réduction
        FREE_SHIPPING: 'free_shipping' // Livraison gratuite
    };
    
    /**
     * Créer un nouveau code promo
     */
    async function createPromoCode(promoData) {
        const db = getDB();
        if (!db) {
            throw new Error('Firebase non disponible');
        }
        
        const code = promoData.code.toUpperCase().trim();
        
        // Vérifier si le code existe déjà
        const existing = await db.collection('promoCodes')
            .where('code', '==', code)
            .get();
        
        if (!existing.empty) {
            throw new Error('Ce code promo existe déjà');
        }
        
        const promo = {
            code: code,
            description: promoData.description || '',
            discountType: promoData.discountType || DISCOUNT_TYPES.PERCENTAGE,
            discountValue: parseFloat(promoData.discountValue) || 0,
            minOrderAmount: parseFloat(promoData.minOrderAmount) || 0,
            maxUses: parseInt(promoData.maxUses) || 0, // 0 = illimité
            usedCount: 0,
            isActive: true,
            startDate: promoData.startDate || new Date().toISOString(),
            endDate: promoData.endDate || null,
            restrictToCategory: promoData.restrictToCategory || null,
            categoryName: promoData.categoryName || null,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await db.collection('promoCodes').add(promo);
        
        return {
            id: docRef.id,
            ...promo
        };
    }
    
    /**
     * Valider un code promo
     * @param {string} code - Le code promo
     * @param {number} orderTotal - Montant total de la commande
     * @param {string} userEmail - Email utilisateur (optionnel)
     * @param {Array} cartItems - Items du panier pour vérifier les restrictions de catégorie
     */
    async function validateCode(code, orderTotal = 0, userEmail = null, cartItems = []) {
        if (!code || code.trim() === '') {
            return { valid: false, error: 'Code requis' };
        }
        
        code = code.toUpperCase().trim();
        
        const db = getDB();
        if (!db) {
            // Mode démo sans Firebase
            return getDemoPromo(code, orderTotal, cartItems);
        }
        
        try {
            // D'abord, vérifier si c'est un code de la roue de la fortune (WHEEL-XXXXXX)
            if (code.startsWith('WHEEL-') || code.startsWith('FC-')) {
                const wheelResult = await validateWheelCode(code, orderTotal, userEmail);
                if (wheelResult.valid || wheelResult.error !== 'Code non trouvé') {
                    return wheelResult;
                }
            }
            
            // Sinon, chercher dans les codes promo classiques
            const snapshot = await db.collection('promoCodes')
                .where('code', '==', code)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return { valid: false, error: 'Code promo invalide' };
            }
            
            const doc = snapshot.docs[0];
            const promo = { id: doc.id, ...doc.data() };
            
            // Vérifier si actif
            if (!promo.isActive) {
                return { valid: false, error: 'Ce code promo n\'est plus actif' };
            }
            
            // Vérifier les dates
            const now = new Date();
            if (promo.startDate && new Date(promo.startDate) > now) {
                return { valid: false, error: 'Ce code promo n\'est pas encore valide' };
            }
            if (promo.endDate && new Date(promo.endDate) < now) {
                return { valid: false, error: 'Ce code promo a expiré' };
            }
            
            // Vérifier le nombre d'utilisations
            if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
                return { valid: false, error: 'Ce code promo a atteint sa limite d\'utilisation' };
            }
            
            // Vérifier la restriction de catégorie (si définie)
            if (promo.restrictToCategory && cartItems && cartItems.length > 0) {
                const hasValidProduct = cartItems.some(item => {
                    if (item.categoryIds && Array.isArray(item.categoryIds)) {
                        return item.categoryIds.includes(promo.restrictToCategory);
                    }
                    if (item.categoryId) {
                        return item.categoryId === promo.restrictToCategory;
                    }
                    return false;
                });
                
                if (!hasValidProduct) {
                    return { 
                        valid: false, 
                        error: `Ce code est valable uniquement pour les produits "${promo.categoryName || 'de la catégorie spéciale'}"` 
                    };
                }
            }
            
            // Vérifier le montant minimum
            if (promo.minOrderAmount > 0 && orderTotal < promo.minOrderAmount) {
                return { 
                    valid: false, 
                    error: `Commande minimum de ${promo.minOrderAmount.toFixed(2)}€ requise` 
                };
            }
            
            // Calculer la réduction
            const discount = calculateDiscount(promo, orderTotal);
            
            return {
                valid: true,
                promo: promo,
                discount: discount,
                message: getSuccessMessage(promo, discount)
            };
            
        } catch (error) {
            console.error('Erreur validation code promo:', error);
            return { valid: false, error: 'Erreur de validation' };
        }
    }
    
    /**
     * Valider un code de la roue de la fortune
     */
    async function validateWheelCode(code, orderTotal = 0, userEmail = null) {
        const db = getDB();
        if (!db) {
            return { valid: false, error: 'Firebase non disponible' };
        }
        
        try {
            // Les codes de la roue sont stockés avec leur code comme ID du document
            const docRef = db.collection('promo_codes').doc(code);
            const doc = await docRef.get();
            
            console.log('🔍 Recherche code roue:', code, '- Trouvé:', doc.exists);
            
            if (!doc.exists) {
                return { valid: false, error: 'Code non trouvé' };
            }
            
            const wheelCode = doc.data();
            
            // Vérifier si déjà utilisé
            if (wheelCode.used) {
                return { valid: false, error: 'Ce code a déjà été utilisé' };
            }
            
            // Vérifier l'expiration
            if (wheelCode.expiresAt) {
                const expirationDate = wheelCode.expiresAt.toDate ? wheelCode.expiresAt.toDate() : new Date(wheelCode.expiresAt);
                if (expirationDate < new Date()) {
                    return { valid: false, error: 'Ce code a expiré' };
                }
            }
            
            // Calculer la réduction selon le type
            let discount = 0;
            let discountType = wheelCode.type;
            
            if (wheelCode.type === 'percent') {
                discount = (orderTotal * wheelCode.discount) / 100;
                discountType = 'percentage';
            } else if (wheelCode.type === 'free_shipping') {
                discount = 9.90; // Frais de port standard
            }
            
            // Créer un objet promo compatible avec le système existant
            const promo = {
                id: doc.id,
                code: wheelCode.code,
                discountType: discountType,
                discountValue: wheelCode.discount,
                description: `Code roue de la fortune (${wheelCode.prize})`,
                source: 'wheel',
                email: wheelCode.email
            };
            
            return {
                valid: true,
                promo: promo,
                discount: discount,
                message: getWheelSuccessMessage(wheelCode, discount),
                isWheelCode: true
            };
            
        } catch (error) {
            console.error('Erreur validation code roue:', error);
            return { valid: false, error: 'Erreur de validation' };
        }
    }
    
    /**
     * Message de succès pour code roue
     */
    function getWheelSuccessMessage(wheelCode, discount) {
        if (wheelCode.type === 'free_shipping') {
            return '🎡 Livraison gratuite appliquée !';
        }
        return `🎡 ${wheelCode.discount}% de réduction appliqué (-${discount.toFixed(2)}€)`;
    }
    
    /**
     * Calculer la réduction
     */
    function calculateDiscount(promo, orderTotal) {
        switch (promo.discountType) {
            case DISCOUNT_TYPES.PERCENTAGE:
                return (orderTotal * promo.discountValue) / 100;
            
            case DISCOUNT_TYPES.FIXED_AMOUNT:
                return Math.min(promo.discountValue, orderTotal);
            
            case DISCOUNT_TYPES.FREE_SHIPPING:
                return 9.90; // Frais de port standard
            
            default:
                return 0;
        }
    }
    
    /**
     * Message de succès selon le type
     */
    function getSuccessMessage(promo, discount) {
        switch (promo.discountType) {
            case DISCOUNT_TYPES.PERCENTAGE:
                return `${promo.discountValue}% de réduction appliqué (-${discount.toFixed(2)}€)`;
            
            case DISCOUNT_TYPES.FIXED_AMOUNT:
                return `${promo.discountValue}€ de réduction appliqué`;
            
            case DISCOUNT_TYPES.FREE_SHIPPING:
                return 'Livraison gratuite appliquée !';
            
            default:
                return 'Code promo appliqué !';
        }
    }
    
    /**
     * Marquer un code promo comme utilisé
     */
    async function usePromoCode(code, orderId = null) {
        const db = getDB();
        if (!db) return;
        
        code = code.toUpperCase().trim();
        
        try {
            // Vérifier si c'est un code de la roue
            if (code.startsWith('WHEEL-') || code.startsWith('FC-')) {
                const docRef = db.collection('promo_codes').doc(code);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    await docRef.update({
                        used: true,
                        usedAt: new Date(),
                        usedOrderId: orderId
                    });
                    console.log('✅ Code roue marqué comme utilisé:', code);
                    return;
                }
            }
            
            // Sinon, code promo classique
            const snapshot = await db.collection('promoCodes')
                .where('code', '==', code)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const currentCount = doc.data().usedCount || 0;
                
                await doc.ref.update({
                    usedCount: currentCount + 1,
                    lastUsedAt: new Date().toISOString(),
                    lastOrderId: orderId
                });
            }
        } catch (error) {
            console.error('Erreur mise à jour code promo:', error);
        }
    }
    
    /**
     * Récupérer tous les codes promo (admin)
     */
    async function getAllPromoCodes() {
        const db = getDB();
        if (!db) return [];
        
        try {
            const snapshot = await db.collection('promoCodes')
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur chargement codes promo:', error);
            return [];
        }
    }
    
    /**
     * Mettre à jour un code promo
     */
    async function updatePromoCode(id, updates) {
        const db = getDB();
        if (!db) return;
        
        try {
            await db.collection('promoCodes').doc(id).update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Erreur mise à jour code promo:', error);
            return false;
        }
    }
    
    /**
     * Supprimer un code promo
     */
    async function deletePromoCode(id) {
        const db = getDB();
        if (!db) return;
        
        try {
            await db.collection('promoCodes').doc(id).delete();
            return true;
        } catch (error) {
            console.error('Erreur suppression code promo:', error);
            return false;
        }
    }
    
    /**
     * Codes promo démo (fallback sans Firebase)
     */
    function getDemoPromo(code, orderTotal, cartItems = []) {
        // Codes promos actifs
        const demoCodes = {
            'MAMIE15': {
                discountType: 'percentage',
                discountValue: 15,
                description: 'Fête des Grands-Mères -15%',
                minOrderAmount: 0,
                endDate: '2026-03-02T23:59:59', // Valable jusqu'au 2 mars
                restrictToCategory: 'fete-mamies', // Uniquement pour cette catégorie
                categoryName: 'Fête des Grands-Mères'
            },
            'BIENVENUE10': {
                discountType: 'percentage',
                discountValue: 10,
                description: 'Bienvenue -10%',
                minOrderAmount: 0,
                endDate: null
            },
            'RESTE10': {
                discountType: 'percentage',
                discountValue: 10,
                description: 'Code exclusif -10%',
                minOrderAmount: 15,
                endDate: null
            }
        };
        
        const promo = demoCodes[code];
        if (!promo) {
            return { valid: false, error: 'Code promo invalide' };
        }
        
        // Vérifier la date d'expiration
        if (promo.endDate && new Date() > new Date(promo.endDate)) {
            return { valid: false, error: 'Ce code promo a expiré' };
        }
        
        // Vérifier la restriction de catégorie
        if (promo.restrictToCategory && cartItems.length > 0) {
            const hasValidProduct = cartItems.some(item => {
                // Vérifier si le produit appartient à la catégorie requise
                if (item.categoryIds && Array.isArray(item.categoryIds)) {
                    return item.categoryIds.includes(promo.restrictToCategory);
                }
                if (item.categoryId) {
                    return item.categoryId === promo.restrictToCategory;
                }
                return false;
            });
            
            if (!hasValidProduct) {
                return { 
                    valid: false, 
                    error: `Ce code est valable uniquement pour les produits "${promo.categoryName || 'de la catégorie spéciale'}"` 
                };
            }
        }
        
        // Vérifier le minimum de commande
        if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) {
            return { 
                valid: false, 
                error: `Minimum de commande : ${promo.minOrderAmount}€` 
            };
        }
        
        return {
            valid: true,
            code: code,
            discountType: promo.discountType,
            discountValue: promo.discountValue,
            description: promo.description,
            restrictToCategory: promo.restrictToCategory
        };
    }
    
    // API publique
    return {
        DISCOUNT_TYPES,
        createPromoCode,
        validateCode,
        usePromoCode,
        getAllPromoCodes,
        updatePromoCode,
        deletePromoCode,
        calculateDiscount
    };
    
})();

// Export global
window.FCPromoCode = FCPromoCode;
