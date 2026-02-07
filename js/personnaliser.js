/* ============================================
   FAMILY CUSTOM - Page Personnalisation JS
   ============================================ */

(function() {
    'use strict';
    
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        window.location.href = 'index.html#categories';
        return;
    }
    
    // State
    let product = null;
    let customerImages = []; // Array d'URLs d'images uploadées
    let maxImages = 1; // Nombre max d'images (configuré par produit)
    let quantity = 1;
    let textColor = '#000000';
    let textSize = 24;
    
    // Selected variants
    let selectedColor = null;
    let selectedSize = null;
    let selectedMaterial = null;
    let selectedCustomOptions = {};
    let selectedSaleOption = null; // Option de vente sélectionnée (lot, pack)
    
    // Accordion state
    let accordionState = {
        imageValidated: false,
        textValidated: false
    };
    
    // Auto-save key
    const AUTOSAVE_KEY = 'fc_custom_' + productId;
    
    // DOM Elements (initialized in DOMContentLoaded)
    let elements = {};
    
    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize DOM elements after page load
        elements = {
            productTitle: document.getElementById('product-title'),
            productPrice: document.getElementById('product-price'),
            productPreview: document.getElementById('product-preview'),
            breadcrumb: document.getElementById('product-name-breadcrumb'),
            stepImage: document.getElementById('step-image'),
            stepText: document.getElementById('step-text'),
            stepVariants: document.getElementById('step-variants'),
            textStepNumber: document.getElementById('text-step-number'),
            uploadZone: document.getElementById('upload-zone'),
            imageInput: document.getElementById('image-input'),
            mockupBg: document.getElementById('mockup-bg'),
            mockupCanvas: document.getElementById('mockup-canvas'),
            photoZone: document.getElementById('photo-zone'),
            customerPhoto: document.getElementById('customer-photo'),
            textZone: document.getElementById('text-zone'),
            previewText: document.getElementById('preview-text'),
            customText: document.getElementById('custom-text'),
            quantityDisplay: document.getElementById('quantity'),
            btnAddCart: document.getElementById('btn-add-cart'),
            btnValidateText: document.getElementById('btn-validate-text')
        };
        
        loadProduct();
        setupEventListeners();
    });
    
    // ===== AUTO-SAVE / RESTORE =====
    function autoSave() {
        try {
            var data = {
                text: elements.customText ? elements.customText.value : '',
                textColor: textColor,
                textSize: textSize,
                color: selectedColor,
                size: selectedSize,
                material: selectedMaterial,
                customOptions: selectedCustomOptions,
                quantity: quantity,
                ts: Date.now()
            };
            sessionStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
        } catch (e) { /* quota exceeded or private mode */ }
    }
    
    function autoRestore() {
        try {
            var raw = sessionStorage.getItem(AUTOSAVE_KEY);
            if (!raw) return;
            var data = JSON.parse(raw);
            // Only restore if saved less than 2 hours ago
            if (Date.now() - (data.ts || 0) > 2 * 3600000) {
                sessionStorage.removeItem(AUTOSAVE_KEY);
                return;
            }
            // Restore text
            if (data.text && elements.customText) {
                elements.customText.value = data.text;
                updateTextPreview();
                // Auto-validate text step visually
                if (data.text.trim()) {
                    accordionState.textValidated = true;
                    if (elements.stepText) elements.stepText.classList.add('completed');
                    if (elements.btnValidateText) {
                        elements.btnValidateText.innerHTML = '<i class="fas fa-check"></i> Texte validé';
                        elements.btnValidateText.style.background = '#4CAF50';
                    }
                }
            }
            // Restore text style
            if (data.textColor) {
                textColor = data.textColor;
                var colorBtn = document.querySelector('.color-btn[data-color="' + textColor + '"]');
                if (colorBtn) {
                    document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('active'); });
                    colorBtn.classList.add('active');
                }
            }
            if (data.textSize) textSize = data.textSize;
            // Restore quantity
            if (data.quantity && data.quantity > 1) {
                quantity = data.quantity;
                if (elements.quantityDisplay) elements.quantityDisplay.textContent = quantity;
            }
            // Restore variant selections (deferred — variants are already rendered by now)
            if (data.color) {
                selectedColor = data.color;
                var colorHex = typeof data.color === 'object' ? data.color.hex : data.color;
                var cBtn = document.querySelector('#color-options .variant-btn[data-color="' + colorHex + '"]');
                if (cBtn && !cBtn.disabled) {
                    document.querySelectorAll('#color-options .variant-btn').forEach(function(b) { b.classList.remove('selected'); });
                    cBtn.classList.add('selected');
                }
            }
            if (data.size) {
                selectedSize = data.size;
                var sBtn = document.querySelector('#size-options .variant-btn[data-size="' + data.size + '"]');
                if (sBtn && !sBtn.disabled) {
                    document.querySelectorAll('#size-options .variant-btn').forEach(function(b) { b.classList.remove('selected'); });
                    sBtn.classList.add('selected');
                    updatePriceDisplay();
                }
            }
            if (data.material) {
                selectedMaterial = data.material;
                var mBtn = document.querySelector('#material-options .variant-btn[data-material="' + data.material + '"]');
                if (mBtn) {
                    document.querySelectorAll('#material-options .variant-btn').forEach(function(b) { b.classList.remove('selected'); });
                    mBtn.classList.add('selected');
                }
            }
            if (data.customOptions) selectedCustomOptions = data.customOptions;
            
            // Update button state
            updateAddToCartButton();
            
            // Notify user
            showToast('Personnalisation restaurée', 'info');
        } catch (e) { /* corrupted data */ }
    }
    
    function clearAutoSave() {
        try { sessionStorage.removeItem(AUTOSAVE_KEY); } catch (e) {}
    }
    
    // Load product from Firebase
    async function loadProduct() {
        const db = window.FirebaseDB;
        
        if (!db) {
            console.error('Firebase not available');
            showError();
            return;
        }
        
        try {
            const doc = await db.collection('products').doc(productId).get();
            
            if (!doc.exists) {
                showError();
                return;
            }
            
            product = { id: doc.id, ...doc.data() };
            
            try {
                renderProduct();
                // Restore saved customization after product is fully rendered
                setTimeout(autoRestore, 300);
            } catch (renderErr) {
                console.error('Error rendering product:', renderErr);
            }
            
        } catch (error) {
            console.error('Error loading product:', error);
            showError();
        }
    }
    
    function showError() {
        elements.productPreview.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Produit non trouvé</p>
                <a href="index.html#categories" class="btn-back">Retour aux créations</a>
            </div>
        `;
    }
    
    // Render product info
    function renderProduct() {
        // Update page info
        elements.productTitle.textContent = product.name;
        
        // Affichage du prix avec promo si applicable
        if (product.originalPrice) {
            elements.productPrice.innerHTML = '<span class="old-price">' + product.originalPrice + '</span> <span class="new-price">' + (product.price || '') + '</span>';
            elements.productPrice.classList.add('promo-price');
        } else {
            elements.productPrice.textContent = product.price || '';
        }
        
        // Update breadcrumb with link back to PDP
        const productLink = 'produit.html?id=' + productId;
        elements.breadcrumb.textContent = 'Personnalisation';
        
        const breadcrumbProductLink = document.getElementById('breadcrumb-product-link');
        if (breadcrumbProductLink) {
            breadcrumbProductLink.href = productLink;
            breadcrumbProductLink.textContent = product.name;
        }
        
        // Update back-to-product link
        const backLink = document.getElementById('back-to-product');
        if (backLink) backLink.href = productLink;
        
        document.title = `Personnaliser : ${product.name} - Family Custom`;
        
        // Tracking: customization start (viewProduct already tracked on PDP)
        if (window.FCTracking && typeof FCTracking.viewProduct === 'function') {
            const priceNum = parseFloat((product.price || '0').toString().replace(/[^\d.,]/g, '').replace(',', '.'));
            FCTracking.viewProduct({ id: product.id, name: product.name, price: priceNum });
        }
        
        // Hide loading
        const loadingEl = document.getElementById('loading-preview');
        if (loadingEl) loadingEl.style.display = 'none';
        
        // Setup the preview with product image or mockup
        const imageToUse = (product.mockup && product.mockup.url) ? product.mockup.url : product.image;
        
        console.log('Product:', product);
        console.log('Image to use:', imageToUse);
        
        // Setup product gallery if multiple images
        setupProductGallery(product);
        
        if (imageToUse) {
            // Use the mockup canvas as the preview
            elements.mockupBg.src = imageToUse;
            elements.mockupCanvas.style.display = 'block';
            
            // Setup mockup zones
            if (product.mockup && product.mockup.url) {
                setupMockupEditor();
            } else {
                // Default zone position for products without mockup config
                elements.photoZone.style.left = '25%';
                elements.photoZone.style.top = '25%';
                elements.photoZone.style.width = '50%';
                elements.photoZone.style.height = '50%';
                elements.photoZone.style.display = 'none';
                
                elements.textZone.style.left = '20%';
                elements.textZone.style.top = '60%';
            }
        } else {
            // No image - show placeholder and still allow customization
            elements.mockupCanvas.style.display = 'block';
            elements.mockupBg.src = 'https://via.placeholder.com/600x600/f5f0e8/c9a87c?text=' + encodeURIComponent(product.name || 'Produit');
            
            // Default zone positions
            elements.photoZone.style.left = '25%';
            elements.photoZone.style.top = '25%';
            elements.photoZone.style.width = '50%';
            elements.photoZone.style.height = '50%';
            elements.photoZone.style.display = 'none';
            
            elements.textZone.style.left = '20%';
            elements.textZone.style.top = '50%';
        }
        
        // Setup steps based on product requirements
        let stepNumber = 1;
        
        // Configurer le nombre d'images requises
        maxImages = product.requiredImages || (product.requiresImage ? 1 : 0);
        
        const requiresImage = maxImages > 0 || product.requiresImage;
        
        if (requiresImage) {
            elements.stepImage.style.display = 'block';
            setupMultiImageUpload(); // Setup multi-image upload UI
            stepNumber++;
        }
        
        // Show/hide text customization section based on product config
        const stepText = document.getElementById('step-text');
        const hasText = product.hasText !== false; // true par défaut pour rétrocompatibilité
        
        if (hasText) {
            stepText.style.display = 'block';
            // Update text step number
            elements.textStepNumber.textContent = requiresImage ? 2 : 1;
            
            // Show text color options if enabled for this product
            const textStyleOptions = document.getElementById('text-style-options');
            if (product.allowTextColor && product.textColors && product.textColors.length > 0) {
                textStyleOptions.style.display = 'block';
                setupTextColorPicker(product.textColors);
            } else if (product.allowTextColor) {
                // Fallback: show default colors if allowTextColor is true but no colors defined
                textStyleOptions.style.display = 'block';
                setupTextColorPicker(null);
            } else {
                textStyleOptions.style.display = 'none';
            }
            stepNumber++;
        } else {
            stepText.style.display = 'none';
        }
        
        // Setup variants if product has any
        const hasVariants = renderVariants(stepNumber);
        
        // Initialize accordion system
        initAccordion(requiresImage, hasText, hasVariants);
    }
    
    // ===== ACCORDION SYSTEM =====
    function initAccordion(requiresImage, hasText, hasVariants) {
        const stepImage = elements.stepImage;
        const stepText = elements.stepText;
        const stepVariants = elements.stepVariants;
        
        // Update variants step number
        if (hasVariants && stepVariants) {
            const variantsStepNumber = document.getElementById('variants-step-number');
            let num = 1;
            if (requiresImage) num++;
            if (hasText) num++;
            if (variantsStepNumber) variantsStepNumber.textContent = num;
        }
        
        // Determine which step to open first
        if (requiresImage) {
            openStep('image');
        } else if (hasText) {
            openStep('text');
        } else if (hasVariants) {
            openStep('variants');
            if (stepVariants) stepVariants.classList.remove('locked');
        }
        
        // If no image required, text step is unlocked
        if (!requiresImage && hasText) {
            accordionState.imageValidated = true;
        }
        
        // If no text required, variants are unlocked
        if (!hasText) {
            accordionState.textValidated = true;
            if (stepVariants) stepVariants.classList.remove('locked');
        }
        
        // Setup step header click handlers
        document.querySelectorAll('.accordion-step .step-header').forEach(header => {
            header.addEventListener('click', function() {
                const step = this.dataset.step;
                const parentStep = this.parentElement;
                
                // Don't allow opening locked steps
                if (parentStep.classList.contains('locked')) {
                    showToast('Veuillez compléter l\'étape précédente', 'warning');
                    return;
                }
                
                openStep(step);
            });
        });
        
        // Setup validate text button
        if (elements.btnValidateText) {
            elements.btnValidateText.addEventListener('click', validateTextStep);
        }
        
        // Initialize add to cart button state
        updateAddToCartButton();
    }
    
    function openStep(stepName) {
        const allSteps = document.querySelectorAll('.accordion-step');
        
        allSteps.forEach(step => {
            const header = step.querySelector('.step-header');
            if (header && header.dataset.step === stepName) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    function validateTextStep() {
        const text = elements.customText.value.trim();
        
        if (!text) {
            showToast('Veuillez entrer votre texte personnalisé', 'warning');
            elements.customText.focus();
            return;
        }
        
        // Mark text step as validated
        accordionState.textValidated = true;
        elements.stepText.classList.add('completed');
        elements.stepText.classList.remove('active');
        
        // Update button to show it's validated
        elements.btnValidateText.innerHTML = '<i class="fas fa-check"></i> Texte validé';
        elements.btnValidateText.style.background = '#4CAF50';
        
        // Check if there are variants to show
        const stepVariants = elements.stepVariants;
        if (stepVariants && stepVariants.style.display !== 'none') {
            // Unlock and open variants step
            stepVariants.classList.remove('locked');
            openStep('variants');
            
            // Smooth scroll to variants
            setTimeout(() => {
                stepVariants.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
        
        showToast('Texte validé ! ✓', 'success');
        updateAddToCartButton();
    }
    
    function validateImageStep() {
        if (customerImages.length === 0) {
            return;
        }
        
        // Mark image step as validated
        accordionState.imageValidated = true;
        elements.stepImage.classList.add('completed');
        
        // Open text step
        if (elements.stepText && elements.stepText.style.display !== 'none') {
            openStep('text');
            setTimeout(() => {
                elements.stepText.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
        
        updateAddToCartButton();
    }
    
    function updateAddToCartButton() {
        const hasText = product.hasText !== false;
        const requiresImage = (product.requiredImages || (product.requiresImage ? 1 : 0)) > 0;
        
        // Check if all required steps are complete
        const imageOk = !requiresImage || accordionState.imageValidated;
        const textOk = !hasText || accordionState.textValidated;
        
        if (imageOk && textOk) {
            elements.btnAddCart.disabled = false;
            elements.btnAddCart.classList.remove('disabled');
            elements.btnAddCart.innerHTML = '<i class="fas fa-shopping-cart"></i> Ajouter au panier';
        } else {
            elements.btnAddCart.disabled = true;
            elements.btnAddCart.classList.add('disabled');
            if (!textOk) {
                elements.btnAddCart.innerHTML = '<i class="fas fa-lock"></i> Validez votre personnalisation';
            } else if (!imageOk) {
                elements.btnAddCart.innerHTML = '<i class="fas fa-lock"></i> Ajoutez votre photo';
            }
        }
        
        // Update progress bar
        updateProgress(requiresImage, hasText);
    }
    
    function updateProgress(requiresImage, hasText) {
        const progressFill = document.querySelector('.progress-fill');
        const progressLabel = document.getElementById('progress-label');
        if (!progressFill || !progressLabel) return;
        
        // Count total steps and completed steps
        let totalSteps = 0;
        let completedSteps = 0;
        
        if (requiresImage) {
            totalSteps++;
            if (accordionState.imageValidated) completedSteps++;
        }
        if (hasText) {
            totalSteps++;
            if (accordionState.textValidated) completedSteps++;
        }
        
        // Variants step
        const hasVariants = elements.stepVariants && elements.stepVariants.style.display !== 'none';
        if (hasVariants) {
            totalSteps++;
            if (elements.stepVariants.classList.contains('completed')) completedSteps++;
        }
        
        if (totalSteps === 0) totalSteps = 1;
        
        const pct = Math.round((completedSteps / totalSteps) * 100);
        progressFill.style.width = pct + '%';
        
        if (pct === 100) {
            progressLabel.textContent = 'Personnalisation terminée — ajoutez au panier !';
            progressLabel.style.color = '#4CAF50';
        } else if (pct > 0) {
            progressLabel.textContent = completedSteps + '/' + totalSteps + ' étape' + (totalSteps > 1 ? 's' : '') + ' complétée' + (completedSteps > 1 ? 's' : '');
            progressLabel.style.color = '';
        } else {
            progressLabel.textContent = 'Complétez les étapes ci-dessous';
            progressLabel.style.color = '';
        }
    }
    
    function showToast(message, type = 'info') {
        // Check if toast function exists
        if (typeof FCToast !== 'undefined' && FCToast.show) {
            FCToast.show(message, type);
        } else {
            // Simple fallback
            const toast = document.createElement('div');
            toast.className = 'simple-toast ' + type;
            toast.innerHTML = message;
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#ff9800' : '#333'};
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 10000;
                animation: fadeInUp 0.3s ease;
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }

    // Setup product gallery with multiple images
    function setupProductGallery(product) {
        const gallery = document.getElementById('product-gallery');
        if (!gallery) return;
        
        // Get images array (fallback to single image)
        let images = [];
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            images = product.images;
        } else if (product.image) {
            images = [product.image];
        }
        
        // Hide gallery if only 1 or no images
        if (images.length <= 1) {
            gallery.style.display = 'none';
            return;
        }
        
        // Render thumbnails
        gallery.innerHTML = images.map((img, index) => `
            <div class="gallery-thumb ${index === 0 ? 'active' : ''}" data-index="${index}" data-src="${img}">
                <img src="${img}" alt="Vue ${index + 1}">
            </div>
        `).join('');
        
        gallery.style.display = 'flex';
        
        // Add click handlers
        gallery.querySelectorAll('.gallery-thumb').forEach(thumb => {
            thumb.addEventListener('click', function() {
                const src = this.dataset.src;
                
                // Update main image
                if (elements.mockupBg) {
                    elements.mockupBg.src = src;
                }
                
                // Update active state
                gallery.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }
    
    // Render product variants (colors, sizes, materials, custom options)
    function renderVariants(currentStep) {
        const stepVariants = document.getElementById('step-variants');
        const variantsStepNumber = document.getElementById('variants-step-number');
        
        let hasAnyVariant = false;
        
        // Reset all variant containers first
        const colorContainer = document.getElementById('variant-colors');
        const sizeContainer = document.getElementById('variant-sizes');
        const materialContainer = document.getElementById('variant-materials');
        const customContainer = document.getElementById('custom-variant-options');
        
        colorContainer.style.display = 'none';
        sizeContainer.style.display = 'none';
        materialContainer.style.display = 'none';
        customContainer.innerHTML = '';
        
        // Reset selections
        selectedColor = null;
        selectedSize = null;
        selectedMaterial = null;
        selectedCustomOptions = {};
        selectedSaleOption = null;
        
        // Check and render colors
        if (product.colors && product.colors.length > 0) {
            hasAnyVariant = true;
            const colorOptions = document.getElementById('color-options');
            
            colorContainer.style.display = 'block';
            
            // Determine color availability based on stock matrix or simple inStock flag
            const getColorAvailability = (color) => {
                // If we have a stock matrix, check if any size is available for this color
                if (product.stockMatrix && product.stockMatrix[color.hex]) {
                    // Out of stock only if ALL sizes are explicitly false
                    const values = Object.values(product.stockMatrix[color.hex]);
                    if (values.length === 0) return color.inStock !== false;
                    return !values.every(val => val === false);
                }
                // Fallback to simple inStock flag
                return color.inStock !== false;
            };
            
            // Find first available color
            const firstAvailableColor = product.colors.find(c => getColorAvailability(c)) || product.colors[0];
            const firstAvailableIndex = product.colors.indexOf(firstAvailableColor);
            
            colorOptions.innerHTML = product.colors.map((color, i) => {
                const isOutOfStock = !getColorAvailability(color);
                const isSelected = i === firstAvailableIndex;
                return `
                    <button type="button" 
                            class="variant-btn ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}" 
                            data-color="${color.hex}"
                            data-name="${color.name}"
                            data-available="${!isOutOfStock}"
                            style="background: ${color.hex}; ${color.hex === '#FFFFFF' ? 'border: 2px solid #ccc;' : ''}"
                            title="${color.name}${isOutOfStock ? ' (Indisponible)' : ''}"
                            ${isOutOfStock ? 'disabled' : ''}>
                        <span class="color-name-tooltip">${color.name}${isOutOfStock ? ' - Indisponible' : ''}</span>
                        ${isOutOfStock ? '<span class="out-of-stock-badge"><i class="fas fa-ban"></i></span>' : ''}
                    </button>
                `;
            }).join('');
            
            // Select first available color by default
            selectedColor = firstAvailableColor;
            
            // Function to update size availability based on selected color
            const updateSizeAvailability = (colorHex) => {
                if (!product.stockMatrix || !product.sizes) return;
                
                const sizeOptions = document.getElementById('size-options');
                if (!sizeOptions) return;
                
                const colorStock = product.stockMatrix[colorHex];
                
                sizeOptions.querySelectorAll('.variant-btn').forEach(btn => {
                    const sizeValue = btn.dataset.size;
                    // If this color has no entry in stockMatrix, treat all sizes as available
                    // Available unless explicitly set to false
                    const isAvailable = !colorStock || colorStock[sizeValue] !== false;
                    
                    btn.classList.toggle('out-of-stock', !isAvailable);
                    btn.disabled = !isAvailable;
                    
                    // Update the out of stock text
                    let outOfStockText = btn.querySelector('.out-of-stock-text');
                    if (!isAvailable && !outOfStockText) {
                        const span = document.createElement('span');
                        span.className = 'out-of-stock-text';
                        span.textContent = 'Indisponible';
                        btn.appendChild(span);
                    } else if (isAvailable && outOfStockText) {
                        outOfStockText.remove();
                    }
                });
                
                // If currently selected size is now unavailable, select first available
                const currentSizeBtn = sizeOptions.querySelector('.variant-btn.selected');
                if (currentSizeBtn && currentSizeBtn.disabled) {
                    const firstAvailableBtn = sizeOptions.querySelector('.variant-btn:not(.out-of-stock)');
                    if (firstAvailableBtn) {
                        currentSizeBtn.classList.remove('selected');
                        firstAvailableBtn.classList.add('selected');
                        selectedSize = firstAvailableBtn.dataset.size;
                        // Update price when size changes due to availability
                        updatePriceDisplay();
                    }
                }
            };
            
            // Add click handlers
            colorOptions.querySelectorAll('.variant-btn:not(.out-of-stock)').forEach(btn => {
                btn.addEventListener('click', function() {
                    colorOptions.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedColor = {
                        hex: this.dataset.color,
                        name: this.dataset.name
                    };
                    // Update size availability when color changes
                    updateSizeAvailability(this.dataset.color);
                    autoSave();
                });
            });
            
            // Initial size availability update
            if (selectedColor) {
                setTimeout(() => updateSizeAvailability(selectedColor.hex), 50);
            }
        }
        
        // Check and render sizes
        if (product.sizes && product.sizes.length > 0) {
            hasAnyVariant = true;
            const sizeOptions = document.getElementById('size-options');
            
            sizeContainer.style.display = 'block';
            
            // Support both old format (string array) and new format (object array with inStock)
            const sizesNormalized = product.sizes.map(size => {
                if (typeof size === 'object') return size;
                return { value: size, inStock: true };
            });
            
            // Determine size availability based on stock matrix or simple inStock flag
            const getSizeInitialAvailability = (size, sizeValue) => {
                // If we have a stock matrix and a selected color, check specific combination
                if (product.stockMatrix && selectedColor) {
                    const colorStock = product.stockMatrix[selectedColor.hex];
                    if (colorStock) {
                        // Available unless explicitly set to false
                        return colorStock[sizeValue] !== false;
                    }
                }
                // Fallback to simple inStock flag
                return size.inStock !== false;
            };
            
            // Find first available size
            const firstAvailableSize = sizesNormalized.find(s => getSizeInitialAvailability(s, s.value)) || sizesNormalized[0];
            const firstAvailableIndex = sizesNormalized.indexOf(firstAvailableSize);
            
            sizeOptions.innerHTML = sizesNormalized.map((size, i) => {
                const isOutOfStock = !getSizeInitialAvailability(size, size.value);
                const isSelected = i === firstAvailableIndex;
                return `
                    <button type="button" 
                            class="variant-btn ${isSelected ? 'selected' : ''} ${isOutOfStock ? 'out-of-stock' : ''}" 
                            data-size="${size.value}"
                            ${isOutOfStock ? 'disabled' : ''}>
                        ${size.value}
                        ${isOutOfStock ? '<span class="out-of-stock-text">Indisponible</span>' : ''}
                    </button>
                `;
            }).join('');
            
            // Select first available size by default
            selectedSize = firstAvailableSize.value;
            
            // Add click handlers
            sizeOptions.querySelectorAll('.variant-btn:not(.out-of-stock)').forEach(btn => {
                btn.addEventListener('click', function() {
                    sizeOptions.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedSize = this.dataset.size;
                    // Update price display when size changes
                    updatePriceDisplay();
                    autoSave();
                });
            });
            
            // Update price display for initial size selection
            updatePriceDisplay();
        }
        
        // Check and render materials
        if (product.materials && product.materials.length > 0) {
            hasAnyVariant = true;
            const materialOptions = document.getElementById('material-options');
            
            materialContainer.style.display = 'block';
            materialOptions.innerHTML = product.materials.map((material, i) => `
                <button type="button" 
                        class="variant-btn ${i === 0 ? 'selected' : ''}" 
                        data-material="${material}">
                    <i class="fas fa-cube"></i> ${material}
                </button>
            `).join('');
            
            // Select first material by default
            selectedMaterial = product.materials[0];
            
            // Add click handlers
            materialOptions.querySelectorAll('.variant-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    materialOptions.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedMaterial = this.dataset.material;
                    autoSave();
                });
            });
        }
        
        // Check and render custom options
        if (product.customOptions && product.customOptions.length > 0) {
            hasAnyVariant = true;
            
            customContainer.innerHTML = product.customOptions.map((option, optIndex) => `
                <div class="custom-variant-group">
                    <label>${option.name}</label>
                    <div class="variant-options custom-variant-options" data-option="${option.name}">
                        ${option.values.map((value, i) => `
                            <button type="button" 
                                    class="variant-btn ${i === 0 ? 'selected' : ''}" 
                                    data-value="${value}">
                                ${value}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `).join('');
            
            // Select first value for each custom option by default
            product.customOptions.forEach(option => {
                selectedCustomOptions[option.name] = option.values[0];
            });
            
            // Add click handlers
            customContainer.querySelectorAll('.custom-variant-options').forEach(optionGroup => {
                const optionName = optionGroup.dataset.option;
                optionGroup.querySelectorAll('.variant-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        optionGroup.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('selected'));
                        this.classList.add('selected');
                        selectedCustomOptions[optionName] = this.dataset.value;
                    });
                });
            });
        }
        
        // Check and render sale options (lots, packs)
        if (product.saleOptions && product.saleOptions.length > 0) {
            hasAnyVariant = true;
            
            // Create sale options container if not exists
            let saleContainer = document.getElementById('sale-options-container');
            if (!saleContainer) {
                saleContainer = document.createElement('div');
                saleContainer.id = 'sale-options-container';
                saleContainer.className = 'variant-group sale-options-group';
                saleContainer.innerHTML = `
                    <label><i class="fas fa-box"></i> Options de vente</label>
                    <div class="variant-options sale-variant-options" id="sale-options"></div>
                `;
                customContainer.appendChild(saleContainer);
            }
            
            const saleOptionsDiv = document.getElementById('sale-options');
            saleOptionsDiv.innerHTML = product.saleOptions.map((option, i) => `
                <button type="button" 
                        class="variant-btn sale-option-btn ${i === 0 ? 'selected' : ''}" 
                        data-name="${option.name}"
                        data-price="${option.price}"
                        data-quantity="${option.quantity || 1}">
                    <span class="sale-option-name">${option.name}</span>
                    <span class="sale-option-price">${option.price.toFixed(2)}€</span>
                </button>
            `).join('');
            
            // Select first sale option by default
            selectedSaleOption = product.saleOptions[0];
            updatePriceDisplay();
            
            // Add click handlers
            saleOptionsDiv.querySelectorAll('.sale-option-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    saleOptionsDiv.querySelectorAll('.sale-option-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedSaleOption = {
                        name: this.dataset.name,
                        price: parseFloat(this.dataset.price),
                        quantity: parseInt(this.dataset.quantity) || 1
                    };
                    updatePriceDisplay();
                });
            });
        }
        
        // Show/hide variants section based on whether any variant exists
        if (hasAnyVariant) {
            stepVariants.style.display = 'block';
            variantsStepNumber.textContent = currentStep;
        } else {
            stepVariants.style.display = 'none';
        }
        
        return hasAnyVariant;
    }
    
    // Setup mockup editor
    function setupMockupEditor() {
        const mockup = product.mockup;
        
        // Set initial position for photo zone
        elements.photoZone.style.left = mockup.x + '%';
        elements.photoZone.style.top = mockup.y + '%';
        elements.photoZone.style.width = mockup.width + '%';
        elements.photoZone.style.height = mockup.height + '%';
        elements.photoZone.style.display = 'none';
        
        // Set initial position for text zone
        elements.textZone.style.left = '20%';
        elements.textZone.style.top = '60%';
    }
    
    // Setup text color picker
    function setupTextColorPicker(customColors) {
        const colorPicker = document.getElementById('text-color-picker');
        if (!colorPicker) return;
        
        // If custom colors are provided, render them instead of default
        if (customColors && customColors.length > 0) {
            colorPicker.innerHTML = customColors.map((color, index) => `
                <button type="button" 
                        class="color-btn ${index === 0 ? 'active' : ''}" 
                        data-color="${color.hex}" 
                        style="background:${color.hex}; ${color.hex.toUpperCase() === '#FFFFFF' ? 'border: 1px solid #ccc;' : ''}"
                        title="${color.name}">
                </button>
            `).join('');
            
            // Set initial text color to first custom color
            textColor = customColors[0].hex;
        }
        
        colorPicker.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                colorPicker.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                textColor = this.dataset.color;
                
                // Update preview text color
                if (elements.previewText) {
                    elements.previewText.style.color = textColor;
                }
            });
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Upload zone drag & drop
        const uploadZone = elements.uploadZone;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.add('dragover'));
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadZone.addEventListener(eventName, () => uploadZone.classList.remove('dragover'));
        });
        
        uploadZone.addEventListener('drop', handleDrop);
        elements.imageInput.addEventListener('change', handleFileSelect);
        
        // Quantity controls
        document.getElementById('qty-minus').addEventListener('click', () => updateQuantity(-1));
        document.getElementById('qty-plus').addEventListener('click', () => updateQuantity(1));
        
        // Add to cart
        elements.btnAddCart.addEventListener('click', addToCart);
        
        // Buy now (express checkout)
        const btnBuyNow = document.getElementById('btn-buy-now');
        if (btnBuyNow) {
            btnBuyNow.addEventListener('click', buyNow);
        }
        
        // Text input - real-time preview + auto-save
        elements.customText.addEventListener('input', function() {
            updateTextPreview();
            autoSave();
        });
        
        // Color picker
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                textColor = this.dataset.color;
                applyTextStyle();
            });
        });
        
        // Text size controls
        document.getElementById('text-smaller')?.addEventListener('click', () => changeTextSize(-2));
        document.getElementById('text-larger')?.addEventListener('click', () => changeTextSize(2));
    }
    
    // Update text preview in real-time
    function updateTextPreview() {
        const text = elements.customText.value;
        
        if (text.trim()) {
            if (elements.previewText) {
                elements.previewText.textContent = text;
            }
            if (elements.textZone) {
                elements.textZone.classList.add('visible');
            }
            applyTextStyle();
            
            // Show editor controls
            showEditorControls();
            
            // Initialize draggable if not already done
            if (elements.textZone && !elements.textZone.dataset.draggableInit) {
                initTextDraggable();
                elements.textZone.dataset.draggableInit = 'true';
            }
        } else {
            if (elements.textZone) {
                elements.textZone.classList.remove('visible');
            }
            // Hide editor controls if no photo either
            const hasImages = customerImages.filter(img => img).length > 0;
            if (!hasImages) {
                hideEditorControls();
            }
        }
    }
    
    // Show/hide editor controls
    function showEditorControls() {
        const controls = document.getElementById('editor-controls');
        const hint = document.getElementById('editor-hint');
        if (controls) controls.style.display = 'flex';
        if (hint) hint.style.display = 'block';
    }
    
    function hideEditorControls() {
        const controls = document.getElementById('editor-controls');
        const hint = document.getElementById('editor-hint');
        if (controls) controls.style.display = 'none';
        if (hint) hint.style.display = 'none';
    }
    
    // Apply text styling
    function applyTextStyle() {
        if (!elements.previewText) return;
        
        elements.previewText.style.color = textColor;
        elements.previewText.style.fontSize = textSize + 'px';
        
        // Update shadow based on text color for better visibility
        if (textColor === '#ffffff' || textColor === '#fff') {
            elements.previewText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.7)';
        } else if (textColor === '#000000' || textColor === '#000') {
            elements.previewText.style.textShadow = '1px 1px 2px rgba(255,255,255,0.5)';
        } else {
            elements.previewText.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
        }
                const sizeDisplay = document.getElementById('text-size-display');
        if (sizeDisplay) {
            sizeDisplay.textContent = textSize + 'px';
        }
    }
    
    // Change text size
    function changeTextSize(delta) {
        textSize = Math.max(12, Math.min(60, textSize + delta));
        applyTextStyle();
    }
    
    // Text draggable functionality
    function initTextDraggable() {
        const zone = elements.textZone;
        const container = elements.mockupCanvas;
        
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        function getContainerRect() {
            return container.getBoundingClientRect();
        }
        
        function pxToPercent(px, total) {
            return (px / total) * 100;
        }
        
        // Drag
        zone.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(zone.style.left) || 20;
            startTop = parseFloat(zone.style.top) || 60;
            zone.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            
            const rect = getContainerRect();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = startLeft + pxToPercent(dx, rect.width);
            let newTop = startTop + pxToPercent(dy, rect.height);
            
            newLeft = Math.max(0, Math.min(90, newLeft));
            newTop = Math.max(0, Math.min(90, newTop));
            
            zone.style.left = newLeft + '%';
            zone.style.top = newTop + '%';
        });
        
        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                zone.style.cursor = '';
            }
        });
        
        // Touch support
        zone.addEventListener('touchstart', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = parseFloat(zone.style.left) || 20;
            startTop = parseFloat(zone.style.top) || 60;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const rect = getContainerRect();
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            
            let newLeft = startLeft + pxToPercent(dx, rect.width);
            let newTop = startTop + pxToPercent(dy, rect.height);
            
            newLeft = Math.max(0, Math.min(90, newLeft));
            newTop = Math.max(0, Math.min(90, newTop));
            
            zone.style.left = newLeft + '%';
            zone.style.top = newTop + '%';
        }, { passive: true });
        
        document.addEventListener('touchend', function() {
            isDragging = false;
        });
    }
    
    // Handle file drop
    function handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            processFile(files[0]);
        }
    }
    
    // Upload image via proxy serveur (clé API côté serveur)
    async function uploadToImgBB(base64Data) {
        // Remove the data:image/...;base64, prefix
        const base64Image = base64Data.split(',')[1];
        
        try {
            const response = await fetch('https://api-two-pi-35.vercel.app/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Image uploadée sur ImgBB:', data.data.url);
                return data.data.url;
            } else {
                console.error('❌ Erreur ImgBB:', data.error);
                throw new Error(data.error?.message || 'Erreur upload ImgBB');
            }
        } catch (error) {
            console.error('❌ Erreur upload ImgBB:', error);
            throw error;
        }
    }
    
    // Handle file select
    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    }
    
    // Process uploaded file
    async function processFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image');
            return;
        }
        
        // Show loading state
        elements.uploadZone.classList.add('uploading');
        elements.uploadZone.innerHTML = `
            <div class="upload-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Upload en cours...</p>
            </div>
            <input type="file" id="image-input" accept="image/*">
        `;
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                // Compress image first
                const compressedImage = await compressImage(e.target.result, 1200, 0.8);
                
                // Upload to ImgBB and get URL
                const imageUrl = await uploadToImgBB(compressedImage);
                
                // Store URL in array (single image mode stores at index 0)
                customerImages[0] = imageUrl;
                
                // Update upload zone
                elements.uploadZone.classList.remove('uploading');
                elements.uploadZone.classList.add('has-image');
                elements.uploadZone.innerHTML = `
                    <div class="uploaded-preview">
                        <img src="${imageUrl}" alt="Votre image">
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-size">${formatFileSize(file.size)}</div>
                        </div>
                        <button type="button" class="btn-remove" id="remove-image">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <input type="file" id="image-input" accept="image/*">
                `;
                
                // Re-attach listeners
                document.getElementById('image-input').addEventListener('change', handleFileSelect);
                document.getElementById('remove-image').addEventListener('click', removeImage);
                
                // Show photo on the preview/mockup canvas
                elements.customerPhoto.src = imageUrl;
                elements.photoZone.style.display = 'block';
                initDraggable();
                
                // Show editor controls
                showEditorControls();
                
                // Validate image step for accordion
                validateImageStep();
                
            } catch (error) {
                console.error('Erreur lors de l\'upload:', error);
                alert('Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
                
                // Reset upload zone
                elements.uploadZone.classList.remove('uploading');
                elements.uploadZone.innerHTML = `
                    <i class="fas fa-cloud-upload-alt"></i>
                    <p>Glissez votre image ici ou cliquez pour parcourir</p>
                    <span class="formats">Formats acceptés : JPG, PNG, WEBP (max 10MB)</span>
                    <input type="file" id="image-input" accept="image/*">
                `;
                document.getElementById('image-input').addEventListener('change', handleFileSelect);
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    // Compress image to reduce file size for storage
    function compressImage(base64, maxWidth, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Scale down if larger than maxWidth
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with quality setting
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.src = base64;
        });
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // ============================================
    // MULTI-IMAGE UPLOAD SYSTEM
    // ============================================
    
    function setupMultiImageUpload() {
        const stepImage = document.getElementById('step-image');
        if (!stepImage) return;
        
        // Update title with number of images required
        const stepTitle = stepImage.querySelector('h3');
        if (stepTitle && maxImages > 1) {
            stepTitle.innerHTML = `<span class="step-number">1</span> Envoyez vos ${maxImages} photos`;
        }
        
        // Create multi-image grid
        const uploadZone = elements.uploadZone;
        uploadZone.innerHTML = createMultiImageHTML();
        
        // Update hint
        const hint = stepImage.querySelector('.upload-hint');
        if (hint && maxImages > 1) {
            hint.innerHTML = `<i class="fas fa-info-circle"></i> Ajoutez ${maxImages} photos. Formats acceptés : JPG, PNG. Qualité recommandée : 300dpi minimum`;
        }
        
        // Setup event listeners for all upload slots
        setupMultiImageListeners();
    }
    
    function createMultiImageHTML() {
        if (maxImages <= 1) {
            // Single image mode (original)
            return `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Glissez votre image ici ou <span>parcourir</span></p>
                <input type="file" id="image-input" accept="image/*">
            `;
        }
        
        // Multi-image grid
        let html = `<div class="multi-image-grid" data-max="${maxImages}">`;
        
        for (let i = 0; i < maxImages; i++) {
            html += `
                <div class="image-slot" data-index="${i}">
                    <div class="slot-content empty">
                        <i class="fas fa-plus"></i>
                        <span>Photo ${i + 1}</span>
                    </div>
                    <input type="file" class="slot-input" accept="image/*" data-index="${i}">
                </div>
            `;
        }
        
        html += `</div>`;
        html += `<div class="image-counter"><span id="image-count">0</span> / ${maxImages} photos ajoutées</div>`;
        
        return html;
    }
    
    function setupMultiImageListeners() {
        if (maxImages <= 1) {
            // Single image mode - use original listeners
            document.getElementById('image-input').addEventListener('change', handleFileSelect);
            return;
        }
        
        // Multi-image mode
        const slots = document.querySelectorAll('.image-slot');
        
        slots.forEach(slot => {
            const input = slot.querySelector('.slot-input');
            const index = parseInt(slot.dataset.index);
            
            // Click to upload
            slot.addEventListener('click', (e) => {
                if (e.target.classList.contains('remove-slot-image')) return;
                if (!customerImages[index]) {
                    input.click();
                }
            });
            
            // File selected
            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    processMultiImageFile(e.target.files[0], index);
                }
            });
            
            // Drag & drop per slot
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('dragover');
            });
            
            slot.addEventListener('dragleave', () => {
                slot.classList.remove('dragover');
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('dragover');
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processMultiImageFile(e.dataTransfer.files[0], index);
                }
            });
        });
    }
    
    async function processMultiImageFile(file, index) {
        if (!file.type.startsWith('image/')) {
            alert('Veuillez sélectionner une image');
            return;
        }
        
        const slot = document.querySelector(`.image-slot[data-index="${index}"]`);
        if (!slot) return;
        
        // Show loading
        slot.querySelector('.slot-content').innerHTML = `
            <div class="slot-loading">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
        `;
        slot.querySelector('.slot-content').classList.remove('empty');
        
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                // Compress and upload
                const compressedImage = await compressImage(e.target.result, 1200, 0.8);
                const imageUrl = await uploadToImgBB(compressedImage);
                
                // Store URL in array
                customerImages[index] = imageUrl;
                
                // Update UI
                slot.querySelector('.slot-content').innerHTML = `
                    <img src="${imageUrl}" alt="Photo ${index + 1}">
                    <button type="button" class="remove-slot-image" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                slot.querySelector('.slot-content').classList.add('has-image');
                
                // Add remove listener
                slot.querySelector('.remove-slot-image').addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeMultiImage(index);
                });
                
                // Update counter
                updateImageCounter();
                
                // Show first image in preview
                if (index === 0) {
                    elements.customerPhoto.src = imageUrl;
                    elements.photoZone.style.display = 'block';
                    initDraggable();
                    showEditorControls();
                }
                
                // Validate image step for accordion
                validateImageStep();
                
            } catch (error) {
                console.error('Erreur upload image', index, error);
                alert('Erreur lors de l\'upload de l\'image. Veuillez réessayer.');
                
                // Reset slot
                slot.querySelector('.slot-content').innerHTML = `
                    <i class="fas fa-plus"></i>
                    <span>Photo ${index + 1}</span>
                `;
                slot.querySelector('.slot-content').classList.add('empty');
                slot.querySelector('.slot-content').classList.remove('has-image');
            }
        };
        
        reader.readAsDataURL(file);
    }
    
    function removeMultiImage(index) {
        customerImages[index] = null;
        
        const slot = document.querySelector(`.image-slot[data-index="${index}"]`);
        if (slot) {
            slot.querySelector('.slot-content').innerHTML = `
                <i class="fas fa-plus"></i>
                <span>Photo ${index + 1}</span>
            `;
            slot.querySelector('.slot-content').classList.add('empty');
            slot.querySelector('.slot-content').classList.remove('has-image');
        }
        
        // Update counter
        updateImageCounter();
        
        // Update preview if we removed the first image
        if (index === 0) {
            // Find next available image
            const nextImage = customerImages.find(img => img);
            if (nextImage) {
                elements.customerPhoto.src = nextImage;
            } else {
                elements.photoZone.style.display = 'none';
                const text = elements.customText ? elements.customText.value.trim() : '';
                if (!text) {
                    hideEditorControls();
                }
            }
        }
    }
    
    function updateImageCounter() {
        const count = customerImages.filter(img => img).length;
        const counter = document.getElementById('image-count');
        if (counter) {
            counter.textContent = count;
        }
    }
    
    // ============================================
    // END MULTI-IMAGE UPLOAD SYSTEM
    // ============================================
    
    function removeImage() {
        customerImages = [];
        elements.uploadZone.classList.remove('has-image');
        
        if (maxImages > 1) {
            elements.uploadZone.innerHTML = createMultiImageHTML();
            setupMultiImageListeners();
        } else {
            elements.uploadZone.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Glissez votre image ici ou <span>parcourir</span></p>
                <input type="file" id="image-input" accept="image/*">
            `;
            document.getElementById('image-input').addEventListener('change', handleFileSelect);
        }
        
        elements.photoZone.style.display = 'none';
        
        // Hide editor controls if no text either
        const text = elements.customText ? elements.customText.value.trim() : '';
        if (!text) {
            hideEditorControls();
        }
    }

    // Draggable functionality
    function initDraggable() {
        const zone = elements.photoZone;
        const container = zone.parentElement;
        
        let isDragging = false;
        let isResizing = false;
        let currentHandle = null;
        let startX, startY, startLeft, startTop, startWidth, startHeight;
        
        function getContainerRect() {
            return container.getBoundingClientRect();
        }
        
        function pxToPercent(px, total) {
            return (px / total) * 100;
        }
        
        // Drag
        zone.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(zone.style.left) || 0;
            startTop = parseFloat(zone.style.top) || 0;
            zone.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        // Resize handles
        zone.querySelectorAll('.resize-handle').forEach(function(handle) {
            handle.addEventListener('mousedown', function(e) {
                isResizing = true;
                currentHandle = this.className.split(' ')[1];
                startX = e.clientX;
                startY = e.clientY;
                startLeft = parseFloat(zone.style.left) || 0;
                startTop = parseFloat(zone.style.top) || 0;
                startWidth = parseFloat(zone.style.width) || 50;
                startHeight = parseFloat(zone.style.height) || 50;
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        document.addEventListener('mousemove', function(e) {
            const rect = getContainerRect();
            
            if (isDragging) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                let newLeft = startLeft + pxToPercent(dx, rect.width);
                let newTop = startTop + pxToPercent(dy, rect.height);
                
                const zoneWidth = parseFloat(zone.style.width) || 50;
                const zoneHeight = parseFloat(zone.style.height) || 50;
                
                newLeft = Math.max(0, Math.min(100 - zoneWidth, newLeft));
                newTop = Math.max(0, Math.min(100 - zoneHeight, newTop));
                
                zone.style.left = newLeft + '%';
                zone.style.top = newTop + '%';
            }
            
            if (isResizing) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const dxPercent = pxToPercent(dx, rect.width);
                const dyPercent = pxToPercent(dy, rect.height);
                
                let newWidth = startWidth;
                let newHeight = startHeight;
                let newLeft = startLeft;
                let newTop = startTop;
                
                if (currentHandle === 'resize-se') {
                    newWidth = Math.max(10, startWidth + dxPercent);
                    newHeight = Math.max(10, startHeight + dyPercent);
                } else if (currentHandle === 'resize-sw') {
                    newWidth = Math.max(10, startWidth - dxPercent);
                    newHeight = Math.max(10, startHeight + dyPercent);
                    newLeft = startLeft + dxPercent;
                } else if (currentHandle === 'resize-ne') {
                    newWidth = Math.max(10, startWidth + dxPercent);
                    newHeight = Math.max(10, startHeight - dyPercent);
                    newTop = startTop + dyPercent;
                } else if (currentHandle === 'resize-nw') {
                    newWidth = Math.max(10, startWidth - dxPercent);
                    newHeight = Math.max(10, startHeight - dyPercent);
                    newLeft = startLeft + dxPercent;
                    newTop = startTop + dyPercent;
                }
                
                if (newLeft < 0) { newWidth += newLeft; newLeft = 0; }
                if (newTop < 0) { newHeight += newTop; newTop = 0; }
                if (newLeft + newWidth > 100) newWidth = 100 - newLeft;
                if (newTop + newHeight > 100) newHeight = 100 - newTop;
                
                zone.style.left = newLeft + '%';
                zone.style.top = newTop + '%';
                zone.style.width = newWidth + '%';
                zone.style.height = newHeight + '%';
            }
        });
        
        document.addEventListener('mouseup', function() {
            isDragging = false;
            isResizing = false;
            currentHandle = null;
            zone.style.cursor = '';
        });
        
        // Touch support
        zone.addEventListener('touchstart', function(e) {
            if (e.target.classList.contains('resize-handle')) return;
            
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            startLeft = parseFloat(zone.style.left) || 0;
            startTop = parseFloat(zone.style.top) || 0;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            
            const touch = e.touches[0];
            const rect = getContainerRect();
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            
            let newLeft = startLeft + pxToPercent(dx, rect.width);
            let newTop = startTop + pxToPercent(dy, rect.height);
            
            const zoneWidth = parseFloat(zone.style.width) || 50;
            const zoneHeight = parseFloat(zone.style.height) || 50;
            
            newLeft = Math.max(0, Math.min(100 - zoneWidth, newLeft));
            newTop = Math.max(0, Math.min(100 - zoneHeight, newTop));
            
            zone.style.left = newLeft + '%';
            zone.style.top = newTop + '%';
        }, { passive: true });
        
        document.addEventListener('touchend', function() {
            isDragging = false;
        });
    }
    
    // Quantity
    function updateQuantity(delta) {
        quantity = Math.max(1, quantity + delta);
        elements.quantityDisplay.textContent = quantity;
        autoSave();
    }
    
    // Update price display based on selected sale option and size price
    function updatePriceDisplay() {
        if (!elements.productPrice) return;
        
        let currentPrice = product.price;
        
        // Check if there's a size-specific price
        if (selectedSize && product.sizePrices && product.sizePrices[selectedSize] !== undefined) {
            currentPrice = product.sizePrices[selectedSize];
        }
        
        // Sale option overrides everything
        if (selectedSaleOption) {
            elements.productPrice.textContent = selectedSaleOption.price.toFixed(2) + '€';
        } else {
            elements.productPrice.textContent = parseFloat(currentPrice).toFixed(2) + '€';
        }
    }
    
    // Get current price based on selected size
    function getCurrentPrice() {
        if (selectedSaleOption) {
            return selectedSaleOption.price;
        }
        if (selectedSize && product.sizePrices && product.sizePrices[selectedSize] !== undefined) {
            return product.sizePrices[selectedSize];
        }
        return product.price;
    }
    
    // Add to cart
    function addToCart() {
        // Check if personalization is complete
        const hasText = product.hasText !== false;
        const requiresImage = (product.requiredImages || (product.requiresImage ? 1 : 0)) > 0;
        
        // Validate text if required
        if (hasText && !accordionState.textValidated) {
            showToast('Veuillez valider votre texte personnalisé', 'warning');
            openStep('text');
            elements.stepText.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        // Validate image if required
        if (requiresImage && !accordionState.imageValidated) {
            showToast('Veuillez ajouter votre photo', 'warning');
            openStep('image');
            elements.stepImage.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        
        // Filter out null/empty values before passing to cart
        const validImages = customerImages.filter(img => img);
        
        // Get customization text only if text section is visible
        const stepText = document.getElementById('step-text');
        const hasTextOption = stepText && stepText.style.display !== 'none';
        const customization = hasTextOption && elements.customText ? elements.customText.value.trim() : '';
        
        // Get text position if text was added
        let textPosition = null;
        if (customization && elements.textZone.classList.contains('visible')) {
            textPosition = {
                x: parseFloat(elements.textZone.style.left) || 20,
                y: parseFloat(elements.textZone.style.top) || 60,
                color: textColor,
                size: textSize
            };
        }
        
        // Build variants object
        const variants = {};
        if (selectedColor) variants.color = selectedColor;
        if (selectedSize) variants.size = selectedSize;
        if (selectedMaterial) variants.material = selectedMaterial;
        if (Object.keys(selectedCustomOptions).length > 0) {
            variants.customOptions = selectedCustomOptions;
        }
        if (selectedSaleOption) {
            variants.saleOption = selectedSaleOption;
        }
        
        // Use sale option price if selected, then size price, otherwise use product price
        const finalPrice = getCurrentPrice();
        const finalQuantity = selectedSaleOption ? (selectedSaleOption.quantity || 1) * quantity : quantity;
        
        const productData = {
            id: product.id,
            name: product.name,
            price: finalPrice,
            image: product.image || null,
            variants: Object.keys(variants).length > 0 ? variants : null,
            saleOptionName: selectedSaleOption ? selectedSaleOption.name : null,
            categoryId: product.categoryId || null,
            categoryIds: product.categoryIds || []
        };
        
        if (window.FCCart) {
            // Animation fly-to-cart
            if (window.FCAnimations) {
                const productImage = document.getElementById('mockup-bg') || document.querySelector('.product-preview img');
                const imageUrl = productImage ? productImage.src : product.image;
                FCAnimations.flyToCart(elements.btnAddCart, imageUrl);
            }
            
            window.FCCart.addToCart(productData, quantity, customization, validImages, textPosition);
            
            // Clear auto-save after successful add to cart
            clearAutoSave();
            
            // Tracking pixel: Add to Cart
            if (window.FCTracking) {
                FCTracking.addToCart({ id: productData.id, name: productData.name, price: finalPrice }, finalQuantity);
            }
            
            // Visual feedback
            elements.btnAddCart.innerHTML = '<i class="fas fa-check"></i> Ajouté au panier !';
            elements.btnAddCart.classList.add('success');
            
            setTimeout(() => {
                elements.btnAddCart.innerHTML = '<i class="fas fa-shopping-cart"></i> Ajouter au panier';
                elements.btnAddCart.classList.remove('success');
            }, 2000);
        }
    }
    
    /**
     * Achat express - Ajoute au panier et redirige direct vers checkout
     */
    function buyNow() {
        // Get customization text only if text section is visible
        const stepText = document.getElementById('step-text');
        const hasTextOption = stepText && stepText.style.display !== 'none';
        const customization = hasTextOption && elements.customText ? elements.customText.value.trim() : '';
        
        // Build variants object
        const variants = {};
        if (selectedColor) variants.color = selectedColor;
        if (selectedSize) variants.size = selectedSize;
        if (selectedMaterial) variants.material = selectedMaterial;
        if (Object.keys(selectedCustomOptions).length > 0) {
            variants.customOptions = selectedCustomOptions;
        }
        
        // Get text position if text exists
        let textPosition = null;
        if (customization && elements.textZone) {
            const canvas = elements.mockupCanvas;
            const canvasRect = canvas.getBoundingClientRect();
            const zoneRect = elements.textZone.getBoundingClientRect();
            
            textPosition = {
                x: ((zoneRect.left - canvasRect.left) / canvasRect.width * 100).toFixed(2),
                y: ((zoneRect.top - canvasRect.top) / canvasRect.height * 100).toFixed(2),
                color: textColor,
                size: textSize
            };
        }
        
        const productData = {
            id: product.id,
            name: product.name,
            price: getCurrentPrice(),
            image: product.image || null,
            variants: Object.keys(variants).length > 0 ? variants : null,
            categoryId: product.categoryId || null,
            categoryIds: product.categoryIds || []
        };
        
        // Filter out null/empty values before passing to cart
        const validImages = customerImages.filter(img => img);
        
        if (window.FCCart) {
            // Vider le panier et ajouter uniquement ce produit pour achat express
            window.FCCart.clearCart();
            window.FCCart.addToCart(productData, quantity, customization, validImages, textPosition);
            
            // Redirection immédiate vers checkout
            window.location.href = 'checkout.html';
        }
    }
    
})();
