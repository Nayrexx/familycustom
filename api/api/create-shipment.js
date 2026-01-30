// API Vercel - Création d'expédition Mondial Relay
const soap = require('soap');
const crypto = require('crypto');

// Configuration Mondial Relay PRODUCTION
const MR_CONFIG = {
    wsdlUrl: 'https://api.mondialrelay.com/WebService.asmx?WSDL',
    enseigne: 'CC23TCRH',  // Code Enseigne PRODUCTION
    codeMarque: 'CC',  // Marque PRODUCTION
    privateKey: 'B1qAsW0U'  // Clé privée PRODUCTION
};

module.exports = async (req, res) => {
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
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
                
                return res.status(200).json({ 
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
                
                return res.status(400).json({ 
                    success: false, 
                    error: errorMessages[mrResult.STAT] || `Erreur Mondial Relay: ${mrResult.STAT}`,
                    code: mrResult.STAT
                });
            }
        } else {
            return res.status(500).json({ success: false, error: 'Réponse invalide de Mondial Relay' });
        }
        
    } catch (error) {
        console.error('Erreur création expédition:', error);
        return res.status(500).json({ error: error.message });
    }
};
