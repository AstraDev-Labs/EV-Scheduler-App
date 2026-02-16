-- Add power_kw column to chargers table to support different charging speeds
-- Default to 7.0 kW (Standard Level 2 Charger) if not specified
ALTER TABLE public.chargers 
ADD COLUMN IF NOT EXISTS power_kw FLOAT DEFAULT 7.0;

-- Optional: Update specific station to lower power if needed (e.g., Station One)
-- UPDATE public.chargers SET power_kw = 3.3 WHERE name = 'Station One';
