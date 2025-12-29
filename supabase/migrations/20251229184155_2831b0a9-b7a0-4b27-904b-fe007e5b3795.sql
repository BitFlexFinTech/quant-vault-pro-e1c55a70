-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trade history table
CREATE TABLE public.trade_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  symbol TEXT NOT NULL,
  contract_type TEXT NOT NULL,
  stake NUMERIC(10, 2) NOT NULL CHECK (stake >= 1.00),
  profit NUMERIC(10, 2),
  is_win BOOLEAN,
  currency TEXT NOT NULL DEFAULT 'USDT'
);

-- Vault locks table
CREATE TABLE public.vault_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  amount NUMERIC(10, 2) DEFAULT 1.00 CHECK (amount >= 1.00),
  locked_at TIMESTAMPTZ DEFAULT NOW()
);

-- System settings table
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize protected floor at $30.03 for 10-trade buffer
INSERT INTO public.system_settings (setting_key, setting_value) VALUES ('current_protected_floor', '30.03');
INSERT INTO public.system_settings (setting_key, setting_value) VALUES ('min_probability', '85');

-- Enable RLS
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Public read/write policies for trading system (no auth required for HFT bot)
CREATE POLICY "Allow public read on trade_history" ON public.trade_history FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trade_history" ON public.trade_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trade_history" ON public.trade_history FOR UPDATE USING (true);

CREATE POLICY "Allow public read on vault_locks" ON public.vault_locks FOR SELECT USING (true);
CREATE POLICY "Allow public insert on vault_locks" ON public.vault_locks FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on system_settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update on system_settings" ON public.system_settings FOR UPDATE USING (true);

-- Enable realtime for trade history
ALTER PUBLICATION supabase_realtime ADD TABLE public.trade_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_locks;