// API Vercel - Recherche de points relais Mondial Relay
const crypto = require('crypto');

// Configuration Mondial Relay PRODUCTION
// Clés stockées dans les variables d'environnement Vercel
const MR_CONFIG = {
    apiUrl: 'https://api.mondialrelay.com/WebService.asmx',
    enseigne: process.env.MR_ENSEIGNE,
    privateKey: process.env.MR_PRIVATE_KEY,
    marque: process.env.MR_CODE_MARQUE
};

module.exports = async (req, res) => {
    // Handle CORS
    const allowedOrigins = ['https://www.family-custom.com', 'https://family-custom.com'];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { postalCode, country = 'FR', nbResults = 10 } = req.body;
        
        if (!postalCode) {
            return res.status(400).json({ error: 'Code postal requis' });
        }
        
        // Valider le format du code postal français
        if (country === 'FR' && !/^\d{5}$/.test(postalCode)) {
            return res.status(400).json({ error: 'Code postal invalide (5 chiffres requis)' });
        }
        
        // Paramètres pour la recherche - tous les champs utilisés dans la signature
        const params = {
            Enseigne: MR_CONFIG.enseigne,
            Pays: country,
            CP: postalCode,
            Ville: '',
            NombreResultats: nbResults.toString()
        };
        
        // Générer la signature MD5 selon la documentation Mondial Relay
        // Ordre: Enseigne + Pays + Ville + CP + NombreResultats + PrivateKey
        const signatureString = 
            params.Enseigne + 
            params.Pays + 
            params.Ville +
            params.CP + 
            params.NombreResultats +
            MR_CONFIG.privateKey;
        
        const security = crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();
        
        // Construire le body SOAP
        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
    <soap:Body>
        <WSI4_PointRelais_Recherche xmlns="http://www.mondialrelay.fr/webservice/">
            <Enseigne>${params.Enseigne}</Enseigne>
            <Pays>${params.Pays}</Pays>
            <Ville>${params.Ville}</Ville>
            <CP>${params.CP}</CP>
            <NombreResultats>${params.NombreResultats}</NombreResultats>
            <Security>${security}</Security>
        </WSI4_PointRelais_Recherche>
    </soap:Body>
</soap:Envelope>`;

        console.log('Calling Mondial Relay API with CP:', postalCode);
        console.log('Signature string:', signatureString);
        console.log('Security hash:', security);
        
        // Appel HTTP POST à l'API Mondial Relay
        const response = await fetch(MR_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche'
            },
            body: soapBody
        });
        
        const xmlResponse = await response.text();
        console.log('Mondial Relay response status:', response.status);
        console.log('Mondial Relay response (first 500 chars):', xmlResponse.substring(0, 500));
        
        // Parser la réponse XML
        const statMatch = xmlResponse.match(/<STAT>(\d+)<\/STAT>/);
        const stat = statMatch ? statMatch[1] : null;
        
        if (stat === '0') {
            // Succès - extraire les points relais
            const shops = [];
            const pointRelaisRegex = /<PointRelais_Details>([\s\S]*?)<\/PointRelais_Details>/g;
            let match;
            
            while ((match = pointRelaisRegex.exec(xmlResponse)) !== null) {
                const prXml = match[1];
                
                const getValue = (tag) => {
                    const m = prXml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
                    return m ? m[1].trim() : '';
                };
                
                shops.push({
                    id: getValue('Num'),
                    name: getValue('LgAdr1'),
                    address: `${getValue('LgAdr3')} ${getValue('LgAdr4')}`.trim(),
                    postalCode: getValue('CP'),
                    city: getValue('Ville'),
                    country: getValue('Pays'),
                    latitude: parseFloat(getValue('Latitude').replace(',', '.') || 0),
                    longitude: parseFloat(getValue('Longitude').replace(',', '.') || 0),
                    schedule: {
                        monday: getValue('Horaires_Lundi'),
                        tuesday: getValue('Horaires_Mardi'),
                        wednesday: getValue('Horaires_Mercredi'),
                        thursday: getValue('Horaires_Jeudi'),
                        friday: getValue('Horaires_Vendredi'),
                        saturday: getValue('Horaires_Samedi'),
                        sunday: getValue('Horaires_Dimanche')
                    }
                });
            }
            
            return res.status(200).json({ success: true, shops: shops });
        } else {
            // Erreur Mondial Relay
            const errorMessages = {
                '1': 'Enseigne invalide',
                '2': 'Numéro d\'enseigne vide ou invalide',
                '3': 'Code pays invalide ou vide',
                '4': 'Code postal invalide',
                '5': 'Ville invalide',
                '6': 'Numéro de point relais invalide',
                '7': 'Erreur interne',
                '8': 'Date invalide',
                '9': 'Paramètre Pays non autorisé pour cette enseigne',
                '10': 'Mode de livraison non autorisé pour cette enseigne',
                '30': 'Clé de sécurité invalide'
            };
            
            return res.status(400).json({ 
                success: false, 
                error: errorMessages[stat] || `Erreur Mondial Relay: code ${stat}`,
                code: stat,
                debug: {
                    signatureString: signatureString,
                    security: security
                }
            });
        }
        
    } catch (error) {
        console.error('Erreur recherche points relais:', error);
        return res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
};
