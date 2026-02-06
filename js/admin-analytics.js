/* ============================================
   FAMILY CUSTOM - Admin Analytics Dashboard
   Charts, Funnel, Journeys, Top Pages
   ============================================ */

window.FCAdminAnalytics = (function() {
    'use strict';
    
    const db = window.FirebaseDB;
    if (!db) return { init: function() {} };
    
    let charts = {};
    let currentPeriod = 7;
    let initialized = false;
    
    // === INIT ===
    function init() {
        if (!initialized) {
            setupPeriodButtons();
            initialized = true;
        }
        loadAnalytics(currentPeriod);
    }
    
    function setupPeriodButtons() {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentPeriod = parseInt(this.dataset.period);
                loadAnalytics(currentPeriod);
            });
        });
    }
    
    // === LOAD ALL DATA ===
    async function loadAnalytics(days) {
        const dates = getLastNDays(days);
        
        try {
            // Fetch dailyStats for the period
            const statsPromises = dates.map(date => 
                db.collection('dailyStats').doc(date).get()
            );
            const statsDocs = await Promise.all(statsPromises);
            
            const dailyData = [];
            let totalViews = 0;
            let allVisitors = new Set();
            let allPages = {};
            let allDevices = { mobile: 0, tablet: 0, desktop: 0 };
            let allSources = {};
            let totalTime = 0;
            let timeCount = 0;
            
            statsDocs.forEach((doc, i) => {
                const data = doc.exists ? doc.data() : null;
                const views = data ? (data.totalViews || 0) : 0;
                const visitors = data && data.uniqueVisitors ? data.uniqueVisitors.length : 0;
                
                dailyData.push({
                    date: dates[i],
                    views: views,
                    visitors: visitors
                });
                
                totalViews += views;
                
                if (data && data.uniqueVisitors) {
                    data.uniqueVisitors.forEach(v => allVisitors.add(v));
                }
                
                if (data && data.pages) {
                    Object.entries(data.pages).forEach(([page, count]) => {
                        allPages[page] = (allPages[page] || 0) + count;
                    });
                }
                
                if (data && data.devices) {
                    Object.entries(data.devices).forEach(([device, count]) => {
                        if (allDevices[device] !== undefined) {
                            allDevices[device] += count;
                        }
                    });
                }
                
                if (data && data.sources) {
                    Object.entries(data.sources).forEach(([source, count]) => {
                        allSources[source] = (allSources[source] || 0) + count;
                    });
                }
                
                if (data && data.avgTime) {
                    Object.values(data.avgTime).forEach(t => {
                        if (t.total && t.count) {
                            totalTime += t.total;
                            timeCount += t.count;
                        }
                    });
                }
            });
            
            // Update stat cards
            document.getElementById('analytics-total-views').textContent = formatNumber(totalViews);
            document.getElementById('analytics-unique-visitors').textContent = formatNumber(allVisitors.size);
            
            const avgTime = timeCount > 0 ? Math.round(totalTime / timeCount) : 0;
            document.getElementById('analytics-avg-time').textContent = formatTime(avgTime);
            
            // Conversion rate: fetch orders for this period
            const startDateStr = dates[0] + 'T00:00:00';
            const ordersSnap = await db.collection('orders')
                .where('createdAt', '>=', startDateStr)
                .get();
            const orderCount = ordersSnap.size;
            const conversionRate = allVisitors.size > 0 ? ((orderCount / allVisitors.size) * 100).toFixed(1) : 0;
            document.getElementById('analytics-conversion-rate').textContent = conversionRate + '%';
            
            // Draw charts
            drawVisitorsTrend(dailyData);
            drawTrafficSources(allSources);
            drawDevices(allDevices);
            
            // Top pages
            drawTopPages(allPages);
            
            // Top products clicked
            await drawTopProducts();
            
            // Funnel
            await drawFunnel(days, allVisitors.size, allPages, orderCount);
            
            // Visitor journeys
            await drawVisitorJourneys();
            
        } catch (e) {
            console.error('Analytics load error:', e);
        }
    }
    
    // === CHARTS ===
    
    function drawVisitorsTrend(dailyData) {
        const ctx = document.getElementById('chart-visitors-trend');
        if (!ctx) return;
        
        if (charts.trend) charts.trend.destroy();
        
        const labels = dailyData.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        });
        
        charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Pages vues',
                    data: dailyData.map(d => d.views),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: currentPeriod <= 30 ? 3 : 0
                }, {
                    label: 'Visiteurs uniques',
                    data: dailyData.map(d => d.visitors),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: currentPeriod <= 30 ? 3 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
    
    function drawTrafficSources(sources) {
        const ctx = document.getElementById('chart-traffic-sources');
        if (!ctx) return;
        
        if (charts.sources) charts.sources.destroy();
        
        const sourceLabels = {
            direct: 'Direct',
            google: 'Google',
            facebook: 'Facebook',
            instagram: 'Instagram',
            tiktok: 'TikTok',
            pinterest: 'Pinterest',
            interne: 'Navigation interne',
            autre: 'Autre'
        };
        
        const colors = ['#3b82f6', '#ef4444', '#f59e0b', '#e91e8c', '#000000', '#e60023', '#6b7280', '#8b5cf6'];
        
        const entries = Object.entries(sources).sort((a, b) => b[1] - a[1]);
        
        charts.sources = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: entries.map(([k]) => sourceLabels[k] || k),
                datasets: [{
                    data: entries.map(([, v]) => v),
                    backgroundColor: colors.slice(0, entries.length)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
                }
            }
        });
    }
    
    function drawDevices(devices) {
        const ctx = document.getElementById('chart-devices');
        if (!ctx) return;
        
        if (charts.devices) charts.devices.destroy();
        
        charts.devices = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Mobile', 'Desktop', 'Tablet'],
                datasets: [{
                    data: [devices.mobile, devices.desktop, devices.tablet],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } }
                }
            }
        });
    }
    
    // === TOP PAGES ===
    function drawTopPages(pages) {
        const container = document.getElementById('top-pages-list');
        if (!container) return;
        
        const sorted = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
        
        const pageNames = {
            index: 'Accueil',
            categorie: 'Catégories',
            personnaliser: 'Personnalisation',
            panier: 'Panier',
            checkout: 'Checkout',
            contact: 'Contact',
            compte: 'Mon compte',
            'carte-cadeau': 'Carte cadeau',
            'suivi-commande': 'Suivi commande',
            faq: 'FAQ',
            success: 'Confirmation',
            retours: 'Retours'
        };
        
        container.innerHTML = sorted.map(([page, count]) => `
            <div class="analytics-list-item">
                <div class="analytics-list-info">
                    <span class="analytics-list-name">${pageNames[page] || page}</span>
                    <span class="analytics-list-count">${formatNumber(count)} vues</span>
                </div>
                <div class="analytics-list-bar">
                    <div class="analytics-list-bar-fill" style="width: ${(count / maxVal * 100).toFixed(0)}%"></div>
                </div>
            </div>
        `).join('');
    }
    
    // === TOP PRODUCTS ===
    async function drawTopProducts() {
        const container = document.getElementById('top-products-list');
        if (!container) return;
        
        try {
            const statsDoc = await db.collection('stats').doc('clicks').get();
            if (!statsDoc.exists) {
                container.innerHTML = '<p class="analytics-empty">Pas encore de données</p>';
                return;
            }
            
            const data = statsDoc.data();
            const products = data.products || {};
            const sorted = Object.entries(products).sort((a, b) => b[1] - a[1]).slice(0, 10);
            const maxVal = sorted.length > 0 ? sorted[0][1] : 1;
            
            container.innerHTML = sorted.map(([name, count]) => `
                <div class="analytics-list-item">
                    <div class="analytics-list-info">
                        <span class="analytics-list-name">${escapeHtml(name)}</span>
                        <span class="analytics-list-count">${formatNumber(count)} clics</span>
                    </div>
                    <div class="analytics-list-bar">
                        <div class="analytics-list-bar-fill bar-purple" style="width: ${(count / maxVal * 100).toFixed(0)}%"></div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = '<p class="analytics-empty">Erreur de chargement</p>';
        }
    }
    
    // === FUNNEL ===
    async function drawFunnel(days, uniqueVisitors, pages, orderCount) {
        // Visiteurs
        const visitors = uniqueVisitors;
        
        // Pages produit = personnaliser views
        const productViews = pages['personnaliser'] || 0;
        
        // Add to cart events
        let addToCartCount = 0;
        try {
            const startDateISO = getLastNDays(days)[0] + 'T00:00:00';
            const eventsSnap = await db.collection('events')
                .where('event', '==', 'add_to_cart')
                .where('timestamp', '>=', startDateISO)
                .get();
            addToCartCount = eventsSnap.size;
        } catch (e) {
            // Events collection may not exist yet or needs composite index
            // Try counting from dailyStats instead
            console.log('Events query fallback:', e.message);
        }
        
        // Checkout views
        const checkoutViews = pages['checkout'] || 0;
        
        // Paid orders
        const paidOrders = orderCount;
        
        // Update funnel bars and values
        const steps = [
            { id: 'visitors', val: visitors },
            { id: 'products', val: productViews },
            { id: 'carts', val: addToCartCount },
            { id: 'checkouts', val: checkoutViews },
            { id: 'paid', val: paidOrders }
        ];
        
        const maxVal = steps[0].val || 1;
        
        steps.forEach((step, i) => {
            const bar = document.getElementById(`funnel-${step.id}`);
            const valEl = document.getElementById(`funnel-${step.id}-val`);
            if (bar) bar.style.width = Math.max((step.val / maxVal) * 100, 8) + '%';
            if (valEl) valEl.textContent = formatNumber(step.val);
            
            // Drop percentage
            if (i > 0) {
                const dropEl = document.getElementById(`funnel-drop-${i}`);
                if (dropEl) {
                    const prev = steps[i - 1].val;
                    const drop = prev > 0 ? (((prev - step.val) / prev) * 100).toFixed(0) : 0;
                    dropEl.textContent = `-${drop}%`;
                }
            }
        });
    }
    
    // === VISITOR JOURNEYS ===
    async function drawVisitorJourneys() {
        const container = document.getElementById('visitor-journeys');
        if (!container) return;
        
        try {
            // Get last 50 page views, grouped by visitor
            const snap = await db.collection('pageViews')
                .orderBy('timestamp', 'desc')
                .limit(200)
                .get();
            
            if (snap.empty) {
                container.innerHTML = '<p class="analytics-empty">Pas encore de données</p>';
                return;
            }
            
            // Group by visitorId
            const journeys = {};
            snap.forEach(doc => {
                const data = doc.data();
                const vid = data.visitorId;
                if (!journeys[vid]) journeys[vid] = [];
                journeys[vid].push({
                    page: data.page,
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                });
            });
            
            // Sort each journey chronologically and take top 10 visitors
            const sortedJourneys = Object.entries(journeys)
                .map(([vid, pages]) => ({
                    vid: vid.substring(0, 8),
                    pages: pages.sort((a, b) => a.timestamp - b.timestamp).map(p => p.page),
                    lastSeen: pages[pages.length - 1].timestamp
                }))
                .sort((a, b) => b.lastSeen - a.lastSeen)
                .slice(0, 10);
            
            const pageNames = {
                index: 'Accueil',
                categorie: 'Catégories',
                personnaliser: 'Produit',
                panier: 'Panier',
                checkout: 'Checkout',
                success: 'Achat ✓',
                contact: 'Contact',
                compte: 'Compte',
                'carte-cadeau': 'Carte cadeau',
                faq: 'FAQ'
            };
            
            const pageColors = {
                index: '#6b7280',
                categorie: '#3b82f6',
                personnaliser: '#8b5cf6',
                panier: '#f59e0b',
                checkout: '#ef4444',
                success: '#10b981',
                contact: '#6b7280',
                compte: '#6b7280'
            };
            
            container.innerHTML = sortedJourneys.map(j => `
                <div class="journey-row">
                    <span class="journey-visitor"><i class="fas fa-user"></i> ${j.vid}...</span>
                    <div class="journey-path">
                        ${j.pages.map(p => `<span class="journey-step" style="background: ${pageColors[p] || '#6b7280'}">${pageNames[p] || p}</span>`).join('<i class="fas fa-arrow-right journey-arrow"></i>')}
                    </div>
                    <span class="journey-time">${timeAgo(j.lastSeen)}</span>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = '<p class="analytics-empty">Erreur de chargement</p>';
        }
    }
    
    // === HELPERS ===
    function getLastNDays(n) {
        const dates = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }
    
    function formatNumber(n) {
        if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
        return n.toString();
    }
    
    function formatTime(seconds) {
        if (seconds < 60) return seconds + 's';
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return min + 'm ' + sec + 's';
    }
    
    function timeAgo(date) {
        const diff = Date.now() - date.getTime();
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'à l\'instant';
        if (min < 60) return `il y a ${min}min`;
        const hours = Math.floor(min / 60);
        if (hours < 24) return `il y a ${hours}h`;
        const days = Math.floor(hours / 24);
        return `il y a ${days}j`;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    return { init: init };
})();
