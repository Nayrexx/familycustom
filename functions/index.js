const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: ['https://www.family-custom.com', 'https://family-custom.com'] });
const soap = require('soap');
const crypto = require('crypto');

// Initialize Firebase Admin
admin.initializeApp();

// Clé secrète Stripe depuis les variables d'environnement
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_live_XXXXX';

const stripe = require('stripe')(STRIPE_SECRET_KEY);

/**
 * Crée un PaymentIntent pour le paiement
 * Appelé depuis le frontend avant de confirmer le paiement
 */
exports.createPaymentIntent = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // Vérifier la méthode
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        try {
            const { amount, currency, customerEmail, orderId, metadata } = req.body;

            // Validation
            if (!amount || amount < 50) {
                return res.status(400).json({ error: 'Montant invalide (minimum 0.50€)' });
            }

            // Créer le PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount), // Montant en centimes
                currency: currency || 'eur',
                receipt_email: customerEmail,
                metadata: {
                    orderId: orderId || '',
                    ...metadata
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            // Retourner le client_secret au frontend
            res.json({
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id
            });

        } catch (error) {
            console.error('Erreur création PaymentIntent:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Webhook Stripe pour recevoir les confirmations de paiement
 * Configure ce webhook dans le dashboard Stripe
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    // Webhook secret from environment variable
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gérer les événements
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Paiement réussi:', paymentIntent.id);
            
            // Mettre à jour la commande dans Firestore
            if (paymentIntent.metadata.orderId) {
                try {
                    await admin.firestore()
                        .collection('orders')
                        .doc(paymentIntent.metadata.orderId)
                        .update({
                            status: 'paid',
                            paymentId: paymentIntent.id,
                            paidAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                } catch (err) {
                    console.error('Erreur mise à jour commande:', err);
                }
            }
            break;

        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Paiement échoué:', failedPayment.id);
            break;

        default:
            console.log(`Event non géré: ${event.type}`);
    }

    res.json({ received: true });
});

// ========================================
// MONDIAL RELAY INTEGRATION
// ========================================

// Configuration Mondial Relay
// Clés stockées dans les variables d'environnement Firebase Functions
const MR_CONFIG = {
    wsdlUrl: 'https://api.mondialrelay.com/Web_Services.asmx?WSDL',
    enseigne: process.env.MR_ENSEIGNE || functions.config().mr?.enseigne || '',
    codeMarque: process.env.MR_CODE_MARQUE || functions.config().mr?.code_marque || '',
    privateKey: process.env.MR_PRIVATE_KEY || functions.config().mr?.private_key || ''
};

/**
 * Génère la signature MD5 pour l'API Mondial Relay
 */
function generateMRSignature(params, privateKey) {
    const concatenated = Object.values(params).join('') + privateKey;
    return crypto.createHash('md5').update(concatenated).digest('hex').toUpperCase();
}

/**
 * Recherche les points relais à proximité d'une adresse
 */
exports.searchParcelShops = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const { postalCode, country = 'FR', nbResults = 10 } = req.body;

            if (!postalCode) {
                return res.status(400).json({ error: 'Code postal requis' });
            }

            const client = await soap.createClientAsync(MR_CONFIG.wsdlUrl);

            const params = {
                Enseigne: MR_CONFIG.enseigne,
                Pays: country,
                CP: postalCode,
                NombreResultats: nbResults.toString(),
                Action: '',
                DelaiEnvoi: '0',
                RayonRecherche: ''
            };

            // Générer la signature
            const signature = generateMRSignature({
                Enseigne: params.Enseigne,
                Pays: params.Pays,
                CP: params.CP
            }, MR_CONFIG.privateKey);

            params.Security = signature;

            const [result] = await client.WSI4_PointRelais_RechercheAsync(params);

            if (result && result.WSI4_PointRelais_RechercheResult) {
                const mrResult = result.WSI4_PointRelais_RechercheResult;
                
                if (mrResult.STAT === '0') {
                    // Succès - formater les points relais
                    const shops = mrResult.PointsRelais?.PointRelais_Details || [];
                    const formattedShops = (Array.isArray(shops) ? shops : [shops]).map(shop => ({
                        id: shop.Num,
                        name: shop.LgAdr1,
                        address: `${shop.LgAdr3 || ''} ${shop.LgAdr4 || ''}`.trim(),
                        postalCode: shop.CP,
                        city: shop.Ville,
                        country: shop.Pays,
                        latitude: parseFloat(shop.Latitude?.replace(',', '.') || 0),
                        longitude: parseFloat(shop.Longitude?.replace(',', '.') || 0),
                        schedule: {
                            monday: shop.Horaires_Lundi,
                            tuesday: shop.Horaires_Mardi,
                            wednesday: shop.Horaires_Mercredi,
                            thursday: shop.Horaires_Jeudi,
                            friday: shop.Horaires_Vendredi,
                            saturday: shop.Horaires_Samedi,
                            sunday: shop.Horaires_Dimanche
                        },
                        mapUrl: shop.URL_Plan,
                        photoUrl: shop.URL_Photo
                    }));

                    res.json({ success: true, shops: formattedShops });
                } else {
                    res.status(400).json({ 
                        success: false, 
                        error: `Erreur Mondial Relay: ${mrResult.STAT}`,
                        code: mrResult.STAT
                    });
                }
            } else {
                res.status(500).json({ success: false, error: 'Réponse invalide de Mondial Relay' });
            }

        } catch (error) {
            console.error('Erreur recherche points relais:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Crée une expédition et génère l'étiquette Mondial Relay
 */
exports.createMondialRelayShipment = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const {
                orderId,
                sender,      // { name, address, postalCode, city, country, phone, email }
                recipient,   // { name, address, postalCode, city, country, phone, email }
                parcelShopId, // ID du point relais (optionnel si livraison à domicile)
                weight,      // Poids en grammes
                deliveryMode = '24R' // 24R = Point Relais, 24L = Domicile
            } = req.body;

            if (!recipient || !weight) {
                return res.status(400).json({ error: 'Destinataire et poids requis' });
            }

            const client = await soap.createClientAsync(MR_CONFIG.wsdlUrl);

            // Préparer les paramètres pour la création d'expédition
            const params = {
                Enseigne: MR_CONFIG.enseigne,
                ModeCol: 'REL',  // Mode de collecte (REL = en point relais)
                ModeLiv: deliveryMode, // Mode de livraison
                NDossier: orderId || '',
                NClient: '',
                Expe_Langage: 'FR',
                Expe_Ad1: sender?.name || 'Family Custom',
                Expe_Ad2: '',
                Expe_Ad3: sender?.address || '123 Rue du Commerce',
                Expe_Ad4: '',
                Expe_Ville: sender?.city || 'Paris',
                Expe_CP: sender?.postalCode || '75001',
                Expe_Pays: sender?.country || 'FR',
                Expe_Tel1: sender?.phone || '0100000000',
                Expe_Tel2: '',
                Expe_Mail: sender?.email || 'contact@family-custom.com',
                Dest_Langage: 'FR',
                Dest_Ad1: recipient.name || '',
                Dest_Ad2: '',
                Dest_Ad3: recipient.address || '',
                Dest_Ad4: '',
                Dest_Ville: recipient.city || '',
                Dest_CP: recipient.postalCode || '',
                Dest_Pays: recipient.country || 'FR',
                Dest_Tel1: recipient.phone || '',
                Dest_Tel2: '',
                Dest_Mail: recipient.email || '',
                Poids: weight.toString(),
                Longueur: '',
                Taille: '',
                NbColis: '1',
                CRT_Valeur: '0',
                CRT_Devise: '',
                Exp_Valeur: '',
                Exp_Devise: '',
                COL_Rel_Pays: 'FR',
                COL_Rel: '',
                LIV_Rel_Pays: recipient.country || 'FR',
                LIV_Rel: parcelShopId || '',
                TAvisage: '',
                TRepworded: '',
                Montage: '',
                TRDV: '',
                Assurance: '',
                Instructions: '',
                Texte: ''
            };

            // Construire la chaîne pour la signature selon la doc MR
            const signatureString = 
                params.Enseigne +
                params.ModeCol +
                params.ModeLiv +
                params.NDossier +
                params.NClient +
                params.Expe_Langage +
                params.Expe_Ad1 +
                params.Expe_Ad2 +
                params.Expe_Ad3 +
                params.Expe_Ad4 +
                params.Expe_Ville +
                params.Expe_CP +
                params.Expe_Pays +
                params.Expe_Tel1 +
                params.Expe_Tel2 +
                params.Expe_Mail +
                params.Dest_Langage +
                params.Dest_Ad1 +
                params.Dest_Ad2 +
                params.Dest_Ad3 +
                params.Dest_Ad4 +
                params.Dest_Ville +
                params.Dest_CP +
                params.Dest_Pays +
                params.Dest_Tel1 +
                params.Dest_Tel2 +
                params.Dest_Mail +
                params.Poids +
                params.Longueur +
                params.Taille +
                params.NbColis +
                params.CRT_Valeur +
                params.CRT_Devise +
                params.Exp_Valeur +
                params.Exp_Devise +
                params.COL_Rel_Pays +
                params.COL_Rel +
                params.LIV_Rel_Pays +
                params.LIV_Rel +
                params.TAvisage +
                params.TRepworded +
                params.Montage +
                params.TRDV +
                params.Assurance +
                params.Instructions +
                params.Texte +
                MR_CONFIG.privateKey;

            params.Security = crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();

            console.log('Création expédition MR avec params:', JSON.stringify(params, null, 2));

            const [result] = await client.WSI2_CreationExpeditionAsync(params);

            if (result && result.WSI2_CreationExpeditionResult) {
                const mrResult = result.WSI2_CreationExpeditionResult;
                
                if (mrResult.STAT === '0') {
                    // Succès - récupérer le numéro d'expédition et l'URL de l'étiquette
                    const shipmentNumber = mrResult.ExpeditionNum;
                    
                    // URL pour télécharger l'étiquette PDF
                    const labelUrl = `https://www.mondialrelay.fr/etiquette/?expedition=${shipmentNumber}`;

                    // Mettre à jour la commande dans Firestore si orderId fourni
                    if (orderId) {
                        try {
                            await admin.firestore()
                                .collection('orders')
                                .doc(orderId)
                                .update({
                                    shipping: {
                                        carrier: 'Mondial Relay',
                                        trackingNumber: shipmentNumber,
                                        labelUrl: labelUrl,
                                        parcelShopId: parcelShopId || null,
                                        deliveryMode: deliveryMode,
                                        createdAt: admin.firestore.FieldValue.serverTimestamp()
                                    }
                                });
                        } catch (err) {
                            console.error('Erreur mise à jour commande:', err);
                        }
                    }

                    res.json({ 
                        success: true, 
                        shipmentNumber: shipmentNumber,
                        labelUrl: labelUrl,
                        trackingUrl: `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${shipmentNumber}`
                    });
                } else {
                    // Erreur Mondial Relay
                    const errorMessages = {
                        '1': 'Enseigne invalide',
                        '2': 'Numéro de compte invalide',
                        '3': 'Pays expéditeur invalide',
                        '4': 'Pays destinataire invalide',
                        '5': 'Poids invalide',
                        '7': 'Code postal invalide',
                        '8': 'Ville invalide',
                        '9': 'Adresse invalide',
                        '10': 'Téléphone invalide',
                        '20': 'Poids colis supérieur au poids max',
                        '21': 'Dimensions invalides',
                        '24': 'Numéro de point relais invalide',
                        '80': 'Code marque invalide',
                        '81': 'Erreur de sécurité (signature)',
                        '82': 'Erreur paramètre'
                    };

                    res.status(400).json({ 
                        success: false, 
                        error: errorMessages[mrResult.STAT] || `Erreur Mondial Relay: ${mrResult.STAT}`,
                        code: mrResult.STAT
                    });
                }
            } else {
                res.status(500).json({ success: false, error: 'Réponse invalide de Mondial Relay' });
            }

        } catch (error) {
            console.error('Erreur création expédition:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Récupère le suivi d'une expédition Mondial Relay
 */
exports.trackMondialRelayShipment = functions.https.onRequest(async (req, res) => {
    cors(req, res, async () => {
        try {
            const { shipmentNumber } = req.body;

            if (!shipmentNumber) {
                return res.status(400).json({ error: 'Numéro d\'expédition requis' });
            }

            const client = await soap.createClientAsync(MR_CONFIG.wsdlUrl);

            const params = {
                Enseigne: MR_CONFIG.enseigne,
                Expedition: shipmentNumber,
                Langue: 'FR'
            };

            // Générer la signature
            const signature = generateMRSignature({
                Enseigne: params.Enseigne,
                Expedition: params.Expedition,
                Langue: params.Langue
            }, MR_CONFIG.privateKey);

            params.Security = signature;

            const [result] = await client.WSI3_GetEtiquettesAsync(params);

            if (result && result.WSI3_GetEtiquettesResult) {
                const mrResult = result.WSI3_GetEtiquettesResult;
                
                if (mrResult.STAT === '0') {
                    res.json({ 
                        success: true,
                        labelUrl: mrResult.URL_Etiquette,
                        status: mrResult.Etat
                    });
                } else {
                    res.status(400).json({ 
                        success: false, 
                        error: `Erreur Mondial Relay: ${mrResult.STAT}`,
                        code: mrResult.STAT
                    });
                }
            } else {
                res.status(500).json({ success: false, error: 'Réponse invalide de Mondial Relay' });
            }

        } catch (error) {
            console.error('Erreur suivi expédition:', error);
            res.status(500).json({ error: error.message });
        }
    });
});

// ========================================
// ABANDONED CART EMAIL REMINDERS (AUTO)
// ========================================

// EmailJS REST API configuration
const EMAILJS_CONFIG = {
    serviceId: process.env.EMAILJS_SERVICE_ID || 'service_df88l3e',
    templateId: process.env.EMAILJS_TEMPLATE_ID || 'template_i84v3mq',
    publicKey: process.env.EMAILJS_PUBLIC_KEY || 'uojT7zPVzrX9dwrTL'
};

/**
 * Génère le HTML de l'email de relance panier abandonné
 */
function buildAbandonedCartEmailHTML(cart) {
    const customerName = cart.firstName || 'Client';
    const itemsHTML = (cart.items || []).map(item => `
        <div style="display:flex;align-items:center;padding:10px 0;border-bottom:1px solid #3d3d3d;">
            <div style="width:60px;height:60px;background:#1a1a2e;border-radius:8px;margin-right:15px;display:flex;align-items:center;justify-content:center;">
                ${item.image ? `<img src="${item.image}" style="max-width:100%;max-height:100%;border-radius:8px;">` : '📦'}
            </div>
            <div style="flex:1;">
                <p style="margin:0;font-weight:600;">${item.name || 'Produit'}</p>
                <p style="margin:5px 0 0 0;color:#c9a87c;">${typeof item.price === 'number' ? item.price.toFixed(2) + '€' : (item.price || '')}</p>
            </div>
        </div>
    `).join('');

    return `
        <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a2e;color:#f5f5f5;border-radius:12px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#e07a5f,#c9a87c);padding:30px;text-align:center;">
                <h1 style="margin:0;color:white;font-size:24px;">🏠 Family Custom</h1>
            </div>
            <div style="padding:30px;">
                <h2 style="color:#e07a5f;margin-bottom:20px;">Votre panier vous attend ! 🛒</h2>
                <p>Bonjour ${customerName},</p>
                <p>Vous avez laissé des articles dans votre panier. Ils n'attendent que vous !</p>
                <div style="background:#2d2d2d;border-radius:10px;padding:20px;margin:20px 0;">
                    ${itemsHTML}
                </div>
                <p style="font-size:18px;font-weight:bold;color:#c9a87c;text-align:center;">Total : ${(cart.total || 0).toFixed(2)} €</p>
                <div style="margin-top:30px;text-align:center;">
                    <a href="https://www.family-custom.com/panier.html" style="background:linear-gradient(135deg,#e07a5f,#c9a87c);color:white;padding:15px 30px;border-radius:25px;text-decoration:none;display:inline-block;font-weight:600;">
                        🛒 Reprendre mon panier
                    </a>
                </div>
            </div>
            <div style="background:#0d0d15;padding:20px;text-align:center;color:#888;font-size:12px;">
                <p>© 2026 Family Custom - Créations personnalisées</p>
                <p>42330 Saint-Galmier, France</p>
            </div>
        </div>
    `;
}

/**
 * Envoie un email via l'API REST EmailJS (server-side)
 */
async function sendEmailViaEmailJS(toEmail, subject, htmlContent) {
    const payload = JSON.stringify({
        service_id: EMAILJS_CONFIG.serviceId,
        template_id: EMAILJS_CONFIG.templateId,
        user_id: EMAILJS_CONFIG.publicKey,
        template_params: {
            to_email: toEmail,
            subject: subject,
            message_html: htmlContent
        }
    });

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`EmailJS error ${response.status}: ${text}`);
    }
    return true;
}

/**
 * NOTE: Scheduled function désactivée — quota EmailJS limité à 200 emails/mois.
 * La relance se fait manuellement depuis le panel admin.
 * Réactiver quand le plan EmailJS sera upgrader ou remplacé par un service sans limite.
 */
// exports.sendAbandonedCartReminders = ... (désactivée)

/**
 * Endpoint HTTP pour déclencher manuellement les relances (depuis l'admin)
 */
exports.triggerCartReminders = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }
        
        try {
            // Vérifier l'authentification admin via token Firebase
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({ error: 'Non autorisé' });
            }
            
            const token = authHeader.split('Bearer ')[1];
            const decoded = await admin.auth().verifyIdToken(token);
            
            // Vérifier que c'est un admin (UIDs autorisés)
            const ADMIN_UIDS = ['cPWcF35BXFQXETh2Xe0IVqFptQo1', 'kvFTWu906zbdFdXMK0FphVC8zUv2', 'VLDcjlZFVxQhkKfiewmGtKVMaji2', '5wipVx4YFPMWL3kUq5VhieSxlRw1'];
            if (!ADMIN_UIDS.includes(decoded.uid)) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
            
            const db = admin.firestore();
            const { cartId } = req.body;
            
            if (cartId) {
                // Relancer un panier spécifique
                const doc = await db.collection('abandonedCarts').doc(cartId).get();
                if (!doc.exists) return res.status(404).json({ error: 'Panier non trouvé' });
                
                const cart = doc.data();
                const html = buildAbandonedCartEmailHTML(cart);
                await sendEmailViaEmailJS(cart.email, 'Vous avez oublié quelque chose... 🛒', html);
                
                await db.collection('abandonedCarts').doc(cartId).update({
                    reminderSent: true,
                    reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
                    reminderCount: admin.firestore.FieldValue.increment(1)
                });
                
                return res.json({ success: true, sent: 1 });
            }
            
            // Relancer tous les non-relancés
            const snapshot = await db.collection('abandonedCarts')
                .where('status', '==', 'abandoned')
                .where('reminderSent', '==', false)
                .get();
            
            let sent = 0;
            for (const doc of snapshot.docs) {
                const cart = doc.data();
                if (!cart.email) continue;
                
                try {
                    const html = buildAbandonedCartEmailHTML(cart);
                    await sendEmailViaEmailJS(cart.email, 'Vous avez oublié quelque chose... 🛒', html);
                    await db.collection('abandonedCarts').doc(doc.id).update({
                        reminderSent: true,
                        reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
                        reminderCount: admin.firestore.FieldValue.increment(1)
                    });
                    sent++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch (err) {
                    console.error('Reminder error:', err);
                }
            }
            
            res.json({ success: true, sent });
        } catch (error) {
            console.error('triggerCartReminders error:', error);
            res.status(500).json({ error: error.message });
        }
    });
});
