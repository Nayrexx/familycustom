const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

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
