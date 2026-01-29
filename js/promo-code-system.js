/* ============================================
   FAMILY CUSTOM - Promo Code System
   Gestion des codes promo avec Firebase
   ============================================ */

const FCPromoCode = (function() {
    'use strict';
    
    const db = window.FirebaseDB;
    
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
     */
    async function validateCode(code, orderTotal = 0) {
        if (!code || code.trim() === '') {
            return { valid: false, error: 'Code requis' };
        }
        
        code = code.toUpperCase().trim();
        
        if (!db) {
            // Mode démo sans Firebase
            return getDemoPromo(code, orderTotal);
        }
        
        try {
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
    async function usePromoCode(code) {
        if (!db) return;
        
        code = code.toUpperCase().trim();
        
        try {
            const snapshot = await db.collection('promoCodes')
                .where('code', '==', code)
                .limit(1)
                .get();
            
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const currentCount = doc.data().usedCount || 0;
                
                await doc.ref.update({
                    usedCount: currentCount + 1,
                    lastUsedAt: new Date().toISOString()
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
     * Codes promo démo (sans Firebase) - Désactivé
     */
    function getDemoPromo(code, orderTotal) {
        // Mode démo désactivé - nécessite Firebase
        return { valid: false, error: 'Code promo invalide' };
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
