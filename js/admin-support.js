/* ============================================
   FAMILY CUSTOM - Admin Support Module
   ============================================ */

const AdminSupport = (function() {
    
    let state = {
        conversations: [],
        currentConversation: null,
        currentFilter: 'waiting',
        unsubscribe: null,
        agentName: localStorage.getItem('supportAgentName') || 'Support'
    };
    
    // Réponses pré-enregistrées
    const CANNED_RESPONSES = [
        {
            label: '👋 Bonjour',
            text: 'Bonjour ! Je suis {agent}, comment puis-je vous aider ?'
        },
        {
            label: '⏳ Délai',
            text: 'Nos délais de fabrication sont de 5 à 10 jours ouvrés. Votre commande sera expédiée dès qu\'elle sera prête !'
        },
        {
            label: '📦 Expédition',
            text: 'Votre commande a été expédiée ! Vous recevrez un email avec le numéro de suivi très prochainement.'
        },
        {
            label: '🔍 Vérification',
            text: 'Je vérifie cela pour vous, un instant s\'il vous plaît...'
        },
        {
            label: '✅ Résolu',
            text: 'Parfait, je suis content d\'avoir pu vous aider ! N\'hésitez pas si vous avez d\'autres questions.'
        },
        {
            label: '📧 Email',
            text: 'Je vous envoie les détails par email à l\'adresse que vous nous avez indiquée.'
        },
        {
            label: '💰 Remboursement',
            text: 'Votre demande de remboursement a bien été prise en compte. Le montant sera crédité sous 5 à 7 jours ouvrés.'
        },
        {
            label: '🎁 Promo',
            text: 'En guise de geste commercial, je vous offre un code promo de 10% pour votre prochaine commande : MERCI10'
        },
        {
            label: '👋 Au revoir',
            text: 'Merci pour votre confiance ! Bonne journée et à bientôt sur Family Custom. 😊'
        }
    ];
    
    let initialized = false;
    
    // Initialize
    function init() {
        if (initialized) {
            console.log('AdminSupport déjà initialisé');
            return;
        }
        
        if (typeof firebase === 'undefined' || !firebase.firestore) {
            console.warn('Firebase non disponible pour le support');
            return;
        }
        
        console.log('Initialisation AdminSupport...');
        initialized = true;
        
        bindEvents();
        loadConversations();
        listenForNewConversations();
        
        console.log('AdminSupport initialisé avec succès');
    }
    
    // Bind Events
    function bindEvents() {
        // Tab buttons
        document.querySelectorAll('.support-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.support-tabs .tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.currentFilter = btn.dataset.status;
                renderConversations();
            });
        });
        
        // Chat modal
        const chatModal = document.getElementById('chat-modal');
        const chatClose = document.getElementById('chat-modal-close');
        const closeConvBtn = document.getElementById('close-conversation-btn');
        const chatInput = document.getElementById('admin-chat-input');
        const chatSend = document.getElementById('admin-chat-send');
        
        if (chatClose) {
            chatClose.addEventListener('click', closeChatModal);
        }
        
        if (closeConvBtn) {
            closeConvBtn.addEventListener('click', closeCurrentConversation);
        }
        
        // Delete button
        const deleteConvBtn = document.getElementById('delete-conversation-btn');
        if (deleteConvBtn) {
            deleteConvBtn.addEventListener('click', deleteCurrentConversation);
        }
        
        if (chatSend) {
            chatSend.addEventListener('click', sendAdminMessage);
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') sendAdminMessage();
            });
        }
        
        // Agent name input
        const agentNameInput = document.getElementById('agent-name-input');
        if (agentNameInput) {
            agentNameInput.value = state.agentName;
            agentNameInput.addEventListener('change', (e) => {
                state.agentName = e.target.value.trim() || 'Support';
                localStorage.setItem('supportAgentName', state.agentName);
            });
        }
        
        // Canned responses clicks (delegation)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('canned-response-btn')) {
                const index = parseInt(e.target.dataset.index);
                if (CANNED_RESPONSES[index]) {
                    useCannedResponse(CANNED_RESPONSES[index].text);
                }
            }
        });
        
        // Click outside modal to close
        if (chatModal) {
            chatModal.addEventListener('click', (e) => {
                if (e.target === chatModal) closeChatModal();
            });
        }
    }
    
    // Load Conversations
    async function loadConversations() {
        try {
            const snapshot = await firebase.firestore()
                .collection('conversations')
                .orderBy('updatedAt', 'desc')
                .get();
            
            state.conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            renderConversations();
            updateBadge();
            
        } catch (error) {
            console.error('Erreur chargement conversations:', error);
        }
    }
    
    // Listen for New Conversations
    function listenForNewConversations() {
        state.unsubscribe = firebase.firestore()
            .collection('conversations')
            .orderBy('updatedAt', 'desc')
            .onSnapshot((snapshot) => {
                state.conversations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                renderConversations();
                updateBadge();
                
                // Update current conversation if open
                if (state.currentConversation) {
                    const updated = state.conversations.find(c => c.id === state.currentConversation.id);
                    if (updated) {
                        state.currentConversation = updated;
                        renderChatMessages();
                    }
                }
            });
    }
    
    // Render Conversations
    function renderConversations() {
        const container = document.getElementById('conversations-list');
        if (!container) return;
        
        const filtered = state.conversations.filter(c => c.status === state.currentFilter);
        
        // Update counts
        const waitingCount = state.conversations.filter(c => c.status === 'waiting').length;
        const activeCount = state.conversations.filter(c => c.status === 'active').length;
        
        const waitingEl = document.getElementById('waiting-count');
        const activeEl = document.getElementById('active-count');
        
        if (waitingEl) waitingEl.textContent = waitingCount;
        if (activeEl) activeEl.textContent = activeCount;
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-headset"></i>
                    <h3>Aucune conversation</h3>
                    <p>${getEmptyMessage(state.currentFilter)}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filtered.map(conv => {
            const lastMessage = conv.messages && conv.messages.length > 0 
                ? conv.messages[conv.messages.length - 1] 
                : null;
            
            const time = conv.updatedAt 
                ? formatTime(conv.updatedAt.toDate ? conv.updatedAt.toDate() : new Date(conv.updatedAt))
                : '';
            
            return `
                <div class="conversation-card ${conv.status}" data-id="${conv.id}">
                    <div class="conversation-header">
                        <div class="conversation-user">
                            <i class="fas fa-user-circle"></i>
                            ${conv.userInfo?.name || 'Visiteur'}
                        </div>
                        <span class="conversation-time">${time}</span>
                    </div>
                    <div class="conversation-email">
                        <i class="fas fa-envelope"></i> ${conv.userInfo?.email || 'Non renseigné'}
                    </div>
                    <div class="conversation-preview">
                        ${lastMessage ? truncate(lastMessage.text, 80) : 'Nouvelle conversation'}
                    </div>
                    <div class="conversation-footer">
                        <span class="conversation-status ${conv.status}">
                            ${getStatusLabel(conv.status)}
                        </span>
                        <span class="conversation-count">
                            <i class="fas fa-comment"></i> ${conv.messages?.length || 0}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Bind click events
        container.querySelectorAll('.conversation-card').forEach(card => {
            card.addEventListener('click', () => openConversation(card.dataset.id));
        });
    }
    
    // Open Conversation
    function openConversation(id) {
        const conv = state.conversations.find(c => c.id === id);
        if (!conv) return;
        
        state.currentConversation = conv;
        
        // Update modal
        const modal = document.getElementById('chat-modal');
        const userEl = document.getElementById('chat-modal-user');
        
        if (userEl) {
            userEl.textContent = `${conv.userInfo?.name || 'Visiteur'} - ${conv.userInfo?.email || ''}`;
        }
        
        renderChatMessages();
        
        if (modal) {
            modal.classList.add('active');
        }
        
        // Mark as active if waiting
        if (conv.status === 'waiting') {
            takeConversation(id);
        }
    }
    
    // Take Conversation
    async function takeConversation(id) {
        try {
            await firebase.firestore()
                .collection('conversations')
                .doc(id)
                .update({
                    status: 'active',
                    agentName: state.agentName,
                    takenAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            // Send system message
            addSystemMessage(id, `${state.agentName} a pris en charge cette conversation.`);
            
        } catch (error) {
            console.error('Erreur prise en charge:', error);
        }
    }
    
    // Render Chat Messages
    function renderChatMessages() {
        const container = document.getElementById('chat-modal-messages');
        if (!container || !state.currentConversation) return;
        
        const messages = state.currentConversation.messages || [];
        
        container.innerHTML = messages.map(msg => {
            const time = formatTime(new Date(msg.time));
            const type = msg.type === 'user' ? 'user' : 'support';
            
            return `
                <div class="chat-message ${type}">
                    <div class="message-bubble">${formatText(msg.text)}</div>
                    <span class="message-time">${msg.agentName ? msg.agentName + ' • ' : ''}${time}</span>
                </div>
            `;
        }).join('');
        
        // Render canned responses
        renderCannedResponses();
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }
    
    // Render Canned Responses
    function renderCannedResponses() {
        const container = document.getElementById('canned-responses');
        if (!container) return;
        
        container.innerHTML = CANNED_RESPONSES.map((resp, index) => 
            `<button class="canned-response-btn" data-index="${index}">${resp.label}</button>`
        ).join('');
    }
    
    // Use Canned Response
    function useCannedResponse(text) {
        const input = document.getElementById('admin-chat-input');
        if (!input) return;
        
        // Replace {agent} with actual agent name
        const formattedText = text.replace('{agent}', state.agentName);
        input.value = formattedText;
        input.focus();
    }
    
    // Send Admin Message
    async function sendAdminMessage() {
        const input = document.getElementById('admin-chat-input');
        if (!input || !state.currentConversation) return;
        
        const text = input.value.trim();
        if (!text) return;
        
        input.value = '';
        input.disabled = true;
        
        try {
            const message = {
                type: 'support',
                text: text,
                agentName: state.agentName,
                time: new Date().toISOString()
            };
            
            await firebase.firestore()
                .collection('conversations')
                .doc(state.currentConversation.id)
                .update({
                    messages: firebase.firestore.FieldValue.arrayUnion(message),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
        } catch (error) {
            console.error('Erreur envoi message:', error);
            showToast('Erreur lors de l\'envoi', 'error');
        } finally {
            input.disabled = false;
            input.focus();
        }
    }
    
    // Add System Message
    async function addSystemMessage(id, text) {
        try {
            await firebase.firestore()
                .collection('conversations')
                .doc(id)
                .update({
                    messages: firebase.firestore.FieldValue.arrayUnion({
                        type: 'system',
                        text: text,
                        time: new Date().toISOString()
                    })
                });
        } catch (error) {
            console.error('Erreur message système:', error);
        }
    }
    
    // Close Current Conversation
    async function closeCurrentConversation() {
        if (!state.currentConversation) return;
        
        if (!confirm('Fermer cette conversation ?')) return;
        
        try {
            await firebase.firestore()
                .collection('conversations')
                .doc(state.currentConversation.id)
                .update({
                    status: 'closed',
                    closedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            closeChatModal();
            showToast('Conversation fermée', 'success');
            
        } catch (error) {
            console.error('Erreur fermeture:', error);
            showToast('Erreur lors de la fermeture', 'error');
        }
    }
    
    // Close Chat Modal
    function closeChatModal() {
        const modal = document.getElementById('chat-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        state.currentConversation = null;
    }
    
    // Delete Current Conversation
    async function deleteCurrentConversation() {
        if (!state.currentConversation) return;
        
        if (!confirm('Supprimer définitivement cette conversation ? Cette action est irréversible.')) return;
        
        try {
            await firebase.firestore()
                .collection('conversations')
                .doc(state.currentConversation.id)
                .delete();
            
            closeChatModal();
            showToast('Conversation supprimée', 'success');
            
        } catch (error) {
            console.error('Erreur suppression:', error);
            showToast('Erreur lors de la suppression', 'error');
        }
    }
    
    // Update Badge
    function updateBadge() {
        const badge = document.getElementById('support-badge');
        if (!badge) return;
        
        const waitingCount = state.conversations.filter(c => c.status === 'waiting').length;
        
        badge.textContent = waitingCount;
        badge.style.display = waitingCount > 0 ? 'inline-flex' : 'none';
    }
    
    // Utilities
    function formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'À l\'instant';
        if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
    
    function formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\n/g, '<br>');
    }
    
    function truncate(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
    
    function getStatusLabel(status) {
        const labels = {
            'waiting': '<i class="fas fa-clock"></i> En attente',
            'active': '<i class="fas fa-comments"></i> En cours',
            'closed': '<i class="fas fa-check-circle"></i> Fermée'
        };
        return labels[status] || status;
    }
    
    function getEmptyMessage(filter) {
        const messages = {
            'waiting': 'Les nouvelles demandes de support apparaîtront ici',
            'active': 'Aucune conversation active',
            'closed': 'Aucune conversation fermée'
        };
        return messages[filter] || '';
    }
    
    function showToast(message, type = 'info') {
        // Use existing toast system if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    // Cleanup
    function destroy() {
        if (state.unsubscribe) {
            state.unsubscribe();
        }
    }
    
    return {
        init,
        destroy
    };
    
})();
