// ============================================
// FAMILY CUSTOM - 3D Preview JS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const preview = document.getElementById('product-preview');
    const container = document.querySelector('.preview-3d-container');
    const btnRotate = document.getElementById('btn-rotate');
    const btnFlip = document.getElementById('btn-flip');
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');
    const zoomIndicator = document.getElementById('zoom-indicator');

    if (!preview || !container) return;

    let is3DMode = false;
    let isFlipped = false;
    let rotateX = 0;
    let rotateY = 0;
    let scale = 1;
    let isDragging = false;
    let startX, startY;

    // 3D Rotation toggle
    btnRotate.addEventListener('click', function() {
        is3DMode = !is3DMode;
        this.classList.toggle('active', is3DMode);
        
        if (!is3DMode) {
            // Reset rotation
            rotateX = 0;
            rotateY = 0;
            updateTransform();
        }
    });

    // Flip button
    btnFlip.addEventListener('click', function() {
        isFlipped = !isFlipped;
        rotateY = isFlipped ? 180 : 0;
        updateTransform();
    });

    // Mouse/Touch drag for 3D rotation
    preview.addEventListener('mousedown', startDrag);
    preview.addEventListener('touchstart', startDrag, { passive: true });
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag, { passive: true });
    
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchend', endDrag);

    function startDrag(e) {
        if (!is3DMode) return;
        
        isDragging = true;
        preview.classList.add('dragging');
        
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }
    }

    function drag(e) {
        if (!isDragging || !is3DMode) return;
        
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const deltaX = clientX - startX;
        const deltaY = clientY - startY;

        rotateY += deltaX * 0.5;
        rotateX -= deltaY * 0.5;

        // Limit rotation
        rotateX = Math.max(-30, Math.min(30, rotateX));
        rotateY = Math.max(-45, Math.min(45, rotateY));

        startX = clientX;
        startY = clientY;

        updateTransform();
    }

    function endDrag() {
        isDragging = false;
        preview.classList.remove('dragging');
    }

    // Zoom controls
    zoomIn.addEventListener('click', function() {
        scale = Math.min(scale + 0.2, 2);
        updateTransform();
        showZoomIndicator();
    });

    zoomOut.addEventListener('click', function() {
        scale = Math.max(scale - 0.2, 0.5);
        updateTransform();
        showZoomIndicator();
    });

    zoomReset.addEventListener('click', function() {
        scale = 1;
        rotateX = 0;
        rotateY = 0;
        isFlipped = false;
        updateTransform();
        showZoomIndicator();
    });

    // Mouse wheel zoom
    preview.addEventListener('wheel', function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        scale = Math.max(0.5, Math.min(2, scale + delta));
        updateTransform();
        showZoomIndicator();
    }, { passive: false });

    function updateTransform() {
        let transform = `scale(${scale})`;
        
        if (is3DMode || isFlipped) {
            transform += ` rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
        
        preview.style.transform = transform;
    }

    function showZoomIndicator() {
        zoomIndicator.textContent = Math.round(scale * 100) + '%';
        zoomIndicator.classList.add('visible');
        
        clearTimeout(window.zoomTimeout);
        window.zoomTimeout = setTimeout(() => {
            zoomIndicator.classList.remove('visible');
        }, 1500);
    }

    // Double click to zoom
    preview.addEventListener('dblclick', function() {
        if (scale === 1) {
            scale = 1.5;
        } else {
            scale = 1;
        }
        updateTransform();
        showZoomIndicator();
    });
});
