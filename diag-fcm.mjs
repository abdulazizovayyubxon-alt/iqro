import 'dotenv/config';
import crypto from 'crypto';

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID;
const APP_ID = process.env.VITE_FIREBASE_APP_ID;
const VAPID = process.env.VITE_FIREBASE_VAPID_KEY.trim();

// 1) Firebase Installations — SDK aynan shunday oladi
const fid = (() => {
  const b = crypto.randomBytes(17); b[0] = 0b01110000 + (b[0] % 0b00010000);
  return b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'').slice(0,22);
})();

const fisRes = await fetch(`https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT}/installations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
  body: JSON.stringify({ fid, appId: APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.13' }),
});
const fis = await fisRes.json();
console.log('1) Installations:', fisRes.status, fis?.authToken?.token ? 'authToken OLINDI' : JSON.stringify(fis).slice(0, 300));
if (!fis?.authToken?.token) process.exit(1);

// 2) FCM registratsiyasi — VAPID kaliti SHU YERDA loyihaga tekshiriladi
const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
const b64 = (buf) => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const body = {
  web: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/diagnostika-' + crypto.randomBytes(8).toString('hex'),
    auth: b64(crypto.randomBytes(16)),
    p256dh: b64(ecdh.getPublicKey()),
    applicationPubKey: VAPID,
  },
};
const regRes = await fetch(`https://fcmregistrations.googleapis.com/v1/projects/${PROJECT}/registrations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': API_KEY,
    'x-goog-firebase-installations-auth': `FIS_v2 ${fis.authToken.token}`,
  },
  body: JSON.stringify(body),
});
const reg = await regRes.json();
console.log('2) FCM registratsiya:', regRes.status);
console.log(regRes.ok
  ? `   ✅ TOKEN BERILDI (${String(reg.token).slice(0, 24)}…) — VAPID kalit loyihaga MOS, FCM API yoqilgan`
  : '   ❌ ' + JSON.stringify(reg).slice(0, 600));
process.exit(0);
