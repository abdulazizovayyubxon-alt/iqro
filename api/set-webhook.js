/**
 * ════════════════════════════════════════════════════════════
 *  Admin yordamchi endpoint (bir martalik / debug)
 *  api/set-webhook.js
 *
 *  1) Telegram webhook o'rnatish (asosiy, action yo'q yoki action=webhook):
 *     https://yoursite.vercel.app/api/set-webhook?secret=iqro-cron-2026-secret
 *
 *  2) settings/version hujjatini ko'rish (debug, action=version):
 *     https://yoursite.vercel.app/api/set-webhook?secret=iqro-cron-2026-secret&action=version
 *
 *  Eslatma: oldin alohida api/debug-version.js bo'lgan — Vercel Hobby
 *  rejasidagi 12 funksiya limitidan oshmaslik uchun shu yerga ko'chirildi.
 * ════════════════════════════════════════════════════════════
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getDb() {
  if (getApps().length === 0) {
    let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountStr);
    } catch (e) {
      serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

export default async function handler(req, res) {
  // Xavfsizlik: secret kalitni tekshiramiz
  const { secret, action } = req.query;
  const expectedSecret = process.env.CRON_SECRET || 'iqro-cron-2026-secret';

  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Ruxsat yo\'q. Secret noto\'g\'ri.' });
  }

  // ── 2) Debug: settings/version hujjatini qaytarish ──
  if (action === 'version') {
    try {
      const db = getDb();
      const versionSnap = await db.collection('settings').doc('version').get();
      if (!versionSnap.exists) {
        return res.status(404).json({ error: 'version document not found' });
      }
      return res.status(200).json(versionSnap.data());
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // ── 1) Asosiy: Telegram webhookni o'rnatish ──
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // Vercel da joylashgan loyihamizning URL si
  // Har doim asosiy (production) domenni ishlatamiz!
  // Shunda har bir yangilanishda eski url ga qolib ketmaydi.
  const baseUrl = 'https://toifapro-t41p.vercel.app';

  const webhookUrl = `${baseUrl}/api/telegram-webhook`;

  try {
    // Avval mavjud webhookni tekshiramiz
    const infoResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const info = await infoResp.json();

    // Webhookni o'rnatamiz
    const setResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true
        })
      }
    );

    const result = await setResp.json();

    // Bot ma'lumotlarini olamiz
    const meResp = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`
    );
    const me = await meResp.json();

    return res.status(200).json({
      success: result.ok,
      message: result.description,
      webhookUrl: webhookUrl,
      bot: me.result ? {
        id: me.result.id,
        username: me.result.username,
        name: me.result.first_name
      } : null,
      previousWebhook: info.result?.url || null,
      pendingUpdates: info.result?.pending_update_count || 0
    });

  } catch (error) {
    console.error('Set webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
