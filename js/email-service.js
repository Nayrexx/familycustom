/* ============================================
   FAMILY CUSTOM - Email Service (EmailJS)
   ============================================ */

(function() {
    'use strict';
    
    // ===========================================
    // CONFIGURATION EMAILJS
    // ===========================================
    // 1. Créez un compte gratuit sur https://www.emailjs.com/
    // 2. Créez un "Email Service" (Gmail, Outlook, etc.)
    // 3. Créez 2 "Email Templates":
    //    - Template pour le client (confirmation)
    //    - Template pour vous (notification)
    // 4. Remplacez les valeurs ci-dessous par vos identifiants
    
    const EMAILJS_CONFIG = {
        publicKey: 'uojT7zPVzrX9dwrTL',           // Trouvez-la dans Account > API Keys
        serviceId: 'service_df88l3e',           // ID de votre service email
        templateCustomer: 'template_i84v3mq',    // Template de confirmation client
        templateOwner: 'template_4rtaroo'           // Template de notification propriétaire
    };
    
    // Email du propriétaire de la boutique
    const OWNER_EMAIL = 'familycustom.pro@gmail.com';
    const SHOP_NAME = 'Family Custom';
    
    // ===========================================
    
    // Initialize EmailJS
    function init() {
        if (EMAILJS_CONFIG.publicKey === 'VOTRE_PUBLIC_KEY') {
            console.warn('EmailJS n\'est pas configuré. Les emails ne seront pas envoyés.');
            return false;
        }
        
        try {
            emailjs.init(EMAILJS_CONFIG.publicKey);
            console.log('EmailJS initialisé');
            return true;
        } catch (error) {
            console.error('Erreur d\'initialisation EmailJS:', error);
            return false;
        }
    }
    
    // Format order items for email
    function formatOrderItems(items) {
        return items.map(item => {
            let line = `• ${item.name} x${item.quantity} - ${(item.priceValue * item.quantity).toFixed(2)}€`;
            if (item.customization) {
                line += `\n  Personnalisation: "${item.customization}"`;
            }
            if (item.customerImage) {
                line += `\n  Photo jointe: Oui`;
            }
            return line;
        }).join('\n\n');
    }
    
    // Format order items as HTML for email
    function formatOrderItemsHTML(items) {
        return items.map(item => {
            let html = `<tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    <strong>${item.name}</strong>
                    ${item.customization ? `<br><small style="color: #e07a5f;">Personnalisation: "${item.customization}"</small>` : ''}
                    ${item.customerImage ? `<br><small style="color: #888;">📷 Photo jointe</small>` : ''}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.priceValue * item.quantity).toFixed(2)}€</td>
            </tr>`;
            return html;
        }).join('');
    }
    
    // Send confirmation email to customer
    async function sendCustomerEmail(order) {
        if (EMAILJS_CONFIG.publicKey === 'VOTRE_PUBLIC_KEY') {
            console.log('Email client non envoyé (EmailJS non configuré)');
            return false;
        }
        
        const templateParams = {
            to_email: order.customer.email,
            email: order.customer.email,
            name: `${order.customer.firstName} ${order.customer.lastName}`,
            to_name: `${order.customer.firstName} ${order.customer.lastName}`,
            order_number: order.orderNumber,
            order_date: new Date(order.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }),
            order_items: formatOrderItems(order.items),
            order_items_html: formatOrderItemsHTML(order.items),
            subtotal: order.subtotal.toFixed(2),
            shipping: order.shipping === 0 ? 'Gratuite' : order.shipping.toFixed(2) + '€',
            total: order.total.toFixed(2),
            customer_address: `${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}`,
            customer_phone: order.customer.phone,
            shop_name: SHOP_NAME
        };
        
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateCustomer,
                templateParams
            );
            console.log('Email de confirmation envoyé au client');
            return true;
        } catch (error) {
            console.error('Erreur envoi email client:', error);
            return false;
        }
    }
    
    // Send notification email to shop owner
    async function sendOwnerEmail(order) {
        if (EMAILJS_CONFIG.publicKey === 'VOTRE_PUBLIC_KEY') {
            console.log('Email propriétaire non envoyé (EmailJS non configuré)');
            return false;
        }
        
        const templateParams = {
            to_email: OWNER_EMAIL,
            email: OWNER_EMAIL,
            order_number: order.orderNumber,
            order_date: new Date(order.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            customer_name: `${order.customer.firstName} ${order.customer.lastName}`,
            customer_email: order.customer.email,
            customer_phone: order.customer.phone,
            customer_address: `${order.customer.address}, ${order.customer.postalCode} ${order.customer.city}`,
            order_items: formatOrderItems(order.items),
            order_items_html: formatOrderItemsHTML(order.items),
            subtotal: order.subtotal.toFixed(2),
            shipping: order.shipping === 0 ? 'Gratuite' : order.shipping.toFixed(2) + '€',
            total: order.total.toFixed(2),
            payment_status: order.status === 'paid' ? '✅ PAYÉE' : '⏳ En attente',
            notes: order.customer.notes || 'Aucune note',
            shop_name: SHOP_NAME
        };
        
        try {
            await emailjs.send(
                EMAILJS_CONFIG.serviceId,
                EMAILJS_CONFIG.templateOwner,
                templateParams
            );
            console.log('Email de notification envoyé au propriétaire');
            return true;
        } catch (error) {
            console.error('Erreur envoi email propriétaire:', error);
            return false;
        }
    }
    
    // Send both emails
    async function sendOrderEmails(order) {
        const initialized = init();
        if (!initialized) {
            return { customer: false, owner: false };
        }
        
        const [customerResult, ownerResult] = await Promise.all([
            sendCustomerEmail(order),
            sendOwnerEmail(order)
        ]);
        
        return {
            customer: customerResult,
            owner: ownerResult
        };
    }
    
    // Expose globally
    window.FCEmail = {
        init,
        sendCustomerEmail,
        sendOwnerEmail,
        sendOrderEmails
    };
    
})();
