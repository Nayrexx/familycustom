// Vercel Serverless Function - Create Stripe PaymentIntent
const Stripe = require('stripe');

// Clé secrète Stripe depuis les variables d'environnement Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // CORS headers
    const allowedOrigins = ['https://www.family-custom.com', 'https://family-custom.com'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { amount, email, orderNumber, customerName } = req.body;

        // Validation
        if (!amount || amount < 50) {
            return res.status(400).json({ error: 'Montant invalide (minimum 0.50€)' });
        }

        // Créer le PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount), // en centimes
            currency: 'eur',
            receipt_email: email,
            metadata: {
                orderNumber: orderNumber || '',
                customerName: customerName || ''
            },
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Retourner le clientSecret
        res.status(200).json({
            clientSecret: paymentIntent.client_secret
        });

    } catch (error) {
        console.error('Stripe error:', error);
        res.status(500).json({ error: error.message });
    }
};
