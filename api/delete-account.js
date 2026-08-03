// api/delete-account.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request has a valid user ID
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  // Supabase Admin client (uses service role key)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  try {
    // 1. Delete the user's profile data from `users` table
    const { error: deleteUserError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);
    if (deleteUserError) throw deleteUserError;

    // 2. Delete their transactions
    const { error: deleteTxError } = await supabaseAdmin
      .from('transactions')
      .delete()
      .eq('user_id', userId);
    if (deleteTxError) throw deleteTxError;

    // 3. Delete their registered_players entries
    const { error: deleteRegError } = await supabaseAdmin
      .from('registered_players')
      .delete()
      .eq('user_id', userId);
    if (deleteRegError) throw deleteRegError;

    // 4. Delete their referrals (as referrer or referred)
    const { error: deleteRefError } = await supabaseAdmin
      .from('pending_referrals')
      .delete()
      .or(`referrer_uid.eq.${userId},referred_uid.eq.${userId}`);
    if (deleteRefError) throw deleteRefError;

    // 5. Delete their notifications (user_notifications)
    const { error: deleteNotifError } = await supabaseAdmin
      .from('user_notifications')
      .delete()
      .eq('user_id', userId);
    if (deleteNotifError) throw deleteNotifError;

    // 6. Delete the auth user itself (using Admin API)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    res.status(200).json({ success: true, message: 'Account permanently deleted.' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
