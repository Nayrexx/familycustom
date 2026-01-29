/* ============================================
   FAMILY CUSTOM - Chat Bot & Live Support
   ============================================ */

const FCChat = (function() {
    
    // Configuration
    const CONFIG = {
        botName: 'Family Assistant',
        companyName: 'Family Custom',
        welcomeMessage: 'Bonjour ! 👋 Je suis l\'assistant virtuel de Family Custom. Comment puis-je vous aider ?',
        offlineMessage: 'Notre équipe n\'est pas disponible actuellement. Laissez-nous un message et nous vous répondrons dès que possible !',
        workingHours: {
            start: 9,  // 9h
            end: 18,   // 18h
            days: [1, 2, 3, 4, 5] // Lundi à Vendredi
        }
    };
    
    // Réponses automatiques du chatbot
    const BOT_RESPONSES = {
        // Salutations
        'bonjour|salut|hello|hey|coucou|bonsoir|bjr|slt|yo': {
            response: 'Bonjour ! 😊 Comment puis-je vous aider aujourd\'hui ?',
            quickReplies: ['Délais de livraison', 'Suivi commande', 'Personnalisation', 'Parler à un conseiller']
        },
        
        // Comment ça va
        'ça va|ca va|comment vas|comment allez|comment tu vas': {
            response: 'Je vais très bien, merci de demander ! 😊 Comment puis-je vous aider ?',
            quickReplies: ['Voir les créations', 'Suivi commande', 'Parler à un conseiller']
        },
        
        // Question sur délai de livraison
        'combien de temps|quand vais-je recevoir|quand livr|délai de livraison|délais de livraison|temps de livraison|livré quand|reçois quand': {
            response: 'Nos délais de livraison sont de **5 à 10 jours ouvrés** après validation de votre commande. Ce délai inclut la fabrication personnalisée et l\'expédition. 🚚',
            quickReplies: ['Frais de livraison', 'Suivi commande', 'Autre question']
        },
        
        // Livraison générale
        'livraison|expédition|envoi|expédi|shipping': {
            response: 'La livraison est **gratuite** en France métropolitaine ! Délai : 5 à 10 jours ouvrés. Vous recevrez un email avec le suivi dès l\'expédition. 📦',
            quickReplies: ['Délais de livraison', 'Suivi commande', 'Livraison internationale']
        },
        
        // Frais de port
        'frais de port|frais de livraison|port gratuit|livraison gratuite|combien coûte la livraison|prix livraison': {
            response: 'La livraison est **100% gratuite** en France métropolitaine, sans minimum d\'achat ! Pour les DOM-TOM et l\'international, les frais sont calculés au checkout. 📦',
            quickReplies: ['Livraison internationale', 'Délais de livraison', 'Autre question']
        },
        
        // Livraison internationale
        'international|étranger|belgique|suisse|canada|hors france|dom tom': {
            response: 'Nous livrons dans toute l\'Europe et au Canada ! Les frais de livraison internationale sont calculés automatiquement lors du paiement selon votre pays. Comptez 10 à 15 jours ouvrés. 🌍',
            quickReplies: ['Délais de livraison', 'Autre question']
        },
        
        // Suivi commande
        'suivre ma commande|suivi commande|où est ma commande|statut commande|tracking|numéro de suivi|mon colis': {
            response: 'Pour suivre votre commande, rendez-vous sur notre page de suivi. Il vous suffit d\'entrer votre numéro de commande et votre email. 📍\n\n👉 [Suivre ma commande](suivi-commande.html)',
            quickReplies: ['Je n\'ai pas reçu d\'email', 'Parler à un conseiller']
        },
        
        // Pas reçu email
        'pas reçu|pas d\'email|aucun email|email confirmation|pas de mail|spam': {
            response: 'Vérifiez d\'abord vos **spams** ou courriers indésirables. Si vous ne trouvez toujours pas l\'email, contactez-nous avec votre numéro de commande et nous vous renverrons les informations ! 📧',
            quickReplies: ['Parler à un conseiller', 'Contact']
        },
        
        // Personnalisation générale
        'personnalis|personnaliser|custom|sur mesure': {
            response: 'Toutes nos créations sont **100% personnalisables** ! Choisissez votre texte, police, couleurs et dimensions. L\'aperçu se met à jour en temps réel. Rendez-vous sur un produit et cliquez sur "Personnaliser" ! ✨',
            quickReplies: ['Voir les créations', 'Prix', 'Autre question']
        },
        
        // Modifier texte / couleur / taille
        'modifier|changer le texte|changer la couleur|changer la taille|quelle police|quelles couleurs': {
            response: 'Sur la page de personnalisation, vous pouvez :\n• Écrire votre texte personnalisé\n• Choisir parmi plusieurs polices\n• Sélectionner la couleur (néons) ou le type de bois\n• Ajuster les dimensions\n\nTout est modifiable avant de valider ! 🎨',
            quickReplies: ['Voir les créations', 'Autre question']
        },
        
        // Prix général
        'prix|tarif|coûte combien|c\'est combien|combien ça coûte|cher': {
            response: 'Nos prix dépendent du produit et des dimensions choisies :\n• **Néons LED** : à partir de 79€\n• **Créations bois** : à partir de 49€\n\nLe prix s\'affiche en temps réel pendant la personnalisation ! 💰',
            quickReplies: ['Voir les créations', 'Parler à un conseiller']
        },
        
        // Paiement
        'paiement|payer|comment payer|moyen de paiement|carte bancaire|cb|visa|mastercard': {
            response: 'Nous acceptons les paiements par **carte bancaire** (Visa, Mastercard, CB) via Stripe, 100% sécurisé. Apple Pay et Google Pay sont aussi disponibles ! 💳',
            quickReplies: ['Paiement sécurisé ?', 'Payer en plusieurs fois', 'Autre question']
        },
        
        // PayPal
        'paypal': {
            response: 'PayPal n\'est pas disponible pour le moment, mais nous acceptons toutes les cartes bancaires via Stripe (Visa, Mastercard, CB) ainsi qu\'Apple Pay et Google Pay. 💳',
            quickReplies: ['Paiement sécurisé ?', 'Autre question']
        },
        
        // Paiement plusieurs fois
        'plusieurs fois|payer en 3|payer en 4|facilité|échelonné': {
            response: 'Le paiement en plusieurs fois sera bientôt disponible ! Pour l\'instant, nous acceptons le paiement en une seule fois par carte bancaire. 💳',
            quickReplies: ['Commander maintenant', 'Autre question']
        },
        
        // Sécurité paiement
        'sécurisé|sécurité|confiance|fiable|données': {
            response: 'Absolument ! Vos paiements sont **100% sécurisés** par Stripe, leader mondial. Vos données bancaires ne passent jamais par nos serveurs, tout est crypté (SSL). 🔒',
            quickReplies: ['Commander maintenant', 'Autre question']
        },
        
        // Retour / Remboursement
        'retour|retourner|rembours|annuler ma commande|annulation': {
            response: 'Les créations personnalisées sont **non retournables** car faites sur mesure pour vous. Cependant, en cas de défaut de fabrication, nous vous proposons un remplacement ou remboursement. Contactez-nous sous 48h avec des photos ! 🤝',
            quickReplies: ['Signaler un problème', 'Parler à un conseiller']
        },
        
        // Problème / Défaut
        'problème|défaut|cassé|abîmé|erreur|pas conforme|qualité': {
            response: 'Oh non, désolé pour ce désagrément ! 😔 Envoyez-nous des photos du problème par email à support@family-custom.com sous 48h après réception. Nous trouverons une solution rapidement !',
            quickReplies: ['Parler à un conseiller', 'Contact']
        },
        
        // Néon - infos générales
        'néon|neon|led|enseigne lumineuse': {
            response: 'Nos **néons LED** sont fabriqués en tube flexible de haute qualité. Ils :\n• Consomment très peu d\'énergie\n• Ne chauffent pas\n• Durent plus de 50 000 heures\n• Sont livrés prêts à brancher\n\nParfaits pour déco intérieure ! 💡',
            quickReplies: ['Prix des néons', 'Dimensions néons', 'Voir les néons']
        },
        
        // Dimensions néon
        'dimension|taille néon|quelle taille|mesure|centimètre|cm': {
            response: 'Nos néons sont disponibles en plusieurs tailles :\n• **Petit** : 40-60 cm\n• **Moyen** : 60-80 cm\n• **Grand** : 80-120 cm\n\nLa taille exacte dépend du texte choisi. Vous verrez les dimensions lors de la personnalisation ! 📏',
            quickReplies: ['Voir les néons', 'Autre question']
        },
        
        // Installation néon
        'installer|installation|accrocher|fixer|brancher|prise': {
            response: 'Nos néons sont **livrés prêts à l\'emploi** avec :\n• Câble d\'alimentation 2m avec interrupteur\n• Kit de fixation murale\n• Instructions de montage\n\nIl suffit de brancher sur une prise standard 220V ! 🔌',
            quickReplies: ['Autre question', 'Voir les néons']
        },
        
        // Bois - infos générales
        'bois|gravure|gravé|découpe|laser|planche': {
            response: 'Nos **créations en bois** sont réalisées en contreplaqué de bouleau ou MDF premium, découpées et gravées au laser avec une grande précision pour une finition parfaite. 🪵',
            quickReplies: ['Voir les créations bois', 'Prix bois', 'Autre question']
        },
        
        // Contact
        'contact|contacter|email|mail|téléphone|numéro|appeler|joindre': {
            response: 'Vous pouvez nous contacter par :\n📧 **Email** : support@family-custom.com\n📍 **Adresse** : 42330 Saint-Galmier\n⏰ Du lundi au vendredi, 9h-18h\n\nOu demandez à parler à un conseiller ici ! 💬',
            quickReplies: ['Parler à un conseiller', 'Autre question']
        },
        
        // Horaires
        'horaire|heure|ouvert|disponible|quand répondez': {
            response: 'Notre équipe est disponible du **lundi au vendredi, de 9h à 18h**. En dehors de ces horaires, laissez un message et nous vous répondrons dès que possible ! ⏰',
            quickReplies: ['Parler à un conseiller', 'Laisser un message']
        },
        
        // Remerciements
        'merci|thanks|super|génial|parfait|excellent|top|cool|nickel': {
            response: 'Avec plaisir ! 😊 N\'hésitez pas si vous avez d\'autres questions. À bientôt sur Family Custom ! ✨',
            quickReplies: ['Voir les créations', 'Autre question']
        },
        
        // Au revoir
        'au revoir|bye|à bientôt|bonne journée|bonne soirée|adieu|ciao': {
            response: 'Au revoir et à bientôt ! 👋 N\'hésitez pas à revenir si vous avez d\'autres questions. Belle journée ! ☀️',
            quickReplies: ['Voir les créations']
        },
        
        // Parler à un humain
        'conseiller|humain|personne réelle|vrai personne|parler à quelqu\'un|aide humaine|support|agent|opérateur': {
            response: 'Je vous mets en relation avec un membre de notre équipe. Un instant s\'il vous plaît... 👤',
            action: 'requestLiveSupport'
        },
        
        // Carte cadeau
        'carte cadeau|gift card|bon cadeau|offrir|idée cadeau|chèque cadeau': {
            response: 'Nous proposons des **cartes cadeaux** de 25€, 50€, 75€, 100€ et 150€ ! Envoyées par email, c\'est le cadeau idéal pour offrir une création personnalisée. 🎁\n\n👉 [Voir les cartes cadeaux](carte-cadeau.html)',
            quickReplies: ['Autre question']
        },
        
        // Commander / Acheter
        'commander|acheter|passer commande|comment acheter': {
            response: 'Pour commander, c\'est simple :\n1. Choisissez votre création\n2. Personnalisez-la\n3. Ajoutez au panier\n4. Passez au paiement\n\n👉 [Voir nos créations](#categories)',
            quickReplies: ['Voir les créations', 'Aide personnalisation']
        },
        
        // Entreprise / Pro
        'entreprise|professionnel|pro|devis|grande quantité|événement|société|btob|b2b': {
            response: 'Vous êtes un professionnel ? Nous proposons des tarifs dégressifs pour les commandes en quantité et des solutions sur mesure pour vos événements ou votre entreprise. Contactez-nous pour un devis personnalisé ! 🏢',
            quickReplies: ['Parler à un conseiller', 'Contact']
        },
        
        // Qualité / Matériaux
        'qualité|matériaux|matériel|fait en quoi|composition': {
            response: 'Nous utilisons uniquement des **matériaux premium** :\n• Néons : tube LED flexible haute qualité\n• Bois : contreplaqué bouleau ou MDF\n• Finitions soignées à la main\n\nChaque création est contrôlée avant expédition ! ✅',
            quickReplies: ['Voir les créations', 'Autre question']
        },
        
        // Garantie
        'garantie|garanti|durée de vie|combien de temps ça dure': {
            response: 'Nos créations sont garanties :\n• **Néons LED** : 2 ans (durée de vie 50 000h+)\n• **Créations bois** : 1 an\n\nEn cas de problème, nous sommes là pour vous aider ! 🛡️',
            quickReplies: ['Signaler un problème', 'Autre question']
        },
        
        // Oui / Non / Autre question
        'oui|ok|d\'accord|entendu': {
            response: 'Parfait ! Comment puis-je vous aider ? 😊',
            quickReplies: ['Délais de livraison', 'Suivi commande', 'Personnalisation', 'Parler à un conseiller']
        },
        
        'non|pas vraiment|non merci': {
            response: 'D\'accord ! Si vous avez d\'autres questions plus tard, je suis là. Bonne visite ! 😊',
            quickReplies: ['Voir les créations', 'Autre question']
        },
        
        'autre question|autre chose|j\'ai une question': {
            response: 'Bien sûr ! Posez-moi votre question, je ferai de mon mieux pour vous aider. 😊',
            quickReplies: ['Délais de livraison', 'Prix', 'Personnalisation', 'Parler à un conseiller']
        },
        
        // Default
        'default': {
            response: 'Je n\'ai pas bien compris votre question. 🤔 Pouvez-vous reformuler ou choisir une option ci-dessous ?',
            quickReplies: ['Délais de livraison', 'Suivi commande', 'Prix', 'Personnalisation', 'Parler à un conseiller']
        }
    };
    
    // State
    let state = {
        isOpen: false,
        mode: 'bot', // 'bot', 'preform', 'waiting', 'live'
        messages: [],
        userInfo: null,
        conversationId: null,
        unreadCount: 0
    };
    
    // Initialize
    function init() {
        createWidget();
        loadState();
        bindEvents();
        
        // Si Firebase est disponible, écouter les messages en direct
        if (typeof firebase !== 'undefined' && state.conversationId) {
            listenForMessages();
        }
    }
    
    // Create Widget HTML
    function createWidget() {
        const widget = document.createElement('div');
        widget.className = 'chat-widget';
        widget.innerHTML = `
            <div class="chat-window" id="chat-window">
                <div class="chat-header">
                    <div class="chat-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chat-info">
                        <h4>${CONFIG.botName}</h4>
                        <div class="chat-status">
                            <span class="status-dot ${isOnline() ? '' : 'offline'}"></span>
                            <span>${isOnline() ? 'En ligne' : 'Hors ligne'}</span>
                        </div>
                    </div>
                    <button class="chat-close" id="chat-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="chat-messages" id="chat-messages">
                    <!-- Messages appear here -->
                </div>
                
                <div class="chat-input-area" id="chat-input-area">
                    <input type="text" class="chat-input" id="chat-input" placeholder="Écrivez votre message...">
                    <button class="chat-send" id="chat-send">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
            
            <button class="chat-toggle" id="chat-toggle">
                <i class="fas fa-comments"></i>
                <span class="chat-badge" id="chat-badge">0</span>
            </button>
        `;
        
        document.body.appendChild(widget);
    }
    
    // Bind Events
    function bindEvents() {
        const toggle = document.getElementById('chat-toggle');
        const close = document.getElementById('chat-close');
        const input = document.getElementById('chat-input');
        const send = document.getElementById('chat-send');
        
        toggle.addEventListener('click', toggleChat);
        close.addEventListener('click', toggleChat);
        
        send.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Quick replies delegation
        document.getElementById('chat-messages').addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-reply')) {
                handleQuickReply(e.target.textContent);
            }
            if (e.target.classList.contains('live-support-btn')) {
                requestLiveSupport();
            }
        });
    }
    
    // Toggle Chat
    function toggleChat() {
        state.isOpen = !state.isOpen;
        const window = document.getElementById('chat-window');
        const toggle = document.getElementById('chat-toggle');
        
        window.classList.toggle('open', state.isOpen);
        toggle.classList.toggle('open', state.isOpen);
        
        if (state.isOpen && state.messages.length === 0) {
            // Premier message de bienvenue
            setTimeout(() => {
                addBotMessage(CONFIG.welcomeMessage, ['Délais de livraison', 'Suivi commande', 'Personnalisation', 'Parler à un conseiller']);
            }, 500);
        }
        
        // Reset unread
        if (state.isOpen) {
            state.unreadCount = 0;
            updateBadge();
        }
        
        saveState();
    }
    
    // Send Message
    function sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        addUserMessage(text);
        input.value = '';
        
        if (state.mode === 'bot') {
            // Traitement chatbot
            setTimeout(() => {
                showTyping();
                setTimeout(() => {
                    hideTyping();
                    processUserMessage(text);
                }, 1000 + Math.random() * 1000);
            }, 300);
        } else if (state.mode === 'live') {
            // Envoi au support en direct
            sendToLiveSupport(text);
        }
    }
    
    // Add Messages
    function addUserMessage(text) {
        const message = {
            type: 'user',
            text: text,
            time: new Date()
        };
        state.messages.push(message);
        renderMessage(message);
        saveState();
        scrollToBottom();
    }
    
    function addBotMessage(text, quickReplies = null) {
        const message = {
            type: 'bot',
            text: text,
            quickReplies: quickReplies,
            time: new Date()
        };
        state.messages.push(message);
        renderMessage(message);
        saveState();
        scrollToBottom();
    }
    
    function addSupportMessage(text, agentName = 'Support') {
        const message = {
            type: 'support',
            text: text,
            agentName: agentName,
            time: new Date()
        };
        state.messages.push(message);
        renderMessage(message);
        
        if (!state.isOpen) {
            state.unreadCount++;
            updateBadge();
            playNotification();
        }
        
        saveState();
        scrollToBottom();
    }
    
    // Render Message
    function renderMessage(message) {
        const container = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `chat-message ${message.type}`;
        
        const time = formatTime(message.time);
        let html = `
            <div class="message-bubble">${formatText(message.text)}</div>
            <span class="message-time">${time}</span>
        `;
        
        if (message.quickReplies && message.quickReplies.length > 0) {
            html += '<div class="quick-replies">';
            message.quickReplies.forEach(reply => {
                html += `<button class="quick-reply">${reply}</button>`;
            });
            html += '</div>';
        }
        
        div.innerHTML = html;
        container.appendChild(div);
    }
    
    // Process User Message (Bot AI)
    function processUserMessage(text) {
        const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        let matched = false;
        
        for (const [pattern, data] of Object.entries(BOT_RESPONSES)) {
            if (pattern === 'default') continue;
            
            const regex = new RegExp(pattern, 'i');
            if (regex.test(normalizedText)) {
                addBotMessage(data.response, data.quickReplies);
                
                if (data.action === 'requestLiveSupport') {
                    setTimeout(() => requestLiveSupport(), 1500);
                }
                
                matched = true;
                break;
            }
        }
        
        if (!matched) {
            const defaultResponse = BOT_RESPONSES['default'];
            addBotMessage(defaultResponse.response, defaultResponse.quickReplies);
        }
    }
    
    // Handle Quick Reply
    function handleQuickReply(text) {
        addUserMessage(text);
        
        // Si on est en mode live support, envoyer au support au lieu du bot
        if (state.mode === 'live' || state.mode === 'waiting') {
            sendToLiveSupport(text);
            return;
        }
        
        setTimeout(() => {
            showTyping();
            setTimeout(() => {
                hideTyping();
                
                // Mapping des quick replies vers les réponses
                const mappings = {
                    'Délais de livraison': 'délai de livraison',
                    'Suivi commande': 'suivre ma commande',
                    'Personnalisation': 'personnaliser',
                    'Parler à un conseiller': 'conseiller',
                    'Frais de livraison': 'frais de port',
                    'Autre question': 'autre question',
                    'Voir les créations': 'voir-creations',
                    'Commander maintenant': 'commander',
                    'Je n\'ai pas reçu d\'email': 'pas reçu',
                    'Signaler un problème': 'problème',
                    'Contact': 'contact',
                    'Prix': 'prix',
                    'FAQ': 'faq',
                    'Envoyer un email': 'contact',
                    'Retour au bot': 'retour-bot',
                    'Livraison internationale': 'international',
                    'Paiement sécurisé ?': 'sécurisé',
                    'Payer en plusieurs fois': 'plusieurs fois',
                    'Prix des néons': 'prix néon',
                    'Dimensions néons': 'dimension',
                    'Voir les néons': 'voir-creations',
                    'Voir les créations bois': 'voir-creations',
                    'Prix bois': 'prix bois',
                    'Aide personnalisation': 'personnaliser',
                    'Laisser un message': 'contact',
                    'Garantie': 'garantie'
                };
                
                const key = mappings[text];
                
                if (key === 'voir-creations') {
                    addBotMessage('Rendez-vous dans notre section créations pour découvrir tous nos produits personnalisables ! ✨\n\n👉 [Voir nos créations](#categories)', ['Autre question']);
                } else if (key === 'retour-bot') {
                    state.mode = 'bot';
                    updateHeader(null, false);
                    addBotMessage('Pas de problème ! Je suis là pour vous aider. Que souhaitez-vous savoir ?', ['Délais de livraison', 'Suivi commande', 'Prix', 'Personnalisation']);
                } else if (key === 'faq') {
                    addBotMessage('Voici les questions les plus fréquentes :', ['Délais de livraison', 'Frais de livraison', 'Personnalisation', 'Retours', 'Paiement']);
                } else if (key === 'prix néon') {
                    addBotMessage('Les néons LED commencent à partir de **79€**. Le prix final dépend de la taille et de la complexité du texte. Vous verrez le prix exact lors de la personnalisation ! 💡', ['Voir les néons', 'Autre question']);
                } else if (key === 'prix bois') {
                    addBotMessage('Les créations en bois commencent à partir de **49€**. Le prix varie selon la taille et le type de bois choisi. 🪵', ['Voir les créations bois', 'Autre question']);
                } else if (key) {
                    processUserMessage(key);
                } else {
                    // Si pas de mapping, traiter comme une question normale
                    processUserMessage(text);
                }
            }, 800);
        }, 300);
    }
    
    // Request Live Support
    function requestLiveSupport() {
        if (!state.userInfo) {
            showPreform();
        } else {
            initiateSupport();
        }
    }
    
    // Show Preform
    function showPreform() {
        state.mode = 'preform';
        const container = document.getElementById('chat-messages');
        
        const preform = document.createElement('div');
        preform.className = 'chat-preform';
        preform.id = 'chat-preform';
        preform.innerHTML = `
            <h4>Parler à un conseiller</h4>
            <p>Laissez-nous vos coordonnées pour que nous puissions vous répondre.</p>
            <input type="text" id="preform-name" placeholder="Votre prénom" required>
            <input type="email" id="preform-email" placeholder="Votre email" required>
            <button id="preform-submit">Démarrer la conversation</button>
        `;
        
        container.appendChild(preform);
        scrollToBottom();
        
        document.getElementById('preform-submit').addEventListener('click', submitPreform);
    }
    
    // Submit Preform
    function submitPreform() {
        const name = document.getElementById('preform-name').value.trim();
        const email = document.getElementById('preform-email').value.trim();
        
        if (!name || !email) {
            alert('Veuillez remplir tous les champs');
            return;
        }
        
        if (!/\S+@\S+\.\S+/.test(email)) {
            alert('Email invalide');
            return;
        }
        
        state.userInfo = { name, email };
        
        // Supprimer le formulaire
        const preform = document.getElementById('chat-preform');
        if (preform) preform.remove();
        
        initiateSupport();
    }
    
    // Initiate Live Support
    async function initiateSupport() {
        state.mode = 'waiting';
        
        const container = document.getElementById('chat-messages');
        const waiting = document.createElement('div');
        waiting.className = 'waiting-support';
        waiting.id = 'waiting-support';
        waiting.innerHTML = `
            <i class="fas fa-headset"></i>
            <h4>Connexion en cours...</h4>
            <p>Un conseiller va prendre en charge votre demande.</p>
        `;
        container.appendChild(waiting);
        scrollToBottom();
        
        // Créer la conversation dans Firebase
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            try {
                const db = firebase.firestore();
                
                const conversationData = {
                    userInfo: state.userInfo,
                    status: 'waiting',
                    messages: state.messages.map(m => ({
                        type: m.type,
                        text: m.text,
                        time: m.time instanceof Date ? m.time.toISOString() : m.time
                    })),
                    page: window.location.pathname,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                console.log('Creating conversation...', conversationData);
                
                const conversationRef = await db.collection('conversations').add(conversationData);
                
                console.log('Conversation created:', conversationRef.id);
                
                state.conversationId = conversationRef.id;
                saveState();
                
                // Écouter les réponses du support
                listenForMessages();
                
                // Message de confirmation
                setTimeout(() => {
                    const waitingEl = document.getElementById('waiting-support');
                    if (waitingEl) {
                        waitingEl.innerHTML = `
                            <i class="fas fa-check-circle" style="color: #4CAF50;"></i>
                            <h4>Demande envoyée !</h4>
                            <p>Un conseiller vous répondra très bientôt. Vous pouvez continuer à écrire.</p>
                        `;
                    }
                    state.mode = 'live';
                    updateHeader('Support', true);
                }, 1500);
                
            } catch (error) {
                console.error('Erreur création conversation:', error);
                console.error('Error code:', error.code);
                console.error('Error message:', error.message);
                
                // Remove waiting element
                const waitingEl = document.getElementById('waiting-support');
                if (waitingEl) waitingEl.remove();
                
                // Mode fallback - simuler une connexion
                fallbackSupport();
            }
        } else {
            console.log('Firebase not available, using fallback mode');
            fallbackSupport();
        }
    }
    
    // Fallback Support (when Firebase is unavailable)
    function fallbackSupport() {
        const waitingEl = document.getElementById('waiting-support');
        if (waitingEl) waitingEl.remove();
        
        state.mode = 'live';
        
        // Simuler un conseiller disponible
        setTimeout(() => {
            addBotMessage(`Merci ${state.userInfo.name} ! Notre équipe a bien reçu votre demande. 📩\n\nComme notre système de chat en direct n'est pas disponible pour le moment, nous vous répondrons par email à **${state.userInfo.email}** dans les plus brefs délais (généralement sous 24h).\n\nEn attendant, n'hésitez pas à consulter notre FAQ ou à nous envoyer un email directement.`, ['FAQ', 'Envoyer un email', 'Retour au bot']);
            updateHeader('Support', false);
        }, 1500);
    }
    
    // Listen for Messages (Firebase Realtime)
    function listenForMessages() {
        if (!state.conversationId) return;
        
        firebase.firestore()
            .collection('conversations')
            .doc(state.conversationId)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    
                    // Vérifier si le support a fermé la conversation
                    if (data.status === 'closed') {
                        handleConversationClosed();
                        return;
                    }
                    
                    // Vérifier si un agent a pris en charge
                    if (data.status === 'active' && state.mode === 'waiting') {
                        const waitingEl = document.getElementById('waiting-support');
                        if (waitingEl) waitingEl.remove();
                        
                        state.mode = 'live';
                        updateHeader(data.agentName || 'Support', true);
                    }
                    
                    // Nouveaux messages du support
                    if (data.messages && data.messages.length > state.messages.length) {
                        const newMessages = data.messages.slice(state.messages.length);
                        newMessages.forEach(msg => {
                            if (msg.type === 'support') {
                                addSupportMessage(msg.text, msg.agentName);
                            }
                        });
                    }
                } else {
                    // La conversation a été supprimée
                    handleConversationClosed();
                }
            });
    }
    
    // Handle Conversation Closed (by support)
    function handleConversationClosed() {
        // Réinitialiser l'état
        state.mode = 'bot';
        state.messages = [];
        state.conversationId = null;
        state.userInfo = null;
        
        // Vider le localStorage
        localStorage.removeItem('fc_chat_state');
        
        // Vider les messages affichés
        const container = document.getElementById('chat-messages');
        if (container) {
            container.innerHTML = '';
        }
        
        // Remettre le header en mode bot
        updateHeader(null, false);
        
        // Message de bienvenue après fermeture
        setTimeout(() => {
            addBotMessage('Merci pour votre échange avec notre équipe ! 😊 Comment puis-je vous aider ?', ['Délais de livraison', 'Suivi commande', 'Personnalisation', 'Parler à un conseiller']);
        }, 500);
    }
    
    // Send to Live Support
    async function sendToLiveSupport(text) {
        if (!state.conversationId) return;
        
        try {
            const conversationRef = firebase.firestore().collection('conversations').doc(state.conversationId);
            
            await conversationRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion({
                    type: 'user',
                    text: text,
                    time: new Date().toISOString()
                }),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Erreur envoi message:', error);
        }
    }
    
    // Update Header
    function updateHeader(name, isLive) {
        const avatar = document.querySelector('.chat-avatar');
        const info = document.querySelector('.chat-info h4');
        
        if (isLive) {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
            info.textContent = name;
        } else {
            avatar.innerHTML = '<i class="fas fa-robot"></i>';
            info.textContent = CONFIG.botName;
        }
    }
    
    // Typing Indicator
    function showTyping() {
        const container = document.getElementById('chat-messages');
        const typing = document.createElement('div');
        typing.className = 'typing-indicator';
        typing.id = 'typing-indicator';
        typing.innerHTML = '<span></span><span></span><span></span>';
        container.appendChild(typing);
        scrollToBottom();
    }
    
    function hideTyping() {
        const typing = document.getElementById('typing-indicator');
        if (typing) typing.remove();
    }
    
    // Utilities
    function formatTime(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    function formatText(text) {
        // Markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
    }
    
    function scrollToBottom() {
        const container = document.getElementById('chat-messages');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }
    
    function updateBadge() {
        const badge = document.getElementById('chat-badge');
        badge.textContent = state.unreadCount;
        badge.classList.toggle('show', state.unreadCount > 0);
    }
    
    function playNotification() {
        // Jouer le son de notification
        try {
            // Créer un son avec Web Audio API (pas besoin de fichier externe)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Son de notification doux
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            
            // Vibrer sur mobile si supporté
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
        } catch (e) {
            console.log('Audio notification not available');
        }
        
        // Faire clignoter le titre de la page
        flashTitle();
    }
    
    function flashTitle() {
        if (state.isOpen) return;
        
        const originalTitle = document.title;
        let isOriginal = true;
        let flashCount = 0;
        
        const flashInterval = setInterval(() => {
            document.title = isOriginal ? '💬 Nouveau message !' : originalTitle;
            isOriginal = !isOriginal;
            flashCount++;
            
            if (flashCount >= 10 || state.isOpen) {
                clearInterval(flashInterval);
                document.title = originalTitle;
            }
        }, 1000);
    }
    
    function isOnline() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        
        return CONFIG.workingHours.days.includes(day) &&
               hour >= CONFIG.workingHours.start &&
               hour < CONFIG.workingHours.end;
    }
    
    // State Management
    function saveState() {
        const toSave = {
            messages: state.messages.map(m => ({
                ...m,
                time: m.time instanceof Date ? m.time.toISOString() : m.time
            })),
            userInfo: state.userInfo,
            conversationId: state.conversationId
        };
        localStorage.setItem('fc_chat_state', JSON.stringify(toSave));
    }
    
    function loadState() {
        try {
            const saved = localStorage.getItem('fc_chat_state');
            if (saved) {
                const data = JSON.parse(saved);
                state.messages = (data.messages || []).map(m => ({
                    ...m,
                    time: new Date(m.time)
                }));
                state.userInfo = data.userInfo;
                state.conversationId = data.conversationId;
                
                // Re-render messages
                state.messages.forEach(renderMessage);
            }
        } catch (e) {
            console.error('Erreur chargement chat:', e);
        }
    }
    
    // Public API
    return {
        init,
        open: () => { if (!state.isOpen) toggleChat(); },
        close: () => { if (state.isOpen) toggleChat(); },
        sendMessage: (text) => {
            const input = document.getElementById('chat-input');
            input.value = text;
            sendMessage();
        }
    };
    
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    FCChat.init();
});
