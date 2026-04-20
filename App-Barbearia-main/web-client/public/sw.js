/* Service Worker for Web Push Notifications 
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Barbershop';
  const options = {
    body: data.body || 'Voce tem uma nova notificacao',
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
    actions: [{ action: 'open', title: 'Ver' }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});*/



/* Service Worker for Web Push Notifications */
const CACHE_NAME = 'push-sw-v1';

self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Força ativação imediata
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(clients.claim()); // Toma controle imediato
});

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (error) {
    console.error('Error parsing push data:', error);
    // Tenta parse como texto simples
    if (event.data) {
      data = {
        title: 'Barbershop',
        body: event.data.text()
      };
    }
  }
  
  const title = data.title || 'Barbershop';
  const options = {
    body: data.body || 'Você tem uma nova notificação',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: { 
      url: data.url || '/dashboard',
      clickUrl: data.clickUrl || data.url || '/dashboard'
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ],
    // Importante para mobile
    silent: false,
    renotify: true,
    requireInteraction: true, // Fica na tela até interagir
    tag: data.tag || 'default' // Evita notificações duplicadas
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const url = event.notification.data?.clickUrl || 
              event.notification.data?.url || 
              '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Verifica se já existe uma aba aberta
        for (let client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não existe, abre nova
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Importante: Gerencia mudanças na subscription
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Push subscription changed');
  event.waitUntil(
    // Envia nova subscription para o backend
    fetch('/api/web-push/resubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldEndpoint: event.oldSubscription ? event.oldSubscription.endpoint : null,
        newSubscription: event.newSubscription
      })
    })
  );
});
