  
    let currentZoom = 100;
    let isFullscreen = false;
    const pdfIframe = document.getElementById('pdf-iframe');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorContainer = document.getElementById('error-container');
    const pdfContainer = document.querySelector('.glass-effect');
    const pdfViewer = document.getElementById('pdf-viewer');
    const zoomLevelDisplay = document.getElementById('zoom-level');
    const mobileZoomLevelDisplay = document.getElementById('mobile-zoom-level');
    
    // Update zoom display
    function updateZoomDisplay() {
        const zoomText = `${currentZoom}%`;
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = zoomText;
        if (mobileZoomLevelDisplay) mobileZoomLevelDisplay.textContent = zoomText;
    }
    
    // Hide loading overlay when PDF loads
    function hideLoading() {
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transform = 'scale(0.95)';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 300);
        }, 800);
    }
    
    // Show error state
    function showError() {
        loadingOverlay.style.display = 'none';
        pdfContainer.style.display = 'none';
        errorContainer.classList.remove('hidden');
    }
    
    // Retry loading
    function retryLoad() {
        errorContainer.classList.add('hidden');
        pdfContainer.style.display = 'block';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.transform = 'scale(1)';
        pdfIframe.src = pdfIframe.src;
    }
    
    // Refresh PDF
    function refreshPDF() {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.opacity = '1';
        loadingOverlay.style.transform = 'scale(1)';
        pdfIframe.src = pdfIframe.src;
    }
    
    // Toggle fullscreen
    function toggleFullscreen() {
        const isMobile = window.innerWidth <= 768; // define mobile breakpoint
        const header = document.getElementById('doc-view-header');

        if (!isFullscreen) {
            pdfViewer.classList.add('fullscreen-mode');

            // Hide header only on mobile
            if (isMobile && header) {
                header.style.display = 'none';
            }

            isFullscreen = true;

            // Update fullscreen button icon
            const fullscreenBtns = document.querySelectorAll('[onclick="toggleFullscreen()"] i');
            fullscreenBtns.forEach(btn => btn.setAttribute('data-lucide', 'minimize'));
            lucide.createIcons();
        } else {
            pdfViewer.classList.remove('fullscreen-mode');

            // Show header back only on mobile
            if (isMobile && header) {
                header.style.display = 'block';
            }

            isFullscreen = false;

            // Update fullscreen button icon
            const fullscreenBtns = document.querySelectorAll('[onclick="toggleFullscreen()"] i');
            fullscreenBtns.forEach(btn => btn.setAttribute('data-lucide', 'expand'));
            lucide.createIcons();
        }
    }

    

    
    // Enhanced zoom functions with actual iframe scaling
    function zoomIn() {
        currentZoom = Math.min(currentZoom + 25, 200);
        applyZoom();
        updateZoomDisplay();

    }
    
    function zoomOut() {
        currentZoom = Math.max(currentZoom - 25, 50);
        applyZoom();
        updateZoomDisplay();

    }
    
    // Apply zoom to iframe
    function applyZoom() {
        const scale = currentZoom / 100;
        const pdfFrame = document.querySelector('.pdf-frame');

        if (isFullscreen && window.innerWidth <= 768) {
            // On mobile fullscreen, use natural size (avoid scale)
            pdfFrame.style.transform = 'none';
        } else {
            pdfFrame.style.transform = `scale(${scale})`;
        }

        const container = document.querySelector('.pdf-iframe-container');
        container.style.overflow = scale > 1 ? 'auto' : 'hidden';
    }



    function enterMobileFullscreen() {
        pdfViewer.classList.add('mobile-fullscreen');
    }

    function exitMobileFullscreen() {
        pdfViewer.classList.remove('mobile-fullscreen');
    }
    
    
    // Enhanced keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '=':
                case '+':
                    e.preventDefault();
                    zoomIn();
                    break;
                case '-':
                    e.preventDefault();
                    zoomOut();
                    break;
                case '0':
                    e.preventDefault();
                    currentZoom = 100;
                    applyZoom();
                    updateZoomDisplay();
                    break;
                case 'r':
                    e.preventDefault();
                    refreshPDF();
                    break;
            }
        }
        
        if (e.key === 'Escape' && isFullscreen) {
            toggleFullscreen();
        }
        
        if (e.key === 'F11') {
            e.preventDefault();
            toggleFullscreen();
        }
    });
    
    // Touch gestures for mobile zoom
    let touchStartDistance = 0;
    let initialZoom = 100;
    
    pdfIframe.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            touchStartDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            initialZoom = currentZoom;
        }
    });
    
    pdfIframe.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            const scale = currentDistance / touchStartDistance;
            const newZoom = Math.max(50, Math.min(200, initialZoom * scale));
            
            if (Math.abs(newZoom - currentZoom) > 5) {
                currentZoom = Math.round(newZoom / 25) * 25;
                applyZoom();
                updateZoomDisplay();
            }
        }
    });
    
    // Enhanced loading experience with progress indication
    let loadingTimeout;
    function startLoadingTimer() {
        loadingTimeout = setTimeout(() => {
            if (loadingOverlay.style.display !== 'none') {
                const loadingText = loadingOverlay.querySelector('p');
                if (loadingText) {
                    loadingText.textContent = 'Still loading... This may take a moment';
                }
            }
        }, 5000);
    }
    
    // Initialize
    updateZoomDisplay();
    startLoadingTimer();
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (isFullscreen) {
            // Adjust fullscreen layout if needed
        }
    });
    
    // Prevent context menu on iframe for better UX
    pdfIframe.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });