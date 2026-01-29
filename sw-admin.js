/* ============================================
   FAMILY CUSTOM - Service Worker Admin PWA
   ============================================ */

const CACHE_NAME = 'fc-admin-v1';
const ADMIN_CACHE = 'fc-admin-data-v1';

// Fichiers à mettre en cache pour l'admin
const STATIC_ASSETS = [
  '/admin.html',
  '/css/admin.css',
  '/css/styles.css',
  '/css/mobile.css',
  '/js/admin.js',
  '/js/firebase-config.js',
  '/images/IMG_3402.jpeg',
  '/images/icon-admin-192.svg',
  '/images/icon-admin-512.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css'
];

// Installation - mise en cache des fichiers statiques
self.addEventListener('install', (event) => {
  console.log('[SW Admin] Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW Admin] Mise en cache des fichiers statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW Admin] Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fc-admin') && name !== CACHE_NAME && name !== ADMIN_CACHE)
          .map((name) => {
            console.log('[SW Admin] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - stratégie Network First pour les données, Cache First pour les assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Firebase/Firestore - toujours réseau (données temps réel)
  if (url.hostname.includes('firebase') || url.hostname.includes('firestore')) {
    return;
  }
  
  // Pour les fichiers statiques - Cache First
  if (STATIC_ASSETS.some(asset => event.request.url.includes(asset)) || 
      event.request.url.includes('.css') || 
      event.request.url.includes('.js') ||
      event.request.url.includes('.png') ||
      event.request.url.includes('.jpg') ||
      event.request.url.includes('.jpeg')) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Mettre à jour le cache en arrière-plan
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            }).catch(() => {});
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          });
        })
    );
    return;
  }
  
  // Pour admin.html - Network First avec fallback cache
  if (event.request.url.includes('admin.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
});

// Notification de nouvelle commande (pour plus tard)
self.addEventListener('push', (event) => {
  console.log('[SW Admin] Push reçu');
  
  let data = { title: 'Family Custom', body: 'Nouvelle notification' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body || 'Nouvelle commande reçue !',
    icon: '/images/icon-admin-192.svg',
    badge: '/images/icon-admin-192.svg',
    vibrate: [200, 100, 200],
    tag: 'fc-admin-notification',
    renotify: true,
    actions: [
      { action: 'view', title: 'Voir' },
      { action: 'dismiss', title: 'Ignorer' }
    ],
    data: {
      url: data.url || '/admin.html#orders'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Family Custom Admin', options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Admin] Clic notification');
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/admin.html#orders';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Chercher une fenêtre admin déjà ouverte
        for (const client of windowClients) {
          if (client.url.includes('admin.html') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Sync en arrière-plan (pour plus tard - sync commandes offline)
self.addEventListener('sync', (event) => {
  console.log('[SW Admin] Sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(
      // Logique de synchronisation des commandes
      Promise.resolve()
    );
  }
});
