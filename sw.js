// Service Worker for EV Charger PWA
const CACHE_NAME = 'ev-charger-v2';
const API_URL = 'https://wattvolt.eu.charge.ampeco.tech/api/v1/app/locations?operatorCountry=GR';
const SYNC_INTERVAL = 60000; // 1 minute for background sync

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('Service Worker installing');
    self.skipWaiting(); // Force activation
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                '/',
                '/index.html',
                '/script.js',
                '/style.css',
                '/manifest.json'
            ]);
        })
    );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
    console.log('Service Worker activating');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all clients
            self.clients.claim()
        ])
    );
});

// Background sync for checking charger status
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);
    if (event.tag === 'check-chargers') {
        event.waitUntil(checkWatchedChargers());
    } else if (event.tag === 'refresh-chargers') {
        event.waitUntil(refreshAllChargers());
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'charger-status-check') {
        event.waitUntil(checkWatchedChargers());
    }
});

// Push event for real-time notifications
self.addEventListener('push', event => {
    console.log('Push received:', event);

    let data = {};
    if (event.data) {
        data = event.data.json();
    }

    const options = {
        body: data.body || 'Charger status update!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: data.tag || 'charger-notification',
        requireInteraction: true,
        data: data.url || '/',
        actions: [
            {
                action: 'view',
                title: 'View Location'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'EV Charger Update', options)
    );
});

// Notification click event
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event);
    event.notification.close();

    if (event.action === 'view') {
        // Open the app and navigate to the location
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default click action
        event.waitUntil(
            clients.openWindow(event.notification.data || '/')
        );
    }
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
            .catch(() => {
                // Return offline fallback if available
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
            })
    );
});

// Function to check watched chargers in background
async function checkWatchedChargers() {
    try {
        console.log('Checking watched chargers in background');

        // Get data from IndexedDB or send message to main thread
        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
            // Send message to main thread to perform the check
            clients.forEach(client => {
                client.postMessage({
                    type: 'BACKGROUND_CHECK_CHARGERS',
                    timestamp: Date.now()
                });
            });
        }

        // Schedule next check
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            setTimeout(() => {
                self.registration.sync.register('check-chargers');
            }, SYNC_INTERVAL);
        }
    } catch (error) {
        console.error('Error in background charger check:', error);
    }
}

// Function to refresh all chargers
async function refreshAllChargers() {
    try {
        console.log('Refreshing all chargers in background');

        const clients = await self.clients.matchAll();
        if (clients.length > 0) {
            clients.forEach(client => {
                client.postMessage({
                    type: 'REFRESH_ALL_CHARGERS',
                    timestamp: Date.now()
                });
            });
        }
    } catch (error) {
        console.error('Error refreshing chargers:', error);
    }
}

// Message event to communicate with main thread
self.addEventListener('message', event => {
    if (event.data) {
        switch (event.data.type) {
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'REGISTER_BACKGROUND_SYNC':
                registerBackgroundSync();
                break;
            case 'CHECK_CHARGERS_NOW':
                checkWatchedChargers();
                break;
        }
    }
});

// Register periodic background sync
async function registerBackgroundSync() {
    try {
        if ('periodicSync' in self.registration) {
            await self.registration.periodicSync.register('charger-status-check', {
                minInterval: SYNC_INTERVAL
            });
            console.log('Periodic background sync registered');
        } else {
            // Fallback to regular background sync
            await self.registration.sync.register('check-chargers');
            console.log('Background sync registered');
        }
    } catch (error) {
        console.error('Background sync registration failed:', error);
    }
}
