/* ============================================
   FAMILY CUSTOM - Admin Notifications System
   ============================================ */

(function() {
    'use strict';
    
    // State
    let notificationsEnabled = false;
    let lastOrderCount = 0;
    let unsubscribeOrders = null;
    
    // Demander la permission de notification
    async function requestNotificationPermission() {
        // Vérifier si on est en PWA standalone (requis pour iOS)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                            window.navigator.standalone === true;
        
        if (!('Notification' in window)) {
            console.log('❌ Notifications non supportées sur ce navigateur');
            if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !isStandalone) {
                alert('📱 Pour recevoir les notifications sur iPhone :\n\n1. Cliquez sur le bouton Partager (carré avec flèche)\n2. Sélectionnez "Sur l\'écran d\'accueil"\n3. Ouvrez l\'app depuis l\'écran d\'accueil\n4. Activez les alertes');
            }
            return false;
        }
        
        console.log('📱 PWA Standalone:', isStandalone);
        console.log('🔔 Permission actuelle:', Notification.permission);
        
        if (Notification.permission === 'granted') {
            console.log('✅ Notifications déjà autorisées');
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                console.log('🔔 Nouvelle permission:', permission);
                return permission === 'granted';
            } catch (e) {
                console.error('Erreur demande permission:', e);
                return false;
            }
        }
        
        console.log('❌ Notifications refusées par l\'utilisateur');
        return false;
    }
    
    // Afficher une notification
    function showNotification(title, options = {}) {
        console.log('🔔 Tentative notification:', title);
        
        if (Notification.permission !== 'granted') {
            console.log('❌ Permission non accordée');
            return;
        }
        
        const defaultOptions = {
            icon: '/images/icon-admin-192.svg',
            badge: '/images/icon-admin-192.svg',
            vibrate: [200, 100, 200],
            tag: 'fc-admin-' + Date.now(),
            renotify: true,
            requireInteraction: true,
            silent: false,
            ...options
        };
        
        // Sur iOS PWA, utiliser directement new Notification
        const isIOSPWA = /iPhone|iPad|iPod/.test(navigator.userAgent) && 
                         (window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches);
        
        if (isIOSPWA) {
            try {
                const notif = new Notification(title, defaultOptions);
                notif.onclick = () => {
                    window.focus();
                    const ordersNav = document.querySelector('[data-section="orders"]');
                    if (ordersNav) ordersNav.click();
                };
                console.log('✅ Notification iOS créée');
            } catch (e) {
                console.error('Erreur notification iOS:', e);
            }
            return;
        }
        
        // Utiliser le service worker si disponible (Android/Desktop)
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, defaultOptions);
                console.log('✅ Notification via Service Worker');
            }).catch(e => {
                console.error('Erreur SW notification:', e);
                new Notification(title, defaultOptions);
            });
        } else {
            // Fallback: notification normale
            try {
                new Notification(title, defaultOptions);
                console.log('✅ Notification standard créée');
            } catch (e) {
                console.error('Erreur notification standard:', e);
            }
        }
    }
    
    // Jouer un son de notification
    function playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Son non disponible');
        }
    }
    
    // Écouter les nouvelles commandes en temps réel
    function listenForNewOrders() {
        const db = window.FirebaseDB;
        if (!db) {
            console.error('❌ Firebase DB non disponible');
            return;
        }
        
        console.log('👂 Démarrage écoute commandes...');
        
        // Timestamp de démarrage - ignorer les commandes plus anciennes
        const startTime = new Date().toISOString();
        let isFirstLoad = true;
        
        // Écouter les nouvelles commandes en temps réel
        unsubscribeOrders = db.collection('orders')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot(snapshot => {
                console.log('📦 Snapshot reçu, changes:', snapshot.docChanges().length, 'firstLoad:', isFirstLoad);
                
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const order = change.doc.data();
                        const orderId = change.doc.id;
                        const orderTime = order.createdAt || '';
                        
                        console.log('📝 Commande détectée:', orderId, 'créée:', orderTime, 'startTime:', startTime);
                        
                        // Ignorer le premier chargement (commandes existantes)
                        if (isFirstLoad) {
                            console.log('⏭️ Premier chargement, ignoré');
                            return;
                        }
                        
                        // Vérifier que la commande est nouvelle (après le démarrage)
                        if (orderTime && orderTime > startTime) {
                            console.log('🆕 NOUVELLE COMMANDE !', orderId);
                            
                            const total = typeof order.total === 'number' 
                                ? order.total.toFixed(2) + '€' 
                                : (order.total || '0€');
                            const customer = order.customer?.firstName || 'Client';
                            
                            // Notification (seulement si activées)
                            if (notificationsEnabled && Notification.permission === 'granted') {
                                showNotification('🛒 Nouvelle Commande !', {
                                    body: `${customer} - ${total}\nCommande #${orderId.substring(0, 8).toUpperCase()}`,
                                    data: { orderId, url: '/admin.html#orders' }
                                });
                            }
                            
                            // Son (toujours si alertes activées)
                            if (notificationsEnabled) {
                                playNotificationSound();
                            }
                            
                            // Badge visuel dans l'onglet (toujours)
                            updatePageTitle(1);
                            
                            // Toast dans l'interface (toujours)
                            showOrderToast(order, orderId);
                        } else {
                            console.log('⏭️ Commande ancienne, ignorée');
                        }
                    }
                });
                
                // Marquer le premier chargement comme terminé
                if (isFirstLoad) {
                    isFirstLoad = false;
                    console.log('✅ Premier chargement terminé, écoute active');
                }
            }, error => {
                console.error('Erreur écoute commandes:', error);
            });
        
        console.log('👂 Écoute des nouvelles commandes activée');
    }
    
    // Mettre à jour le titre de la page avec le nombre de nouvelles commandes
    function updatePageTitle(newCount) {
        const baseTitle = 'Admin - Family Custom';
        if (newCount > 0) {
            document.title = `(${newCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }
    
    // Afficher un toast pour nouvelle commande
    function showOrderToast(order, orderId) {
        // Supprimer ancien toast si existe
        const existingToast = document.getElementById('order-toast');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'order-toast';
        toast.className = 'order-notification-toast';
        toast.innerHTML = `
            <div class="toast-icon">🛒</div>
            <div class="toast-content">
                <strong>Nouvelle Commande !</strong>
                <p>${order.customer?.firstName || 'Client'} ${order.customer?.lastName || ''}</p>
                <p class="toast-total">${order.total || '0€'}</p>
            </div>
            <button class="toast-action" onclick="window.viewOrder('${orderId}')">
                Voir <i class="fas fa-arrow-right"></i>
            </button>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        // Animation d'entrée
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Auto-hide après 30 secondes
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 30000);
    }
    
    // Fonction pour voir une commande (exposée globalement)
    window.viewOrder = function(orderId) {
        // Aller à la section commandes
        const ordersNav = document.querySelector('[data-section="orders"]');
        if (ordersNav) ordersNav.click();
        
        // Réinitialiser le titre
        updatePageTitle(0);
        
        // Fermer le toast
        const toast = document.getElementById('order-toast');
        if (toast) toast.remove();
    };
    
    // Configurer le bouton d'activation des notifications
    function setupNotificationButton() {
        const btn = document.getElementById('notif-toggle-btn');
        if (!btn) {
            console.error('Bouton notification non trouvé');
            return;
        }
        
        btn.addEventListener('click', async () => {
            const granted = await requestNotificationPermission();
            
            if (granted) {
                notificationsEnabled = true;
                btn.innerHTML = '<i class="fas fa-bell"></i> <span>Alertes ON</span>';
                btn.classList.remove('btn-outline');
                btn.classList.add('btn-success');
                btn.style.background = '#27ae60';
                btn.style.borderColor = '#27ae60';
                btn.style.color = '#fff';
                
                // Sauvegarder la préférence
                localStorage.setItem('fc-admin-notifications', 'enabled');
                
                showToast('🔔 Notifications activées !');
                
                // Envoyer une notification de test après 2 secondes
                setTimeout(() => {
                    showNotification('✅ Test Notification', {
                        body: 'Les alertes fonctionnent ! Vous recevrez une notification à chaque nouvelle commande.',
                        tag: 'fc-test-' + Date.now()
                    });
                    playNotificationSound();
                }, 2000);
                
            } else {
                showToast('❌ Notifications refusées. Activez-les dans les paramètres de votre navigateur.');
            }
        });
        
        // Vérifier si déjà activé
        if (Notification.permission === 'granted' && localStorage.getItem('fc-admin-notifications') === 'enabled') {
            notificationsEnabled = true;
            btn.innerHTML = '<i class="fas fa-bell"></i> <span>Alertes ON</span>';
            btn.classList.remove('btn-outline');
            btn.classList.add('btn-success');
            btn.style.background = '#27ae60';
            btn.style.borderColor = '#27ae60';
            btn.style.color = '#fff';
        }
        
        console.log('✅ Bouton notification configuré');
    }
    
    // Toast helper
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
        } else {
            alert(message);
        }
    }
    
    // Initialisation
    function init() {
        // Attendre que l'admin soit connecté
        const checkDashboard = setInterval(() => {
            const dashboard = document.getElementById('admin-dashboard');
            if (dashboard && !dashboard.classList.contains('hidden')) {
                clearInterval(checkDashboard);
                
                // Configurer le bouton et démarrer l'écoute
                setTimeout(() => {
                    setupNotificationButton();
                    listenForNewOrders();
                }, 500);
            }
        }, 500);
    }
    
    // Cleanup quand on quitte la page
    window.addEventListener('beforeunload', () => {
        if (unsubscribeOrders) {
            unsubscribeOrders();
        }
    });
    
    // Démarrer
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
