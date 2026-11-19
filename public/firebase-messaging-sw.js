/* Firebase Cloud Messaging — orqa fon (background) bildirishnoma ishlovchisi.
 *
 * Konfiguratsiya registratsiya URL query-paramlari orqali uzatiladi
 * (kalitlar .env'dan keladi; bu fayl ommaviy bo'lgani uchun hardcode QILINMAYDI —
 * Firebase web kalitlari maxfiy emas, lekin manbani yagona joyda saqlaymiz).
 *
 * Bu SW workbox (PWA) SW'idan ALOHIDA — o'z scope'ida ishlaydi, to'qnashmaydi.
 */
/* global importScripts, firebase, clients */
/* CDN versiyasi package.json'dagi `firebase` bilan MOS bo'lishi kerak — aks holda
 * SW va ilova turli protokol versiyalarida token muzokara qilishi mumkin. */
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

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
      // badge Android status-barida bir rangli ko'rsatiladi — oq/alpha belgi shart
      badge: '/notification-96.png',
      data: payload.data || {},
    };
    self.registration.showNotification(title, options);
  });
}

// Bildirishnoma bosilganda — ochiq oynani fokuslab maqsadli sahifaga o'tkazish yoki yangisini ochish
function sanitizeLink(raw) {
  if (!raw || typeof raw !== 'string') return '/';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  try {
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }
  } catch { /* noto'g'ri URL */ }
  return '/';
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const rawLink = data.link
    || (data.FCM_MSG && data.FCM_MSG.fcmOptions && data.FCM_MSG.fcmOptions.link)
    || (data.FCM_MSG && data.FCM_MSG.data && data.FCM_MSG.data.link)
    || '/';
  const link = sanitizeLink(rawLink);
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.startsWith(self.location.origin)) {
          if ('navigate' in client && client.url !== targetUrl) {
            try { await client.navigate(targetUrl); } catch { /* focus bilan davom */ }
          }
          if ('focus' in client) return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
