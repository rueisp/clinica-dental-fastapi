// Service Worker para CloudentApp
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejo del toque / clic sobre la notificación en el celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si la app ya está abierta en segundo plano, la enfoca y navega al chat
      for (const client of clientList) {
        if (client.url.includes('/chat') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Si está cerrada, abre una nueva ventana con el chat
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});