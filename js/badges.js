/**
 * Customer Badges / Gamification - Family Custom
 * Système de badges et récompenses
 */

const FCBadges = (function() {
    
    // Définition des badges
    const badgeDefinitions = {
        // Badges de commandes
        'first-order': {
            id: 'first-order',
            name: 'Première Commande',
            description: 'Vous avez passé votre première commande',
            icon: '🎉',
            color: '#e07a5f',
            condition: (stats) => stats.totalOrders >= 1
        },
        'loyal-customer': {
            id: 'loyal-customer',
            name: 'Client Fidèle',
            description: '5 commandes passées',
            icon: '⭐',
            color: '#f39c12',
            condition: (stats) => stats.totalOrders >= 5
        },
        'vip': {
            id: 'vip',
            name: 'Client VIP',
            description: '10 commandes passées',
            icon: '👑',
            color: '#9b59b6',
            condition: (stats) => stats.totalOrders >= 10
        },
        'legend': {
            id: 'legend',
            name: 'Légende',
            description: '25 commandes passées',
            icon: '🏆',
            color: '#c9a87c',
            condition: (stats) => stats.totalOrders >= 25
        },
        
        // Badges de dépenses
        'big-spender': {
            id: 'big-spender',
            name: 'Grand Acheteur',
            description: 'Plus de 200€ dépensés',
            icon: '💎',
            color: '#3498db',
            condition: (stats) => stats.totalSpent >= 200
        },
        'collector': {
            id: 'collector',
            name: 'Collectionneur',
            description: 'Plus de 500€ dépensés',
            icon: '🎨',
            color: '#e74c3c',
            condition: (stats) => stats.totalSpent >= 500
        },
        
        // Badges d'engagement
        'early-bird': {
            id: 'early-bird',
            name: 'Early Bird',
            description: 'Compte créé dans les 6 premiers mois',
            icon: '🐦',
            color: '#1abc9c',
            condition: (stats) => stats.isEarlyBird
        },
        'reviewer': {
            id: 'reviewer',
            name: 'Critique',
            description: 'A laissé 3 avis',
            icon: '✍️',
            color: '#2ecc71',
            condition: (stats) => stats.reviewsCount >= 3
        },
        'social-butterfly': {
            id: 'social-butterfly',
            name: 'Ambassadeur',
            description: 'A parrainé 3 amis',
            icon: '🦋',
            color: '#e91e63',
            condition: (stats) => stats.referralsCount >= 3
        },
        
        // Badges spéciaux
        'holiday-shopper': {
            id: 'holiday-shopper',
            name: 'Esprit de Fête',
            description: 'Commande pendant les fêtes',
            icon: '🎄',
            color: '#27ae60',
            condition: (stats) => stats.hasHolidayOrder
        },
        'perfectionist': {
            id: 'perfectionist',
            name: 'Perfectionniste',
            description: 'A utilisé toutes les options de personnalisation',
            icon: '✨',
            color: '#9c27b0',
            condition: (stats) => stats.usedAllCustomOptions
        },
        'night-owl': {
            id: 'night-owl',
            name: 'Noctambule',
            description: 'Commande passée après minuit',
            icon: '🦉',
            color: '#34495e',
            condition: (stats) => stats.hasNightOrder
        }
    };
    
    /**
     * Récupère les stats d'un client
     */
    async function getCustomerStats(customerId) {
        const stats = {
            totalOrders: 0,
            totalSpent: 0,
            reviewsCount: 0,
            referralsCount: 0,
            isEarlyBird: false,
            hasHolidayOrder: false,
            hasNightOrder: false,
            usedAllCustomOptions: false,
            createdAt: null
        };
        
        if (typeof firebase === 'undefined') return stats;
        
        try {
            // Récupérer le profil client
            const customerDoc = await firebase.firestore()
                .collection('customers')
                .doc(customerId)
                .get();
            
            if (customerDoc.exists) {
                const data = customerDoc.data();
                // Gérer les différents formats de date (Timestamp Firestore, Date JS, string)
                if (data.createdAt) {
                    if (typeof data.createdAt.toDate === 'function') {
                        stats.createdAt = data.createdAt.toDate();
                    } else if (data.createdAt instanceof Date) {
                        stats.createdAt = data.createdAt;
                    } else if (typeof data.createdAt === 'string' || typeof data.createdAt === 'number') {
                        stats.createdAt = new Date(data.createdAt);
                    } else {
                        stats.createdAt = new Date();
                    }
                } else {
                    stats.createdAt = new Date();
                }
                stats.reviewsCount = data.reviewsCount || 0;
                stats.referralsCount = data.referralsCount || 0;
                
                // Early bird: inscrit avant juillet 2026
                const earlyBirdDeadline = new Date('2026-07-01');
                stats.isEarlyBird = stats.createdAt < earlyBirdDeadline;
            }
            
            // Récupérer les commandes
            const ordersSnapshot = await firebase.firestore()
                .collection('orders')
                .where('email', '==', customerDoc.data()?.email)
                .get();
            
            ordersSnapshot.forEach(doc => {
                const order = doc.data();
                stats.totalOrders++;
                
                // Calculer le total dépensé
                const amount = parseFloat(String(order.total || order.amount || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
                stats.totalSpent += amount;
                
                // Vérifier commande de fêtes (décembre)
                let orderDate;
                if (order.createdAt && typeof order.createdAt.toDate === 'function') {
                    orderDate = order.createdAt.toDate();
                } else if (order.createdAt instanceof Date) {
                    orderDate = order.createdAt;
                } else if (order.createdAt || order.date) {
                    orderDate = new Date(order.createdAt || order.date);
                } else {
                    orderDate = new Date();
                }
                if (orderDate.getMonth() === 11) {
                    stats.hasHolidayOrder = true;
                }
                
                // Vérifier commande nocturne
                const hour = orderDate.getHours();
                if (hour >= 0 && hour < 6) {
                    stats.hasNightOrder = true;
                }
            });
            
        } catch (error) {
            console.error('Error getting customer stats:', error);
        }
        
        return stats;
    }
    
    /**
     * Calcule les badges débloqués
     */
    async function getUnlockedBadges(customerId) {
        const stats = await getCustomerStats(customerId);
        const unlocked = [];
        
        for (const [id, badge] of Object.entries(badgeDefinitions)) {
            if (badge.condition(stats)) {
                unlocked.push({
                    ...badge,
                    unlockedAt: new Date() // Idéalement stocker la vraie date
                });
            }
        }
        
        return unlocked;
    }
    
    /**
     * Récupère tous les badges (débloqués ou non)
     */
    async function getAllBadges(customerId) {
        const stats = await getCustomerStats(customerId);
        const badges = [];
        
        for (const [id, badge] of Object.entries(badgeDefinitions)) {
            badges.push({
                ...badge,
                unlocked: badge.condition(stats)
            });
        }
        
        return badges;
    }
    
    /**
     * Affiche les badges dans un container
     */
    async function render(containerId, customerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="badges-loading">
                <i class="fas fa-spinner fa-spin"></i> Chargement des badges...
            </div>
        `;
        
        const badges = await getAllBadges(customerId);
        const unlockedCount = badges.filter(b => b.unlocked).length;
        
        container.innerHTML = `
            <div class="badges-section">
                <div class="badges-header">
                    <h3><i class="fas fa-medal"></i> Mes Badges</h3>
                    <span class="badges-count">${unlockedCount}/${badges.length} débloqués</span>
                </div>
                <div class="badges-progress">
                    <div class="badges-progress-bar" style="width: ${(unlockedCount / badges.length) * 100}%"></div>
                </div>
                <div class="badges-grid">
                    ${badges.map(badge => `
                        <div class="badge-item ${badge.unlocked ? 'unlocked' : 'locked'}" 
                             title="${badge.description}"
                             style="--badge-color: ${badge.color}">
                            <div class="badge-icon">
                                ${badge.unlocked ? badge.icon : '🔒'}
                            </div>
                            <div class="badge-info">
                                <span class="badge-name">${badge.name}</span>
                                ${badge.unlocked 
                                    ? `<span class="badge-unlocked"><i class="fas fa-check"></i> Débloqué</span>`
                                    : `<span class="badge-hint">${badge.description}</span>`
                                }
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Vérifie si un nouveau badge a été débloqué
     */
    async function checkNewBadges(customerId, previousBadges = []) {
        const currentBadges = await getUnlockedBadges(customerId);
        const newBadges = currentBadges.filter(
            badge => !previousBadges.some(pb => pb.id === badge.id)
        );
        
        if (newBadges.length > 0) {
            // Afficher notification pour chaque nouveau badge
            newBadges.forEach(badge => {
                showBadgeNotification(badge);
            });
            
            // Sauvegarder les badges dans Firebase
            await saveBadges(customerId, currentBadges.map(b => b.id));
        }
        
        return newBadges;
    }
    
    /**
     * Affiche une notification de badge débloqué
     */
    function showBadgeNotification(badge) {
        const notification = document.createElement('div');
        notification.className = 'badge-notification';
        notification.innerHTML = `
            <div class="badge-notification-content" style="--badge-color: ${badge.color}">
                <div class="badge-notification-icon">${badge.icon}</div>
                <div class="badge-notification-text">
                    <span class="badge-notification-title">Nouveau badge débloqué !</span>
                    <span class="badge-notification-name">${badge.name}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }
    
    /**
     * Sauvegarde les badges dans Firebase
     */
    async function saveBadges(customerId, badgeIds) {
        if (typeof firebase === 'undefined') return;
        
        try {
            await firebase.firestore()
                .collection('customers')
                .doc(customerId)
                .update({
                    badges: badgeIds,
                    badgesUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.log('Could not save badges:', error.message);
        }
    }
    
    /**
     * Récupère le niveau du client
     */
    async function getCustomerLevel(customerId) {
        const stats = await getCustomerStats(customerId);
        
        if (stats.totalOrders >= 25) return { level: 4, name: 'Légende', icon: '🏆', color: '#c9a87c' };
        if (stats.totalOrders >= 10) return { level: 3, name: 'VIP', icon: '👑', color: '#9b59b6' };
        if (stats.totalOrders >= 5) return { level: 2, name: 'Fidèle', icon: '⭐', color: '#f39c12' };
        if (stats.totalOrders >= 1) return { level: 1, name: 'Membre', icon: '🌟', color: '#e07a5f' };
        return { level: 0, name: 'Nouveau', icon: '👋', color: '#95a5a6' };
    }
    
    return {
        getCustomerStats,
        getUnlockedBadges,
        getAllBadges,
        render,
        checkNewBadges,
        showBadgeNotification,
        getCustomerLevel,
        badgeDefinitions
    };
})();

// Exposer globalement
window.FCBadges = FCBadges;
