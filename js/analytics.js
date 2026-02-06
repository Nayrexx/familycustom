/* ============================================
   FAMILY CUSTOM - Analytics Complet
   Visiteurs, Pages vues, Clics, Sources
   ============================================ */

(function() {
    'use strict';
    
    const db = window.FirebaseDB;
    if (!db) {
        window.FCAnalytics = {
            trackCategoryClick: function() {},
            trackProductClick: function() {},
            trackEvent: function() {}
        };
        return;
    }
    
    // === Visitor ID persistant ===
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
    const pageEntryTime = Date.now();
    
    // === Helpers ===
    function getPageName() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'index';
        return page;
    }
    
    function getDeviceType() {
        const w = window.innerWidth;
        if (w < 768) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }
    
    function getSource() {
        const ref = document.referrer;
        if (!ref) return 'direct';
        if (ref.includes('google')) return 'google';
        if (ref.includes('facebook') || ref.includes('fb.com')) return 'facebook';
        if (ref.includes('instagram')) return 'instagram';
        if (ref.includes('tiktok')) return 'tiktok';
        if (ref.includes('pinterest')) return 'pinterest';
        if (ref.includes('family-custom.com')) return 'interne';
        return 'autre';
    }
    
    // === Visitor Presence (temps réel) ===
    async function registerVisitor() {
        try {
            await db.collection('visitors').doc(visitorId).set({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                page: getPageName(),
                device: getDeviceType(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { /* silent */ }
    }
    
    async function updateHeartbeat() {
        try {
            await db.collection('visitors').doc(visitorId).update({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                page: getPageName()
            });
        } catch (e) {
            registerVisitor();
        }
    }
    
    async function removeVisitor() {
        try {
            await db.collection('visitors').doc(visitorId).delete();
        } catch (e) { /* silent */ }
    }
    
    // === Page Views ===
    async function trackPageView() {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const page = getPageName();
            const device = getDeviceType();
            const source = getSource();
            
            // Log individuel de la page vue
            await db.collection('pageViews').add({
                page: page,
                visitorId: visitorId,
                device: device,
                source: source,
                referrer: document.referrer || 'direct',
                url: window.location.href,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Compteur journalier agrégé (sans transaction pour éviter les conflits)
            const dailyRef = db.collection('dailyStats').doc(today);
            const inc = firebase.firestore.FieldValue.increment(1);
            const arrayUnion = firebase.firestore.FieldValue.arrayUnion(visitorId);
            
            await dailyRef.set({
                date: today,
                totalViews: inc,
                uniqueVisitors: arrayUnion,
                [`pages.${page}`]: inc,
                [`devices.${device}`]: inc,
                [`sources.${source}`]: inc
            }, { merge: true });
            
        } catch (e) { /* silent */ }
    }
    
    // === Temps passé sur la page ===
    function trackTimeOnPage() {
        const timeSpent = Math.round((Date.now() - pageEntryTime) / 1000); // en secondes
        if (timeSpent < 2) return; // ignorer les rebonds instantanés
        
        try {
            // Utiliser sendBeacon pour fiabilité à la fermeture
            const data = JSON.stringify({
                page: getPageName(),
                visitorId: visitorId,
                timeSpent: timeSpent,
                timestamp: new Date().toISOString()
            });
            
            // On stocke le temps dans localStorage, on l'enverra au prochain chargement
            const pendingTime = JSON.parse(localStorage.getItem('fc_pending_time') || '[]');
            pendingTime.push({ page: getPageName(), time: timeSpent, date: new Date().toISOString().split('T')[0] });
            // Garder max 20 entrées
            if (pendingTime.length > 20) pendingTime.shift();
            localStorage.setItem('fc_pending_time', JSON.stringify(pendingTime));
        } catch (e) { /* silent */ }
    }
    
    // Envoyer les temps en attente
    async function flushPendingTime() {
        try {
            const pending = JSON.parse(localStorage.getItem('fc_pending_time') || '[]');
            if (pending.length === 0) return;
            
            const inc = firebase.firestore.FieldValue.increment;
            for (const entry of pending) {
                const dailyRef = db.collection('dailyStats').doc(entry.date);
                await dailyRef.set({
                    [`avgTime.${entry.page}.total`]: inc(entry.time),
                    [`avgTime.${entry.page}.count`]: inc(1)
                }, { merge: true });
            }
            localStorage.removeItem('fc_pending_time');
        } catch (e) { /* silent */ }
    }
    
    // === Click Tracking ===
    async function trackClick(type, id, name) {
        try {
            const inc = firebase.firestore.FieldValue.increment(1);
            const statRef = db.collection('stats').doc('clicks');
            
            await db.collection('clicks').add({
                type: type,
                itemId: id,
                itemName: name,
                visitorId: visitorId,
                page: getPageName(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            if (type === 'category') {
                await statRef.set({
                    [`categories.${id}`]: inc,
                    total: inc
                }, { merge: true });
            } else if (type === 'product') {
                await statRef.set({
                    [`products.${id}`]: inc,
                    total: inc
                }, { merge: true });
            }
        } catch (e) { /* silent */ }
    }
    
    // === Custom Event Tracking ===
    async function trackEvent(eventName, eventData) {
        try {
            await db.collection('events').add({
                event: eventName,
                data: eventData || {},
                visitorId: visitorId,
                page: getPageName(),
                device: getDeviceType(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { /* silent */ }
    }
    
    // === Initialize ===
    registerVisitor();
    trackPageView();
    flushPendingTime();
    setInterval(updateHeartbeat, HEARTBEAT_INTERVAL);
    
    window.addEventListener('beforeunload', function() {
        trackTimeOnPage();
        removeVisitor();
    });
    
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
            trackTimeOnPage();
            removeVisitor();
        } else {
            registerVisitor();
        }
    });
    
    // === Auto-track add-to-cart buttons ===
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.add-to-cart-btn, .btn-add-cart, [data-action="add-to-cart"]');
        if (btn) {
            trackEvent('add_to_cart', {
                source: getPageName()
            });
        }
    });
    
    // === Public API ===
    window.FCAnalytics = {
        trackCategoryClick: function(categoryId, categoryName) {
            trackClick('category', categoryId, categoryName);
        },
        trackProductClick: function(productId, productName) {
            trackClick('product', productId, productName);
        },
        trackEvent: trackEvent
    };
    
})();
