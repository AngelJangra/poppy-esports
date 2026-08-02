// api/telegram-webhook.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, TELEGRAM_BOT_TOKEN, ADMIN_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.error('Missing Telegram env vars');
    return res.status(500).json({ error: 'Missing config' });
  }

  const payload = req.body;
  const record = payload.record;
  if (!record) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: user, error } = await supabase
    .from('users')
    .select('display_name, email')
    .eq('id', record.user_id)
    .single();

  const userName = user?.display_name || record.user_id;
  const userEmail = user?.email || 'N/A';

  const message = `💰 *New Deposit Request – POPPY ESPORTS*  
  User: ${userName} (${userEmail})  
  Amount: ₹${record.amount}  
  Method: ${record.payment_method}  
  UTR: ${record.utr}  
  Screenshot: ${record.screenshot_url}  
  Deposit ID: ${record.id}`;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  if (!response.ok) {
    console.error('Telegram send error:', await response.text());
    return res.status(500).json({ error: 'Telegram send failed' });
  }

  res.status(200).json({ success: true });
}
