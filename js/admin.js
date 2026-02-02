/* ============================================
   FAMILY CUSTOM - Admin Panel JavaScript (Firebase)
   ============================================ */

(function() {
    'use strict';
    
    // ===== Firebase References =====
    const db = window.FirebaseDB;
    const auth = window.FirebaseAuth;
    
    // ===== State =====
    let categories = [];
    let products = [];
    let orders = [];
    let currentEditId = null;
    let currentOrderId = null;
    let currentCategoryImageUrl = null;
    let isLoading = false;
    
    // ===== DOM Elements =====
    const elements = {
        loginScreen: document.getElementById('login-screen'),
        dashboard: document.getElementById('admin-dashboard'),
        loginForm: document.getElementById('login-form'),
        loginEmail: document.getElementById('login-email'),
        loginPassword: document.getElementById('login-password'),
        loginError: document.getElementById('login-error'),
        logoutBtn: document.getElementById('logout-btn'),
        pageTitle: document.getElementById('page-title'),
        dateDisplay: document.querySelector('.date-display'),
        navItems: document.querySelectorAll('.nav-item'),
        sections: document.querySelectorAll('.section'),
        statCategories: document.getElementById('stat-categories'),
        statProducts: document.getElementById('stat-products'),
        statVisitors: document.getElementById('stat-visitors'),
        statClicks: document.getElementById('stat-clicks'),
        categoryClicksList: document.getElementById('category-clicks-list'),
        productClicksList: document.getElementById('product-clicks-list'),
        categoriesTableBody: document.getElementById('categories-table-body'),
        btnAddCategory: document.getElementById('btn-add-category'),
        modalCategory: document.getElementById('modal-category'),
        categoryForm: document.getElementById('category-form'),
        productsGrid: document.getElementById('products-grid'),
        btnAddProduct: document.getElementById('btn-add-product'),
        filterCategory: document.getElementById('filter-category'),
        modalProduct: document.getElementById('modal-product'),
        productForm: document.getElementById('product-form'),
        productCategorySelect: document.getElementById('product-category'),
        productImageUrl: document.getElementById('product-image-url'),
        productImagesContainer: document.getElementById('product-images-container'),
        btnAddImage: document.getElementById('btn-add-image'),
        uploadImageFile: document.getElementById('upload-image-file'),
        imagePreview: document.getElementById('image-preview'),
        passwordForm: document.getElementById('password-form'),
        btnExport: document.getElementById('btn-export'),
        categoryIcon: document.getElementById('category-icon'),
        iconPreview: document.querySelector('.icon-preview'),
        toastContainer: document.getElementById('toast-container'),
        // Orders
        ordersTableBody: document.getElementById('orders-table-body'),
        filterOrderStatus: document.getElementById('filter-order-status'),
        btnRefreshOrders: document.getElementById('btn-refresh-orders'),
        btnExportOrders: document.getElementById('btn-export-orders'),
        modalOrder: document.getElementById('modal-order'),
        orderDetailsContent: document.getElementById('order-details-content'),
        orderStatusSelect: document.getElementById('order-status-select'),
        btnUpdateOrderStatus: document.getElementById('btn-update-order-status')
    };
    
    // Product images array
    let productImages = [];
    
    // NOTE: viewOrder et deleteOrder sont définis plus bas dans le fichier
    // et exposés globalement via window.viewOrder = viewOrder

    // ===== Utility Functions =====
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Render customer images (single or array) for admin view
    function renderAdminCustomerImages(customerImage) {
        if (!customerImage) return '-';
        
        // If it's an array of images
        if (Array.isArray(customerImage)) {
            const validImages = customerImage.filter(img => img);
            if (validImages.length === 0) return '-';
            
            return validImages.map((img, i) => 
                `<a href="${img}" target="_blank" class="customer-img-link"><img src="${img}" alt="Photo ${i + 1}" class="order-customer-img"></a>`
            ).join(' ');
        }
        
        // Single image (string)
        return `<a href="${customerImage}" target="_blank" class="customer-img-link"><img src="${customerImage}" alt="Photo client" class="order-customer-img"></a>`;
    }
    
    function slugify(text) {
        return text.toString().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }
    
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : 'exclamation-circle'}"></i> ${message}`;
        elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    function showLoading(show) {
        isLoading = show;
        document.body.style.cursor = show ? 'wait' : 'default';
    }
    
    // ===== Product Images Management =====
    
    function addProductImage(url) {
        if (!url || !url.trim()) return;
        url = url.trim();
        
        // Vérifier si l'URL est déjà ajoutée
        if (productImages.includes(url)) {
            showToast('Cette image est déjà ajoutée', 'error');
            return;
        }
        
        productImages.push(url);
        renderProductImages();
        elements.productImageUrl.value = '';
    }
    
    function removeProductImage(index) {
        productImages.splice(index, 1);
        renderProductImages();
    }
    
    // Exposer pour les onclick inline
    window.FCAdmin = window.FCAdmin || {};
    window.FCAdmin.removeProductImage = removeProductImage;
    
    function renderProductImages() {
        if (!elements.productImagesContainer) return;
        
        elements.productImagesContainer.innerHTML = productImages.map((url, index) => `
            <div class="product-image-item ${index === 0 ? 'main' : ''}" data-index="${index}">
                <img src="${url}" alt="Image ${index + 1}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect fill=%22%23ccc%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22%3EErreur%3C/text%3E%3C/svg%3E'">
                ${index === 0 ? '<span class="image-badge">Principale</span>' : ''}
                <button type="button" class="remove-image-btn" onclick="FCAdmin.removeProductImage(${index})"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }
    
    // ===== UPLOAD IMAGE TO IMGUR (fonctionne depuis navigateur) =====
    
    // Client ID Imgur pour uploads anonymes (gratuit)
    const IMGUR_CLIENT_ID = 'fc062ce5a6b4253';
    
    async function uploadImageToPostImages(file) {
        const progressEl = document.getElementById('upload-progress');
        const progressFill = progressEl?.querySelector('.progress-fill');
        const progressText = progressEl?.querySelector('.progress-text');
        
        if (!file) return null;
        
        // Vérifier le type de fichier
        if (!file.type.startsWith('image/')) {
            showToast('Veuillez sélectionner une image', 'error');
            return null;
        }
        
        // Vérifier la taille (max 20MB pour Imgur)
        if (file.size > 20 * 1024 * 1024) {
            showToast('Image trop lourde (max 20MB)', 'error');
            return null;
        }
        
        // Afficher la progression
        if (progressEl) {
            progressEl.classList.remove('hidden', 'success', 'error');
            if (progressFill) progressFill.style.width = '30%';
            if (progressText) progressText.textContent = 'Upload en cours...';
        }
        
        try {
            // Convertir en base64
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            
            if (progressFill) progressFill.style.width = '50%';
            
            // Upload vers Imgur
            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64,
                    type: 'base64'
                })
            });
            
            if (progressFill) progressFill.style.width = '80%';
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.link) {
                const imageUrl = result.data.link;
                
                if (progressEl) {
                    progressEl.classList.add('success');
                    if (progressFill) progressFill.style.width = '100%';
                    if (progressText) progressText.textContent = 'Upload réussi !';
                }
                
                // Ajouter l'image au produit
                addProductImage(imageUrl);
                showToast('Image uploadée !', 'success');
                
                // Cacher après 2s
                setTimeout(() => {
                    progressEl?.classList.add('hidden');
                }, 2000);
                
                return imageUrl;
            } else {
                throw new Error(result.data?.error || 'Erreur Imgur');
            }
        } catch (error) {
            console.error('Upload error:', error);
            
            if (progressEl) {
                progressEl.classList.add('error');
                if (progressText) progressText.textContent = 'Erreur: ' + error.message;
            }
            
            showToast('Erreur d\'upload: ' + error.message, 'error');
            
            setTimeout(() => {
                progressEl?.classList.add('hidden');
            }, 3000);
            
            return null;
        }
    }
    
    // Exposer la fonction d'upload
    window.FCAdmin.uploadImage = uploadImageToPostImages;
    
    // ===== IMPORT PRODUCT FROM URL =====
    
    async function importProductFromUrl() {
        const urlInput = document.getElementById('import-product-url');
        const statusEl = document.getElementById('import-status');
        const url = urlInput.value.trim();
        
        if (!url) {
            showToast('Veuillez coller une URL', 'error');
            return;
        }
        
        // Show loading
        statusEl.className = 'import-status loading';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Récupération des informations...';
        
        try {
            // Try multiple CORS proxies
            const proxies = [
                'https://api.allorigins.win/raw?url=',
                'https://corsproxy.io/?',
                'https://api.codetabs.com/v1/proxy?quest='
            ];
            
            let html = null;
            let lastError = null;
            
            for (const proxy of proxies) {
                try {
                    const response = await fetch(proxy + encodeURIComponent(url), {
                        headers: {
                            'Accept': 'text/html'
                        }
                    });
                    if (response.ok) {
                        html = await response.text();
                        if (html && html.length > 1000) break;
                    }
                } catch (e) {
                    lastError = e;
                    continue;
                }
            }
            
            if (!html || html.length < 500) {
                throw new Error('Impossible de récupérer la page. Essayez de copier manuellement.');
            }
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Detect site and extract accordingly
            let productData;
            if (url.includes('aliexpress')) {
                productData = extractAliExpressData(html, doc, url);
            } else if (url.includes('amazon')) {
                productData = extractAmazonData(doc, url);
            } else {
                productData = extractGenericData(doc, url);
            }
            
            if (!productData.name && !productData.description && productData.images.length === 0) {
                throw new Error('Aucune information trouvée. Ce site bloque peut-être l\'import automatique.');
            }
            
            // Fill the form
            if (productData.name) {
                document.getElementById('product-name').value = productData.name;
            }
            if (productData.description) {
                document.getElementById('product-description').value = productData.description;
            }
            if (productData.price) {
                document.getElementById('product-price').value = productData.price;
            }
            
            // Add images
            if (productData.images && productData.images.length > 0) {
                productImages = [...productData.images];
                renderProductImages();
            }
            
            // Success
            statusEl.className = 'import-status success';
            statusEl.innerHTML = '<i class="fas fa-check"></i> Informations importées ! Vérifiez et ajustez si nécessaire.';
            urlInput.value = '';
            
            showToast('Produit importé avec succès !');
            
        } catch (error) {
            console.error('Import error:', error);
            statusEl.className = 'import-status error';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + (error.message || 'Erreur lors de l\'import');
        }
    }
    
    // Extract data from AliExpress
    function extractAliExpressData(html, doc, sourceUrl) {
        const data = {
            name: '',
            description: '',
            price: '',
            images: []
        };
        
        // AliExpress stores data in JSON within script tags
        // Try to find window.runParams or similar
        const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
        
        for (const script of scripts) {
            // Look for product data JSON
            const dataMatch = script.match(/("subject"|"title"|"productTitle")\s*:\s*"([^"]+)"/i);
            if (dataMatch && !data.name) {
                data.name = dataMatch[2];
            }
            
            // Look for description
            const descMatch = script.match(/("description"|"productDescription")\s*:\s*"([^"]+)"/i);
            if (descMatch && !data.description) {
                data.description = descMatch[2].replace(/\\n/g, ' ').replace(/\\"/g, '"');
            }
            
            // Look for price
            const priceMatch = script.match(/("formattedPrice"|"minPrice"|"activityAmount")\s*:\s*"?([0-9.,]+)/i);
            if (priceMatch && !data.price) {
                data.price = priceMatch[2] + '€';
            }
            
            // Look for images in JSON
            const imgMatches = script.matchAll(/"(https?:\/\/[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
            for (const match of imgMatches) {
                let imgUrl = match[1].replace(/\\u002F/g, '/');
                if (imgUrl.includes('alicdn.com') && !imgUrl.includes('icon') && !imgUrl.includes('avatar') && data.images.length < 6) {
                    // Clean up the URL
                    imgUrl = imgUrl.split('_')[0] + imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[0] || imgUrl;
                    if (!data.images.includes(imgUrl)) {
                        data.images.push(imgUrl);
                    }
                }
            }
        }
        
        // Fallback to meta tags
        if (!data.name) {
            data.name = doc.querySelector('meta[property="og:title"]')?.content ||
                       doc.querySelector('title')?.textContent || '';
            data.name = data.name.split('|')[0].split('-')[0].trim();
        }
        
        if (!data.description) {
            data.description = doc.querySelector('meta[property="og:description"]')?.content ||
                              doc.querySelector('meta[name="description"]')?.content || '';
        }
        
        // Get OG image as fallback
        if (data.images.length === 0) {
            const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
            if (ogImage) data.images.push(ogImage);
        }
        
        // Clean up name
        if (data.name.length > 100) data.name = data.name.substring(0, 100);
        if (data.description.length > 500) data.description = data.description.substring(0, 500);
        
        return data;
    }
    
    // Extract data from Amazon
    function extractAmazonData(doc, sourceUrl) {
        const data = {
            name: '',
            description: '',
            price: '',
            images: []
        };
        
        data.name = doc.querySelector('#productTitle')?.textContent?.trim() ||
                   doc.querySelector('meta[property="og:title"]')?.content || '';
        
        data.description = doc.querySelector('#productDescription')?.textContent?.trim() ||
                          doc.querySelector('#feature-bullets')?.textContent?.trim() ||
                          doc.querySelector('meta[name="description"]')?.content || '';
        
        const priceEl = doc.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice');
        if (priceEl) data.price = priceEl.textContent.trim();
        
        // Images
        const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
        if (ogImage) data.images.push(ogImage);
        
        doc.querySelectorAll('#altImages img, #imageBlock img').forEach(img => {
            let src = img.src || img.dataset.src;
            if (src && !src.includes('sprite') && data.images.length < 5) {
                // Get larger version
                src = src.replace(/\._.*_\./, '.');
                if (!data.images.includes(src)) data.images.push(src);
            }
        });
        
        return data;
    }
    
    // Generic extractor for other sites
    function extractGenericData(doc, sourceUrl) {
        const data = {
            name: '',
            description: '',
            price: '',
            images: []
        };
        
        // Try different meta tags for title
        data.name = 
            doc.querySelector('meta[property="og:title"]')?.content ||
            doc.querySelector('meta[name="twitter:title"]')?.content ||
            doc.querySelector('h1')?.textContent?.trim() ||
            doc.querySelector('title')?.textContent?.trim() || '';
        
        // Clean up the name
        data.name = data.name.split('|')[0].split('-')[0].split('–')[0].trim();
        if (data.name.length > 100) data.name = data.name.substring(0, 100);
        
        // Try different meta tags for description
        data.description = 
            doc.querySelector('meta[property="og:description"]')?.content ||
            doc.querySelector('meta[name="description"]')?.content ||
            doc.querySelector('meta[name="twitter:description"]')?.content || '';
        
        data.description = data.description.trim();
        if (data.description.length > 500) data.description = data.description.substring(0, 500) + '...';
        
        // Try to get price
        const priceEl = doc.querySelector('[class*="price"], [data-price], .product-price');
        if (priceEl) {
            const priceText = priceEl.textContent.trim();
            const priceMatch = priceText.match(/[\d,.]+/);
            if (priceMatch) {
                data.price = priceMatch[0].replace(',', '.') + '€';
            }
        }
        
        // Get images
        const ogImage = doc.querySelector('meta[property="og:image"]')?.content;
        if (ogImage) data.images.push(ogImage);
        
        // Try to get more product images
        const imgSelectors = [
            'img[class*="product"]',
            'img[class*="gallery"]',
            '.product-image img',
            '.gallery img',
            '[class*="slider"] img',
            '[class*="carousel"] img'
        ];
        
        imgSelectors.forEach(selector => {
            doc.querySelectorAll(selector).forEach(img => {
                let src = img.src || img.dataset.src || img.dataset.lazySrc;
                if (src && !data.images.includes(src) && data.images.length < 5) {
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (src.startsWith('/')) {
                        const urlObj = new URL(sourceUrl);
                        src = urlObj.origin + src;
                    }
                    if (src.startsWith('http') && !src.includes('placeholder') && !src.includes('icon')) {
                        data.images.push(src);
                    }
                }
            });
        });
        
        return data;
    }
    
    // Import from pasted content (for AliExpress and blocked sites)
    function importFromPastedContent() {
        const content = document.getElementById('import-paste-content').value.trim();
        const statusEl = document.getElementById('import-status');
        
        if (!content) {
            showToast('Colle le texte copié depuis la page produit', 'error');
            return;
        }
        
        statusEl.className = 'import-status loading';
        statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyse du texte...';
        
        try {
            // Split content into lines
            const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length === 0) {
                throw new Error('Aucun texte trouvé');
            }
            
            // First meaningful line is usually the title
            let title = '';
            let description = '';
            let price = '';
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip very short lines or common UI text
                if (line.length < 5) continue;
                if (/^(acheter|buy|add to cart|ajouter|share|partager|wish|favoris)/i.test(line)) continue;
                if (/^[0-9]+\s*(avis|reviews|sold|vendu)/i.test(line)) continue;
                
                // First good line is the title
                if (!title && line.length > 10 && line.length < 200) {
                    title = line;
                    continue;
                }
                
                // Look for price
                if (!price) {
                    const priceMatch = line.match(/[€$]\s*([0-9]+[.,][0-9]{2})|([0-9]+[.,][0-9]{2})\s*[€$]/);
                    if (priceMatch) {
                        price = (priceMatch[1] || priceMatch[2]).replace(',', '.') + '€';
                        continue;
                    }
                }
                
                // Rest is description
                if (title && line.length > 20) {
                    description += (description ? ' ' : '') + line;
                }
            }
            
            // Limit description
            if (description.length > 500) {
                description = description.substring(0, 500) + '...';
            }
            
            // Fill the form
            if (title) {
                document.getElementById('product-name').value = title;
            }
            if (description) {
                document.getElementById('product-description').value = description;
            }
            if (price) {
                document.getElementById('product-price').value = price;
            }
            
            // Clear the paste area
            document.getElementById('import-paste-content').value = '';
            
            statusEl.className = 'import-status success';
            statusEl.innerHTML = '<i class="fas fa-check"></i> Texte extrait ! N\'oublie pas d\'ajouter les images.';
            
            showToast('Informations extraites !');
            
        } catch (error) {
            statusEl.className = 'import-status error';
            statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + error.message;
        }
    }
    
    // ===== Firebase Functions =====
    
    async function loadCategories() {
        try {
            const snapshot = await db.collection('categories').get();
            categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return categories;
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Erreur de chargement des catégories', 'error');
            return [];
        }
    }
    
    async function loadProducts() {
        try {
            const snapshot = await db.collection('products').get();
            products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            return products;
        } catch (error) {
            console.error('Error loading products:', error);
            showToast('Erreur de chargement des produits', 'error');
            return [];
        }
    }
    
    async function saveCategoryToFirebase(category) {
        try {
            await db.collection('categories').doc(category.id).set(category);
            return true;
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Erreur de sauvegarde', 'error');
            return false;
        }
    }
    
    async function deleteCategoryFromFirebase(categoryId) {
        try {
            await db.collection('categories').doc(categoryId).delete();
            
            // Find products with this category in categoryIds array
            const productsWithArraySnapshot = await db.collection('products')
                .where('categoryIds', 'array-contains', categoryId)
                .get();
            
            // Also find products with old format (single categoryId)
            const productsWithSingleSnapshot = await db.collection('products')
                .where('categoryId', '==', categoryId)
                .get();
            
            const batch = db.batch();
            
            // For products with categoryIds array, remove this category from the array
            productsWithArraySnapshot.docs.forEach(doc => {
                const data = doc.data();
                const updatedCategoryIds = (data.categoryIds || []).filter(id => id !== categoryId);
                
                // If product has no more categories, delete it
                if (updatedCategoryIds.length === 0) {
                    batch.delete(doc.ref);
                } else {
                    // Otherwise just update the categoryIds
                    batch.update(doc.ref, { 
                        categoryIds: updatedCategoryIds,
                        categoryId: updatedCategoryIds[0] // Update categoryId for backward compat
                    });
                }
            });
            
            // Delete products that only have old format categoryId
            productsWithSingleSnapshot.docs.forEach(doc => {
                // Skip if already handled in categoryIds
                if (!productsWithArraySnapshot.docs.some(d => d.id === doc.id)) {
                    batch.delete(doc.ref);
                }
            });
            
            await batch.commit();
            
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Erreur de suppression', 'error');
            return false;
        }
    }
    
    async function saveProductToFirebase(product) {
        try {
            await db.collection('products').doc(product.id).set(product);
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            showToast('Erreur de sauvegarde', 'error');
            return false;
        }
    }
    
    async function deleteProductFromFirebase(productId) {
        try {
            await db.collection('products').doc(productId).delete();
            return true;
        } catch (error) {
            console.error('Error deleting product:', error);
            showToast('Erreur de suppression', 'error');
            return false;
        }
    }
    
    // ===== Orders Functions =====
    async function loadOrders(statusFilter = '') {
        try {
            let query = db.collection('orders').orderBy('createdAt', 'desc');
            
            if (statusFilter) {
                query = query.where('status', '==', statusFilter);
            }
            
            const snapshot = await query.get();
            orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderOrders();
            return orders;
        } catch (error) {
            console.error('Error loading orders:', error);
            showToast('Erreur de chargement des commandes', 'error');
            return [];
        }
    }
    
    async function updateOrderStatus(orderId, newStatus) {
        try {
            // Get order data first for email notification and status history
            const orderDoc = await db.collection('orders').doc(orderId).get();
            const orderData = orderDoc.exists ? { id: orderDoc.id, ...orderDoc.data() } : null;
            
            // Build status history
            const currentHistory = orderData?.statusHistory || [];
            const now = new Date().toISOString();
            
            // Add new status to history if not already there
            const existingEntry = currentHistory.find(h => h.status === newStatus);
            if (!existingEntry) {
                currentHistory.push({
                    status: newStatus,
                    date: now,
                    updatedBy: 'admin'
                });
            }
            
            // Update order with new status and history
            await db.collection('orders').doc(orderId).update({ 
                status: newStatus,
                statusHistory: currentHistory,
                updatedAt: now
            });
            
            // Update local state
            const orderIndex = orders.findIndex(o => o.id === orderId);
            if (orderIndex > -1) {
                orders[orderIndex].status = newStatus;
                orders[orderIndex].statusHistory = currentHistory;
            }
            
            // Send email notification if FCEmailNotifications is available
            if (typeof FCEmailNotifications !== 'undefined' && orderData && orderData.email) {
                try {
                    await FCEmailNotifications.sendStatusChangeEmail(orderData, newStatus);
                    console.log('Email notification sent for order:', orderId);
                } catch (emailError) {
                    console.log('Could not send email notification:', emailError.message);
                }
            }
            
            showToast('Statut mis à jour');
            return true;
        } catch (error) {
            console.error('Error updating order:', error);
            showToast('Erreur de mise à jour', 'error');
            return false;
        }
    }
    
    async function deleteOrder(orderId) {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        
        const orderNumber = order.orderNumber || orderId.slice(0, 8);
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer la commande ${orderNumber} ?\n\nCette action est irréversible.`)) {
            return;
        }
        
        try {
            await db.collection('orders').doc(orderId).delete();
            
            // Update local state
            orders = orders.filter(o => o.id !== orderId);
            
            renderOrders();
            updateStats();
            showToast('Commande supprimée');
            return true;
        } catch (error) {
            console.error('Error deleting order:', error);
            showToast('Erreur de suppression', 'error');
            return false;
        }
    }
    
    // Expose deleteOrder globally
    window.deleteOrder = deleteOrder;
    
    function renderOrders() {
        if (!elements.ordersTableBody) return;
        
        if (orders.length === 0) {
            elements.ordersTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-shopping-bag"></i>
                        <p>Aucune commande</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        elements.ordersTableBody.innerHTML = orders.map(order => {
            const date = new Date(order.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const statusClass = {
                'pending': 'status-pending',
                'paid': 'status-paid',
                'shipped': 'status-shipped',
                'completed': 'status-completed'
            }[order.status] || 'status-pending';
            
            const statusLabel = {
                'pending': 'En attente',
                'paid': 'Payée',
                'shipped': 'Expédiée',
                'completed': 'Terminée'
            }[order.status] || 'En attente';
            
            // Render mini tags
            const tagIcons = {
                'urgent': '<i class="fas fa-exclamation"></i>',
                'waiting': '<i class="fas fa-clock"></i>',
                'vip': '<i class="fas fa-star"></i>',
                'problem': '<i class="fas fa-exclamation-triangle"></i>',
                'gift': '<i class="fas fa-gift"></i>'
            };
            const orderTags = order.tags || [];
            const tagsHtml = orderTags.length > 0 ? `
                <div class="order-tags-mini">
                    ${orderTags.map(tag => `<span class="order-tag-mini tag-${tag}" title="${tag}">${tagIcons[tag] || ''}</span>`).join('')}
                </div>
            ` : '';
            
            return `
                <tr>
                    <td>
                        <strong>${order.orderNumber || order.id.slice(0, 8)}</strong>
                        ${tagsHtml}
                    </td>
                    <td>${date}</td>
                    <td>${order.customer?.firstName || ''} ${order.customer?.lastName || ''}<br>
                        <small>${order.customer?.email || ''}</small></td>
                    <td><strong>${order.total?.toFixed(2) || '0.00'}€</strong></td>
                    <td><span class="order-status ${statusClass}">${statusLabel}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="window.viewOrder('${order.id}')" title="Voir">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteOrder('${order.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    function viewOrder(orderId) {
        console.log('👁️ viewOrder appelé avec ID:', orderId);
        console.log('📦 Orders disponibles:', orders.length);
        
        const order = orders.find(o => o.id === orderId);
        console.log('📋 Commande trouvée:', order);
        
        if (!order) {
            console.error('❌ Commande non trouvée');
            alert('Commande non trouvée');
            return;
        }
        
        currentOrderId = orderId;
        
        const date = new Date(order.createdAt).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        elements.orderDetailsContent.innerHTML = `
            <div class="order-detail-grid">
                <div class="order-detail-section">
                    <h4><i class="fas fa-info-circle"></i> Informations</h4>
                    <p><strong>N° Commande:</strong> ${order.orderNumber || order.id}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Paiement:</strong> ${order.paymentMethod === 'stripe' ? 'Carte bancaire' : 'En attente'}</p>
                </div>
                
                <div class="order-detail-section">
                    <h4><i class="fas fa-user"></i> Client</h4>
                    <p>${order.customer?.firstName || ''} ${order.customer?.lastName || ''}</p>
                    <p>${order.customer?.email || ''}</p>
                    <p>${order.customer?.phone || ''}</p>
                </div>
                
                <div class="order-detail-section">
                    <h4><i class="fas fa-truck"></i> Livraison</h4>
                    <p>${order.customer?.address || ''}</p>
                    <p>${order.customer?.postalCode || ''} ${order.customer?.city || ''}</p>
                    ${order.customer?.notes ? `<p class="notes"><em>Note: ${order.customer.notes}</em></p>` : ''}
                </div>
                
                <div class="order-detail-section full-width">
                    <h4><i class="fas fa-shopping-cart"></i> Articles commandés</h4>
                    <table class="order-items-table">
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Personnalisation</th>
                                <th>Photo client</th>
                                <th>Qté</th>
                                <th>Prix</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(order.items || []).map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.customization || '-'}</td>
                                    <td>${renderAdminCustomerImages(item.customerImage)}</td>
                                    <td>${item.quantity}</td>
                                    <td>${(item.priceValue * item.quantity).toFixed(2)}€</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4">Sous-total</td>
                                <td>${order.subtotal?.toFixed(2) || '0.00'}€</td>
                            </tr>
                            <tr>
                                <td colspan="4">Livraison</td>
                                <td>${order.shipping === 0 ? 'Gratuite' : (order.shipping?.toFixed(2) || '0.00') + '€'}</td>
                            </tr>
                            <tr class="total-row">
                                <td colspan="4"><strong>Total</strong></td>
                                <td><strong>${order.total?.toFixed(2) || '0.00'}€</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        
        console.log('✅ Contenu injecté dans modal');
        console.log('📧 Client:', order.customer);
        console.log('🛒 Items:', order.items);
        
        // Get elements fresh (in case they weren't loaded initially)
        const orderStatusSelect = elements.orderStatusSelect || document.getElementById('order-status-select');
        const modalOrder = elements.modalOrder || document.getElementById('modal-order');
        
        // Set current status in select
        if (orderStatusSelect) {
            orderStatusSelect.value = order.status || 'pending';
        }
        
        // Load tags
        loadOrderTags(order);
        
        // Load checklist
        loadOrderChecklist(order);
        
        // Load internal notes
        loadOrderNotes(order);
        
        // Display shipping info if exists
        displayShippingInfo(order);
        
        if (modalOrder) {
            openModal(modalOrder);
            console.log('✅ Modal ouvert');
        } else {
            console.error('❌ Modal non trouvé!');
            alert('Erreur: Modal de commande non trouvé');
        }
    }
    
    // ===== DISPLAY SHIPPING INFO =====
    function displayShippingInfo(order) {
        const shippingSection = document.getElementById('shipping-info-section');
        if (!shippingSection) return;
        
        if (order.shipping?.trackingNumber) {
            shippingSection.style.display = 'block';
            document.getElementById('shipping-carrier').textContent = order.shipping.carrier || 'Mondial Relay';
            document.getElementById('shipping-tracking').textContent = order.shipping.trackingNumber;
            
            const labelLink = document.getElementById('shipping-label-link');
            const trackingLink = document.getElementById('shipping-tracking-link');
            
            if (labelLink && order.shipping.labelUrl) {
                labelLink.href = order.shipping.labelUrl;
                labelLink.style.display = 'inline-flex';
            }
            
            if (trackingLink) {
                trackingLink.href = order.shipping.trackingUrl || 
                    `https://www.mondialrelay.fr/suivi-de-colis/?numeroExpedition=${order.shipping.trackingNumber}`;
                trackingLink.style.display = 'inline-flex';
            }
        } else {
            shippingSection.style.display = 'none';
        }
    }
    
    // ===== ORDER TAGS =====
    function loadOrderTags(order) {
        const tags = order.tags || [];
        document.querySelectorAll('.order-tag').forEach(btn => {
            const tag = btn.dataset.tag;
            btn.classList.toggle('active', tags.includes(tag));
        });
    }
    
    async function toggleOrderTag(tag) {
        if (!currentOrderId) return;
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        order.tags = order.tags || [];
        const index = order.tags.indexOf(tag);
        if (index > -1) {
            order.tags.splice(index, 1);
        } else {
            order.tags.push(tag);
        }
        
        // Save to Firebase
        try {
            await db.collection('orders').doc(currentOrderId).update({ tags: order.tags });
            loadOrderTags(order);
            renderOrders();
            showToast('Tag mis à jour');
        } catch (error) {
            console.error('Error updating tags:', error);
            showToast('Erreur', 'error');
        }
    }
    
    // ===== ORDER CHECKLIST =====
    function loadOrderChecklist(order) {
        const checklist = order.checklist || {};
        document.querySelectorAll('#order-checklist input').forEach(input => {
            const check = input.dataset.check;
            input.checked = checklist[check] || false;
        });
    }
    
    async function updateOrderChecklist(checkName, checked) {
        if (!currentOrderId) return;
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        order.checklist = order.checklist || {};
        order.checklist[checkName] = checked;
        
        // Save to Firebase
        try {
            await db.collection('orders').doc(currentOrderId).update({ checklist: order.checklist });
        } catch (error) {
            console.error('Error updating checklist:', error);
        }
    }
    
    // ===== ORDER NOTES =====
    function loadOrderNotes(order) {
        const notesEl = document.getElementById('order-internal-notes');
        if (notesEl) {
            notesEl.value = order.internalNotes || '';
        }
    }
    
    async function saveOrderNotes() {
        if (!currentOrderId) return;
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        const notesEl = document.getElementById('order-internal-notes');
        const notes = notesEl ? notesEl.value : '';
        order.internalNotes = notes;
        
        // Save to Firebase
        try {
            await db.collection('orders').doc(currentOrderId).update({ internalNotes: notes });
            showToast('Note enregistrée');
        } catch (error) {
            console.error('Error saving notes:', error);
            showToast('Erreur', 'error');
        }
    }
    
    // ===== PRINT ORDER =====
    function printOrder() {
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        const date = new Date(order.createdAt).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        
        const itemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.name}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;">${item.customization || '-'}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${item.quantity}</td>
                <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${(item.priceValue * item.quantity).toFixed(2)}€</td>
            </tr>
        `).join('');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bon de commande - ${order.orderNumber || order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #333; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .info-box h3 { margin: 0 0 10px 0; color: #D4AF37; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #333; color: white; padding: 10px; text-align: left; }
                    .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                    .checklist { margin-top: 30px; padding: 15px; border: 2px dashed #ddd; border-radius: 8px; }
                    .checklist h3 { margin: 0 0 15px 0; }
                    .checklist-item { padding: 5px 0; display: flex; align-items: center; gap: 10px; }
                    .checkbox { width: 18px; height: 18px; border: 2px solid #333; display: inline-block; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <h1>🛍️ Bon de commande</h1>
                <div class="header">
                    <div>
                        <strong>N° ${order.orderNumber || order.id}</strong><br>
                        Date: ${date}
                    </div>
                    <div style="text-align:right;">
                        <strong>Family Custom</strong><br>
                        familycustom.fr
                    </div>
                </div>
                
                <div class="info-box">
                    <h3>👤 Client</h3>
                    <p><strong>${order.customer?.firstName || ''} ${order.customer?.lastName || ''}</strong></p>
                    <p>${order.customer?.email || ''}</p>
                    <p>${order.customer?.phone || ''}</p>
                </div>
                
                <div class="info-box">
                    <h3>📦 Adresse de livraison</h3>
                    <p>${order.customer?.address || ''}</p>
                    <p><strong>${order.customer?.postalCode || ''} ${order.customer?.city || ''}</strong></p>
                    ${order.customer?.notes ? `<p style="color:#666;margin-top:10px;"><em>Note: ${order.customer.notes}</em></p>` : ''}
                </div>
                
                <h3>🛒 Articles</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Personnalisation</th>
                            <th style="text-align:center;">Qté</th>
                            <th style="text-align:right;">Prix</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                
                <div class="total">
                    Sous-total: ${order.subtotal?.toFixed(2) || '0.00'}€<br>
                    Livraison: ${order.shipping === 0 ? 'Gratuite' : (order.shipping?.toFixed(2) || '0.00') + '€'}<br>
                    <span style="font-size:1.3em;color:#D4AF37;">TOTAL: ${order.total?.toFixed(2) || '0.00'}€</span>
                </div>
                
                <div class="checklist">
                    <h3>✅ Checklist préparation</h3>
                    <div class="checklist-item"><span class="checkbox"></span> Photo client vérifiée</div>
                    <div class="checklist-item"><span class="checkbox"></span> Personnalisation correcte</div>
                    <div class="checklist-item"><span class="checkbox"></span> Produit préparé</div>
                    <div class="checklist-item"><span class="checkbox"></span> Contrôle qualité</div>
                    <div class="checklist-item"><span class="checkbox"></span> Emballé</div>
                    <div class="checklist-item"><span class="checkbox"></span> Étiquette imprimée</div>
                </div>
                
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
    
    // ===== PRINT LABEL =====
    function printLabel() {
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Étiquette - ${order.orderNumber || order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .label { 
                        width: 100mm; 
                        padding: 15mm; 
                        border: 3px solid #000; 
                        border-radius: 5mm;
                        margin: 0 auto;
                    }
                    .from { font-size: 10pt; color: #666; margin-bottom: 8mm; padding-bottom: 5mm; border-bottom: 1px solid #ddd; }
                    .to-label { font-size: 9pt; color: #999; margin-bottom: 2mm; }
                    .to { font-size: 14pt; font-weight: bold; }
                    .address { font-size: 12pt; margin-top: 3mm; line-height: 1.5; }
                    .city { font-size: 16pt; font-weight: bold; margin-top: 5mm; }
                    .order-ref { margin-top: 8mm; padding-top: 5mm; border-top: 1px dashed #ddd; font-size: 10pt; color: #666; }
                    @media print { 
                        body { padding: 0; }
                        .label { border: 2px solid #000; }
                    }
                </style>
            </head>
            <body>
                <div class="label">
                    <div class="from">
                        <strong>EXP:</strong> Family Custom - familycustom.fr
                    </div>
                    
                    <div class="to-label">DESTINATAIRE :</div>
                    <div class="to">${order.customer?.firstName || ''} ${order.customer?.lastName || ''}</div>
                    <div class="address">${order.customer?.address || ''}</div>
                    <div class="city">${order.customer?.postalCode || ''} ${order.customer?.city || ''}</div>
                    ${order.customer?.phone ? `<div class="address">Tél: ${order.customer.phone}</div>` : ''}
                    
                    <div class="order-ref">
                        Réf: ${order.orderNumber || order.id}
                    </div>
                </div>
                
                <script>window.onload = function() { window.print(); }</script>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
    
    // ===== MONDIAL RELAY INTEGRATION =====
    const MONDIAL_RELAY_API_URL = 'https://api-two-pi-35.vercel.app/api';
    
    async function generateMondialRelayLabel() {
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) {
            alert('Commande non trouvée');
            return;
        }
        
        // Vérifier si l'étiquette existe déjà
        if (order.shipping?.trackingNumber) {
            const confirm = window.confirm(
                `Une étiquette existe déjà (N° ${order.shipping.trackingNumber}).\n\n` +
                'Voulez-vous ouvrir l\'étiquette existante ?'
            );
            if (confirm) {
                window.open(order.shipping.labelUrl, '_blank');
            }
            return;
        }
        
        // Modal pour saisir les infos d'expédition
        const modal = document.createElement('div');
        modal.className = 'modal mondial-relay-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-shipping-fast"></i> Créer étiquette Mondial Relay</h3>
                    <button class="close-modal" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="mr-shipment-form">
                        <h4>📦 Informations du colis</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Poids (grammes) *</label>
                                <input type="number" id="mr-weight" value="500" min="1" max="30000" required>
                            </div>
                            <div class="form-group">
                                <label>Mode de livraison</label>
                                <select id="mr-delivery-mode">
                                    <option value="24R">Point Relais (24R)</option>
                                    <option value="24L">Domicile (24L)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group" id="mr-parcelshop-group">
                            <label>Numéro Point Relais (si livraison en relais)</label>
                            <div class="parcelshop-search">
                                <input type="text" id="mr-parcelshop-id" placeholder="Ex: 123456">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="searchParcelShops()">
                                    <i class="fas fa-search"></i> Chercher
                                </button>
                            </div>
                            <div id="mr-parcelshop-results"></div>
                        </div>
                        
                        <hr style="margin: 20px 0;">
                        
                        <h4>📍 Destinataire</h4>
                        <div class="recipient-preview">
                            <p><strong>${order.customer?.firstName || ''} ${order.customer?.lastName || ''}</strong></p>
                            <p>${order.customer?.address || 'Adresse non renseignée'}</p>
                            <p>${order.customer?.postalCode || ''} ${order.customer?.city || ''}</p>
                            <p>📞 ${order.customer?.phone || 'Non renseigné'}</p>
                            <p>📧 ${order.customer?.email || 'Non renseigné'}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Annuler
                    </button>
                    <button class="btn btn-primary" onclick="submitMondialRelayShipment()">
                        <i class="fas fa-tag"></i> Générer l'étiquette
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Activer le modal après l'ajout au DOM
        setTimeout(() => modal.classList.add('active'), 10);
    }
    
    async function searchParcelShops() {
        const order = orders.find(o => o.id === currentOrderId);
        const postalCode = order?.customer?.postalCode || '';
        
        if (!postalCode) {
            alert('Code postal du client non disponible');
            return;
        }
        
        const resultsDiv = document.getElementById('mr-parcelshop-results');
        resultsDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Recherche en cours...</p>';
        
        try {
            const response = await fetch(`${MONDIAL_RELAY_API_URL}/search-relay-points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postalCode: postalCode, country: 'FR', nbResults: 5 })
            });
            
            const data = await response.json();
            
            if (data.success && data.shops.length > 0) {
                resultsDiv.innerHTML = `
                    <div class="parcelshop-list">
                        ${data.shops.map(shop => `
                            <div class="parcelshop-item" onclick="selectParcelShop('${shop.id}', '${shop.name}')">
                                <strong>${shop.name}</strong>
                                <span>${shop.address}, ${shop.postalCode} ${shop.city}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = '<p class="text-muted">Aucun point relais trouvé</p>';
            }
        } catch (error) {
            console.error('Erreur recherche points relais:', error);
            resultsDiv.innerHTML = '<p class="text-danger">Erreur lors de la recherche</p>';
        }
    }
    
    window.selectParcelShop = function(id, name) {
        document.getElementById('mr-parcelshop-id').value = id;
        document.getElementById('mr-parcelshop-results').innerHTML = 
            `<p class="text-success"><i class="fas fa-check"></i> Point relais sélectionné: ${name}</p>`;
    };
    
    window.searchParcelShops = searchParcelShops;
    
    async function submitMondialRelayShipment() {
        const order = orders.find(o => o.id === currentOrderId);
        if (!order) return;
        
        const weight = parseInt(document.getElementById('mr-weight').value);
        const deliveryMode = document.getElementById('mr-delivery-mode').value;
        const parcelShopId = document.getElementById('mr-parcelshop-id').value;
        
        if (!weight || weight < 1) {
            alert('Veuillez entrer un poids valide');
            return;
        }
        
        if (deliveryMode === '24R' && !parcelShopId) {
            alert('Veuillez sélectionner un point relais pour la livraison en relais');
            return;
        }
        
        // Afficher le loader
        const submitBtn = document.querySelector('.mondial-relay-modal .btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création en cours...';
        submitBtn.disabled = true;
        
        try {
            console.log('📦 Envoi à Mondial Relay:', {
                orderId: order.id,
                recipient: {
                    name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
                    address: order.customer?.address || '',
                    postalCode: order.customer?.postalCode || '',
                    city: order.customer?.city || '',
                    country: 'FR',
                    phone: order.customer?.phone || '',
                    email: order.customer?.email || ''
                },
                weight: weight,
                deliveryMode: deliveryMode,
                parcelShopId: parcelShopId || null
            });
            
            const response = await fetch(`${MONDIAL_RELAY_API_URL}/create-shipment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    recipient: {
                        name: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
                        address: order.customer?.address || '',
                        postalCode: order.customer?.postalCode || '',
                        city: order.customer?.city || '',
                        country: 'FR',
                        phone: order.customer?.phone || '',
                        email: order.customer?.email || ''
                    },
                    weight: weight,
                    deliveryMode: deliveryMode,
                    parcelShopId: parcelShopId || null
                })
            });
            
            console.log('📬 Response status:', response.status);
            
            // Gérer le cas où la réponse n'est pas du JSON valide
            let data;
            try {
                const text = await response.text();
                console.log('📬 Response text:', text);
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError);
                alert('Erreur serveur: réponse invalide');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                return;
            }
            
            console.log('📬 Response data:', data);
            
            if (data.success) {
                alert(`✅ Étiquette créée avec succès!\n\nN° Expédition: ${data.shipmentNumber}`);
                
                // Fermer la modal
                document.querySelector('.mondial-relay-modal').remove();
                
                // Mettre à jour l'affichage de la commande
                const orderIndex = orders.findIndex(o => o.id === currentOrderId);
                if (orderIndex !== -1) {
                    orders[orderIndex].shipping = {
                        carrier: 'Mondial Relay',
                        trackingNumber: data.shipmentNumber,
                        labelUrl: data.labelUrl,
                        trackingUrl: data.trackingUrl
                    };
                }
                
                // Ouvrir l'étiquette
                window.open(data.labelUrl, '_blank');
                
                // Rafraîchir l'affichage
                viewOrder(currentOrderId);
                
            } else {
                alert(`❌ Erreur: ${data.error}`);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Erreur création expédition:', error);
            alert('Erreur lors de la création de l\'étiquette');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    window.submitMondialRelayShipment = submitMondialRelayShipment;
    window.generateMondialRelayLabel = generateMondialRelayLabel;
    
    // Expose viewOrder globally for onclick
    // Also expose as _adminViewOrder for admin-notifications.js
    window.viewOrder = viewOrder;
    window._adminViewOrder = viewOrder;
    
    // ===== Newsletter Functions =====
    let newsletterSubscribers = [];
    
    async function loadNewsletter() {
        try {
            const snapshot = await db.collection('newsletter').orderBy('subscribedAt', 'desc').get();
            newsletterSubscribers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderNewsletter();
            
            // Update count
            const countEl = document.getElementById('newsletter-count');
            if (countEl) countEl.textContent = newsletterSubscribers.length;
            
            return newsletterSubscribers;
        } catch (error) {
            console.error('Error loading newsletter:', error);
            return [];
        }
    }
    
    function renderNewsletter() {
        const tbody = document.getElementById('newsletter-table-body');
        if (!tbody) return;
        
        if (newsletterSubscribers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-state">
                        <i class="fas fa-envelope"></i>
                        <p>Aucun inscrit à la newsletter</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = newsletterSubscribers.map(sub => {
            const date = new Date(sub.subscribedAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <tr>
                    <td><strong>${sub.email}</strong></td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.deleteNewsletterSub('${sub.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    async function deleteNewsletterSub(id) {
        if (!confirm('Supprimer cet inscrit de la newsletter ?')) return;
        
        try {
            await db.collection('newsletter').doc(id).delete();
            newsletterSubscribers = newsletterSubscribers.filter(s => s.id !== id);
            renderNewsletter();
            
            const countEl = document.getElementById('newsletter-count');
            if (countEl) countEl.textContent = newsletterSubscribers.length;
            
            showToast('Inscrit supprimé');
        } catch (error) {
            console.error('Error deleting subscriber:', error);
            showToast('Erreur de suppression', 'error');
        }
    }
    
    function exportNewsletterCSV() {
        if (newsletterSubscribers.length === 0) {
            showToast('Aucun inscrit à exporter', 'error');
            return;
        }
        
        const headers = ['Email', 'Date inscription'];
        const rows = newsletterSubscribers.map(sub => {
            const date = new Date(sub.subscribedAt).toLocaleDateString('fr-FR');
            return `${sub.email},${date}`;
        });
        
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `newsletter_familycustom_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        showToast('Export CSV téléchargé');
    }
    
    /**
     * Export des commandes en Excel (CSV)
     */
    function exportOrdersToExcel() {
        if (orders.length === 0) {
            showToast('Aucune commande à exporter', 'error');
            return;
        }
        
        // En-têtes du fichier
        const headers = [
            'N° Commande',
            'Date',
            'Statut',
            'Client Nom',
            'Client Email',
            'Téléphone',
            'Adresse',
            'Code Postal',
            'Ville',
            'Produits',
            'Quantité Totale',
            'Sous-Total',
            'Livraison',
            'Code Promo',
            'Réduction',
            'Total'
        ];
        
        // Lignes de données
        const rows = orders.map(order => {
            const customer = order.customer || {};
            const date = order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';
            
            // Détails des produits
            const productsStr = (order.items || []).map(item => 
                `${item.name} x${item.quantity}${item.customization ? ' ('+item.customization+')' : ''}`
            ).join(' | ');
            
            const totalQty = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
            
            // Escape les virgules et les guillemets dans les champs texte
            const escapeCSV = (str) => {
                if (!str) return '';
                str = String(str);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            };
            
            return [
                escapeCSV(order.orderNumber),
                escapeCSV(date),
                escapeCSV(getStatusLabel(order.status)),
                escapeCSV((customer.firstName || '') + ' ' + (customer.lastName || '')),
                escapeCSV(customer.email),
                escapeCSV(customer.phone),
                escapeCSV(customer.address),
                escapeCSV(customer.postalCode),
                escapeCSV(customer.city),
                escapeCSV(productsStr),
                totalQty,
                (order.subtotal || 0).toFixed(2) + '€',
                (order.shipping || 0).toFixed(2) + '€',
                escapeCSV(order.promoCode || '-'),
                order.discount ? order.discount.toFixed(2) + '€' : '0€',
                (order.total || 0).toFixed(2) + '€'
            ].join(',');
        });
        
        // Créer le CSV
        const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // BOM UTF-8 pour Excel
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `commandes_familycustom_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        URL.revokeObjectURL(url);
        showToast(`${orders.length} commande(s) exportée(s)`);
    }
    
    function getStatusLabel(status) {
        const labels = {
            'pending': 'En attente',
            'paid': 'Payée',
            'processing': 'En préparation',
            'shipped': 'Expédiée',
            'completed': 'Terminée',
            'cancelled': 'Annulée'
        };
        return labels[status] || status;
    }
    
    window.deleteNewsletterSub = deleteNewsletterSub;
    
    // ===== Gift Cards Section =====
    let giftCards = [];
    
    async function loadGiftCards() {
        try {
            if (typeof FCGiftCard === 'undefined') {
                console.error('FCGiftCard module not loaded');
                return;
            }
            
            giftCards = await FCGiftCard.getAllGiftCards();
            renderGiftCards();
            updateGiftCardStats();
            
            return giftCards;
        } catch (error) {
            console.error('Error loading gift cards:', error);
            return [];
        }
    }
    
    function updateGiftCardStats() {
        const totalEl = document.getElementById('gc-total');
        const activeEl = document.getElementById('gc-active');
        const usedEl = document.getElementById('gc-used');
        const balanceEl = document.getElementById('gc-balance');
        const countEl = document.getElementById('gc-count');
        
        if (totalEl) totalEl.textContent = giftCards.length;
        if (countEl) countEl.textContent = giftCards.length;
        
        const activeCards = giftCards.filter(gc => gc.status === 'active');
        const usedCards = giftCards.filter(gc => gc.status === 'used');
        const totalBalance = activeCards.reduce((sum, gc) => sum + (gc.remainingBalance || 0), 0);
        
        if (activeEl) activeEl.textContent = activeCards.length;
        if (usedEl) usedEl.textContent = usedCards.length;
        if (balanceEl) balanceEl.textContent = totalBalance.toFixed(2) + '€';
    }
    
    function renderGiftCards() {
        const tbody = document.getElementById('giftcards-table-body');
        if (!tbody) return;
        
        if (giftCards.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-gift"></i>
                        <p>Aucune carte cadeau</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = giftCards.map(gc => {
            const statusClass = gc.status === 'active' ? 'badge-success' : 
                               gc.status === 'used' ? 'badge-danger' : 'badge-warning';
            const statusText = gc.status === 'active' ? 'Active' : 
                              gc.status === 'used' ? 'Utilisée' : 'Expirée';
            
            const recipientInfo = gc.recipientEmail || gc.recipientName || '-';
            
            return `
                <tr>
                    <td><code>${gc.code}</code></td>
                    <td><strong>${gc.amount?.toFixed(2) || '0.00'}€</strong></td>
                    <td style="color:${gc.remainingBalance > 0 ? 'var(--success)' : 'var(--danger)'};font-weight:600;">${gc.remainingBalance?.toFixed(2) || '0.00'}€</td>
                    <td>${recipientInfo}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-edit" onclick="window.copyGiftCardCode('${gc.code}')" title="Copier">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn-delete" onclick="window.deleteGiftCard('${gc.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    async function createGiftCard(e) {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('gc-amount').value);
        const email = document.getElementById('gc-email').value.trim();
        const recipient = document.getElementById('gc-recipient').value.trim();
        
        if (amount < 5 || amount > 500) {
            showToast('Montant entre 5€ et 500€', 'error');
            return;
        }
        
        try {
            const giftCardData = {
                amount: amount,
                recipientEmail: email || null,
                recipientName: recipient || null,
                senderName: 'Admin',
                message: 'Carte créée par l\'administrateur'
            };
            
            const result = await FCGiftCard.saveGiftCard(giftCardData);
            
            showToast(`Carte cadeau créée: ${result.code}`);
            
            // Reset form
            document.getElementById('gc-amount').value = 50;
            document.getElementById('gc-email').value = '';
            document.getElementById('gc-recipient').value = '';
            
            // Reload list
            await loadGiftCards();
            
        } catch (error) {
            console.error('Error creating gift card:', error);
            showToast('Erreur de création', 'error');
        }
    }
    
    async function deleteGiftCard(id) {
        if (!confirm('Supprimer cette carte cadeau ?')) return;
        
        try {
            await db.collection('giftCards').doc(id).delete();
            giftCards = giftCards.filter(gc => gc.id !== id);
            renderGiftCards();
            updateGiftCardStats();
            showToast('Carte cadeau supprimée');
        } catch (error) {
            console.error('Error deleting gift card:', error);
            showToast('Erreur de suppression', 'error');
        }
    }
    
    function copyGiftCardCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('Code copié !');
        }).catch(() => {
            // Fallback
            const input = document.createElement('input');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('Code copié !');
        });
    }
    
    // Expose gift card functions
    window.deleteGiftCard = deleteGiftCard;
    window.copyGiftCardCode = copyGiftCardCode;
    
    // ===== Promo Codes Section =====
    let promoCodes = [];
    
    async function loadPromoCodes() {
        try {
            if (typeof FCPromoCode === 'undefined') {
                console.error('FCPromoCode module not loaded');
                return;
            }
            
            promoCodes = await FCPromoCode.getAllPromoCodes();
            renderPromoCodes();
            updatePromoCodeStats();
            
            return promoCodes;
        } catch (error) {
            console.error('Error loading promo codes:', error);
            return [];
        }
    }
    
    function updatePromoCodeStats() {
        const totalEl = document.getElementById('pc-total');
        const activeEl = document.getElementById('pc-active');
        const expiredEl = document.getElementById('pc-expired');
        const usesEl = document.getElementById('pc-uses');
        const countEl = document.getElementById('pc-count');
        
        const now = new Date();
        
        if (totalEl) totalEl.textContent = promoCodes.length;
        if (countEl) countEl.textContent = promoCodes.length;
        
        const activeCodes = promoCodes.filter(pc => {
            if (!pc.isActive) return false;
            if (pc.endDate && new Date(pc.endDate) < now) return false;
            if (pc.maxUses > 0 && pc.usedCount >= pc.maxUses) return false;
            return true;
        });
        
        const expiredCodes = promoCodes.filter(pc => {
            if (pc.endDate && new Date(pc.endDate) < now) return true;
            if (pc.maxUses > 0 && pc.usedCount >= pc.maxUses) return true;
            return false;
        });
        
        const totalUses = promoCodes.reduce((sum, pc) => sum + (pc.usedCount || 0), 0);
        
        if (activeEl) activeEl.textContent = activeCodes.length;
        if (expiredEl) expiredEl.textContent = expiredCodes.length;
        if (usesEl) usesEl.textContent = totalUses;
    }
    
    function renderPromoCodes() {
        const tbody = document.getElementById('promocodes-table-body');
        if (!tbody) return;
        
        if (promoCodes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-percent"></i>
                        <p>Aucun code promo</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        const now = new Date();
        
        tbody.innerHTML = promoCodes.map(pc => {
            // Déterminer le type de réduction affiché
            let discountLabel = '';
            switch (pc.discountType) {
                case 'percentage':
                    discountLabel = '-' + pc.discountValue + '%';
                    break;
                case 'fixed':
                    discountLabel = '-' + pc.discountValue.toFixed(2) + '€';
                    break;
                case 'free_shipping':
                    discountLabel = 'Livraison gratuite';
                    break;
            }
            
            // Expiration
            let expirationLabel = '-';
            if (pc.endDate) {
                const endDate = new Date(pc.endDate);
                expirationLabel = endDate.toLocaleDateString('fr-FR');
                if (endDate < now) {
                    expirationLabel = `<span style="color:var(--danger);">${expirationLabel}</span>`;
                }
            }
            
            // Utilisations
            const usesLabel = pc.maxUses > 0 
                ? `${pc.usedCount || 0}/${pc.maxUses}` 
                : `${pc.usedCount || 0}`;
            
            // Statut
            let statusClass = 'badge-success';
            let statusText = 'Actif';
            
            if (!pc.isActive) {
                statusClass = 'badge-danger';
                statusText = 'Off';
            } else if (pc.endDate && new Date(pc.endDate) < now) {
                statusClass = 'badge-warning';
                statusText = 'Expiré';
            } else if (pc.maxUses > 0 && pc.usedCount >= pc.maxUses) {
                statusClass = 'badge-warning';
                statusText = 'Épuisé';
            }
            
            return `
                <tr>
                    <td><code>${pc.code}</code></td>
                    <td><strong>${discountLabel}</strong></td>
                    <td>${pc.minOrderAmount > 0 ? pc.minOrderAmount.toFixed(0) + '€' : '-'}</td>
                    <td>${usesLabel}</td>
                    <td>${expirationLabel}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-edit" onclick="window.copyPromoCode('${pc.code}')" title="Copier">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn-edit" onclick="window.togglePromoCode('${pc.id}', ${pc.isActive})" title="${pc.isActive ? 'Désactiver' : 'Activer'}">
                                <i class="fas fa-${pc.isActive ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn-delete" onclick="window.deletePromoCode('${pc.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    async function createPromoCode(e) {
        e.preventDefault();
        
        const code = document.getElementById('pc-code').value.toUpperCase().trim();
        const discountType = document.getElementById('pc-type').value;
        const discountValue = parseFloat(document.getElementById('pc-value').value);
        const minOrderAmount = parseFloat(document.getElementById('pc-min-order').value) || 0;
        const maxUses = parseInt(document.getElementById('pc-max-uses').value) || 0;
        const endDate = document.getElementById('pc-end-date').value || null;
        const description = document.getElementById('pc-description').value.trim();
        
        if (!code || code.length < 3) {
            showToast('Le code doit avoir au moins 3 caractères', 'error');
            return;
        }
        
        if (discountValue <= 0) {
            showToast('La valeur de réduction doit être positive', 'error');
            return;
        }
        
        try {
            const promoData = {
                code: code,
                discountType: discountType,
                discountValue: discountValue,
                minOrderAmount: minOrderAmount,
                maxUses: maxUses,
                endDate: endDate,
                description: description
            };
            
            await FCPromoCode.createPromoCode(promoData);
            
            showToast(`Code promo "${code}" créé !`);
            
            // Reset form
            document.getElementById('pc-code').value = '';
            document.getElementById('pc-value').value = '';
            document.getElementById('pc-min-order').value = '0';
            document.getElementById('pc-max-uses').value = '0';
            document.getElementById('pc-end-date').value = '';
            document.getElementById('pc-description').value = '';
            
            // Reload list
            await loadPromoCodes();
            
        } catch (error) {
            console.error('Error creating promo code:', error);
            showToast(error.message || 'Erreur de création', 'error');
        }
    }
    
    async function togglePromoCode(id, currentState) {
        try {
            await FCPromoCode.updatePromoCode(id, { isActive: !currentState });
            
            const pc = promoCodes.find(p => p.id === id);
            if (pc) pc.isActive = !currentState;
            
            renderPromoCodes();
            updatePromoCodeStats();
            showToast(currentState ? 'Code désactivé' : 'Code activé');
        } catch (error) {
            console.error('Error toggling promo code:', error);
            showToast('Erreur de mise à jour', 'error');
        }
    }
    
    async function deletePromoCode(id) {
        if (!confirm('Supprimer ce code promo ?')) return;
        
        try {
            await FCPromoCode.deletePromoCode(id);
            promoCodes = promoCodes.filter(pc => pc.id !== id);
            renderPromoCodes();
            updatePromoCodeStats();
            showToast('Code promo supprimé');
        } catch (error) {
            console.error('Error deleting promo code:', error);
            showToast('Erreur de suppression', 'error');
        }
    }
    
    function copyPromoCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            showToast('Code copié !');
        }).catch(() => {
            const input = document.createElement('input');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('Code copié !');
        });
    }
    
    // Expose promo code functions
    window.deletePromoCode = deletePromoCode;
    window.togglePromoCode = togglePromoCode;
    window.copyPromoCode = copyPromoCode;
    
    // ===== Auth Functions (Firebase Auth) =====
    function checkAuth() {
        // Écoute les changements d'état d'authentification
        auth.onAuthStateChanged((user) => {
            if (user) {
                showDashboard();
            } else {
                elements.loginScreen.classList.remove('hidden');
                elements.dashboard.classList.add('hidden');
            }
        });
    }
    
    async function login(email, password) {
        try {
            elements.loginError.textContent = '';
            await auth.signInWithEmailAndPassword(email, password);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Erreur de connexion';
            switch (error.code) {
                case 'auth/invalid-email':
                    errorMessage = 'Email invalide';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Utilisateur non trouvé';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Mot de passe incorrect';
                    break;
                case 'auth/invalid-credential':
                    errorMessage = 'Identifiants invalides';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Trop de tentatives. Réessayez plus tard.';
                    break;
            }
            elements.loginError.textContent = errorMessage;
            return false;
        }
    }
    
    async function logout() {
        try {
            await auth.signOut();
            elements.loginScreen.classList.remove('hidden');
            elements.dashboard.classList.add('hidden');
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    async function showDashboard() {
        elements.loginScreen.classList.add('hidden');
        elements.dashboard.classList.remove('hidden');
        
        showLoading(true);
        
        await loadCategories();
        await loadProducts();
        await loadOrders();
        
        updateStats();
        renderCategories();
        renderProducts();
        updateCategorySelects();
        updateDate();
        
        // Start real-time analytics
        startVisitorTracking();
        loadClickStats();
        
        showLoading(false);
    }
    
    // ===== UI Functions =====
    function updateDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        elements.dateDisplay.textContent = now.toLocaleDateString('fr-FR', options);
    }
    
    function updateStats() {
        elements.statCategories.textContent = categories.length;
        elements.statProducts.textContent = products.length;
        
        // Update financial stats
        updateDashboardStats();
        
        // Update monthly goal
        updateMonthlyGoalProgress();
        
        // Update revenue history
        updateRevenueHistory();
        
        // Load customer photos
        loadCustomerPhotos();
    }
    
    async function updateDashboardStats() {
        try {
            // Get all orders
            const snapshot = await db.collection('orders').get();
            const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Get today's date at midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculate stats
            let todayRevenue = 0;
            let todayOrders = 0;
            let totalRevenue = 0;
            let paidOrdersCount = 0;
            let todoOrders = 0;
            
            allOrders.forEach(order => {
                const orderDate = order.createdAt ? new Date(order.createdAt) : null;
                const isToday = orderDate && orderDate >= today;
                const isPaidOrCompleted = order.status === 'paid' || order.status === 'shipped' || order.status === 'completed';
                
                if (isPaidOrCompleted) {
                    paidOrdersCount++;
                    const orderTotal = parseFloat(order.total) || 0;
                    totalRevenue += orderTotal;
                    
                    if (isToday) {
                        todayRevenue += orderTotal;
                        todayOrders++;
                    }
                }
                
                // Orders to prepare (paid but not shipped)
                if (order.status === 'paid') {
                    todoOrders++;
                }
            });
            
            // Calculate average cart
            const averageCart = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;
            
            // Update UI - New dashboard elements
            const statOrdersToday = document.getElementById('stat-orders-today');
            const statRevenueToday = document.getElementById('stat-revenue-today');
            const statAverageCart = document.getElementById('stat-average-cart');
            const statOrdersTodo = document.getElementById('stat-orders-todo');
            
            if (statOrdersToday) statOrdersToday.textContent = todayOrders;
            if (statRevenueToday) statRevenueToday.textContent = todayRevenue.toFixed(2) + '€';
            if (statAverageCart) statAverageCart.textContent = averageCart.toFixed(2) + '€';
            if (statOrdersTodo) statOrdersTodo.textContent = todoOrders;
            
            // Update recent orders
            updateRecentOrders(allOrders);
            
            // Update alerts
            updateDashboardAlerts(allOrders, todoOrders);
            
        } catch (error) {
            console.error('Error calculating dashboard stats:', error);
        }
    }
    
    function updateRecentOrders(allOrders) {
        const recentOrdersBody = document.getElementById('recent-orders-body');
        if (!recentOrdersBody) return;
        
        // Sort by date descending and take first 5
        const recentOrders = allOrders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        if (recentOrders.length === 0) {
            recentOrdersBody.innerHTML = '<tr><td colspan="5" class="loading-text">Aucune commande</td></tr>';
            return;
        }
        
        recentOrdersBody.innerHTML = recentOrders.map(order => {
            const statusLabels = {
                'pending': { text: 'En attente', class: 'pending', icon: '🟡' },
                'paid': { text: 'Payée', class: 'paid', icon: '🔵' },
                'shipped': { text: 'Expédiée', class: 'shipped', icon: '🟢' },
                'completed': { text: 'Terminée', class: 'completed', icon: '✅' }
            };
            const status = statusLabels[order.status] || statusLabels['pending'];
            
            const productNames = order.items 
                ? order.items.map(i => i.name || 'Produit').slice(0, 2).join(', ') + (order.items.length > 2 ? '...' : '')
                : '-';
            
            const clientName = order.customer 
                ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email || '-'
                : '-';
            
            return `
                <tr onclick="viewOrder('${order.id}')" style="cursor: pointer;">
                    <td><strong>#${order.orderNumber || order.id.slice(0, 6)}</strong></td>
                    <td>${clientName}</td>
                    <td>${productNames}</td>
                    <td><strong>${parseFloat(order.total || 0).toFixed(2)}€</strong></td>
                    <td><span class="status-badge ${status.class}">${status.icon} ${status.text}</span></td>
                </tr>
            `;
        }).join('');
    }
    
    function updateDashboardAlerts(allOrders, todoOrders) {
        const alertsList = document.getElementById('alerts-list');
        if (!alertsList) return;
        
        const alerts = [];
        
        // Alert: Orders to prepare
        if (todoOrders > 0) {
            alerts.push({
                type: 'warning',
                icon: 'fas fa-box',
                message: `${todoOrders} commande${todoOrders > 1 ? 's' : ''} en attente de préparation`
            });
        }
        
        // Alert: Pending orders (not paid)
        const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
        if (pendingOrders > 0) {
            alerts.push({
                type: 'info',
                icon: 'fas fa-clock',
                message: `${pendingOrders} commande${pendingOrders > 1 ? 's' : ''} en attente de paiement`
            });
        }
        
        // Alert: No products
        if (products.length === 0) {
            alerts.push({
                type: 'danger',
                icon: 'fas fa-exclamation-triangle',
                message: 'Aucun produit créé - Ajoutez vos premiers produits !'
            });
        }
        
        // Alert: No categories
        if (categories.length === 0) {
            alerts.push({
                type: 'danger',
                icon: 'fas fa-folder-open',
                message: 'Aucune catégorie créée - Commencez par créer des catégories'
            });
        }
        
        // Success: Everything is good
        if (alerts.length === 0) {
            alerts.push({
                type: 'success',
                icon: 'fas fa-check-circle',
                message: 'Tout est en ordre ! Aucune action requise.'
            });
        }
        
        alertsList.innerHTML = alerts.map(alert => `
            <div class="alert-item alert-${alert.type}">
                <i class="${alert.icon}"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');
    }
    
    // ===== MONTHLY GOAL FUNCTIONS =====
    const GOAL_STORAGE_KEY = 'familycustom_monthly_goal';
    
    function getMonthlyGoal() {
        const stored = localStorage.getItem(GOAL_STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // Check if it's still the same month
            const now = new Date();
            const storedDate = new Date(data.month);
            if (now.getMonth() === storedDate.getMonth() && now.getFullYear() === storedDate.getFullYear()) {
                return data.goal;
            }
        }
        return 500; // Default goal
    }
    
    function setMonthlyGoal(goal) {
        const now = new Date();
        localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify({
            goal: goal,
            month: now.toISOString()
        }));
    }
    
    async function updateMonthlyGoalProgress() {
        try {
            const goal = getMonthlyGoal();
            
            // Get current month's orders
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            const snapshot = await db.collection('orders').get();
            const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Calculate this month's revenue
            let monthlyRevenue = 0;
            allOrders.forEach(order => {
                const orderDate = order.createdAt ? new Date(order.createdAt) : null;
                const isThisMonth = orderDate && orderDate >= startOfMonth;
                const isPaid = order.status === 'paid' || order.status === 'shipped' || order.status === 'completed';
                
                if (isThisMonth && isPaid) {
                    monthlyRevenue += parseFloat(order.total) || 0;
                }
            });
            
            // Calculate progress
            const percentage = Math.min((monthlyRevenue / goal) * 100, 100);
            const remaining = Math.max(goal - monthlyRevenue, 0);
            
            // Calculate days left in month
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const daysLeft = Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
            
            // Update UI
            const progressFill = document.getElementById('goal-progress-fill');
            const goalCurrent = document.getElementById('goal-current');
            const goalTarget = document.getElementById('goal-target');
            const goalPercentage = document.getElementById('goal-percentage');
            const goalRemaining = document.getElementById('goal-remaining');
            const goalDaysLeft = document.getElementById('goal-days-left');
            
            if (progressFill) {
                progressFill.style.width = percentage + '%';
                if (percentage >= 100) {
                    progressFill.classList.add('goal-reached');
                } else {
                    progressFill.classList.remove('goal-reached');
                }
            }
            if (goalCurrent) goalCurrent.textContent = monthlyRevenue.toFixed(2) + '€';
            if (goalTarget) goalTarget.textContent = goal.toFixed(2) + '€';
            if (goalPercentage) goalPercentage.textContent = Math.round(percentage) + '%';
            if (goalRemaining) goalRemaining.textContent = remaining.toFixed(2) + '€';
            if (goalDaysLeft) goalDaysLeft.textContent = daysLeft + 'j';
            
        } catch (error) {
            console.error('Error updating monthly goal:', error);
        }
    }
    
    // Edit monthly goal - exposed globally
    window.editMonthlyGoal = function() {
        const currentGoal = getMonthlyGoal();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'goal-edit-overlay';
        overlay.innerHTML = `
            <div class="goal-edit-modal">
                <h4><i class="fas fa-bullseye"></i> Modifier l'objectif mensuel</h4>
                <input type="number" id="goal-input" value="${currentGoal}" min="0" step="50" placeholder="Objectif en €">
                <div class="goal-edit-buttons">
                    <button class="btn-cancel" onclick="closeGoalEdit()">Annuler</button>
                    <button class="btn-save" onclick="saveMonthlyGoal()">Enregistrer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Focus input
        document.getElementById('goal-input').focus();
        document.getElementById('goal-input').select();
    };
    
    window.closeGoalEdit = function() {
        const overlay = document.querySelector('.goal-edit-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 200);
        }
    };
    
    window.saveMonthlyGoal = function() {
        const input = document.getElementById('goal-input');
        const goal = parseFloat(input.value) || 500;
        setMonthlyGoal(goal);
        closeGoalEdit();
        updateMonthlyGoalProgress();
        showToast('Objectif mis à jour !', 'success');
    };
    
    // ===== REVENUE HISTORY FUNCTIONS =====
    async function updateRevenueHistory() {
        try {
            const snapshot = await db.collection('orders').get();
            const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Get last 6 months
            const monthsData = [];
            const now = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
                
                let revenue = 0;
                let orderCount = 0;
                
                allOrders.forEach(order => {
                    const orderDate = order.createdAt ? new Date(order.createdAt) : null;
                    const isPaid = order.status === 'paid' || order.status === 'shipped' || order.status === 'completed';
                    
                    if (orderDate && isPaid && orderDate >= month && orderDate <= monthEnd) {
                        revenue += parseFloat(order.total) || 0;
                        orderCount++;
                    }
                });
                
                monthsData.push({
                    month: month,
                    monthName: month.toLocaleDateString('fr-FR', { month: 'short' }),
                    monthFull: month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
                    revenue: revenue,
                    orders: orderCount
                });
            }
            
            // Find max revenue for scaling
            const maxRevenue = Math.max(...monthsData.map(m => m.revenue), 1);
            
            // Render chart bars
            const barsContainer = document.getElementById('revenue-bars');
            const monthsContainer = document.getElementById('revenue-months');
            
            if (barsContainer && monthsContainer) {
                barsContainer.innerHTML = monthsData.map(m => {
                    const height = (m.revenue / maxRevenue) * 100;
                    return `
                        <div class="revenue-bar" style="height: ${Math.max(height, 3)}%">
                            <div class="revenue-bar-tooltip">${m.revenue.toFixed(2)}€</div>
                        </div>
                    `;
                }).join('');
                
                monthsContainer.innerHTML = monthsData.map(m => 
                    `<span class="revenue-month-label">${m.monthName}</span>`
                ).join('');
            }
            
            // Render table
            const tableBody = document.getElementById('revenue-history-body');
            if (tableBody) {
                tableBody.innerHTML = monthsData.reverse().map((m, index) => {
                    const prevMonth = monthsData[index + 1];
                    let evolution = '';
                    
                    if (prevMonth && prevMonth.revenue > 0) {
                        const diff = ((m.revenue - prevMonth.revenue) / prevMonth.revenue) * 100;
                        if (diff > 0) {
                            evolution = `<span class="revenue-evolution positive"><i class="fas fa-arrow-up"></i> +${diff.toFixed(1)}%</span>`;
                        } else if (diff < 0) {
                            evolution = `<span class="revenue-evolution negative"><i class="fas fa-arrow-down"></i> ${diff.toFixed(1)}%</span>`;
                        } else {
                            evolution = `<span class="revenue-evolution neutral">—</span>`;
                        }
                    } else {
                        evolution = `<span class="revenue-evolution neutral">—</span>`;
                    }
                    
                    return `
                        <tr>
                            <td><strong>${m.monthFull}</strong></td>
                            <td>${m.orders}</td>
                            <td><strong>${m.revenue.toFixed(2)}€</strong></td>
                            <td>${evolution}</td>
                        </tr>
                    `;
                }).join('');
            }
            
        } catch (error) {
            console.error('Error loading revenue history:', error);
        }
    }
    
    // ===== CUSTOMER PHOTOS FUNCTIONS =====
    let allCustomerPhotos = [];
    
    async function loadCustomerPhotos() {
        try {
            const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').limit(50).get();
            const recentOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            allCustomerPhotos = [];
            
            recentOrders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        if (item.customerImage && item.customerImage.length > 50) {
                            allCustomerPhotos.push({
                                image: item.customerImage,
                                orderNumber: order.orderNumber || order.id.slice(0, 6),
                                orderId: order.id,
                                productName: item.name || 'Produit',
                                date: order.createdAt ? new Date(order.createdAt) : new Date(),
                                customization: item.customization || ''
                            });
                        }
                    });
                }
            });
            
            console.log('📷 Photos clients chargées:', allCustomerPhotos.length);
            
            // Render recent photos (max 8)
            renderCustomerPhotos(allCustomerPhotos.slice(0, 8), 'customer-photos-grid');
            
        } catch (error) {
            console.error('Error loading customer photos:', error);
            const container = document.getElementById('customer-photos-grid');
            if (container) {
                container.innerHTML = '<div class="loading-text">Erreur lors du chargement des photos</div>';
            }
        }
    }
    
    function renderCustomerPhotos(photos, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (photos.length === 0) {
            container.innerHTML = '<div class="loading-text">Aucune photo client pour le moment</div>';
            return;
        }
        
        container.innerHTML = photos.map((photo, index) => `
            <div class="customer-photo-item" data-photo-index="${index}" onclick="openPhotoLightboxByIndex(${index})">
                <img src="${photo.image}" alt="Photo client" loading="lazy" onerror="this.parentElement.style.display='none'">
                <div class="photo-overlay">
                    <span class="photo-order">#${photo.orderNumber}</span>
                    <span class="photo-date">${photo.date.toLocaleDateString('fr-FR')}</span>
                </div>
            </div>
        `).join('');
    }
    
    // Photo lightbox by index (to avoid base64 in onclick)
    window.openPhotoLightboxByIndex = function(index) {
        const photo = allCustomerPhotos[index];
        if (!photo) return;
        
        const lightbox = document.createElement('div');
        lightbox.className = 'photo-lightbox';
        lightbox.innerHTML = `
            <button class="photo-lightbox-close" onclick="closePhotoLightbox()">
                <i class="fas fa-times"></i>
            </button>
            <img src="${photo.image}" alt="Photo client">
            <div class="photo-lightbox-info">
                <div class="order-number">Commande #${photo.orderNumber}</div>
                <div class="order-product">${photo.productName}</div>
                ${photo.customization ? `<div class="order-custom">« ${photo.customization} »</div>` : ''}
                <div class="order-date">${photo.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <button class="btn-download-photo" onclick="downloadPhoto(${index})">
                    <i class="fas fa-download"></i> Télécharger
                </button>
            </div>
        `;
        
        document.body.appendChild(lightbox);
        setTimeout(() => lightbox.classList.add('active'), 10);
        
        // Close on background click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closePhotoLightbox();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closePhotoLightbox();
                document.removeEventListener('keydown', escHandler);
            }
        });
    };
    
    // Download photo
    window.downloadPhoto = function(index) {
        const photo = allCustomerPhotos[index];
        if (!photo) return;
        
        const link = document.createElement('a');
        link.href = photo.image;
        link.download = `photo_commande_${photo.orderNumber}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    window.closePhotoLightbox = function() {
        const lightbox = document.querySelector('.photo-lightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            setTimeout(() => lightbox.remove(), 300);
        }
    };
    
    // Show all customer photos
    window.showAllCustomerPhotos = function() {
        const modal = document.createElement('div');
        modal.className = 'all-photos-modal';
        modal.innerHTML = `
            <div class="all-photos-header">
                <h3><i class="fas fa-images"></i> Toutes les photos clients (${allCustomerPhotos.length})</h3>
                <button class="btn btn-outline" onclick="closeAllPhotosModal()">
                    <i class="fas fa-times"></i> Fermer
                </button>
            </div>
            <div class="all-photos-content">
                <div class="all-photos-grid" id="all-photos-grid"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Render all photos
        renderCustomerPhotos(allCustomerPhotos, 'all-photos-grid');
    };
    
    window.closeAllPhotosModal = function() {
        const modal = document.querySelector('.all-photos-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };
    
    // ===== Analytics Functions =====
    let visitorsUnsubscribe = null;
    
    function startVisitorTracking() {
        // Real-time listener for active visitors
        const oneMinuteAgo = new Date(Date.now() - 60000);
        
        visitorsUnsubscribe = db.collection('visitors')
            .where('lastSeen', '>', oneMinuteAgo)
            .onSnapshot((snapshot) => {
                const activeVisitors = snapshot.size;
                elements.statVisitors.textContent = activeVisitors;
            }, (error) => {
                console.error('Visitor tracking error:', error);
                elements.statVisitors.textContent = '-';
            });
    }
    
    async function loadClickStats() {
        try {
            // Get click stats
            const statsDoc = await db.collection('stats').doc('clicks').get();
            
            if (statsDoc.exists) {
                const data = statsDoc.data();
                elements.statClicks.textContent = data.total || 0;
                
                // Render category clicks
                renderClicksList(data.categories || {}, elements.categoryClicksList, 'category');
                
                // Render product clicks
                renderClicksList(data.products || {}, elements.productClicksList, 'product');
            } else {
                elements.statClicks.textContent = '0';
                elements.categoryClicksList.innerHTML = '<p class="empty-text">Aucun clic enregistré</p>';
                elements.productClicksList.innerHTML = '<p class="empty-text">Aucun clic enregistré</p>';
            }
        } catch (error) {
            console.error('Error loading click stats:', error);
        }
    }
    
    function renderClicksList(clicksData, container, type) {
        const entries = Object.entries(clicksData);
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="empty-text">Aucun clic enregistré</p>';
            return;
        }
        
        // Sort by clicks (descending)
        entries.sort((a, b) => b[1] - a[1]);
        
        // Take top 10
        const top10 = entries.slice(0, 10);
        
        let html = '<ul class="clicks-ranking">';
        top10.forEach(([id, clicks], index) => {
            let name = id;
            
            // Try to find real name
            if (type === 'category') {
                const cat = categories.find(c => c.id === id);
                if (cat) name = cat.name;
            } else if (type === 'product') {
                const prod = products.find(p => p.id === id);
                if (prod) name = prod.name;
            }
            
            html += `<li>
                <span class="rank">${index + 1}</span>
                <span class="name">${name}</span>
                <span class="count">${clicks} clics</span>
            </li>`;
        });
        html += '</ul>';
        
        container.innerHTML = html;
    }
    
    function switchSection(sectionId) {
        elements.sections.forEach(section => section.classList.remove('active'));
        elements.navItems.forEach(item => item.classList.remove('active'));
        
        const targetSection = document.getElementById(`section-${sectionId}`);
        const targetNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        
        if (targetSection) targetSection.classList.add('active');
        if (targetNav) targetNav.classList.add('active');
        
        const titles = {
            dashboard: 'Tableau de bord',
            categories: 'Catégories',
            products: 'Produits',
            orders: 'Commandes',
            support: 'Support',
            newsletter: 'Newsletter',
            giftcards: 'Cartes Cadeaux',
            promocodes: 'Codes Promo',
            settings: 'Paramètres'
        };
        elements.pageTitle.textContent = titles[sectionId] || 'Admin';
        
        // Load newsletter when switching to that section
        if (sectionId === 'newsletter') {
            loadNewsletter();
        }
        
        // Load discounts when switching to that section
        if (sectionId === 'discounts') {
            loadGiftCards();
            loadPromoCodes();
            initDiscountTabs();
        }
        
        // Initialize support when switching to that section
        if (sectionId === 'support' && typeof AdminSupport !== 'undefined') {
            AdminSupport.init();
        }
    }
    
    // Initialize discount tabs
    function initDiscountTabs() {
        const tabs = document.querySelectorAll('.discount-tab');
        const contents = document.querySelectorAll('.discount-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update tabs
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update contents
                contents.forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${targetTab}`).classList.add('active');
            });
        });
    }
    
    function openModal(modal) {
        console.log('🔓 openModal - avant:', modal?.classList?.toString());
        modal.classList.add('active');
        console.log('🔓 openModal - après:', modal?.classList?.toString());
        console.log('🔓 Modal visible?', window.getComputedStyle(modal).visibility);
    }
    
    function closeModal(modal) {
        modal.classList.remove('active');
        currentEditId = null;
    }
    
    function updateCategorySelects() {
        const options = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        elements.filterCategory.innerHTML = '<option value="">Toutes</option>' + options;
        // Mise à jour des checkboxes de catégories
        updateCategoryCheckboxes();
    }
    
    function updateCategoryCheckboxes(selectedIds = []) {
        const container = document.getElementById('product-categories-container');
        if (!container) return;
        
        container.innerHTML = categories.map(cat => `
            <label class="category-checkbox-option">
                <input type="checkbox" name="product-categories" value="${cat.id}" ${selectedIds.includes(cat.id) ? 'checked' : ''}>
                <span class="category-checkbox-label">${cat.name}</span>
            </label>
        `).join('');
    }
    
    // ===== Categories =====
    function renderCategories() {
        if (categories.length === 0) {
            elements.categoriesTableBody.innerHTML = `
                <tr><td colspan="5" class="empty-state">
                    <i class="fas fa-folder-open"></i><p>Aucune catégorie</p>
                </td></tr>
            `;
            return;
        }
        
        elements.categoriesTableBody.innerHTML = categories.map(cat => {
            const productCount = products.filter(p => {
                // Support ancien format (categoryId) et nouveau format (categoryIds)
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return p.categoryIds.includes(cat.id);
                }
                return p.categoryId === cat.id;
            }).length;
            const catColor = cat.color || '#D4AF37';
            return `
                <tr>
                    <td>
                        <div class="table-icon" style="background: ${catColor}; color: ${isLightColor(catColor) ? '#1a1a1a' : '#fff'}">
                            <i class="fas ${cat.icon || 'fa-cube'}"></i>
                        </div>
                    </td>
                    <td><strong>${cat.name}</strong></td>
                    <td><code>${cat.slug}</code></td>
                    <td>${productCount} produit${productCount > 1 ? 's' : ''}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-edit" onclick="editCategory('${cat.id}')" title="Modifier">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn-delete" onclick="deleteCategory('${cat.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    function isLightColor(color) {
        if (!color) return false;
        const hex = color.replace('#', '');
        if (hex.length < 6) return false;
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 155;
    }
    
    window.editCategory = function(id) {
        const category = categories.find(c => c.id === id);
        if (!category) return;
        
        currentEditId = id;
        document.getElementById('modal-category-title').textContent = 'Modifier la catégorie';
        document.getElementById('category-id').value = id;
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-slug').value = category.slug;
        document.getElementById('category-icon').value = category.icon;
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-order').value = category.order || 0;
        document.getElementById('category-gradient1').value = category.gradient1 || '#1a1a2e';
        document.getElementById('category-gradient2').value = category.gradient2 || '#0d0d1a';
        document.getElementById('category-icon-color').value = category.iconColor || '#D4AF37';
        document.getElementById('category-text-style').value = category.textStyle || 'light';
        
        // Afficher l'image si elle existe
        const imagePreview = document.getElementById('category-image-preview');
        const uploadPlaceholder = document.querySelector('#category-image-zone .upload-placeholder');
        if (category.imageUrl) {
            imagePreview.innerHTML = `
                <img src="${category.imageUrl}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeCategoryImage()" style="margin-top: 10px;">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            `;
            imagePreview.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            currentCategoryImageUrl = category.imageUrl;
        } else {
            imagePreview.style.display = 'none';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            currentCategoryImageUrl = null;
        }
        
        updateIconPreview();
        updateCategoryPreview();
        
        openModal(elements.modalCategory);
    };
    
    window.deleteCategory = async function(id) {
        if (!confirm('Supprimer cette catégorie ? Elle sera retirée de tous les produits associés.')) return;
        
        showLoading(true);
        
        const success = await deleteCategoryFromFirebase(id);
        if (success) {
            categories = categories.filter(c => c.id !== id);
            // Retirer la catégorie des produits (nouveau format)
            products.forEach(p => {
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    p.categoryIds = p.categoryIds.filter(catId => catId !== id);
                }
                if (p.categoryId === id) {
                    p.categoryId = p.categoryIds && p.categoryIds.length > 0 ? p.categoryIds[0] : null;
                }
            });
            // Supprimer les produits qui n'ont plus de catégorie
            products = products.filter(p => {
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return p.categoryIds.length > 0;
                }
                return p.categoryId !== null;
            });
            renderCategories();
            renderProducts();
            updateCategorySelects();
            updateStats();
            showToast('Catégorie supprimée');
        }
        
        showLoading(false);
    };
    
    async function saveCategory(e) {
        e.preventDefault();
        
        const name = document.getElementById('category-name').value.trim();
        const slug = document.getElementById('category-slug').value.trim() || slugify(name);
        const icon = document.getElementById('category-icon').value.trim() || 'fa-cube';
        const description = document.getElementById('category-description').value.trim();
        const order = parseInt(document.getElementById('category-order').value) || 0;
        const gradient1 = document.getElementById('category-gradient1').value;
        const gradient2 = document.getElementById('category-gradient2').value;
        const iconColor = document.getElementById('category-icon-color').value;
        const textStyle = document.getElementById('category-text-style').value;
        const editId = document.getElementById('category-id').value;
        
        showLoading(true);
        
        const category = {
            id: editId || slug || generateId(),
            name,
            slug,
            icon,
            description,
            order,
            gradient1,
            gradient2,
            iconColor,
            textStyle,
            imageUrl: currentCategoryImageUrl || null
        };
        
        const success = await saveCategoryToFirebase(category);
        
        if (success) {
            if (editId) {
                const index = categories.findIndex(c => c.id === editId);
                if (index > -1) categories[index] = category;
                showToast('Catégorie modifiée');
            } else {
                categories.push(category);
                showToast('Catégorie créée');
            }
            
            renderCategories();
            updateCategorySelects();
            updateStats();
            closeModal(elements.modalCategory);
            resetCategoryForm();
        }
        
        showLoading(false);
    }
    
    function resetCategoryForm() {
        elements.categoryForm.reset();
        document.getElementById('category-id').value = '';
        document.getElementById('category-icon').value = 'fa-cube';
        document.getElementById('category-order').value = '0';
        document.getElementById('category-gradient1').value = '#1a1a2e';
        document.getElementById('category-gradient2').value = '#0d0d1a';
        document.getElementById('category-icon-color').value = '#D4AF37';
        document.getElementById('category-text-style').value = 'light';
        document.getElementById('category-image-preview').style.display = 'none';
        document.getElementById('category-image-preview').innerHTML = '';
        const uploadPlaceholder = document.querySelector('#category-image-zone .upload-placeholder');
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        document.getElementById('modal-category-title').textContent = 'Nouvelle catégorie';
        currentCategoryImageUrl = null;
        updateIconPreview();
        updateCategoryPreview();
    }
    
    function updateIconPreview() {
        const iconValue = document.getElementById('category-icon')?.value || 'fa-cube';
        const iconPreviewEl = document.querySelector('.icon-preview');
        if (iconPreviewEl) {
            iconPreviewEl.innerHTML = `<i class="fas ${iconValue}"></i>`;
        }
    }
    
    // ===== Category Preview =====
    function updateCategoryPreview() {
        const previewBox = document.getElementById('category-preview');
        if (!previewBox) return;
        
        const name = document.getElementById('category-name').value || 'Nom catégorie';
        const description = document.getElementById('category-description').value || 'Description';
        const icon = document.getElementById('category-icon').value || 'fa-cube';
        const gradient1 = document.getElementById('category-gradient1').value || '#1a1a2e';
        const gradient2 = document.getElementById('category-gradient2').value || '#0d0d1a';
        const iconColor = document.getElementById('category-icon-color').value || '#D4AF37';
        const textStyle = document.getElementById('category-text-style').value || 'light';
        
        let backgroundStyle = `linear-gradient(145deg, ${gradient1} 0%, ${gradient2} 100%)`;
        if (currentCategoryImageUrl) {
            backgroundStyle = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url('${currentCategoryImageUrl}')`;
        }
        
        previewBox.className = `category-preview-box ${textStyle === 'dark' ? 'text-dark' : ''}`;
        previewBox.style.background = backgroundStyle;
        previewBox.style.backgroundSize = 'cover';
        previewBox.style.backgroundPosition = 'center';
        
        previewBox.innerHTML = `
            <div class="preview-icon" style="color: ${iconColor}; background: rgba(255,255,255,0.1);">
                <i class="fas ${icon}"></i>
            </div>
            <h3>${name}</h3>
            <p>${description.substring(0, 40)}${description.length > 40 ? '...' : ''}</p>
        `;
    }
    
    // ===== Category Color Pickers =====
    function initCategoryColorPickers() {
        const gradient1Input = document.getElementById('category-gradient1');
        const gradient2Input = document.getElementById('category-gradient2');
        const iconColorInput = document.getElementById('category-icon-color');
        const iconSelect = document.getElementById('category-icon');
        
        if (!gradient1Input || !gradient2Input || !iconColorInput) return;
        
        // Mettre à jour l'aperçu quand les couleurs changent
        [gradient1Input, gradient2Input, iconColorInput].forEach(input => {
            input.addEventListener('input', updateCategoryPreview);
        });
        
        // Mettre à jour quand l'icône change
        if (iconSelect) {
            iconSelect.addEventListener('change', updateCategoryPreview);
        }
    }
    
    // ===== Product Templates =====
    function initProductTemplates() {
        const templatesContainer = document.querySelector('.product-templates-grid');
        if (!templatesContainer) return;
        
        templatesContainer.addEventListener('click', function(e) {
            const template = e.target.closest('.product-template');
            if (!template) return;
            
            // Retirer la sélection des autres templates
            templatesContainer.querySelectorAll('.product-template').forEach(t => {
                t.classList.remove('selected');
            });
            template.classList.add('selected');
            
            // Appliquer les pré-configurations selon le type
            const type = template.dataset.template;
            applyProductTemplate(type);
        });
    }
    
    function applyProductTemplate(type) {
        // Réinitialiser les options
        document.getElementById('product-has-colors')?.click();
        document.getElementById('product-has-sizes')?.click();
        document.getElementById('product-has-materials')?.click();
        
        // Décocher tout d'abord
        const hasColors = document.getElementById('product-has-colors');
        const hasSizes = document.getElementById('product-has-sizes');
        const hasMaterials = document.getElementById('product-has-materials');
        const hasText = document.getElementById('product-has-text');
        const requiresImage = document.getElementById('product-requires-image');
        const allowTextColor = document.getElementById('product-allow-text-color');
        const requiredImagesInput = document.getElementById('product-required-images');
        const requiredImagesConfig = document.getElementById('required-images-config');
        
        if (hasColors?.checked) hasColors.click();
        if (hasSizes?.checked) hasSizes.click();
        if (hasMaterials?.checked) hasMaterials.click();
        if (requiresImage?.checked) requiresImage.click();
        if (allowTextColor?.checked) allowTextColor.click();
        // Récocher le texte par défaut
        if (!hasText?.checked) hasText?.click();
        // Réinitialiser le nombre de photos
        if (requiredImagesInput) requiredImagesInput.value = 1;
        if (requiredImagesConfig) requiredImagesConfig.classList.add('hidden');
        
        // Appliquer selon le type
        switch(type) {
            case 'neon':
                // Néons : couleurs disponibles
                if (!hasColors?.checked) hasColors?.click();
                // Pré-cocher les couleurs néon classiques
                setTimeout(() => {
                    ['#FF0000', '#FF69B4', '#00FF00', '#00FFFF', '#0000FF', '#FFFFFF', '#FFD700'].forEach(color => {
                        const cb = document.querySelector(`input[name="colors"][value="${color}"]`);
                        if (cb && !cb.checked) cb.click();
                    });
                }, 100);
                document.getElementById('product-delivery-days').value = '12';
                break;
                
            case 'wood':
                // Bois : matériaux disponibles
                if (!hasMaterials?.checked) hasMaterials?.click();
                setTimeout(() => {
                    ['Bois naturel', 'Bois peint'].forEach(mat => {
                        const cb = document.querySelector(`input[name="materials"][value="${mat}"]`);
                        if (cb && !cb.checked) cb.click();
                    });
                }, 100);
                document.getElementById('product-delivery-days').value = '14';
                break;
                
            case 'textile':
                // Textile : tailles et couleurs
                if (!hasSizes?.checked) hasSizes?.click();
                if (!hasColors?.checked) hasColors?.click();
                setTimeout(() => {
                    ['S', 'M', 'L', 'XL'].forEach(size => {
                        const cb = document.querySelector(`input[name="sizes"][value="${size}"]`);
                        if (cb && !cb.checked) cb.click();
                    });
                }, 100);
                document.getElementById('product-delivery-days').value = '10';
                break;
                
            case 'poster':
                // Poster : image requise
                if (!requiresImage?.checked) requiresImage?.click();
                document.getElementById('product-delivery-days').value = '7';
                break;
                
            case 'custom':
                // Autre : rien de pré-configuré
                document.getElementById('product-delivery-days').value = '10';
                break;
        }
    }
    
    // ===== Category Image Upload =====
    function initCategoryImageUpload() {
        const uploadZone = document.getElementById('category-image-zone');
        const fileInput = document.getElementById('category-image-input');
        
        if (!uploadZone || !fileInput) return;
        
        uploadZone.addEventListener('click', () => fileInput.click());
        
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleCategoryImageUpload(file);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleCategoryImageUpload(file);
            }
        });
    }
    
    function handleCategoryImageUpload(file) {
        // Convertir en base64 pour stockage simple (ou utiliser Firebase Storage si disponible)
        const reader = new FileReader();
        reader.onload = (e) => {
            currentCategoryImageUrl = e.target.result;
            
            const imagePreview = document.getElementById('category-image-preview');
            const uploadPlaceholder = document.querySelector('#category-image-zone .upload-placeholder');
            
            imagePreview.innerHTML = `
                <img src="${currentCategoryImageUrl}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeCategoryImage()" style="margin-top: 10px;">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            `;
            imagePreview.style.display = 'block';
            if (uploadPlaceholder) uploadPlaceholder.style.display = 'none';
            
            updateCategoryPreview();
        };
        reader.readAsDataURL(file);
    }
    
    window.removeCategoryImage = function() {
        currentCategoryImageUrl = null;
        const imagePreview = document.getElementById('category-image-preview');
        const uploadPlaceholder = document.querySelector('#category-image-zone .upload-placeholder');
        
        imagePreview.style.display = 'none';
        imagePreview.innerHTML = '';
        if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
        document.getElementById('category-image-input').value = '';
        
        updateCategoryPreview();
    };

    // ===== Products =====
    function renderProducts(filterCat = '') {
        let filteredProducts = products;
        if (filterCat) {
            filteredProducts = products.filter(p => {
                // Support ancien format (categoryId) et nouveau format (categoryIds)
                if (p.categoryIds && Array.isArray(p.categoryIds)) {
                    return p.categoryIds.includes(filterCat);
                }
                return p.categoryId === filterCat;
            });
        }
        
        if (filteredProducts.length === 0) {
            elements.productsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="fas fa-box-open"></i><p>Aucun produit</p>
                </div>
            `;
            return;
        }
        
        elements.productsGrid.innerHTML = filteredProducts.map(product => {
            // Support ancien format (categoryId) et nouveau format (categoryIds)
            const productCatIds = product.categoryIds || (product.categoryId ? [product.categoryId] : []);
            const productCategories = productCatIds.map(id => categories.find(c => c.id === id)).filter(Boolean);
            const categoryNames = productCategories.map(c => c.name).join(', ') || 'Sans catégorie';
            return `
                <div class="product-card-admin">
                    <div class="product-card-image">
                        ${product.image 
                            ? `<img src="${product.image}" alt="${product.name}">`
                            : `<i class="fas fa-cube placeholder"></i>`
                        }
                        ${product.badge ? `<span class="product-card-badge">${product.badge}</span>` : ''}
                    </div>
                    <div class="product-card-body">
                        <div class="product-card-category">${categoryNames}</div>
                        <h4>${product.name}</h4>
                        <p>${product.description || ''}</p>
                        <div class="product-card-price">${product.price || 'Prix non défini'}</div>
                        <div class="product-card-actions">
                            <button class="btn btn-sm btn-outline" onclick="editProduct('${product.id}')" title="Modifier">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="duplicateProduct('${product.id}')" title="Dupliquer">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')" title="Supprimer">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    window.editProduct = function(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        // Reset variants form first
        resetVariantsForm();
        
        currentEditId = id;
        document.getElementById('modal-product-title').textContent = 'Modifier le produit';
        document.getElementById('product-id').value = id;
        document.getElementById('product-name').value = product.name;
        
        // Charger les catégories (support ancien et nouveau format)
        const selectedCatIds = product.categoryIds || (product.categoryId ? [product.categoryId] : []);
        updateCategoryCheckboxes(selectedCatIds);
        
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price || '';
        document.getElementById('product-cost').value = product.cost || '';
        // Support ancien format (nombre) et nouveau format (plage)
        const deliveryDaysValue = product.deliveryDays || '8-14';
        document.getElementById('product-delivery-days').value = deliveryDaysValue;
        document.getElementById('product-badge').value = product.badge || '';
        document.getElementById('product-has-text').checked = product.hasText !== false; // true par défaut
        document.getElementById('product-requires-image').checked = product.requiresImage || false;
        document.getElementById('product-allow-text-color').checked = product.allowTextColor || false;
        
        // Nombre de photos requises
        const requiredImagesInput = document.getElementById('product-required-images');
        const requiredImagesConfig = document.getElementById('required-images-config');
        if (requiredImagesInput) {
            requiredImagesInput.value = product.requiredImages || 1;
        }
        if (requiredImagesConfig) {
            if (product.requiresImage) {
                requiredImagesConfig.classList.remove('hidden');
            } else {
                requiredImagesConfig.classList.add('hidden');
            }
        }
        
        elements.productImageUrl.value = '';
        
        // Load product images
        productImages = [];
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            productImages = [...product.images];
        } else if (product.image) {
            productImages = [product.image];
        }
        renderProductImages();
        
        // Load mockup config
        const mockupConfig = document.getElementById('mockup-config');
        if (mockupConfig) {
            if (product.requiresImage) {
                mockupConfig.classList.add('active');
            } else {
                mockupConfig.classList.remove('active');
            }
        }
        
        if (product.mockup) {
            const mockupUrlEl = document.getElementById('product-mockup-url');
            const mockupXEl = document.getElementById('mockup-x');
            const mockupYEl = document.getElementById('mockup-y');
            const mockupWidthEl = document.getElementById('mockup-width');
            const mockupHeightEl = document.getElementById('mockup-height');
            
            if (mockupUrlEl) mockupUrlEl.value = product.mockup.url || '';
            if (mockupXEl) mockupXEl.value = product.mockup.x || 25;
            if (mockupYEl) mockupYEl.value = product.mockup.y || 20;
            if (mockupWidthEl) mockupWidthEl.value = product.mockup.width || 50;
            if (mockupHeightEl) mockupHeightEl.value = product.mockup.height || 60;
            if (typeof updateMockupPreview === 'function') updateMockupPreview();
        } else {
            const mockupUrlEl = document.getElementById('product-mockup-url');
            const mockupXEl = document.getElementById('mockup-x');
            const mockupYEl = document.getElementById('mockup-y');
            const mockupWidthEl = document.getElementById('mockup-width');
            const mockupHeightEl = document.getElementById('mockup-height');
            
            if (mockupUrlEl) mockupUrlEl.value = '';
            if (mockupXEl) mockupXEl.value = 25;
            if (mockupYEl) mockupYEl.value = 20;
            if (mockupWidthEl) mockupWidthEl.value = 50;
            if (mockupHeightEl) mockupHeightEl.value = 60;
        }
        
        if (product.image) {
            elements.imagePreview?.querySelector('img')?.setAttribute('src', product.image);
            elements.imagePreview?.classList.add('active');
        } else {
            elements.imagePreview?.classList.remove('active');
        }
        
        // Load variants
        loadVariantsForEdit(product);
        
        openModal(elements.modalProduct);
    };
    
    window.duplicateProduct = async function(id) {
        const product = products.find(p => p.id === id);
        if (!product) return;
        
        if (!confirm(`Dupliquer "${product.name}" ?`)) return;
        
        showLoading(true);
        
        try {
            // Créer une copie du produit sans l'ID
            const newProduct = { ...product };
            delete newProduct.id;
            newProduct.name = product.name + ' (copie)';
            newProduct.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Ajouter à Firebase
            const docRef = await db.collection('products').add(newProduct);
            
            // Ajouter à la liste locale
            products.push({ id: docRef.id, ...newProduct });
            renderProducts(elements.filterCategory.value);
            updateStats();
            
            showToast('Produit dupliqué avec succès !');
            
            // Ouvrir en édition
            setTimeout(() => editProduct(docRef.id), 300);
            
        } catch (error) {
            console.error('Erreur duplication:', error);
            showToast('Erreur lors de la duplication', 'error');
        }
        
        showLoading(false);
    };
    
    window.deleteProduct = async function(id) {
        if (!confirm('Supprimer ce produit ?')) return;
        
        showLoading(true);
        
        const success = await deleteProductFromFirebase(id);
        if (success) {
            products = products.filter(p => p.id !== id);
            renderProducts(elements.filterCategory.value);
            updateStats();
            showToast('Produit supprimé');
        }
        
        showLoading(false);
    };
    
    let selectedImageFile = null;
    
    async function saveProduct(e) {
        e.preventDefault();
        
        const name = document.getElementById('product-name').value.trim();
        
        // Récupérer les catégories sélectionnées (checkboxes multiples)
        const categoryIds = [];
        document.querySelectorAll('input[name="product-categories"]:checked').forEach(cb => {
            categoryIds.push(cb.value);
        });
        
        if (categoryIds.length === 0) {
            showToast('Veuillez sélectionner au moins une catégorie', 'error');
            return;
        }
        
        const description = document.getElementById('product-description').value.trim();
        const price = document.getElementById('product-price').value.trim();
        const cost = document.getElementById('product-cost').value.trim();
        const deliveryDays = document.getElementById('product-delivery-days').value.trim();
        const badge = document.getElementById('product-badge').value.trim();
        const hasText = document.getElementById('product-has-text').checked;
        const requiresImage = document.getElementById('product-requires-image').checked;
        const requiredImages = requiresImage ? (parseInt(document.getElementById('product-required-images')?.value) || 1) : 0;
        const allowTextColor = document.getElementById('product-allow-text-color').checked;
        const editId = document.getElementById('product-id').value;
        
        // Images multiples - prendre le tableau, ou l'URL simple si le tableau est vide
        const singleImageUrl = elements.productImageUrl.value.trim();
        if (singleImageUrl && !productImages.includes(singleImageUrl)) {
            productImages.push(singleImageUrl);
        }
        const images = [...productImages];
        const mainImage = images.length > 0 ? images[0] : null;
        
        // Mockup configuration (si les éléments existent)
        const mockupUrlEl = document.getElementById('product-mockup-url');
        const mockupUrl = mockupUrlEl ? mockupUrlEl.value.trim() : '';
        let mockupConfig = null;
        if (requiresImage && mockupUrl) {
            mockupConfig = {
                url: mockupUrl,
                x: parseInt(document.getElementById('mockup-x')?.value) || 25,
                y: parseInt(document.getElementById('mockup-y')?.value) || 20,
                width: parseInt(document.getElementById('mockup-width')?.value) || 50,
                height: parseInt(document.getElementById('mockup-height')?.value) || 60
            };
        }
        
        // Get variants
        const colors = getSelectedColors();
        const textColors = getSelectedTextColors();
        const sizes = getSelectedSizes();
        const materials = getSelectedMaterials();
        const customOptions = getCustomOptions();
        const productSaleOptions = getSaleOptions();
        const stockMatrix = getStockMatrix();
        const sizePrices = getSizePrices();
        
        showLoading(true);
        
        const productId = editId || generateId();
        
        const product = {
            id: productId,
            name,
            categoryIds,
            categoryId: categoryIds[0], // Rétrocompatibilité avec l'ancien format
            description,
            price,
            cost: cost ? parseFloat(cost) : null,
            deliveryDays: deliveryDays || '8-14',
            badge: badge || null,
            image: mainImage,
            images: images,
            hasText: hasText,
            requiresImage: requiresImage,
            requiredImages: requiredImages,
            allowTextColor: allowTextColor,
            textColors: textColors,
            mockup: mockupConfig,
            colors: colors,
            sizes: sizes,
            sizePrices: sizePrices,
            stockMatrix: stockMatrix,
            materials: materials,
            customOptions: customOptions,
            saleOptions: productSaleOptions,
            updatedAt: new Date().toISOString()
        };
        
        const success = await saveProductToFirebase(product);
        
        if (success) {
            if (editId) {
                const index = products.findIndex(p => p.id === editId);
                if (index > -1) products[index] = product;
                showToast('Produit modifié');
            } else {
                products.push(product);
                showToast('Produit créé ✓');
            }
            
            renderProducts(elements.filterCategory.value);
            updateStats();
            
            // Mode "création en série" : on garde le modal ouvert si coché
            const keepOpenCheckbox = document.getElementById('keep-open-after-save');
            if (keepOpenCheckbox && keepOpenCheckbox.checked && !editId) {
                // Réinitialiser le formulaire mais garder le modal ouvert
                resetProductForm();
                // Focus sur le champ nom pour enchaîner
                document.getElementById('product-name').focus();
            } else {
                closeModal(elements.modalProduct);
                resetProductForm();
            }
        }
        
        showLoading(false);
    }
    
    function resetProductForm() {
        elements.productForm.reset();
        document.getElementById('product-id').value = '';
        elements.productImageUrl.value = '';
        document.getElementById('product-requires-image').checked = false;
        document.getElementById('product-allow-text-color').checked = false;
        document.getElementById('modal-product-title').textContent = 'Nouveau produit';
        elements.imagePreview?.classList.remove('active');
        
        // Reset product images array
        productImages = [];
        renderProductImages();
        
        // Reset cost and delivery days
        document.getElementById('product-cost').value = '';
        document.getElementById('product-delivery-days').value = 10;
        
        // Reset badge
        document.getElementById('product-badge').value = '';
        
        // Reset mockup config (si les éléments existent)
        const mockupUrl = document.getElementById('product-mockup-url');
        const mockupX = document.getElementById('mockup-x');
        const mockupY = document.getElementById('mockup-y');
        const mockupWidth = document.getElementById('mockup-width');
        const mockupHeight = document.getElementById('mockup-height');
        const mockupImg = document.getElementById('mockup-preview-img');
        const mockupZone = document.getElementById('mockup-zone');
        
        if (mockupUrl) mockupUrl.value = '';
        if (mockupX) mockupX.value = 25;
        if (mockupY) mockupY.value = 20;
        if (mockupWidth) mockupWidth.value = 50;
        if (mockupHeight) mockupHeight.value = 60;
        if (mockupImg) mockupImg.src = '';
        if (mockupZone) mockupZone.style.display = 'none';
        
        // Reset template selection
        document.querySelectorAll('.product-template').forEach(t => t.classList.remove('selected'));
        
        // Fermer les options avancées
        const advancedOptions = document.querySelector('#modal-product .advanced-options');
        if (advancedOptions) advancedOptions.removeAttribute('open');
        
        // Reset category checkboxes (décocher toutes les catégories)
        updateCategoryCheckboxes([]);
        
        // Reset variants
        resetVariantsForm();
    }
    
    // ===== VARIANTS MANAGEMENT =====
    let customProductOptions = [];
    let saleOptions = []; // Options de vente (lots, packs)
    
    function initVariantsHandlers() {
        // Toggle colors options
        const hasColorsCheckbox = document.getElementById('product-has-colors');
        const colorsOptions = document.getElementById('colors-options');
        if (hasColorsCheckbox && colorsOptions) {
            hasColorsCheckbox.addEventListener('change', function() {
                colorsOptions.classList.toggle('hidden', !this.checked);
                updateStockMatrix();
            });
        }
        
        // Listen for color selection changes to update stock matrix
        document.getElementById('color-picker-grid').addEventListener('change', function(e) {
            if (e.target.name === 'colors') {
                updateStockMatrix();
            }
        });
        
        // Toggle text colors options
        const allowTextColorCheckbox = document.getElementById('product-allow-text-color');
        const textColorsOptions = document.getElementById('text-colors-options');
        if (allowTextColorCheckbox && textColorsOptions) {
            allowTextColorCheckbox.addEventListener('change', function() {
                textColorsOptions.classList.toggle('hidden', !this.checked);
            });
        }
        
        // Toggle sizes options
        const hasSizesCheckbox = document.getElementById('product-has-sizes');
        const sizesOptions = document.getElementById('sizes-options');
        if (hasSizesCheckbox && sizesOptions) {
            hasSizesCheckbox.addEventListener('change', function() {
                sizesOptions.classList.toggle('hidden', !this.checked);
                updateStockMatrix();
                updateSizePricesGrid();
            });
        }
        
        // Listen for size selection changes to update stock matrix
        document.getElementById('size-picker-grid').addEventListener('change', function(e) {
            if (e.target.name === 'sizes') {
                updateStockMatrix();
                updateSizePricesGrid();
            }
        });
        
        // Toggle size prices option
        const hasSizePricesCheckbox = document.getElementById('product-has-size-prices');
        const sizePricesContainer = document.getElementById('size-prices-container');
        if (hasSizePricesCheckbox && sizePricesContainer) {
            hasSizePricesCheckbox.addEventListener('change', function() {
                sizePricesContainer.classList.toggle('hidden', !this.checked);
                if (this.checked) {
                    updateSizePricesGrid();
                }
            });
        }
        
        // Toggle materials options
        const hasMaterialsCheckbox = document.getElementById('product-has-materials');
        const materialsOptions = document.getElementById('materials-options');
        if (hasMaterialsCheckbox && materialsOptions) {
            hasMaterialsCheckbox.addEventListener('change', function() {
                materialsOptions.classList.toggle('hidden', !this.checked);
            });
        }
        
        // Toggle custom options
        const hasCustomOptionsCheckbox = document.getElementById('product-has-custom-options');
        const customOptions = document.getElementById('custom-options');
        if (hasCustomOptionsCheckbox && customOptions) {
            hasCustomOptionsCheckbox.addEventListener('change', function() {
                customOptions.classList.toggle('hidden', !this.checked);
            });
        }
        
        // Add custom size
        const addCustomSizeBtn = document.getElementById('add-custom-size');
        if (addCustomSizeBtn) {
            addCustomSizeBtn.addEventListener('click', function() {
                const sizeInput = document.getElementById('custom-size-value');
                if (sizeInput.value.trim()) {
                    addSizeToGrid(sizeInput.value.trim());
                    sizeInput.value = '';
                }
            });
        }
        
        // Add custom color
        const addCustomColorBtn = document.getElementById('add-custom-color');
        if (addCustomColorBtn) {
            addCustomColorBtn.addEventListener('click', function() {
                const colorPicker = document.getElementById('custom-color-picker');
                const colorNameInput = document.getElementById('custom-color-name');
                const colorHex = colorPicker.value;
                const colorName = colorNameInput.value.trim() || colorHex;
                addColorToGrid(colorHex, colorName);
                colorNameInput.value = '';
            });
        }
        
        // Add custom text color
        const addCustomTextColorBtn = document.getElementById('add-custom-text-color');
        if (addCustomTextColorBtn) {
            addCustomTextColorBtn.addEventListener('click', function() {
                const colorPicker = document.getElementById('custom-text-color-picker');
                const colorNameInput = document.getElementById('custom-text-color-name');
                const colorHex = colorPicker.value.toUpperCase();
                const colorName = colorNameInput.value.trim() || colorHex;
                addTextColorToGrid(colorHex, colorName);
                colorNameInput.value = '';
            });
        }
        
        // Add custom material
        const addCustomMaterialBtn = document.getElementById('add-custom-material');
        if (addCustomMaterialBtn) {
            addCustomMaterialBtn.addEventListener('click', function() {
                const materialInput = document.getElementById('custom-material-value');
                if (materialInput.value.trim()) {
                    addMaterialToGrid(materialInput.value.trim());
                    materialInput.value = '';
                }
            });
        }
        
        // Add custom option
        const addCustomOptionBtn = document.getElementById('add-custom-option');
        if (addCustomOptionBtn) {
            addCustomOptionBtn.addEventListener('click', function() {
                const optionName = document.getElementById('custom-option-name');
                const optionValues = document.getElementById('custom-option-values');
                if (optionName.value.trim() && optionValues.value.trim()) {
                    const values = optionValues.value.split(',').map(v => v.trim()).filter(v => v);
                    addCustomOption(optionName.value.trim(), values);
                    optionName.value = '';
                    optionValues.value = '';
                }
            });
        }
        
        // Toggle sale options
        const hasSaleOptionsCheckbox = document.getElementById('product-has-sale-options');
        const saleOptionsDiv = document.getElementById('sale-options');
        if (hasSaleOptionsCheckbox && saleOptionsDiv) {
            hasSaleOptionsCheckbox.addEventListener('change', function() {
                saleOptionsDiv.classList.toggle('hidden', !this.checked);
            });
        }
        
        // Add sale option
        const addSaleOptionBtn = document.getElementById('add-sale-option');
        if (addSaleOptionBtn) {
            addSaleOptionBtn.addEventListener('click', function() {
                const nameInput = document.getElementById('sale-option-name');
                const priceInput = document.getElementById('sale-option-price');
                const qtyInput = document.getElementById('sale-option-quantity');
                
                const name = nameInput.value.trim();
                const price = parseFloat(priceInput.value);
                const quantity = parseInt(qtyInput.value) || 1;
                
                if (name && !isNaN(price) && price >= 0) {
                    addSaleOption(name, price, quantity);
                    nameInput.value = '';
                    priceInput.value = '';
                    qtyInput.value = '1';
                } else {
                    alert('Veuillez remplir le nom et le prix de l\'option');
                }
            });
        }
    }
    
    function addColorToGrid(colorHex, colorName) {
        const grid = document.getElementById('color-picker-grid');
        const label = document.createElement('label');
        label.className = 'color-option';
        label.innerHTML = `
            <input type="checkbox" name="colors" value="${colorHex}" data-name="${colorName}" checked>
            <span class="color-swatch" style="background:${colorHex}"></span>
            <span class="color-name">${colorName}</span>
        `;
        grid.appendChild(label);
        // Update stock matrix after adding
        setTimeout(updateStockMatrix, 50);
    }
    
    function addTextColorToGrid(colorHex, colorName) {
        const grid = document.getElementById('text-color-picker-grid');
        // Check if color already exists
        const existingInput = grid.querySelector(`input[value="${colorHex}"]`);
        if (existingInput) {
            existingInput.checked = true;
            return;
        }
        
        const label = document.createElement('label');
        label.className = 'color-option';
        const isWhite = colorHex.toUpperCase() === '#FFFFFF';
        label.innerHTML = `
            <input type="checkbox" name="textColors" value="${colorHex}" data-name="${colorName}" checked>
            <span class="color-swatch" style="background:${colorHex}; ${isWhite ? 'border:1px solid #ccc;' : ''}"></span>
            <span class="color-name">${colorName}</span>
        `;
        grid.appendChild(label);
    }
    
    function addSizeToGrid(sizeValue) {
        const grid = document.getElementById('size-picker-grid');
        const label = document.createElement('label');
        label.className = 'size-option';
        label.innerHTML = `
            <input type="checkbox" name="sizes" value="${sizeValue}" checked>
            <span class="size-tag">${sizeValue}</span>
        `;
        grid.appendChild(label);
        // Update stock matrix after adding
        setTimeout(updateStockMatrix, 50);
    }
    
    // Stock matrix data storage
    let stockMatrixData = {};
    
    // Update stock matrix table
    function updateStockMatrix(existingMatrix = null) {
        const matrixContainer = document.getElementById('stock-matrix-management');
        const tableHeader = document.getElementById('stock-matrix-header');
        const tableBody = document.getElementById('stock-matrix-body');
        
        if (!matrixContainer || !tableHeader || !tableBody) return;
        
        // Get selected colors
        const selectedColors = [];
        document.querySelectorAll('input[name="colors"]:checked').forEach(input => {
            selectedColors.push({
                hex: input.value,
                name: input.dataset.name || input.value
            });
        });
        
        // Get selected sizes
        const selectedSizes = [];
        document.querySelectorAll('input[name="sizes"]:checked').forEach(input => {
            selectedSizes.push(input.value);
        });
        
        const hasColors = document.getElementById('product-has-colors')?.checked && selectedColors.length > 0;
        const hasSizes = document.getElementById('product-has-sizes')?.checked && selectedSizes.length > 0;
        
        // Show matrix if both colors AND sizes are selected
        // If only sizes are available (no colors), show simple size stock management
        if (hasColors && hasSizes) {
            matrixContainer.style.display = 'block';
            
            // Build header row
            tableHeader.innerHTML = `
                <tr>
                    <th class="matrix-corner"></th>
                    ${selectedSizes.map(size => `<th class="matrix-size-header">${size}</th>`).join('')}
                    <th class="matrix-action-header">
                        <span title="Cocher/décocher toute la ligne">Ligne</span>
                    </th>
                </tr>
            `;
            
            // Build body rows
            tableBody.innerHTML = selectedColors.map(color => {
                const colorKey = color.hex;
                
                return `
                    <tr data-color="${colorKey}">
                        <td class="matrix-color-cell">
                            <span class="matrix-color-swatch" style="background: ${color.hex}; ${color.hex.toUpperCase() === '#FFFFFF' ? 'border: 1px solid #ccc;' : ''}"></span>
                            <span class="matrix-color-name">${color.name}</span>
                        </td>
                        ${selectedSizes.map(size => {
                            // Check if we have existing data
                            let inStock = true;
                            if (existingMatrix && existingMatrix[colorKey]) {
                                inStock = existingMatrix[colorKey][size] !== false;
                            } else if (stockMatrixData[colorKey]) {
                                inStock = stockMatrixData[colorKey][size] !== false;
                            }
                            
                            return `
                                <td class="matrix-stock-cell">
                                    <input type="checkbox" 
                                           class="matrix-checkbox" 
                                           data-color="${colorKey}" 
                                           data-size="${size}" 
                                           ${inStock ? 'checked' : ''}
                                           title="${color.name} - ${size}">
                                </td>
                            `;
                        }).join('')}
                        <td class="matrix-row-action">
                            <button type="button" class="btn-matrix-row" data-color="${colorKey}" title="Basculer toute la ligne">
                                <i class="fas fa-toggle-on"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Add column action row
            tableBody.innerHTML += `
                <tr class="matrix-column-actions">
                    <td class="matrix-action-label">Colonne</td>
                    ${selectedSizes.map(size => `
                        <td class="matrix-col-action">
                            <button type="button" class="btn-matrix-col" data-size="${size}" title="Basculer toute la colonne">
                                <i class="fas fa-toggle-on"></i>
                            </button>
                        </td>
                    `).join('')}
                    <td></td>
                </tr>
            `;
            
            // Add event listeners for row toggle buttons
            tableBody.querySelectorAll('.btn-matrix-row').forEach(btn => {
                btn.addEventListener('click', function() {
                    const colorKey = this.dataset.color;
                    const checkboxes = tableBody.querySelectorAll(`input[data-color="${colorKey}"]`);
                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    checkboxes.forEach(cb => cb.checked = !allChecked);
                });
            });
            
            // Add event listeners for column toggle buttons
            tableBody.querySelectorAll('.btn-matrix-col').forEach(btn => {
                btn.addEventListener('click', function() {
                    const size = this.dataset.size;
                    const checkboxes = tableBody.querySelectorAll(`input[data-size="${size}"]`);
                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    checkboxes.forEach(cb => cb.checked = !allChecked);
                });
            });
            
        } else {
            matrixContainer.style.display = 'none';
        }
        
        // Setup matrix action buttons
        setupStockMatrixActions();
    }
    
    // Variable to store size prices temporarily
    let sizePricesData = {};
    
    // Update size prices grid
    function updateSizePricesGrid(existingPrices = null) {
        const container = document.getElementById('size-prices-grid');
        const hasSizePrices = document.getElementById('product-has-size-prices');
        
        if (!container) return;
        
        // Get selected sizes
        const selectedSizes = [];
        document.querySelectorAll('input[name="sizes"]:checked').forEach(input => {
            selectedSizes.push(input.value);
        });
        
        if (selectedSizes.length === 0) {
            container.innerHTML = '<p style="color: #888; font-size: 0.85rem;">Sélectionnez d\'abord des tailles ci-dessus.</p>';
            return;
        }
        
        // Get base price for placeholder
        const basePrice = document.getElementById('product-price')?.value || '';
        
        // Build the price inputs grid
        container.innerHTML = selectedSizes.map(size => {
            // Check existing price
            let priceValue = '';
            if (existingPrices && existingPrices[size] !== undefined) {
                priceValue = existingPrices[size];
            } else if (sizePricesData[size] !== undefined) {
                priceValue = sizePricesData[size];
            }
            
            return `
                <div class="size-price-item">
                    <label>
                        <span class="size-badge">${size}</span>
                    </label>
                    <input type="number" 
                           step="0.01" 
                           min="0" 
                           class="size-price-input"
                           data-size="${size}"
                           value="${priceValue}"
                           placeholder="${basePrice ? basePrice + '€' : 'Prix de base'}">
                </div>
            `;
        }).join('');
        
        // Add event listeners to save values temporarily
        container.querySelectorAll('.size-price-input').forEach(input => {
            input.addEventListener('change', function() {
                sizePricesData[this.dataset.size] = this.value ? parseFloat(this.value) : null;
            });
            input.addEventListener('input', function() {
                sizePricesData[this.dataset.size] = this.value ? parseFloat(this.value) : null;
            });
        });
    }
    
    // Get size prices for saving
    function getSizePrices() {
        const hasSizePrices = document.getElementById('product-has-size-prices')?.checked;
        if (!hasSizePrices) return null;
        
        const prices = {};
        document.querySelectorAll('.size-price-input').forEach(input => {
            const size = input.dataset.size;
            const value = input.value ? parseFloat(input.value) : null;
            if (value !== null && !isNaN(value)) {
                prices[size] = value;
            }
        });
        
        return Object.keys(prices).length > 0 ? prices : null;
    }
    
    // Setup stock matrix actions (all/none buttons)
    function setupStockMatrixActions() {
        const allBtn = document.getElementById('stock-matrix-all');
        const noneBtn = document.getElementById('stock-matrix-none');
        
        if (allBtn) {
            allBtn.onclick = function() {
                document.querySelectorAll('.matrix-checkbox').forEach(cb => cb.checked = true);
            };
        }
        
        if (noneBtn) {
            noneBtn.onclick = function() {
                document.querySelectorAll('.matrix-checkbox').forEach(cb => cb.checked = false);
            };
        }
    }
    
    // Get stock matrix data for saving
    function getStockMatrix() {
        const matrix = {};
        document.querySelectorAll('.matrix-checkbox').forEach(cb => {
            const color = cb.dataset.color;
            const size = cb.dataset.size;
            if (!matrix[color]) matrix[color] = {};
            matrix[color][size] = cb.checked;
        });
        return Object.keys(matrix).length > 0 ? matrix : null;
    }
    
    function addMaterialToGrid(materialValue) {
        const grid = document.getElementById('material-picker-grid');
        const label = document.createElement('label');
        label.className = 'material-option';
        label.innerHTML = `
            <input type="checkbox" name="materials" value="${materialValue}" checked>
            <span class="material-tag"><i class="fas fa-cube"></i> ${materialValue}</span>
        `;
        grid.appendChild(label);
    }
    
    function addCustomOption(name, values) {
        customProductOptions.push({ name, values });
        renderCustomOptionsList();
    }
    
    function removeCustomOption(index) {
        customProductOptions.splice(index, 1);
        renderCustomOptionsList();
    }
    
    function renderCustomOptionsList() {
        const list = document.getElementById('custom-options-list');
        if (!list) return;
        
        list.innerHTML = customProductOptions.map((opt, i) => `
            <div class="custom-option-item">
                <div class="option-info">
                    <span class="option-name">${opt.name}</span>
                    <span class="option-values">${opt.values.join(', ')}</span>
                </div>
                <button type="button" class="btn-remove" onclick="window.removeCustomProductOption(${i})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    // Expose to window for onclick
    window.removeCustomProductOption = function(index) {
        removeCustomOption(index);
    };
    
    // ===== SALE OPTIONS (LOTS, PACKS) =====
    function addSaleOption(name, price, quantity) {
        saleOptions.push({ name, price, quantity });
        renderSaleOptionsList();
    }
    
    function removeSaleOption(index) {
        saleOptions.splice(index, 1);
        renderSaleOptionsList();
    }
    
    function renderSaleOptionsList() {
        const list = document.getElementById('sale-options-list');
        if (!list) return;
        
        list.innerHTML = saleOptions.map((opt, i) => `
            <div class="sale-option-item">
                <div class="option-info">
                    <span class="option-name">${opt.name}</span>
                    <span class="option-details">${opt.price.toFixed(2)}€ ${opt.quantity > 1 ? `(${opt.quantity} pièces)` : ''}</span>
                </div>
                <button type="button" class="btn-remove" onclick="window.removeSaleOption(${i})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
    
    window.removeSaleOption = function(index) {
        removeSaleOption(index);
    };
    
    function getSaleOptions() {
        const hasSaleOptions = document.getElementById('product-has-sale-options');
        if (!hasSaleOptions || !hasSaleOptions.checked || saleOptions.length === 0) return null;
        return saleOptions;
    }
    
    function getSelectedColors() {
        const hasColors = document.getElementById('product-has-colors').checked;
        if (!hasColors) return null;
        
        const stockMatrix = getStockMatrix();
        const selected = [];
        document.querySelectorAll('input[name="colors"]:checked').forEach(input => {
            const colorHex = input.value;
            // Determine if color has any size in stock (if matrix exists)
            let inStock = true;
            if (stockMatrix && stockMatrix[colorHex]) {
                // Color is out of stock only if ALL sizes are out of stock
                inStock = Object.values(stockMatrix[colorHex]).some(val => val === true);
            }
            
            selected.push({
                hex: colorHex,
                name: input.dataset.name || input.value,
                inStock: inStock
            });
        });
        return selected.length > 0 ? selected : null;
    }
    
    function getSelectedTextColors() {
        const allowTextColor = document.getElementById('product-allow-text-color').checked;
        if (!allowTextColor) return null;
        
        const selected = [];
        document.querySelectorAll('input[name="textColors"]:checked').forEach(input => {
            selected.push({
                hex: input.value,
                name: input.dataset.name || input.value
            });
        });
        return selected.length > 0 ? selected : null;
    }
    
    function getSelectedSizes() {
        const hasSizes = document.getElementById('product-has-sizes').checked;
        if (!hasSizes) return null;
        
        const stockMatrix = getStockMatrix();
        const selected = [];
        document.querySelectorAll('input[name="sizes"]:checked').forEach(input => {
            const sizeValue = input.value;
            // Determine if size has any color in stock (if matrix exists)
            let inStock = true;
            if (stockMatrix) {
                // Size is out of stock only if ALL colors have this size out of stock
                inStock = Object.keys(stockMatrix).some(colorKey => 
                    stockMatrix[colorKey][sizeValue] === true
                );
            }
            
            selected.push({
                value: sizeValue,
                inStock: inStock
            });
        });
        return selected.length > 0 ? selected : null;
    }
    
    function getSelectedMaterials() {
        const hasMaterials = document.getElementById('product-has-materials').checked;
        if (!hasMaterials) return null;
        
        const selected = [];
        document.querySelectorAll('input[name="materials"]:checked').forEach(input => {
            selected.push(input.value);
        });
        return selected.length > 0 ? selected : null;
    }
    
    function getCustomOptions() {
        const hasCustomOptionsEl = document.getElementById('product-has-custom-options');
        const hasCustomOptions = hasCustomOptionsEl ? hasCustomOptionsEl.checked : false;
        if (!hasCustomOptions || customProductOptions.length === 0) return null;
        return customProductOptions;
    }
    
    function resetVariantsForm() {
        // Reset checkboxes
        const checkboxIds = ['product-has-colors', 'product-has-sizes', 'product-has-materials', 'product-has-custom-options', 'product-has-sale-options', 'product-allow-text-color', 'product-has-size-prices'];
        checkboxIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = false;
        });
        
        // Hide all variant options
        const optionIds = ['colors-options', 'sizes-options', 'materials-options', 'custom-options', 'sale-options', 'text-colors-options', 'size-prices-container'];
        optionIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        // Uncheck all color/size/material/text color checkboxes
        document.querySelectorAll('input[name="colors"], input[name="sizes"], input[name="materials"], input[name="textColors"]').forEach(input => {
            input.checked = false;
        });
        
        // Clear stock matrix
        const matrixContainer = document.getElementById('stock-matrix-management');
        if (matrixContainer) matrixContainer.style.display = 'none';
        stockMatrixData = {};
        
        // Clear size prices
        sizePricesData = {};
        const sizePricesGrid = document.getElementById('size-prices-grid');
        if (sizePricesGrid) sizePricesGrid.innerHTML = '';
        
        // Reset custom options
        customProductOptions = [];
        renderCustomOptionsList();
        
        // Reset sale options
        saleOptions = [];
        renderSaleOptionsList();
    }
    
    function loadVariantsForEdit(product) {
        // Store stock matrix for loading
        if (product.stockMatrix) {
            stockMatrixData = product.stockMatrix;
        }
        
        // Load colors
        if (product.colors && product.colors.length > 0) {
            document.getElementById('product-has-colors').checked = true;
            document.getElementById('colors-options').classList.remove('hidden');
            product.colors.forEach(color => {
                const input = document.querySelector(`input[name="colors"][value="${color.hex}"]`);
                if (input) {
                    input.checked = true;
                } else {
                    addColorToGrid(color.hex, color.name);
                }
            });
        }
        
        // Load text colors
        if (product.textColors && product.textColors.length > 0) {
            document.getElementById('product-allow-text-color').checked = true;
            document.getElementById('text-colors-options').classList.remove('hidden');
            product.textColors.forEach(color => {
                const input = document.querySelector(`input[name="textColors"][value="${color.hex}"]`);
                if (input) {
                    input.checked = true;
                } else {
                    // Add custom color that's not in the default grid
                    addTextColorToGrid(color.hex, color.name);
                }
            });
        }
        
        // Load sizes
        if (product.sizes && product.sizes.length > 0) {
            document.getElementById('product-has-sizes').checked = true;
            document.getElementById('sizes-options').classList.remove('hidden');
            product.sizes.forEach(size => {
                // Support both old format (string) and new format (object with inStock)
                const sizeValue = typeof size === 'object' ? size.value : size;
                const input = document.querySelector(`input[name="sizes"][value="${sizeValue}"]`);
                if (input) {
                    input.checked = true;
                } else {
                    addSizeToGrid(sizeValue);
                }
            });
        }
        
        // Load size prices
        if (product.sizePrices && Object.keys(product.sizePrices).length > 0) {
            document.getElementById('product-has-size-prices').checked = true;
            document.getElementById('size-prices-container').classList.remove('hidden');
            sizePricesData = { ...product.sizePrices };
            setTimeout(() => updateSizePricesGrid(product.sizePrices), 100);
        } else {
            sizePricesData = {};
        }
        
        // Update stock matrix after colors and sizes are loaded (with longer delay to ensure DOM is ready)
        setTimeout(() => {
            updateStockMatrix(product.stockMatrix);
        }, 200);
        
        // Load materials
        if (product.materials && product.materials.length > 0) {
            document.getElementById('product-has-materials').checked = true;
            document.getElementById('materials-options').classList.remove('hidden');
            product.materials.forEach(material => {
                const input = document.querySelector(`input[name="materials"][value="${material}"]`);
                if (input) {
                    input.checked = true;
                } else {
                    addMaterialToGrid(material);
                }
            });
        }
        
        // Load custom options
        if (product.customOptions && product.customOptions.length > 0) {
            document.getElementById('product-has-custom-options').checked = true;
            document.getElementById('custom-options').classList.remove('hidden');
            customProductOptions = [...product.customOptions];
            renderCustomOptionsList();
        }
        
        // Load sale options
        if (product.saleOptions && product.saleOptions.length > 0) {
            document.getElementById('product-has-sale-options').checked = true;
            document.getElementById('sale-options').classList.remove('hidden');
            saleOptions = [...product.saleOptions];
            renderSaleOptionsList();
        }
    }
    
    // Mockup preview functions
    function updateMockupPreview() {
        const mockupUrlEl = document.getElementById('product-mockup-url');
        const mockupImg = document.getElementById('mockup-preview-img');
        const mockupZone = document.getElementById('mockup-zone');
        
        if (!mockupUrlEl || !mockupImg || !mockupZone) return;
        
        const mockupUrl = mockupUrlEl.value.trim();
        
        if (mockupUrl) {
            mockupImg.src = mockupUrl;
            mockupImg.onload = function() {
                updateMockupZone();
            };
        } else {
            mockupImg.src = '';
            mockupZone.style.display = 'none';
        }
    }
    
    function updateMockupZone() {
        const mockupZone = document.getElementById('mockup-zone');
        const mockupX = document.getElementById('mockup-x');
        const mockupY = document.getElementById('mockup-y');
        const mockupWidth = document.getElementById('mockup-width');
        const mockupHeight = document.getElementById('mockup-height');
        
        if (!mockupZone || !mockupX || !mockupY || !mockupWidth || !mockupHeight) return;
        
        const x = parseInt(mockupX.value) || 0;
        const y = parseInt(mockupY.value) || 0;
        const width = parseInt(mockupWidth.value) || 50;
        const height = parseInt(mockupHeight.value) || 50;
        
        mockupZone.style.display = 'block';
        mockupZone.style.left = x + '%';
        mockupZone.style.top = y + '%';
        mockupZone.style.width = width + '%';
        mockupZone.style.height = height + '%';
    }

    function updateImagePreview() {
        const url = elements.productImageUrl?.value?.trim();
        const img = elements.imagePreview?.querySelector('img');
        
        if (url && img) {
            // Test if image loads correctly
            img.onload = function() {
                elements.imagePreview?.classList.add('active');
            };
            img.onerror = function() {
                console.error('Failed to load image:', url);
                elements.imagePreview?.classList.remove('active');
            };
            img.src = url;
        } else {
            elements.imagePreview?.classList.remove('active');
        }
    }
    
    function removeImage() {
        if (elements.productImageUrl) elements.productImageUrl.value = '';
        elements.imagePreview?.classList.remove('active');
    }
    
    // ===== Settings =====
    async function changePassword(e) {
        e.preventDefault();
        
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;
        
        if (newPass !== confirmPass) {
            showToast('Les mots de passe ne correspondent pas', 'error');
            return;
        }
        
        if (newPass.length < 4) {
            showToast('Mot de passe trop court (min 4 caractères)', 'error');
            return;
        }
        
        try {
            await db.collection('settings').doc('admin').set({ password: newPass });
            elements.passwordForm.reset();
            showToast('Mot de passe modifié');
        } catch (error) {
            console.error('Error changing password:', error);
            showToast('Erreur', 'error');
        }
    }
    
    function exportData() {
        const data = {
            categories: categories,
            products: products,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `family-custom-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('Données exportées');
    }
    
    async function resetData() {
        if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ?')) return;
        if (!confirm('Cette action est irréversible. Continuer ?')) return;
        
        showLoading(true);
        
        try {
            const catSnapshot = await db.collection('categories').get();
            const batch1 = db.batch();
            catSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
            await batch1.commit();
            
            const prodSnapshot = await db.collection('products').get();
            const batch2 = db.batch();
            prodSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
            await batch2.commit();
            
            // Garder le flag initialized pour éviter la réinjection des données par défaut
            await markAsInitialized();
            
            categories = [];
            products = [];
            
            renderCategories();
            renderProducts();
            updateCategorySelects();
            updateStats();
            
            showToast('Données supprimées');
        } catch (error) {
            console.error('Reset error:', error);
            showToast('Erreur', 'error');
        }
        
        showLoading(false);
    }
    
    // ===== Event Listeners =====
    function initEventListeners() {
        elements.loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            showLoading(true);
            const email = elements.loginEmail.value;
            const password = elements.loginPassword.value;
            await login(email, password);
            showLoading(false);
        });
        
        elements.logoutBtn.addEventListener('click', logout);
        
        elements.navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                switchSection(this.dataset.section);
            });
        });
        
        document.querySelectorAll('.action-card').forEach(card => {
            card.addEventListener('click', function() {
                const action = this.dataset.action;
                if (action === 'add-category') {
                    switchSection('categories');
                    resetCategoryForm();
                    openModal(elements.modalCategory);
                } else if (action === 'add-product') {
                    switchSection('products');
                    resetProductForm();
                    openModal(elements.modalProduct);
                }
            });
        });
        
        elements.btnAddCategory.addEventListener('click', function() {
            resetCategoryForm();
            openModal(elements.modalCategory);
        });
        
        elements.categoryForm.addEventListener('submit', saveCategory);
        elements.categoryIcon.addEventListener('change', () => {
            updateIconPreview();
            updateCategoryPreview();
        });
        
        // Event listeners pour la prévisualisation en temps réel des catégories
        const categoryPreviewInputs = ['category-name', 'category-description', 'category-gradient1', 'category-gradient2', 'category-icon-color', 'category-text-style'];
        categoryPreviewInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateCategoryPreview);
                el.addEventListener('change', updateCategoryPreview);
            }
        });
        
        // Event listeners pour les color pickers de catégorie
        initCategoryColorPickers();
        
        // Event listeners pour les templates de produit
        initProductTemplates();
        
        // Initialiser l'upload d'image de catégorie
        initCategoryImageUpload();
        
        elements.btnAddProduct.addEventListener('click', function() {
            resetProductForm();
            openModal(elements.modalProduct);
        });
        
        elements.productForm.addEventListener('submit', saveProduct);
        
        elements.filterCategory.addEventListener('change', function() {
            renderProducts(this.value);
        });
        
        // Bouton ajouter image
        if (elements.btnAddImage) {
            elements.btnAddImage.addEventListener('click', function() {
                addProductImage(elements.productImageUrl.value);
            });
        }
        
        // Upload image file
        if (elements.uploadImageFile) {
            elements.uploadImageFile.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    uploadImageToPostImages(file);
                    // Reset l'input pour pouvoir re-uploader le même fichier
                    this.value = '';
                }
            });
        }
        
        // Ajouter image avec Entrée
        elements.productImageUrl.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addProductImage(this.value);
            }
        });
        
        // Preview image quand on colle une URL (désactivé, on utilise le bouton maintenant)
        // elements.productImageUrl.addEventListener('input', updateImagePreview);
        // elements.productImageUrl.addEventListener('blur', updateImagePreview);
        
        // Remove image from preview (deprecated - using multi-image now)
        const imagePreviewRemove = elements.imagePreview?.querySelector('.remove-image');
        if (imagePreviewRemove) {
            imagePreviewRemove.addEventListener('click', removeImage);
        }
        
        // Import from URL
        const btnImportUrl = document.getElementById('btn-import-url');
        const importUrlInput = document.getElementById('import-product-url');
        if (btnImportUrl && importUrlInput) {
            btnImportUrl.addEventListener('click', importProductFromUrl);
            importUrlInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    importProductFromUrl();
                }
            });
        }
        
        // Import tabs
        document.querySelectorAll('.import-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.import-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.import-tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById('import-tab-' + this.dataset.tab).classList.add('active');
            });
        });
        
        // Import from paste
        const btnImportPaste = document.getElementById('btn-import-paste');
        if (btnImportPaste) {
            btnImportPaste.addEventListener('click', importFromPastedContent);
        }
        
        // Add pasted image
        const btnAddPasteImage = document.getElementById('btn-add-paste-image');
        if (btnAddPasteImage) {
            btnAddPasteImage.addEventListener('click', function() {
                const input = document.getElementById('import-paste-image');
                if (input.value.trim()) {
                    addProductImage(input.value.trim());
                    input.value = '';
                }
            });
        }
        
        // Mockup config toggle
        const requiresImageCheckbox = document.getElementById('product-requires-image');
        const mockupConfig = document.getElementById('mockup-config');
        const requiredImagesConfig = document.getElementById('required-images-config');
        
        if (requiresImageCheckbox && mockupConfig) {
            requiresImageCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    mockupConfig.classList.add('active');
                    if (requiredImagesConfig) requiredImagesConfig.classList.remove('hidden');
                } else {
                    mockupConfig.classList.remove('active');
                    if (requiredImagesConfig) requiredImagesConfig.classList.add('hidden');
                }
            });
        }
        
        // Mockup preview listeners (optionnel - seulement si les éléments existent)
        const mockupUrlEl = document.getElementById('product-mockup-url');
        const mockupXEl = document.getElementById('mockup-x');
        const mockupYEl = document.getElementById('mockup-y');
        const mockupWidthEl = document.getElementById('mockup-width');
        const mockupHeightEl = document.getElementById('mockup-height');
        
        if (mockupUrlEl) {
            mockupUrlEl.addEventListener('input', updateMockupPreview);
            mockupUrlEl.addEventListener('blur', updateMockupPreview);
        }
        if (mockupXEl) mockupXEl.addEventListener('input', updateMockupZone);
        if (mockupYEl) mockupYEl.addEventListener('input', updateMockupZone);
        if (mockupWidthEl) mockupWidthEl.addEventListener('input', updateMockupZone);
        if (mockupHeightEl) mockupHeightEl.addEventListener('input', updateMockupZone);
        
        elements.passwordForm.addEventListener('submit', changePassword);
        elements.btnExport.addEventListener('click', exportData);
        
        // Orders event listeners
        if (elements.filterOrderStatus) {
            elements.filterOrderStatus.addEventListener('change', function() {
                loadOrders(this.value);
            });
        }
        
        if (elements.btnRefreshOrders) {
            elements.btnRefreshOrders.addEventListener('click', function() {
                const filter = elements.filterOrderStatus ? elements.filterOrderStatus.value : '';
                loadOrders(filter);
                showToast('Commandes actualisées');
            });
        }
        
        if (elements.btnExportOrders) {
            elements.btnExportOrders.addEventListener('click', exportOrdersToExcel);
        }
        
        if (elements.btnUpdateOrderStatus) {
            elements.btnUpdateOrderStatus.addEventListener('click', async function() {
                if (!currentOrderId) return;
                const newStatus = elements.orderStatusSelect.value;
                const success = await updateOrderStatus(currentOrderId, newStatus);
                if (success) {
                    renderOrders();
                    closeModal(elements.modalOrder);
                }
            });
        }
        
        // Order tags
        document.querySelectorAll('.order-tag').forEach(btn => {
            btn.addEventListener('click', function() {
                toggleOrderTag(this.dataset.tag);
            });
        });
        
        // Order checklist
        document.querySelectorAll('#order-checklist input').forEach(input => {
            input.addEventListener('change', function() {
                updateOrderChecklist(this.dataset.check, this.checked);
            });
        });
        
        // Order notes
        const btnSaveNotes = document.getElementById('btn-save-notes');
        if (btnSaveNotes) {
            btnSaveNotes.addEventListener('click', saveOrderNotes);
        }
        
        // Print order
        const btnPrintOrder = document.getElementById('btn-print-order');
        if (btnPrintOrder) {
            btnPrintOrder.addEventListener('click', printOrder);
        }
        
        // Print label
        const btnPrintLabel = document.getElementById('btn-print-label');
        if (btnPrintLabel) {
            btnPrintLabel.addEventListener('click', printLabel);
        }
        
        // Mondial Relay button
        const btnMondialRelay = document.getElementById('btn-mondial-relay');
        if (btnMondialRelay) {
            btnMondialRelay.addEventListener('click', generateMondialRelayLabel);
        }
        
        // Newsletter export button
        const btnExportNewsletter = document.getElementById('btn-export-newsletter');
        if (btnExportNewsletter) {
            btnExportNewsletter.addEventListener('click', exportNewsletterCSV);
        }
        
        // Gift card creation form
        const createGiftCardForm = document.getElementById('create-giftcard-form');
        if (createGiftCardForm) {
            createGiftCardForm.addEventListener('submit', createGiftCard);
        }
        
        // Promo code creation form
        const createPromoCodeForm = document.getElementById('create-promocode-form');
        if (createPromoCodeForm) {
            createPromoCodeForm.addEventListener('submit', createPromoCode);
        }
        
        document.querySelectorAll('.modal-close, .modal-cancel, .modal-overlay').forEach(el => {
            el.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) closeModal(modal);
            });
        });
        
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => closeModal(modal));
            }
        });
    }
    
    // ===== Initialize =====
    function init() {
        initEventListeners();
        initVariantsHandlers();
        initKeyboardShortcuts();
        checkAuth();
        
        // Initialize Support module if available
        if (typeof AdminSupport !== 'undefined') {
            AdminSupport.init();
        }
    }
    
    // ===== Keyboard Shortcuts =====
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+S pour sauvegarder le produit
            if (e.ctrlKey && e.key === 's') {
                const productModal = document.getElementById('modal-product');
                if (productModal && productModal.classList.contains('active')) {
                    e.preventDefault();
                    const form = document.getElementById('product-form');
                    if (form) {
                        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                }
            }
            
            // Echap pour fermer les modals
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    closeModal(activeModal);
                }
            }
        });
        
        // Enter sur le champ d'image pour ajouter l'image
        const imageUrlInput = document.getElementById('product-image-url');
        if (imageUrlInput) {
            imageUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addProductImage();
                }
            });
        }
        
        // Import CSV
        initImportCSV();
    }
    
    // ===== IMPORT CSV SYSTEM =====
    let importedProducts = [];
    
    function initImportCSV() {
        const btnImport = document.getElementById('btn-import-products');
        const modalImport = document.getElementById('modal-import');
        const fileInput = document.getElementById('import-file');
        const btnStartImport = document.getElementById('btn-start-import');
        
        console.log('🔧 Init Import CSV:', { btnImport, modalImport, fileInput, btnStartImport });
        
        if (!btnImport) {
            console.error('❌ Bouton import non trouvé');
            return;
        }
        if (!modalImport) {
            console.error('❌ Modal import non trouvé');
            return;
        }
        
        btnImport.addEventListener('click', () => {
            console.log('📥 Clic sur Importer CSV');
            importedProducts = [];
            if (fileInput) fileInput.value = '';
            const preview = document.getElementById('import-preview');
            const progress = document.getElementById('import-progress');
            if (preview) preview.style.display = 'none';
            if (progress) progress.style.display = 'none';
            if (btnStartImport) btnStartImport.disabled = true;
            openModal(modalImport);
        });
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    parseCSV(event.target.result);
                };
                reader.readAsText(file, 'UTF-8');
            });
        }
        
        if (btnStartImport) {
            btnStartImport.addEventListener('click', startImport);
        }
        
        console.log('✅ Import CSV initialisé');
    }
    
    function parseCSV(content) {
        const lines = content.split('\n').filter(line => line.trim());
        importedProducts = [];
        
        // Skip header if it looks like one
        const startIndex = lines[0].toLowerCase().includes('nom') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(';').map(p => p.trim());
            if (parts.length >= 2 && parts[0]) {
                importedProducts.push({
                    name: parts[0],
                    price: parseFloat(parts[1]?.replace(',', '.')) || 0,
                    categorySlug: parts[2] || '',
                    description: parts[3] || '',
                    imageUrl: parts[4] || ''
                });
            }
        }
        
        // Show preview
        const preview = document.getElementById('import-preview');
        const previewList = document.getElementById('import-preview-list');
        const countEl = document.getElementById('import-count');
        const btnStart = document.getElementById('btn-start-import');
        
        countEl.textContent = importedProducts.length;
        
        previewList.innerHTML = importedProducts.slice(0, 10).map((p, i) => `
            <div style="padding: 8px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                <span><strong>${p.name}</strong> - ${p.price.toFixed(2)}€</span>
                <span style="color: #888; font-size: 0.85rem;">${p.categorySlug || 'Sans catégorie'}</span>
            </div>
        `).join('') + (importedProducts.length > 10 ? `<div style="padding: 10px; text-align: center; color: #888;">... et ${importedProducts.length - 10} autres</div>` : '');
        
        preview.style.display = 'block';
        btnStart.disabled = importedProducts.length === 0;
    }
    
    async function startImport() {
        if (importedProducts.length === 0) return;
        
        const progressDiv = document.getElementById('import-progress');
        const progressBar = document.getElementById('import-progress-bar');
        const statusEl = document.getElementById('import-status');
        const btnStart = document.getElementById('btn-start-import');
        
        progressDiv.style.display = 'block';
        btnStart.disabled = true;
        
        let success = 0;
        let errors = 0;
        
        for (let i = 0; i < importedProducts.length; i++) {
            const p = importedProducts[i];
            
            // Find category by slug
            const category = categories.find(c => c.slug === p.categorySlug);
            
            // Create product
            const productData = {
                name: p.name,
                price: p.price.toFixed(2) + '€',
                priceValue: p.price,
                categoryId: category?.id || '',
                description: p.description,
                images: p.imageUrl ? [p.imageUrl] : [],
                stock: 'En stock',
                customizable: true,
                createdAt: new Date().toISOString()
            };
            
            try {
                await db.collection('products').add(productData);
                success++;
            } catch (err) {
                console.error('Erreur import:', p.name, err);
                errors++;
            }
            
            // Update progress
            const percent = Math.round(((i + 1) / importedProducts.length) * 100);
            progressBar.style.width = percent + '%';
            statusEl.textContent = `${i + 1}/${importedProducts.length} - ${p.name}`;
        }
        
        // Done
        statusEl.innerHTML = `<span style="color: #27ae60;">✅ ${success} produits importés</span>` + 
                             (errors > 0 ? ` <span style="color: #e74c3c;">❌ ${errors} erreurs</span>` : '');
        
        // Reload products
        await loadProducts();
        renderProducts();
        
        showToast(`${success} produits importés avec succès !`);
        
        // Close modal after delay
        setTimeout(() => {
            closeModal(document.getElementById('modal-import'));
        }, 2000);
    }
    
    document.addEventListener('DOMContentLoaded', init);
    
})();
