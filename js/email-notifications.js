/**
 * Email Notifications - Family Custom
 * Notifications automatiques par email
 */

const FCEmailNotifications = (function() {
    
    // Templates d'emails
    const templates = {
        orderStatusChange: {
            subject: (orderNumber, status) => `Family Custom - Mise à jour de votre commande ${orderNumber}`,
            body: (data) => `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #e07a5f, #c9a87c); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">🏠 Family Custom</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #e07a5f; margin-bottom: 20px;">Mise à jour de votre commande</h2>
                        <p>Bonjour ${data.customerName},</p>
                        <p>Votre commande <strong style="color: #c9a87c;">${data.orderNumber}</strong> a été mise à jour.</p>
                        
                        <div style="background: #2d2d2d; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #aaa;">Nouveau statut</p>
                            <span style="background: ${data.statusColor}; color: white; padding: 10px 25px; border-radius: 20px; font-weight: 600; display: inline-block;">
                                ${data.statusIcon} ${data.statusLabel}
                            </span>
                        </div>
                        
                        ${data.statusMessage ? `<p style="color: #ccc;">${data.statusMessage}</p>` : ''}
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${data.trackingUrl}" style="background: linear-gradient(135deg, #e07a5f, #c9a87c); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: 600;">
                                📦 Suivre ma commande
                            </a>
                        </div>
                    </div>
                    <div style="background: #0d0d15; padding: 20px; text-align: center; color: #888; font-size: 12px;">
                        <p>© 2026 Family Custom - Créations personnalisées</p>
                        <p>42330 Saint-Galmier, France</p>
                    </div>
                </div>
            `
        },
        
        abandonedCart: {
            subject: () => `Vous avez oublié quelque chose... 🛒`,
            body: (data) => `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #e07a5f, #c9a87c); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">🏠 Family Custom</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #e07a5f; margin-bottom: 20px;">Votre panier vous attend ! 🛒</h2>
                        <p>Bonjour ${data.customerName},</p>
                        <p>Vous avez laissé des articles dans votre panier. Ils n'attendent que vous !</p>
                        
                        <div style="background: #2d2d2d; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            ${data.items.map(item => `
                                <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #3d3d3d;">
                                    <div style="width: 60px; height: 60px; background: #1a1a2e; border-radius: 8px; margin-right: 15px; display: flex; align-items: center; justify-content: center;">
                                        ${item.image ? `<img src="${item.image}" style="max-width: 100%; max-height: 100%; border-radius: 8px;">` : '📦'}
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; font-weight: 600;">${item.name}</p>
                                        <p style="margin: 5px 0 0 0; color: #c9a87c;">${item.price}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${data.promoCode ? `
                            <div style="background: linear-gradient(135deg, #4CAF50, #45a049); border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0 0 10px 0; color: white;">🎁 Code promo exclusif</p>
                                <span style="background: white; color: #333; padding: 10px 20px; border-radius: 5px; font-weight: bold; font-size: 18px; display: inline-block;">
                                    ${data.promoCode}
                                </span>
                                <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">-10% sur votre commande</p>
                            </div>
                        ` : ''}
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${data.cartUrl}" style="background: linear-gradient(135deg, #e07a5f, #c9a87c); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: 600;">
                                🛒 Reprendre mon panier
                            </a>
                        </div>
                    </div>
                    <div style="background: #0d0d15; padding: 20px; text-align: center; color: #888; font-size: 12px;">
                        <p>© 2026 Family Custom - Créations personnalisées</p>
                    </div>
                </div>
            `
        },
        
        orderShipped: {
            subject: (orderNumber) => `Votre commande ${orderNumber} est en route ! 🚚`,
            body: (data) => `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #e07a5f, #c9a87c); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px;">🏠 Family Custom</h1>
                    </div>
                    <div style="padding: 30px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <span style="font-size: 60px;">🚚</span>
                            <h2 style="color: #e07a5f; margin: 10px 0;">Votre colis est en route !</h2>
                        </div>
                        
                        <p>Bonjour ${data.customerName},</p>
                        <p>Bonne nouvelle ! Votre commande <strong style="color: #c9a87c;">${data.orderNumber}</strong> a été expédiée.</p>
                        
                        ${data.trackingNumber ? `
                            <div style="background: #2d2d2d; border-radius: 10px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; color: #aaa;">Numéro de suivi</p>
                                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #c9a87c;">${data.trackingNumber}</p>
                                ${data.carrier ? `<p style="margin: 10px 0 0 0; color: #888;">Transporteur: ${data.carrier}</p>` : ''}
                            </div>
                        ` : ''}
                        
                        <div style="background: #2d2d2d; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0; color: #aaa;">📍 Adresse de livraison</p>
                            <p style="margin: 0; line-height: 1.6;">${data.shippingAddress}</p>
                        </div>
                        
                        <p style="color: #4CAF50;"><strong>📅 Livraison estimée :</strong> ${data.estimatedDelivery}</p>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${data.trackingUrl}" style="background: linear-gradient(135deg, #e07a5f, #c9a87c); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; display: inline-block; font-weight: 600;">
                                📦 Suivre mon colis
                            </a>
                        </div>
                    </div>
                    <div style="background: #0d0d15; padding: 20px; text-align: center; color: #888; font-size: 12px;">
                        <p>© 2026 Family Custom - Créations personnalisées</p>
                    </div>
                </div>
            `
        }
    };
    
    // Mapping des statuts
    const statusConfig = {
        'pending': { label: 'En attente', icon: '⏳', color: '#f39c12', message: 'Votre commande est en attente de traitement.' },
        'confirmed': { label: 'Confirmée', icon: '✅', color: '#27ae60', message: 'Votre commande a été confirmée et sera bientôt préparée.' },
        'processing': { label: 'En préparation', icon: '🎨', color: '#3498db', message: 'Nos artisans travaillent sur votre création personnalisée.' },
        'shipped': { label: 'Expédiée', icon: '🚚', color: '#9b59b6', message: 'Votre colis est en route vers vous !' },
        'delivered': { label: 'Livrée', icon: '📦', color: '#27ae60', message: 'Votre commande a été livrée. Merci pour votre confiance !' },
        'cancelled': { label: 'Annulée', icon: '❌', color: '#e74c3c', message: 'Votre commande a été annulée.' }
    };
    
    /**
     * Envoie un email de changement de statut
     */
    async function sendStatusChangeEmail(order, newStatus) {
        if (!order.email) {
            console.log('No email for order:', order.orderNumber);
            return false;
        }
        
        const config = statusConfig[newStatus] || statusConfig['pending'];
        const baseUrl = window.location.origin;
        
        const data = {
            customerName: order.firstName || order.name || 'Client',
            orderNumber: order.orderNumber,
            statusLabel: config.label,
            statusIcon: config.icon,
            statusColor: config.color,
            statusMessage: config.message,
            trackingUrl: `${baseUrl}/suivi-commande.html?order=${order.orderNumber}`
        };
        
        // Si expédié, utiliser le template spécifique
        if (newStatus === 'shipped') {
            return await sendShippedEmail(order, data);
        }
        
        const template = templates.orderStatusChange;
        
        return await sendEmail({
            to: order.email,
            subject: template.subject(order.orderNumber, newStatus),
            html: template.body(data)
        });
    }
    
    /**
     * Envoie un email d'expédition
     */
    async function sendShippedEmail(order, baseData) {
        const data = {
            ...baseData,
            trackingNumber: order.trackingNumber || null,
            carrier: order.carrier || null,
            shippingAddress: formatAddress(order),
            estimatedDelivery: order.estimatedDelivery || 'Sous 3-5 jours ouvrés'
        };
        
        const template = templates.orderShipped;
        
        return await sendEmail({
            to: order.email,
            subject: template.subject(order.orderNumber),
            html: template.body(data)
        });
    }
    
    /**
     * Envoie un email de panier abandonné
     */
    async function sendAbandonedCartEmail(customer, cartItems, promoCode = null) {
        if (!customer.email) return false;
        
        const baseUrl = window.location.origin;
        
        const data = {
            customerName: customer.firstName || customer.name || 'Client',
            items: cartItems,
            promoCode: promoCode,
            cartUrl: `${baseUrl}/panier.html`
        };
        
        const template = templates.abandonedCart;
        
        return await sendEmail({
            to: customer.email,
            subject: template.subject(),
            html: template.body(data)
        });
    }
    
    /**
     * Formate l'adresse pour l'email
     */
    function formatAddress(order) {
        const parts = [
            order.address,
            order.addressComplement,
            `${order.postalCode} ${order.city}`,
            order.country || 'France'
        ].filter(Boolean);
        
        return parts.join('<br>');
    }
    
    /**
     * Envoie l'email via EmailJS
     */
    async function sendEmail({ to, subject, html }) {
        // Utiliser EmailJS si disponible
        if (typeof emailjs !== 'undefined') {
            try {
                await emailjs.send(
                    'service_familycustom', // Service ID
                    'template_notification', // Template ID
                    {
                        to_email: to,
                        subject: subject,
                        message_html: html
                    }
                );
                console.log('Email sent to:', to);
                return true;
            } catch (error) {
                console.error('EmailJS error:', error);
                return false;
            }
        }
        
        // Fallback: log l'email
        console.log('Email would be sent:', { to, subject });
        return true;
    }
    
    /**
     * Vérifie les paniers abandonnés (appelé depuis l'admin)
     */
    async function checkAbandonedCarts() {
        if (typeof firebase === 'undefined') return [];
        
        const abandonedCarts = [];
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        try {
            // Récupérer les clients avec panier non vide et dernière activité > 24h
            const snapshot = await firebase.firestore()
                .collection('customers')
                .where('lastCartUpdate', '<', oneDayAgo)
                .where('cartAbandoned', '==', false)
                .get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.cart && data.cart.length > 0) {
                    abandonedCarts.push({
                        id: doc.id,
                        ...data
                    });
                }
            });
        } catch (error) {
            console.error('Error checking abandoned carts:', error);
        }
        
        return abandonedCarts;
    }
    
    return {
        sendStatusChangeEmail,
        sendShippedEmail,
        sendAbandonedCartEmail,
        checkAbandonedCarts,
        statusConfig,
        templates
    };
})();

// Exposer globalement
window.FCEmailNotifications = FCEmailNotifications;
