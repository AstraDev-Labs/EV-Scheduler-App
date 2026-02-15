
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta
import pandas as pd
import logging

import math
logger = logging.getLogger(__name__)

class SolarMLService:
    def __init__(self):
        self.model = None
        self.is_trained = False
        self._train_model()

    def _calculate_solar_altitude(self, hour: int, lat: float = 12.9716):
        """Estimate solar altitude angle (simple model for 12.97N Bangalore)"""
        # Solar Noon is roughly 12:15, using 12:00 for simplicity
        # Seasonal variation simplified: assume equinox-like path
        # Altitude = 90 - abs(Lat - Declination)
        # Declination ranges from -23.5 to +23.5. Assuming 0 for generic daily cycle.
        # Max altitude at noon ~ 77-90 degrees depending on season
        
        # Simple cyclic model based on hour
        # Sun is up roughly from 6:00 to 18:00
        angle = (hour - 6) * (180 / 12) # 0 degrees at 6am, 180 at 6pm
        if angle < 0 or angle > 180: return -1 # Below horizon
        
        # Sine wave peaked at 12:00 (90 degrees)
        rad = math.radians(angle)
        return math.sin(rad) * 90

    def _generate_synthetic_data(self, n_samples=3000):
        """Generate synthetic solar data for training with physical grounded features"""
        hours = np.random.randint(0, 24, n_samples)
        cloud_cover = np.random.uniform(0, 100, n_samples)
        
        records = []
        for h, c in zip(hours, cloud_cover):
            solar_alt_factor = max(0, self._calculate_solar_altitude(h) / 90)
            
            # theoretical max radiation (approx GHI)
            theoretical_rad = solar_alt_factor * 1100 
            
            # Real radiation after clouds
            # Cloud cover reduces GHI, but diffuse radiation might remain.
            # Simple model:
            radiation = theoretical_rad * (1 - (c * 0.75) / 100)
            radiation += np.random.normal(0, 50) # Noise
            radiation = max(0, radiation)
            
            # Efficiency calculation:
            # Efficiency peaks at ~1000 W/m² (STC)
            # But high heat reduces efficiency. 
            # We'll stick to the requested simple driver: Radiation
            
            # Base efficiency based on radiation intensity
            # Assume panels reach 100% of "rated output" at 1000 W/m²
            # This 'efficiency' is actually 'Output Power %'
            eff = (radiation / 1000.0) * 100
            
            # Cap at 100ish (some panels forecast >100% if >1000W/m2, but let's clip)
            eff = np.clip(eff, 0, 100)
            
            records.append({
                'hour': h,
                'cloud_cover': c,
                'radiation': radiation,
                'efficiency': eff
            })
            
        df = pd.DataFrame(records)
        X = df[['hour', 'cloud_cover', 'radiation']]
        y = df['efficiency'].values
        return X, y

    def _train_model(self):
        """Train the Random Forest model"""
        try:
            logger.info("Training Solar ML Model with Radiation features...")
            X_train, y_train = self._generate_synthetic_data(4000)
            self.model = RandomForestRegressor(n_estimators=100, random_state=42)
            self.model.fit(X_train, y_train)
            self.is_trained = True
            logger.info("Solar ML Model trained successfully!")
        except Exception as e:
            logger.error(f"Failed to train ML model: {e}")

    def predict_efficiency(self, hour: int, cloud_cover: float, radiation: float) -> float:
        """Predict solar efficiency for a given condition"""
        if not self.is_trained: return 0.0
        try:
            input_data = pd.DataFrame([{
                'hour': hour,
                'cloud_cover': cloud_cover,
                'radiation': radiation
            }])
            prediction = self.model.predict(input_data)[0]
            
            # Physical safety: if sun is below horizon, efficiency MUST be 0
            if self._calculate_solar_altitude(hour) <= 0: return 0.0
            
            return float(max(0, min(100, prediction)))
        except Exception as e:
            logger.error(f"Prediction error: {e}")
            return 0.0

    async def fetch_real_weather(self, lat: float, lng: float, hours_ahead=48):
        """Fetch real weather forecast from Met.no (Meteorologisk institutt)"""
        try:
            import httpx
            # Met.no requires a unique User-Agent
            url = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
            params = {"lat": lat, "lon": lng}
            headers = {"User-Agent": "SmartEVScheduler/1.0 github.com/smartev"}
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url, params=params, headers=headers)
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Met.no API error: Status {response.status_code} - {response.text}")
            return None
        except Exception as e:
            logger.error(f"Weather API error (Met.no): {e}")
            return None

    async def get_forecast(self, lat: float = 12.9716, lng: float = 77.5946, hours_ahead=24):
        """Get high-precision ML forecast using Met.no data"""
        forecast = []
        
        # Fetch from Met.no
        weather_json = await self.fetch_real_weather(lat, lng)
        
        now = datetime.now()
        
        if not weather_json or 'properties' not in weather_json:
             logger.warning("ML: No valid weather data from Met.no")
        
        timeseries = weather_json.get('properties', {}).get('timeseries', []) if weather_json else []
        
        for i in range(hours_ahead):
            target_dt = now + timedelta(hours=i)
            # Met.no uses ISO timestamps in UTC usually (Z)
            # We need to find the closest time series point
            
            # Simple matching: timestamps are like "2026-02-15T12:00:00Z"
            # We construct our target ISO prefix
            # Note: Met.no is strict on UTC. 
            # Our input calc 'target_dt' is local system time (IST).
            # So we should convert target_dt (IST) to UTC to match Met.no
            
            # Quick hack: Met.no compact time series are hourly.
            # We just iterate and find the one closest to target_dt
            
            # Reset values
            cloud_cover = 20.0
            uv_index = 0.0
            temp_c = 25.0
            radiation = 0.0 
            
            # Find closest point
            closest_point = None
            min_diff = float('inf')
            
            # We need to render the target time efficiently
            # Let's assume list is sorted.
            # Convert target_dt to UTC? 
            # Actually, standard ISO comparison works if we ignore timezone or unify it.
            # Met.no returns Z time.
            # Let's just do robust string matching for the hour if possible, or parsing.
            
            target_iso_hour = target_dt.strftime("%Y-%m-%dT%H") # Local time match? No, Met returns UTC.
            # If server is IST (UTC+5:30), 12:00 IST is 06:30 UTC.
            # We should probably match by "Hour in the sequence" relative to "Now"
            # The API returns 'now' onwards.
            # So index 'i' in the loop roughly corresponds to index 'i' in timeseries (hourly)
            
            if i < len(timeseries):
                 closest_point = timeseries[i]
            
            if closest_point:
                data = closest_point.get('data', {}).get('instant', {}).get('details', {})
                next_1_hours = closest_point.get('data', {}).get('next_1_hours', {}).get('details', {})
                
                cloud_cover = float(data.get('cloud_area_fraction', 20))
                temp_c = float(data.get('air_temperature', 25))
                
                # Met.no compact doesn't usually give UV directly in 'instant'. 
                # We interpret strict Radiation/UV from Cloud Cover + Solar Altitude.
                
                h = target_dt.hour
                solar_max = self._calculate_solar_altitude(h, lat) * 12 # Rough scaler for ~1000W/m2 peak
                if solar_max < 0: solar_max = 0
                
                # Radiation is heavily affected by clouds
                # Cloud fraction is 0-100
                attenuation = 1.0 - ((cloud_cover / 100.0) * 0.85) # Clouds block up to 85% light
                radiation = solar_max * attenuation
                
                # UV Index Calculation (Approximate)
                # Clear sky max UV at noon ~ 11-12 in tropics
                # Solar alt 90 -> UV 12
                # Solar alt 45 -> UV 4-5
                uv_max_clear = (self._calculate_solar_altitude(h, lat) / 90.0) * 12.0
                if uv_max_clear < 0: uv_max_clear = 0
                
                # Attenuate UV by cloud cover (clouds block UV less than visible light, but still significant)
                # Linear-ish reduction?
                uv_index = uv_max_clear * (1 - (cloud_cover / 100.0) * 0.7)
                
                if uv_index < 0: uv_index = 0.0
                
                logger.info(f"ML: Met.no/Calc for {h}:00 -> Cloud: {cloud_cover}%, UV: {uv_index:.2f}, Rad: {radiation:.1f}")

            # 3. Predict Solar Efficiency
            eff = self.predict_efficiency(target_dt.hour, cloud_cover=cloud_cover, radiation=radiation)
            
            # 4. Calculate Grid Load
            h = target_dt.hour
            if 0 <= h < 6: base_load = 30 + (h * 2)
            elif 6 <= h < 10: base_load = 50 + ((h-6) * 10)
            elif 10 <= h < 17: base_load = 70
            elif 17 <= h < 21: base_load = 80 + ((h-17) * 5)
            else: base_load = 60 - ((h-21) * 10)
            
            temp_factor = 1.0
            if temp_c > 25: temp_factor = 1 + ((temp_c - 25) * 0.05)
            if temp_c < 10: temp_factor = 1 + ((10 - temp_c) * 0.03)
            grid_load = min(100, base_load * temp_factor)
            
            is_today = target_dt.date() == datetime.now().date()
            day_prefix = "Today" if is_today else "Tomorrow"
            
            forecast.append({
                "hour": h,
                "efficiency": round(eff, 1),
                "grid_load": round(grid_load, 1),
                "label": f"{h:02d}:00",
                "full_label": f"{day_prefix} {h:02d}:00",
                "is_peak": eff > 80,
                "weather": {
                    "cloud_cover": round(cloud_cover, 1),
                    "radiation": round(radiation, 1),
                    "temp_c": temp_c,
                    "uv_index": round(uv_index, 1)
                }
            })
            
        return forecast

# Singleton instance
solar_ml = SolarMLService()
