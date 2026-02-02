/* ============================================
   FAMILY CUSTOM - Analytics (Visitors & Clicks)
   ============================================ */

(function() {
    'use strict';
    
    const db = window.FirebaseDB;
    if (!db) {
        console.log('Firebase not available for analytics');
        window.FCAnalytics = {
            trackCategoryClick: function() {},
            trackProductClick: function() {}
        };
        return;
    }
    
    // Generate unique visitor ID
    function getVisitorId() {
        let visitorId = localStorage.getItem('fc_visitor_id');
        if (!visitorId) {
            visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('fc_visitor_id', visitorId);
        }
        return visitorId;
    }
    
    const visitorId = getVisitorId();
    const HEARTBEAT_INTERVAL = 30000;
    
    // ===== Visitor Presence =====
    async function registerVisitor() {
        try {
            await db.collection('visitors').doc(visitorId).set({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            // Silent fail
        }
    }
    
    async function updateHeartbeat() {
        try {
            await db.collection('visitors').doc(visitorId).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                page: window.location.pathname
            });
        } catch (error) {
            registerVisitor();
        }
    }
    
    async function removeVisitor() {
        try {
            await db.collection('visitors').doc(visitorId).delete();
        } catch (error) {
            // Silent fail
        }
    }
    
    // ===== Click Tracking =====
    async function trackClick(type, id, name) {
        try {
            const statRef = db.collection('stats').doc('clicks');
            const clickRef = db.collection('clicks').doc();
            
            await clickRef.set({
                type: type,
                itemId: id,
                itemName: name,
                visitorId: visitorId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.runTransaction(async (transaction) => {
                const statDoc = await transaction.get(statRef);
                let data = statDoc.exists ? statDoc.data() : { categories: {}, products: {}, total: 0 };
                
                if (type === 'category') {
                    data.categories = data.categories || {};
                    data.categories[id] = (data.categories[id] || 0) + 1;
                } else if (type === 'product') {
                    data.products = data.products || {};
                    data.products[id] = (data.products[id] || 0) + 1;
                }
                data.total = (data.total || 0) + 1;
                
                transaction.set(statRef, data);
            });
        } catch (error) {
            // Silent fail - don't break user experience
        }
    }
    
    // ===== Initialize =====
    registerVisitor();
    setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);
    
    window.addEventListener('beforeunload', removeVisitor);
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            removeVisitor();
        } else {
            registerVisitor();
        }
    });
    
    window.FCAnalytics = {
        trackCategoryClick: function(categoryId, categoryName) {
            trackClick('category', categoryId, categoryName);
        },
        trackProductClick: function(productId, productName) {
            trackClick('product', productId, productName);
        }
    };
    
    console.log('Analytics initialized');
    
})();
