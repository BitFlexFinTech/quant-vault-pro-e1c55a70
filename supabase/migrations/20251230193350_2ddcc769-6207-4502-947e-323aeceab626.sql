-- Enable realtime for system_settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;

-- Add api_token to system_settings if not exists
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('api_token', 'bwQm6CfYuKyOduN')
ON CONFLICT (setting_key) DO NOTHING;