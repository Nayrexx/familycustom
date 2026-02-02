/* ============================================
   FAMILY CUSTOM - Gift Card System
   Gestion complète des cartes cadeaux
   ============================================ */

const FCGiftCard = (function() {
    'use strict';
    
    // Reference to Firebase DB
    const db = window.FirebaseDB;
    
    // ==========================================
    // GENERATE GIFT CARD CODE
    // ==========================================
    function generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            if (i > 0 && i % 4 === 0) code += '-';
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    // ==========================================
    // SAVE GIFT CARD TO FIREBASE
    // ==========================================
    async function saveGiftCard(giftCardData) {
        if (!db) {
            console.warn('Firebase non disponible');
            throw new Error('Firebase non disponible');
        }
        
        // Generate code if not provided
        const code = giftCardData.code || generateCode();
        
        const giftCard = {
            code: code,
            amount: giftCardData.amount || 0,
            remainingBalance: giftCardData.amount || 0,
            recipientName: giftCardData.recipientName || null,
            recipientEmail: giftCardData.recipientEmail || null,
            senderName: giftCardData.senderName || null,
            message: giftCardData.message || null,
            deliveryOption: giftCardData.deliveryOption || 'immediate',
            scheduledDate: giftCardData.scheduledDate || null,
            status: 'active', // active, used, expired
            orderId: giftCardData.orderId || null,
            createdAt: new Date().toISOString(),
            usedAt: null,
            usedOnOrder: null
        };
        
        try {
            const docRef = await db.collection('giftCards').add(giftCard);
            
            console.log('Carte cadeau enregistrée:', docRef.id);
            return { id: docRef.id, code: code, ...giftCard };
        } catch (error) {
            console.error('Erreur enregistrement carte cadeau:', error);
            throw error;
        }
    }
    
    // ==========================================
    // VALIDATE GIFT CARD CODE
    // ==========================================
    async function validateCode(code) {
        if (!code || code.trim() === '') {
            return { valid: false, error: 'Veuillez entrer un code' };
        }
        
        // Normalize code (remove spaces, uppercase)
        const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '');
        
        if (!db) {
            return { valid: false, error: 'Service indisponible' };
        }
        
        try {
            const snapshot = await db.collection('giftCards')
                .where('code', '==', normalizedCode)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return { valid: false, error: 'Code invalide ou inexistant' };
            }
            
            const doc = snapshot.docs[0];
            const giftCard = { id: doc.id, ...doc.data() };
            
            // Check status
            if (giftCard.status === 'used') {
                return { valid: false, error: 'Cette carte a déjà été utilisée' };
            }
            
            if (giftCard.status === 'expired') {
                return { valid: false, error: 'Cette carte a expiré' };
            }
            
            // Check remaining balance
            if (giftCard.remainingBalance <= 0) {
                return { valid: false, error: 'Le solde de cette carte est épuisé' };
            }
            
            return {
                valid: true,
                giftCard: giftCard,
                balance: giftCard.remainingBalance
            };
            
        } catch (error) {
            console.error('Erreur validation carte:', error);
            return { valid: false, error: 'Erreur de validation' };
        }
    }
    
    // ==========================================
    // USE GIFT CARD (deduct from balance)
    // ==========================================
    async function useGiftCard(code, amountUsed, orderId) {
        if (!db) {
            return { success: false, error: 'Service indisponible' };
        }
        
        const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '');
        
        try {
            // Find card by code
            const snapshot = await db.collection('giftCards')
                .where('code', '==', normalizedCode)
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return { success: false, error: 'Carte introuvable' };
            }
            
            const doc = snapshot.docs[0];
            const giftCard = doc.data();
            const newBalance = giftCard.remainingBalance - amountUsed;
            
            const updateData = {
                remainingBalance: Math.max(0, newBalance),
                usedAt: new Date().toISOString(),
                usedOnOrder: orderId || null
            };
            
            // If fully used, mark as used
            if (newBalance <= 0) {
                updateData.status = 'used';
            }
            
            await doc.ref.update(updateData);
            
            return {
                success: true,
                amountDeducted: Math.min(amountUsed, giftCard.remainingBalance),
                newBalance: Math.max(0, newBalance)
            };
            
        } catch (error) {
            console.error('Erreur utilisation carte:', error);
            return { success: false, error: 'Erreur lors de l\'utilisation' };
        }
    }
    
    // ==========================================
    // GET ALL GIFT CARDS (for admin)
    // ==========================================
    async function getAllGiftCards() {
        if (!db) {
            return [];
        }
        
        try {
            const snapshot = await db.collection('giftCards')
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erreur chargement cartes:', error);
            return [];
        }
    }
    
    // ==========================================
    // SEND GIFT CARD EMAIL
    // ==========================================
    async function sendGiftCardEmail(giftCard) {
        console.log('Email carte cadeau à envoyer:', {
            to: giftCard.recipientEmail,
            code: giftCard.code,
            amount: giftCard.amount,
            message: giftCard.message,
            from: giftCard.senderName
        });
        
        if (typeof FCEmail !== 'undefined' && typeof FCEmail.sendGiftCardEmail === 'function') {
            return await FCEmail.sendGiftCardEmail(giftCard);
        }
        
        return true;
    }
    
    // Public API
    return {
        generateCode,
        saveGiftCard,
        validateCode,
        useGiftCard,
        getAllGiftCards,
        sendGiftCardEmail
    };
    
})();

// Make available globally
window.FCGiftCard = FCGiftCard;
