// API Vercel - Création d'expédition Mondial Relay
const crypto = require('crypto');

// Configuration Mondial Relay PRODUCTION
// Clés stockées dans les variables d'environnement Vercel
const MR_CONFIG = {
    apiUrl: 'https://api.mondialrelay.com/Web_Services.asmx',
    enseigne: process.env.MR_ENSEIGNE,
    codeMarque: process.env.MR_CODE_MARQUE,
    privateKey: process.env.MR_PRIVATE_KEY
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
        const {
            orderId,
            sender,      // { name, address, postalCode, city, country, phone, email }
            recipient,   // { name, address, postalCode, city, country, phone, email }
            parcelShopId, // ID du point relais (optionnel si livraison à domicile)
            weight,      // Poids en grammes
            deliveryMode = '24R' // 24R = Point Relais, 24L = Domicile
        } = req.body;
        
        console.log('📦 Received request:', JSON.stringify(req.body, null, 2));
        
        if (!recipient || !weight) {
            return res.status(400).json({ error: 'Destinataire et poids requis' });
        }
        
        // Préparer les paramètres pour la création d'expédition
        const params = {
            Enseigne: MR_CONFIG.enseigne,
            ModeCol: 'REL',
            ModeLiv: deliveryMode,
            NDossier: orderId || '',
            NClient: '',
            Expe_Langage: 'FR',
            Expe_Ad1: sender?.name || 'Family Custom',
            Expe_Ad2: '',
            Expe_Ad3: sender?.address || '10 Rue Example',
            Expe_Ad4: '',
            Expe_Ville: sender?.city || 'Paris',
            Expe_CP: sender?.postalCode || '75001',
            Expe_Pays: sender?.country || 'FR',
            Expe_Tel1: (sender?.phone || '0600000000').replace(/\s/g, ''),
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
            Dest_Tel1: (recipient.phone || '').replace(/\s/g, ''),
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
            TReprise: '',
            Montage: '',
            TRDV: '',
            Assurance: '',
            Instructions: '',
            Texte: ''
        };
        
        // Construire la chaîne pour la signature MD5
        const signatureString = Object.values(params).join('') + MR_CONFIG.privateKey;
        params.Security = crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();
        
        console.log('🔐 Security hash generated');
        
        // Construire le body SOAP manuellement
        const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <WSI2_CreationExpedition xmlns="http://www.mondialrelay.fr/webservice/">
      <Enseigne>${params.Enseigne}</Enseigne>
      <ModeCol>${params.ModeCol}</ModeCol>
      <ModeLiv>${params.ModeLiv}</ModeLiv>
      <NDossier>${params.NDossier}</NDossier>
      <NClient>${params.NClient}</NClient>
      <Expe_Langage>${params.Expe_Langage}</Expe_Langage>
      <Expe_Ad1>${params.Expe_Ad1}</Expe_Ad1>
      <Expe_Ad2>${params.Expe_Ad2}</Expe_Ad2>
      <Expe_Ad3>${params.Expe_Ad3}</Expe_Ad3>
      <Expe_Ad4>${params.Expe_Ad4}</Expe_Ad4>
      <Expe_Ville>${params.Expe_Ville}</Expe_Ville>
      <Expe_CP>${params.Expe_CP}</Expe_CP>
      <Expe_Pays>${params.Expe_Pays}</Expe_Pays>
      <Expe_Tel1>${params.Expe_Tel1}</Expe_Tel1>
      <Expe_Tel2>${params.Expe_Tel2}</Expe_Tel2>
      <Expe_Mail>${params.Expe_Mail}</Expe_Mail>
      <Dest_Langage>${params.Dest_Langage}</Dest_Langage>
      <Dest_Ad1>${params.Dest_Ad1}</Dest_Ad1>
      <Dest_Ad2>${params.Dest_Ad2}</Dest_Ad2>
      <Dest_Ad3>${params.Dest_Ad3}</Dest_Ad3>
      <Dest_Ad4>${params.Dest_Ad4}</Dest_Ad4>
      <Dest_Ville>${params.Dest_Ville}</Dest_Ville>
      <Dest_CP>${params.Dest_CP}</Dest_CP>
      <Dest_Pays>${params.Dest_Pays}</Dest_Pays>
      <Dest_Tel1>${params.Dest_Tel1}</Dest_Tel1>
      <Dest_Tel2>${params.Dest_Tel2}</Dest_Tel2>
      <Dest_Mail>${params.Dest_Mail}</Dest_Mail>
      <Poids>${params.Poids}</Poids>
      <Longueur>${params.Longueur}</Longueur>
      <Taille>${params.Taille}</Taille>
      <NbColis>${params.NbColis}</NbColis>
      <CRT_Valeur>${params.CRT_Valeur}</CRT_Valeur>
      <CRT_Devise>${params.CRT_Devise}</CRT_Devise>
      <Exp_Valeur>${params.Exp_Valeur}</Exp_Valeur>
      <Exp_Devise>${params.Exp_Devise}</Exp_Devise>
      <COL_Rel_Pays>${params.COL_Rel_Pays}</COL_Rel_Pays>
      <COL_Rel>${params.COL_Rel}</COL_Rel>
      <LIV_Rel_Pays>${params.LIV_Rel_Pays}</LIV_Rel_Pays>
      <LIV_Rel>${params.LIV_Rel}</LIV_Rel>
      <TAvisage>${params.TAvisage}</TAvisage>
      <TReprise>${params.TReprise}</TReprise>
      <Montage>${params.Montage}</Montage>
      <TRDV>${params.TRDV}</TRDV>
      <Assurance>${params.Assurance}</Assurance>
      <Instructions>${params.Instructions}</Instructions>
      <Texte>${params.Texte}</Texte>
      <Security>${params.Security}</Security>
    </WSI2_CreationExpedition>
  </soap:Body>
</soap:Envelope>`;
        
        console.log('📤 Sending SOAP request to Mondial Relay...');
        
        const response = await fetch(MR_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI2_CreationExpedition'
            },
            body: soapBody
        });
        
        const responseText = await response.text();
        console.log('📥 SOAP Response:', responseText.substring(0, 500));
        
        // Parser la réponse XML
        const statMatch = responseText.match(/<STAT>(\d+)<\/STAT>/);
        const expeditionMatch = responseText.match(/<ExpeditionNum>(\d+)<\/ExpeditionNum>/);
        
        if (statMatch) {
            const stat = statMatch[1];
            
            if (stat === '0' && expeditionMatch) {
                const shipmentNumber = expeditionMatch[1];
                const labelUrl = `https://www.mondialrelay.fr/public/permanent/etiquette.aspx?ens=${MR_CONFIG.enseigne}&expedition=${shipmentNumber}&format=A4&lg=FR`;
                
                console.log('✅ Expédition créée:', shipmentNumber);
                
                return res.status(200).json({ 
                    success: true, 
                    shipmentNumber: shipmentNumber,
                    labelUrl: labelUrl,
                    trackingUrl: `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${shipmentNumber}`
                });
            } else {
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
                    '20': 'Poids supérieur au maximum autorisé',
                    '24': 'Numéro de point relais invalide',
                    '80': 'Code marque invalide',
                    '81': 'Erreur de sécurité (signature)',
                    '82': 'Erreur paramètre',
                    '97': 'Compte Mondial Relay non activé'
                };
                
                console.log('❌ Erreur MR:', stat, errorMessages[stat]);
                
                return res.status(400).json({ 
                    success: false, 
                    error: errorMessages[stat] || `Erreur Mondial Relay code ${stat}`,
                    code: stat
                });
            }
        }
        
        return res.status(500).json({ 
            success: false, 
            error: 'Réponse invalide de Mondial Relay',
            rawResponse: responseText.substring(0, 200)
        });
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
        return res.status(500).json({ 
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
};
