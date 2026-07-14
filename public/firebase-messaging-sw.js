/* Firebase Cloud Messaging — orqa fon (background) bildirishnoma ishlovchisi.
 *
 * Konfiguratsiya registratsiya URL query-paramlari orqali uzatiladi
 * (kalitlar .env'dan keladi; bu fayl ommaviy bo'lgani uchun hardcode QILINMAYDI —
 * Firebase web kalitlari maxfiy emas, lekin manbani yagona joyda saqlaymiz).
 *
 * Bu SW workbox (PWA) SW'idan ALOHIDA — o'z scope'ida ishlaydi, to'qnashmaydi.
 */
/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URL(self.location).searchParams;
const config = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
};

if (config.apiKey && config.projectId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Zehin';
    const options = {
      body: (payload.notification && payload.notification.body) || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: payload.data || {},
    };
    self.registration.showNotification(title, options);
  });
}

// Bildirishnoma bosilganda — ochiq oynani fokuslash yoki yangisini ochish
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
