// Cache names for different strategies
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-cache-${CACHE_VERSION}`;
const IMAGE_CACHE = `image-cache-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;
const SPLASH_CACHE = `splash-cache-${CACHE_VERSION}`;

// Static assets for cache-first strategy
const STATIC_ASSETS = [
  '/',
  '/icon.png',
  '/site.webmanifest',
  '/assets/application.css',
  '/assets/application.js',
  '/assets/application.tailwind.css',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png'
];

// Splash screen assets
const SPLASH_ASSETS = [
  '/splash/splash-320x568.png',
  '/splash/splash-375x667.png',
  '/splash/splash-414x896.png',
  '/splash/splash-768x1024.png',
  '/splash/splash-1024x768.png'
];

// API endpoints for network-first strategy
const API_ENDPOINTS = [
  '/api/',
  '/items',
  '/stock_transactions',
  '/locations',
  '/teams'
];

// Image and font patterns for stale-while-revalidate
const ASSET_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:woff|woff2|ttf|eot)$/
];

// Install event - cache static assets and splash screens
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE)
        .then(cache => {
          console.log('Service Worker: Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      // Cache splash screen assets
      caches.open(SPLASH_CACHE)
        .then(cache => {
          console.log('Service Worker: Caching splash screen assets');
          return cache.addAll(SPLASH_ASSETS).catch(error => {
            console.warn('Service Worker: Some splash assets failed to cache', error);
            // Don't fail installation if splash assets fail
          });
        })
    ])
    .then(() => {
      console.log('Service Worker: All assets cached');
      return self.skipWaiting();
    })
    .catch(error => {
      console.error('Service Worker: Failed to cache assets', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE &&
                cacheName !== SPLASH_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement different caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Cache-first strategy for static assets
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Network-first strategy for API endpoints
  if (isApiRequest(request)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Stale-while-revalidate for images and fonts
  if (isAssetRequest(request)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Default: network-first for HTML pages
  if (request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
    return;
  }

  // Fallback to network
  event.respondWith(fetch(request));
});

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      return cachedResponse;
    }

    console.log('Service Worker: Fetching and caching', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Cache-first failed', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    console.log('Service Worker: Network-first for', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/') || new Response('Offline', { 
        status: 503, 
        statusText: 'Service Unavailable' 
      });
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('Service Worker: Background fetch failed', error);
  });

  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('Service Worker: Serving stale content', request.url);
    return cachedResponse;
  }

  // If no cache, wait for network
  console.log('Service Worker: No cache, waiting for network', request.url);
  return fetchPromise;
}

// Helper functions to determine request types
function isStaticAsset(request) {
  const url = new URL(request.url);
  return STATIC_ASSETS.some(asset => url.pathname === asset) ||
         url.pathname.startsWith('/assets/') ||
         url.pathname.includes('.css') ||
         url.pathname.includes('.js');
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint)) ||
         url.pathname.startsWith('/api/') ||
         request.headers.get('accept')?.includes('application/json');
}

function isAssetRequest(request) {
  const url = new URL(request.url);
  return ASSET_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Background sync for offline transactions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync-transactions') {
    event.waitUntil(syncOfflineTransactions());
  }
});

// Sync offline transactions
async function syncOfflineTransactions() {
  console.log('Service Worker: Starting background sync for offline transactions');
  
  try {
    // Open IndexedDB to get pending transactions
    const db = await openOfflineDatabase();
    const pendingTransactions = await getPendingTransactionsFromDB(db);
    
    console.log(`Service Worker: Found ${pendingTransactions.length} pending transactions`);
    
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const transaction of pendingTransactions) {
      try {
        const success = await syncTransactionInBackground(transaction);
        if (success) {
          syncedCount++;
          await markTransactionSyncedInDB(db, transaction.id);
        } else {
          failedCount++;
          await incrementRetryCountInDB(db, transaction.id);
        }
      } catch (error) {
        console.error('Service Worker: Failed to sync transaction', transaction.id, error);
        failedCount++;
        await incrementRetryCountInDB(db, transaction.id);
      }
    }
    
    console.log(`Service Worker: Background sync completed. Synced: ${syncedCount}, Failed: ${failedCount}`);
    
    // Notify clients about sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        synced: syncedCount,
        failed: failedCount
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
    throw error;
  }
}

// Open offline database in service worker
function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PurpleStockOfflineDB', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get pending transactions from IndexedDB
function getPendingTransactionsFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['transactions'], 'readonly');
    const store = tx.objectStore('transactions');
    const index = store.index('status');
    
    const pendingTransactions = [];
    const request = index.openCursor(IDBKeyRange.only('pending'));
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        // Only sync transactions that haven't exceeded retry limit
        if (cursor.value.retryCount < 3) {
          pendingTransactions.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(pendingTransactions);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Sync individual transaction in background
async function syncTransactionInBackground(transaction) {
  try {
    const endpoint = getEndpointForTransactionType(transaction.type);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(transaction.data)
    });
    
    if (response.ok) {
      console.log('Service Worker: Transaction synced successfully', transaction.id);
      return true;
    } else {
      console.error('Service Worker: Transaction sync failed', transaction.id, response.status);
      return false;
    }
  } catch (error) {
    console.error('Service Worker: Network error during transaction sync', transaction.id, error);
    return false;
  }
}

// Get endpoint for transaction type
function getEndpointForTransactionType(type) {
  const endpoints = {
    'stock_in': '/stock_transactions',
    'stock_out': '/stock_transactions',
    'stock_move': '/stock_transactions',
    'stock_adjust': '/stock_transactions',
    'item_create': '/items',
    'item_update': '/items',
    'location_create': '/locations',
    'location_update': '/locations'
  };
  
  return endpoints[type] || '/api/sync';
}

// Mark transaction as synced in database
function markTransactionSyncedInDB(db, transactionId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');
    
    const getRequest = store.get(transactionId);
    getRequest.onsuccess = () => {
      const transaction = getRequest.result;
      if (transaction) {
        transaction.status = 'synced';
        transaction.syncedAt = Date.now();
        
        const putRequest = store.put(transaction);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(); // Transaction not found, might have been deleted
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Increment retry count for failed transaction
function incrementRetryCountInDB(db, transactionId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');
    
    const getRequest = store.get(transactionId);
    getRequest.onsuccess = () => {
      const transaction = getRequest.result;
      if (transaction) {
        transaction.retryCount = (transaction.retryCount || 0) + 1;
        transaction.lastAttempt = Date.now();
        
        // Mark as failed if exceeded retry limit
        if (transaction.retryCount >= 3) {
          transaction.status = 'failed';
        }
        
        const putRequest = store.put(transaction);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve(); // Transaction not found
      }
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}
