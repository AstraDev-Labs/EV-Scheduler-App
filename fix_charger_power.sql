-- FIX: Update "New EV1" to be a standard 3.3kW charger (or even 1kW if you want it very slow)
-- This will make the cost for 1 hour approx 330 rupees instead of 700.
UPDATE public.chargers 
SET power_kw = 3.3 
WHERE name = 'New EV1';

-- Verify the change
SELECT id, name, cost_per_kwh, "power_kw" FROM public.chargers WHERE name = 'New EV1';
