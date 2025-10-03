// Service Worker for Push Notifications
const CACHE_NAME = 'email-app-v1';
const urlsToCache = [
  '/',
  '/offline.html'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Push event - show notification
self.addEventListener('push', (event) => {
  const options = {
    body: 'You have a new email!',
    icon: '/email-icon.svg',
    badge: '/email-badge.svg',
    vibrate: [200, 100, 200],
    tag: 'email-notification',
    renotify: true,
    actions: [
      {
        action: 'view',
        title: 'View Email',
        icon: '/view-icon.svg'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/dismiss-icon.svg'
      }
    ],
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.icon = data.icon || options.icon;
      options.badge = data.badge || options.badge;
      options.tag = data.tag || options.tag;
      options.data = data.data || options.data;
      options.title = data.title || 'New Email';
      
      if (data.actions) {
        options.actions = data.actions;
      }
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      options.title || 'New Email',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    // Open the email app
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

// Handle background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'email-sync') {
    event.waitUntil(syncEmails());
  }
});

async function syncEmails() {
  // Implement email sync logic here
  console.log('Syncing emails...');
}

// Handle message from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});