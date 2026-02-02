// ============================================
// FAMILY CUSTOM - Order Tracking JS
// Intégration Firebase + Données de démonstration
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const trackBtn = document.getElementById('track-btn');
    const orderInput = document.getElementById('order-number');
    const trackingResult = document.getElementById('tracking-result');
    const trackingNotFound = document.getElementById('tracking-not-found');

    // Track button click
    if (trackBtn) {
        trackBtn.addEventListener('click', searchOrder);
    }
    
    // Enter key in input
    if (orderInput) {
        orderInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchOrder();
            }
        });
    }

    // Recherche de commande
    async function searchOrder() {
        const orderNumber = orderInput.value.trim().toUpperCase();
        
        if (!orderNumber) {
            showNotification('Veuillez entrer un numéro de commande', 'error');
            return;
        }

        // Cacher les résultats précédents
        if (trackingResult) trackingResult.style.display = 'none';
        if (trackingNotFound) trackingNotFound.style.display = 'none';

        // Animation de chargement
        trackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Recherche...';
        trackBtn.disabled = true;

        try {
            // Rechercher dans Firebase uniquement
            let order = await searchInFirebase(orderNumber);

            // Afficher le résultat
            trackBtn.innerHTML = '<i class="fas fa-search"></i> Suivre';
            trackBtn.disabled = false;

            if (order) {
                displayOrder(orderNumber, order);
            } else {
                if (trackingNotFound) trackingNotFound.style.display = 'block';
            }
        } catch (error) {
            console.error('Erreur de recherche:', error);
            trackBtn.innerHTML = '<i class="fas fa-search"></i> Suivre';
            trackBtn.disabled = false;
            
            // Afficher message d'erreur
            if (trackingNotFound) trackingNotFound.style.display = 'block';
        }
    }

    // Recherche dans Firebase
    async function searchInFirebase(orderNumber) {
        // Vérifier si Firebase est disponible
        if (!window.FirebaseDB) {
            console.log('Firebase non disponible, utilisation des données de démo');
            return null;
        }

        try {
            // Chercher par numéro de commande
            const snapshot = await window.FirebaseDB.collection('orders')
                .where('orderNumber', '==', orderNumber)
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                return formatFirebaseOrder(data, doc.id);
            }

            // Chercher aussi par ID de document (au cas où)
            const directDoc = await window.FirebaseDB.collection('orders').doc(orderNumber).get();
            if (directDoc.exists) {
                return formatFirebaseOrder(directDoc.data(), orderNumber);
            }

            return null;
        } catch (error) {
            console.error('Erreur Firebase:', error);
            return null;
        }
    }

    // Formater les données Firebase pour l'affichage
    function formatFirebaseOrder(data, docId) {
        const orderDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        
        // Construire la timeline selon le statut
        const timeline = buildTimeline(data.status, orderDate, data.statusHistory || []);
        
        // Formater les items
        const items = (data.items || []).map(item => ({
            name: item.name || item.productName || 'Article',
            customization: item.customization || item.options || '',
            price: item.price || 0,
            image: item.image || item.imageUrl || 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=100'
        }));

        return {
            orderNumber: data.orderNumber || docId,
            status: data.status || 'confirmed',
            date: formatDate(orderDate),
            createdAt: orderDate,
            items: items,
            subtotal: data.subtotal || data.total || 0,
            shipping: data.shipping || 0,
            total: data.total || 0,
            address: {
                name: data.shippingAddress?.name || data.customerName || 'Client',
                street: data.shippingAddress?.address || data.shippingAddress?.street || '',
                city: `${data.shippingAddress?.postalCode || ''} ${data.shippingAddress?.city || ''}, ${data.shippingAddress?.country || 'France'}`
            },
            timeline: timeline,
            trackingNumber: data.trackingNumber || null,
            carrier: data.carrier || null
        };
    }

    // Construire la timeline selon le statut actuel
    function buildTimeline(currentStatus, orderDate, statusHistory) {
        const statuses = ['confirmed', 'preparation', 'fabrication', 'shipped', 'delivered'];
        const statusIndex = {
            'pending': -1,
            'confirmed': 0,
            'paid': 0,
            'preparation': 1,
            'fabrication': 2,
            'shipped': 3,
            'delivered': 4
        };
        const currentIndex = statusIndex[currentStatus] ?? 0;
        
        const timeline = {};
        
        statuses.forEach((status, index) => {
            // Chercher dans l'historique la vraie date
            const historyEntry = statusHistory.find(h => h.status === status);
            
            if (index < currentIndex) {
                // Étapes complétées - utiliser la vraie date si disponible
                timeline[status] = {
                    completed: true,
                    date: historyEntry ? formatDateTime(new Date(historyEntry.date)) : formatDateTime(orderDate)
                };
            } else if (index === currentIndex) {
                // Étape actuelle - utiliser la vraie date si disponible
                timeline[status] = {
                    completed: false,
                    active: true,
                    date: historyEntry ? formatDateTime(new Date(historyEntry.date)) : formatDateTime(new Date())
                };
            } else {
                // Étapes futures - afficher estimation
                timeline[status] = {
                    completed: false,
                    date: getEstimatedDate(orderDate, index, false)
                };
            }
        });
        
        return timeline;
    }

    // Estimation des dates selon l'étape (délais réalistes pour fabrication artisanale)
    function getEstimatedDate(orderDate, stepIndex, isPast) {
        // Jours ouvrés après commande pour chaque étape
        // Confirmé: J+0, Préparation: J+0, Fabrication: J+1, Expédié: J+4, Livré: J+7-10
        const estimatesMin = [0, 0, 1, 4, 7];
        const estimatesMax = [0, 0, 1, 5, 10];
        
        const estimatedDateMin = new Date(orderDate);
        const estimatedDateMax = new Date(orderDate);
        
        // Ajouter les jours ouvrés (en évitant les weekends)
        let daysToAddMin = estimatesMin[stepIndex];
        let daysToAddMax = estimatesMax[stepIndex];
        
        while (daysToAddMin > 0) {
            estimatedDateMin.setDate(estimatedDateMin.getDate() + 1);
            const day = estimatedDateMin.getDay();
            if (day !== 0 && day !== 6) daysToAddMin--; // Skip weekends
        }
        
        while (daysToAddMax > 0) {
            estimatedDateMax.setDate(estimatedDateMax.getDate() + 1);
            const day = estimatedDateMax.getDay();
            if (day !== 0 && day !== 6) daysToAddMax--; // Skip weekends
        }
        
        // Pour les étapes futures (expédié, livré), afficher une fourchette
        if (!isPast && stepIndex >= 3) {
            if (stepIndex === 3) {
                return `Estimation : ${formatDateShort(estimatedDateMin)}`;
            } else {
                return `Estimation : ${formatDateShort(estimatedDateMin)} - ${formatDateShort(estimatedDateMax)}`;
            }
        }
        
        return formatDateTime(estimatedDateMin);
    }
    
    // Format court pour les estimations
    function formatDateShort(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });
    }

    // Affichage de la commande
    function displayOrder(orderNumber, order) {
        // En-tête
        const resultOrderNumber = document.getElementById('result-order-number');
        const resultOrderDate = document.getElementById('result-order-date');
        
        if (resultOrderNumber) resultOrderNumber.textContent = '#' + orderNumber;
        if (resultOrderDate) resultOrderDate.textContent = order.date;
        
        // Badge de statut
        const statusBadge = document.querySelector('.status-badge');
        if (statusBadge) {
            statusBadge.className = 'status-badge ' + order.status;
            statusBadge.textContent = getStatusText(order.status);
        }

        // Timeline
        updateTimeline(order.timeline);
        
        // Progress bar
        updateProgressBar(order.status);

        // Articles
        const itemsContainer = document.getElementById('order-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = order.items.map(item => `
                <div class="order-item">
                    <img src="${item.image}" alt="${item.name}" class="order-item-image" onerror="this.src='https://via.placeholder.com/80'">
                    <div class="order-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.customization || ''}</p>
                    </div>
                    <div class="order-item-price">${parseFloat(item.price).toFixed(2)} €</div>
                </div>
            `).join('');
        }

        // Résumé
        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryShipping = document.getElementById('summary-shipping');
        const summaryTotal = document.getElementById('summary-total');
        
        if (summarySubtotal) summarySubtotal.textContent = parseFloat(order.subtotal).toFixed(2) + ' €';
        if (summaryShipping) summaryShipping.textContent = order.shipping === 0 ? 'Gratuite' : parseFloat(order.shipping).toFixed(2) + ' €';
        if (summaryTotal) summaryTotal.textContent = parseFloat(order.total).toFixed(2) + ' €';

        // Adresse
        const shippingName = document.getElementById('shipping-name');
        const shippingAddress = document.getElementById('shipping-address');
        const shippingCity = document.getElementById('shipping-city');
        
        if (shippingName) shippingName.textContent = order.address.name;
        if (shippingAddress) shippingAddress.textContent = order.address.street;
        if (shippingCity) shippingCity.textContent = order.address.city;

        // Numéro de suivi transporteur (si disponible)
        if (order.trackingNumber && order.status === 'shipped') {
            showTrackingInfo(order.trackingNumber, order.carrier);
        }

        // Afficher le résultat
        if (trackingResult) {
            trackingResult.style.display = 'block';
            trackingResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // Mise à jour de la barre de progression
    function updateProgressBar(status) {
        const progressFill = document.getElementById('progress-fill');
        if (!progressFill) return;
        
        const progressValues = {
            'pending': 5,
            'confirmed': 12,
            'paid': 12,
            'preparation': 30,
            'fabrication': 55,
            'shipped': 80,
            'delivered': 100
        };
        
        const progress = progressValues[status] || 0;
        
        // Animation après un petit délai
        setTimeout(() => {
            progressFill.style.width = progress + '%';
        }, 300);
    }

    // Afficher les infos de suivi transporteur
    function showTrackingInfo(trackingNumber, carrier) {
        const shippingInfo = document.querySelector('.shipping-info');
        if (!shippingInfo) return;

        // Vérifier si l'élément existe déjà
        let trackingDiv = shippingInfo.querySelector('.carrier-tracking');
        if (!trackingDiv) {
            trackingDiv = document.createElement('div');
            trackingDiv.className = 'carrier-tracking';
            shippingInfo.appendChild(trackingDiv);
        }

        const carrierLinks = {
            'colissimo': `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`,
            'chronopost': `https://www.chronopost.fr/tracking-no-cms/suivi-page?liession=${trackingNumber}`,
            'mondial_relay': `https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=${trackingNumber}`,
            'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
            'dhl': `https://www.dhl.com/fr-fr/home/tracking.html?tracking-id=${trackingNumber}`
        };

        const carrierNames = {
            'colissimo': 'Colissimo',
            'chronopost': 'Chronopost',
            'mondial_relay': 'Mondial Relay',
            'ups': 'UPS',
            'dhl': 'DHL'
        };

        const trackingUrl = carrierLinks[carrier] || '#';
        const carrierName = carrierNames[carrier] || carrier || 'Transporteur';

        trackingDiv.innerHTML = `
            <div class="tracking-carrier">
                <i class="fas fa-truck"></i>
                <span><strong>${carrierName}</strong></span>
            </div>
            <div class="tracking-number-box">
                <span>N° de suivi : <strong>${trackingNumber}</strong></span>
                <a href="${trackingUrl}" target="_blank" class="btn-track-carrier">
                    Suivre le colis <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `;
    }

    // Mise à jour de la timeline
    function updateTimeline(timeline) {
        const steps = document.querySelectorAll('.timeline-step');
        
        steps.forEach(step => {
            const stepName = step.dataset.step;
            const stepData = timeline[stepName];
            
            if (stepData) {
                step.classList.remove('completed', 'active');
                
                if (stepData.completed) {
                    step.classList.add('completed');
                } else if (stepData.active) {
                    step.classList.add('active');
                }
                
                // Mettre à jour la date
                const dateEl = step.querySelector('.step-date');
                if (dateEl && stepData.date) {
                    dateEl.textContent = stepData.date;
                }
            }
        });
    }

    // Textes des statuts
    function getStatusText(status) {
        const statusTexts = {
            'pending': 'En attente',
            'confirmed': 'Confirmée',
            'preparation': 'En préparation',
            'fabrication': 'En fabrication',
            'shipped': 'Expédiée',
            'delivered': 'Livrée',
            'cancelled': 'Annulée'
        };
        return statusTexts[status] || status;
    }

    // Formater une date
    function formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    // Formater date et heure
    function formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric'
        }) + ' - ' + d.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Notification
    function showNotification(message, type) {
        // Créer une notification toast
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Vérifier si numéro de commande dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderFromUrl = urlParams.get('order') || urlParams.get('orderNumber');
    if (orderFromUrl && orderInput) {
        orderInput.value = orderFromUrl;
        // Petite pause pour que Firebase se charge
        setTimeout(searchOrder, 500);
    }

    // Si le client est connecté, pré-remplir ses infos
    if (window.FCCustomer && window.FCCustomer.isLoggedIn()) {
        const customer = window.FCCustomer.getCurrentCustomer();
        if (customer) {
            // Ajouter un lien vers son compte
            const trackingForm = document.querySelector('.tracking-form');
            if (trackingForm) {
                const accountLink = document.createElement('p');
                accountLink.className = 'account-link-info';
                accountLink.innerHTML = `
                    <i class="fas fa-user"></i> 
                    Connecté en tant que <strong>${customer.firstName || customer.email}</strong> - 
                    <a href="compte.html">Voir toutes mes commandes</a>
                `;
                trackingForm.appendChild(accountLink);
            }
        }
    }
});

// Styles pour les notifications et infos transporteur
(function() {
    const style = document.createElement('style');
    style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 10000;
        }
        
        .toast-notification.show {
            transform: translateY(0);
            opacity: 1;
        }
        
        .toast-notification.error {
            background: #e74c3c;
        }
        
        .toast-notification.success {
            background: #27ae60;
        }
        
        .carrier-tracking {
            margin-top: 20px;
            padding: 15px;
            background: #f0f7ff;
            border-radius: 8px;
            border: 1px solid #d0e3ff;
        }
        
        .tracking-carrier {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
            color: #2c5aa0;
        }
        
        .tracking-number-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .btn-track-carrier {
            background: #2c5aa0;
            color: white;
            padding: 8px 16px;
            border-radius: 5px;
            text-decoration: none;
            font-size: 0.9rem;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: background 0.3s;
        }
        
        .btn-track-carrier:hover {
            background: #1e3d6f;
        }
        
        .account-link-info {
            margin-top: 15px;
            padding: 10px 15px;
            background: #f5f5f5;
            border-radius: 8px;
            font-size: 0.9rem;
            color: #666;
        }
        
        .account-link-info a {
            color: #2c5aa0;
            text-decoration: none;
        }
        
        .account-link-info a:hover {
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);
})();
