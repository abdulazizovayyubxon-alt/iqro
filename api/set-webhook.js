/**
 * ════════════════════════════════════════════════════════════
 *  Telegram Webhook ro'yxatdan o'tkazish (bir martalik)
 *  api/set-webhook.js
 *
 *  Ishlatish: https://yoursite.vercel.app/api/set-webhook?secret=iqro-cron-2026-secret
 * ════════════════════════════════════════════════════════════
 */

export default async function handler(req, res) {
  // Xavfsizlik: secret kalitni tekshiramiz
  const { secret } = req.query;
  const expectedSecret = process.env.CRON_SECRET || 'iqro-cron-2026-secret';

  if (secret !== expectedSecret) {
    return res.status(403).json({ error: 'Ruxsat yo\'q. Secret noto\'g\'ri.' });
  }

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8523102352:AAEQOggWs3ULCGivaao-bmMpwT-_lFdxMeQ';
  
  // Vercel da joylashgan loyihamizning URL si
  // Vercel VERCEL_URL env ni o'zi qo'yadi
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://iqro-t41p.vercel.app';

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
