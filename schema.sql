-- ================================================================
-- POPPY ESPORTS – Complete Supabase Schema (Full Reset)
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  phone_number TEXT,
  balance NUMERIC DEFAULT 0,
  winning_cash NUMERIC DEFAULT 0,
  bonus_cash NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  referral_code TEXT UNIQUE,
  referred_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  total_matches INTEGER DEFAULT 0,
  won_matches INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  referral_earnings NUMERIC DEFAULT 0,
  photo_url TEXT,
  leaderboard_rank INTEGER,
  leaderboard_display_earnings NUMERIC,
  is_admin BOOLEAN DEFAULT FALSE,
  username TEXT,
  game_uid TEXT,
  last_checked_notifications TIMESTAMP,
  -- Free Fire UID & Clan details
  free_fire_uid TEXT UNIQUE,
  ff_clan_id TEXT,
  ff_clan_name TEXT,
  ff_captain_id TEXT,
  ff_captain_nickname TEXT,
  ff_captain_level INTEGER,
  ff_captain_region TEXT,
  ff_verified BOOLEAN DEFAULT FALSE,
  -- Referral tracking
  total_referred_spending NUMERIC DEFAULT 0,
  referral_earnings_from_spending NUMERIC DEFAULT 0,
  joined_tournaments JSONB DEFAULT '{}'
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Promotions
CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  link TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tournaments
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id),
  name TEXT NOT NULL,
  start_time TIMESTAMP,
  status TEXT CHECK (status IN ('upcoming','ongoing','completed','result','cancelled')),
  entry_fee NUMERIC DEFAULT 0,
  prize_pool NUMERIC DEFAULT 0,
  per_kill_prize NUMERIC DEFAULT 0,
  max_players INTEGER DEFAULT 0,
  mode TEXT,
  tags JSONB,
  banner_url TEXT,
  description TEXT,
  room_id TEXT,
  room_password TEXT,
  show_id_pass BOOLEAN DEFAULT FALSE,
  registration_open BOOLEAN DEFAULT TRUE,
  slot_config JSONB,
  winnings_credited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Registered Players (join table)
CREATE TABLE registered_players (
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  game_uid TEXT,
  teammates JSONB,
  slots JSONB,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (tournament_id, user_id)
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  amount NUMERIC,
  description TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  balance_after NUMERIC,
  admin_uid UUID REFERENCES users(id),
  details JSONB
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  method_details JSONB,
  status TEXT CHECK (status IN ('pending','completed','rejected')),
  request_timestamp TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id),
  reject_reason TEXT,
  admin_note TEXT
);

-- Deposits
CREATE TABLE deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  upi_id TEXT,
  utr TEXT,
  screenshot_url TEXT,
  status TEXT CHECK (status IN ('pending','completed','rejected')),
  timestamp TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES users(id)
);

-- Pending Referrals
CREATE TABLE pending_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_uid UUID REFERENCES users(id),
  referred_uid UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending','credited')),
  timestamp TIMESTAMP DEFAULT NOW(),
  credited_at TIMESTAMP,
  bonus_amount NUMERIC
);

-- Notifications (global)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  message TEXT,
  image_url TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- User Notifications (individual)
CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  image_url TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Settings (single row)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_url TEXT,
  splash_logo_url TEXT,
  app_name TEXT DEFAULT 'POPPY ESPORTS',
  signup_bonus NUMERIC DEFAULT 10,
  min_withdraw NUMERIC DEFAULT 50,
  referral_bonus NUMERIC DEFAULT 10,
  referral_percent NUMERIC DEFAULT 10,
  referral_share_link TEXT,
  support_contact TEXT,
  developer_contact TEXT,
  upi_details TEXT,
  qr_code_url TEXT,
  app_update JSONB,
  announcement_bar JSONB,
  policy_privacy TEXT,
  policy_terms TEXT,
  policy_refund TEXT,
  policy_fair_play TEXT,
  theme JSONB,
  last_updated TIMESTAMP,
  telegram_link TEXT,
  discord_link TEXT,
  youtube_link TEXT,
  instagram_link TEXT,
  game_icon_url TEXT
);

-- Admin Config
CREATE TABLE admin_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_uid UUID REFERENCES users(id),
  setup_complete BOOLEAN DEFAULT FALSE
);

-- ================================================================
-- INSERT DEFAULT SETTINGS & FREE FIRE GAME
-- ================================================================

-- Insert Free Fire game (if not exists)
INSERT INTO games (id, name, image_url, created_at)
SELECT 
  gen_random_uuid(), 
  'Free Fire', 
  'https://i.ibb.co/4Z5hPVzp/20250418-150058.jpg', 
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM games WHERE name = 'Free Fire');

-- Insert default settings with POPPY ESPORTS
INSERT INTO settings (
  app_name, signup_bonus, min_withdraw, referral_bonus, referral_percent,
  support_contact, developer_contact, upi_details, qr_code_url,
  logo_url, splash_logo_url, game_icon_url
) VALUES (
  'POPPY ESPORTS',
  10,
  50,
  10,
  10,
  '9389660753',
  '9848988740',
  '9848988740',
  'https://i.ibb.co/j9P6NzXp/IMG-20250822-120255.jpg',
  'POPPY_ESPORTS.png',
  'POPPY_ESPORTS.png',
  'https://i.ibb.co/4Z5hPVzp/20250418-150058.jpg'
);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE registered_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users
CREATE POLICY "Users can read own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin full access" ON users FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Games (public read, admin write)
CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Admin write games" ON games FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Promotions
CREATE POLICY "Public read promotions" ON promotions FOR SELECT USING (true);
CREATE POLICY "Admin write promotions" ON promotions FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Tournaments
CREATE POLICY "Public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Admin write tournaments" ON tournaments FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Registered Players
CREATE POLICY "Users select own registrations" ON registered_players FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own registration" ON registered_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own registration" ON registered_players FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin all registered_players" ON registered_players FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Transactions
CREATE POLICY "Users select own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin all transactions" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Withdrawals
CREATE POLICY "Users insert own withdrawals" ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users select own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin all withdrawals" ON withdrawals FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Deposits
CREATE POLICY "Users insert own deposits" ON deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users select own deposits" ON deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin all deposits" ON deposits FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Pending Referrals
CREATE POLICY "Users select own referrals" ON pending_referrals FOR SELECT USING (auth.uid() = referrer_uid OR auth.uid() = referred_uid);
CREATE POLICY "Users insert referrals" ON pending_referrals FOR INSERT WITH CHECK (auth.uid() = referred_uid);
CREATE POLICY "Admin all referrals" ON pending_referrals FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Notifications (global)
CREATE POLICY "Public read global notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Admin write notifications" ON notifications FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- User Notifications
CREATE POLICY "Users select own user_notifications" ON user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own user_notifications" ON user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin write user_notifications" ON user_notifications FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Settings
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admin write settings" ON settings FOR ALL USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- Admin Config
CREATE POLICY "Public read admin_config" ON admin_config FOR SELECT USING (true);
CREATE POLICY "Insert admin_config if empty" ON admin_config FOR INSERT WITH CHECK (NOT EXISTS (SELECT 1 FROM admin_config));
CREATE POLICY "Admin update admin_config" ON admin_config FOR UPDATE USING (EXISTS (SELECT 1 FROM admin_config WHERE admin_uid = auth.uid()));

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_game_id ON tournaments(game_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_leaderboard_rank ON users(leaderboard_rank);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
CREATE INDEX idx_deposits_status ON deposits(status);
CREATE INDEX idx_pending_referrals_status ON pending_referrals(status);
CREATE INDEX idx_users_free_fire_uid ON users(free_fire_uid);

-- ================================================================
-- FUNCTION: add_balance (used by admin to credit users atomically)
-- ================================================================
CREATE OR REPLACE FUNCTION add_balance(user_id UUID, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET balance = balance + amount,
      winning_cash = winning_cash + amount,
      total_earnings = total_earnings + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
