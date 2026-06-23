/* =====================================================
   PAINT PRO — Service Worker Registration
   ===================================================== */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
            .then((registration) => {
                console.log('[SW] Registered, scope:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[SW] New version available');
                            // Optional: notify user about update
                            if (typeof showToast === 'function') {
                                showToast('Güncelleme mevcut! Yenile.', 'info');
                            }
                        }
                    });
                });
            })
            .catch((err) => {
                console.warn('[SW] Registration failed:', err);
            });
    });
} else {
    console.log('[SW] Service Workers not supported');
}
