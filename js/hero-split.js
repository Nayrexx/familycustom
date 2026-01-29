/* ============================================
   FAMILY CUSTOM - Hero Split Screen Interactif
   JavaScript pour le configurateur live
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    
    // ===== Éléments DOM =====
    const heroSplit = document.querySelector('.hero-split');
    const configInput = document.getElementById('preview-text');
    const woodText = document.getElementById('wood-text');
    const neonText = document.getElementById('neon-text');
    const woodPlaceholder = document.querySelector('.wood-placeholder');
    const neonPlaceholder = document.querySelector('.neon-placeholder');
    const colorDots = document.querySelectorAll('.color-dot');
    
    // ===== Configuration des couleurs néon =====
    const neonColors = {
        pink: {
            main: '#ff2d75',
            glow: 'rgba(255, 45, 117, 0.8)'
        },
        blue: {
            main: '#00f0ff',
            glow: 'rgba(0, 240, 255, 0.8)'
        },
        purple: {
            main: '#bf00ff',
            glow: 'rgba(191, 0, 255, 0.8)'
        },
        white: {
            main: '#ffffff',
            glow: 'rgba(255, 255, 255, 0.8)'
        },
        yellow: {
            main: '#ffe135',
            glow: 'rgba(255, 225, 53, 0.8)'
        }
    };
    
    let currentColor = 'pink';
    
    // ===== Animation d'entrée =====
    setTimeout(() => {
        heroSplit?.classList.add('loaded');
    }, 100);
    
    // ===== Mise à jour du texte en temps réel =====
    const updatePreviewText = (text) => {
        const displayText = text.trim() || '';
        
        if (displayText) {
            // Afficher le texte
            if (woodText) {
                woodText.textContent = displayText;
                woodText.setAttribute('data-text', displayText);
                woodText.style.display = 'block';
            }
            if (neonText) {
                neonText.textContent = displayText;
                neonText.style.display = 'block';
            }
            
            // Cacher les placeholders
            if (woodPlaceholder) woodPlaceholder.style.display = 'none';
            if (neonPlaceholder) neonPlaceholder.style.display = 'none';
            
        } else {
            // Cacher le texte
            if (woodText) woodText.style.display = 'none';
            if (neonText) neonText.style.display = 'none';
            
            // Afficher les placeholders
            if (woodPlaceholder) woodPlaceholder.style.display = 'block';
            if (neonPlaceholder) neonPlaceholder.style.display = 'block';
        }
    };
    
    // ===== Écouteur d'événement sur l'input =====
    if (configInput) {
        // Mise à jour en temps réel
        configInput.addEventListener('input', (e) => {
            updatePreviewText(e.target.value);
        });
        
        // Effet focus
        configInput.addEventListener('focus', () => {
            configInput.parentElement.classList.add('focused');
        });
        
        configInput.addEventListener('blur', () => {
            configInput.parentElement.classList.remove('focused');
        });
        
        // Empêcher les caractères spéciaux
        configInput.addEventListener('keypress', (e) => {
            // Autoriser lettres, chiffres, espaces, accents
            const regex = /^[a-zA-ZÀ-ÿ0-9\s&'"-]$/;
            if (!regex.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });
    }
    
    // ===== Changement de couleur néon =====
    const updateNeonColor = (colorName) => {
        const color = neonColors[colorName];
        if (!color || !neonText) return;
        
        currentColor = colorName;
        
        // Mettre à jour la variable CSS
        document.documentElement.style.setProperty('--neon-pink', color.main);
        document.documentElement.style.setProperty('--neon-glow', color.glow);
        
        // Appliquer le style directement
        neonText.style.textShadow = `
            0 0 5px #fff,
            0 0 10px #fff,
            0 0 20px ${color.main},
            0 0 40px ${color.main},
            0 0 60px ${color.main},
            0 0 80px ${color.main},
            0 0 100px ${color.main}
        `;
        
        // Mettre à jour les états actifs des dots
        colorDots.forEach(dot => {
            dot.classList.remove('active');
            if (dot.classList.contains(colorName)) {
                dot.classList.add('active');
            }
        });
        
        // Mettre à jour le border du neon-preview
        const neonPreview = document.querySelector('.neon-preview');
        if (neonPreview) {
            neonPreview.style.borderColor = `${color.main}40`;
            neonPreview.style.boxShadow = `
                0 0 30px ${color.glow}20,
                inset 0 0 30px rgba(0, 0, 0, 0.5)
            `;
        }
    };
    
    // ===== Écouteurs sur les dots de couleur =====
    colorDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const colorClasses = ['pink', 'blue', 'purple', 'white', 'yellow'];
            const colorClass = colorClasses.find(c => dot.classList.contains(c));
            if (colorClass) {
                updateNeonColor(colorClass);
            }
        });
    });
    
    // ===== Effet parallaxe subtil au mouvement de souris =====
    const panels = document.querySelectorAll('.split-panel');
    
    if (window.innerWidth > 900) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            const mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
            
            // Légère rotation des previews
            const woodPreview = document.querySelector('.wood-preview');
            const neonPreview = document.querySelector('.neon-preview');
            
            if (woodPreview) {
                woodPreview.style.transform = `
                    perspective(1000px)
                    rotateY(${mouseX * 3}deg)
                    rotateX(${mouseY * -2}deg)
                `;
            }
            
            if (neonPreview) {
                neonPreview.style.transform = `
                    perspective(1000px)
                    rotateY(${mouseX * 3}deg)
                    rotateX(${mouseY * -2}deg)
                `;
            }
        });
    }
    
    // ===== Animation des étoiles néon =====
    const animateStars = () => {
        const stars = document.querySelectorAll('.decor-neon[class*="star"]');
        stars.forEach(star => {
            const randomDelay = Math.random() * 2;
            star.style.animationDelay = `${randomDelay}s`;
        });
    };
    
    animateStars();
    
    // ===== Texte par défaut pour démo =====
    const demoTexts = ['Emma', 'Lucas', 'Léa', 'Hugo', 'Chloé', 'Louis'];
    let demoIndex = 0;
    let isDemoRunning = false;
    
    const runDemo = () => {
        if (configInput && !configInput.value && !isDemoRunning) {
            isDemoRunning = true;
            const text = demoTexts[demoIndex];
            let charIndex = 0;
            
            const typeText = () => {
                if (charIndex < text.length) {
                    configInput.value += text[charIndex];
                    updatePreviewText(configInput.value);
                    charIndex++;
                    setTimeout(typeText, 100);
                } else {
                    setTimeout(() => {
                        // Effacer après 3 secondes
                        const eraseText = () => {
                            if (configInput.value.length > 0) {
                                configInput.value = configInput.value.slice(0, -1);
                                updatePreviewText(configInput.value);
                                setTimeout(eraseText, 50);
                            } else {
                                demoIndex = (demoIndex + 1) % demoTexts.length;
                                isDemoRunning = false;
                            }
                        };
                        eraseText();
                    }, 3000);
                }
            };
            
            typeText();
        }
    };
    
    // Lancer la démo après 2 secondes si l'input est vide
    setTimeout(() => {
        if (configInput && !configInput.value) {
            runDemo();
            // Répéter toutes les 8 secondes
            setInterval(runDemo, 8000);
        }
    }, 2000);
    
    // Arrêter la démo si l'utilisateur commence à taper
    if (configInput) {
        configInput.addEventListener('focus', () => {
            isDemoRunning = true; // Empêche la démo de se relancer
            configInput.value = '';
            updatePreviewText('');
        });
    }
    
    // ===== Accessibilité : Navigation clavier =====
    colorDots.forEach((dot, index) => {
        dot.setAttribute('tabindex', '0');
        dot.setAttribute('role', 'button');
        dot.setAttribute('aria-label', `Couleur ${dot.classList[1]}`);
        
        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dot.click();
            }
        });
    });
    
    // ===== Console log stylisé =====
    console.log(
        '%c✨ Hero Split Screen Loaded',
        'color: #ff2d75; font-size: 14px; font-weight: bold;'
    );
});

// ===== Export pour usage externe =====
window.HeroSplit = {
    setPreviewText: (text) => {
        const input = document.getElementById('preview-text');
        if (input) {
            input.value = text;
            input.dispatchEvent(new Event('input'));
        }
    },
    setNeonColor: (color) => {
        const dot = document.querySelector(`.color-dot.${color}`);
        if (dot) dot.click();
    }
};
