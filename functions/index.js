const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });
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

// Configuration Mondial Relay (TEST)
const MR_CONFIG = {
    wsdlUrl: 'https://api.mondialrelay.com/Web_Services.asmx?WSDL',
    enseigne: 'TTMRSDBX',  // Code Enseigne TEST
    codeMarque: 'TT',
    privateKey: '9ytnxVCC'  // Clé privée TEST
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
                Expe_Mail: sender?.email || 'contact@familycustom.fr',
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
