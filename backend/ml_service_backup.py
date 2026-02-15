
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
        # theoretical_rad: Peak at ~1000 W/m² at solar noon
        
        records = []
        for h, c in zip(hours, cloud_cover):
            solar_alt_factor = max(0, self._calculate_solar_altitude(h) / 90)
            
            # theoretical max radiation for this hour (Clear Sky)
            theoretical_rad = solar_alt_factor * 1000 
            
            # Real radiation after clouds (simplistic linear reduction)
            real_rad = theoretical_rad * (1 - (c * 0.7) / 100)
            
            # Efficiency calculation:
            # Efficiency is not just radiation. It peaks when radiation is high AND temp is cool.
            # But here we focus on Energy Yield as % of Capacity
            base_eff = (real_rad / 1000) * 100
            
            # Random noise
            base_eff += np.random.normal(0, 2)
            
            records.append({
                'hour': h,
                'cloud_cover': c,
                'radiation': real_rad,
                'efficiency': np.clip(base_eff, 0, 100)
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
        """Fetch real weather forecast from Open-Meteo API"""
        try:
            import httpx
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lng,
                "hourly": "cloud_cover,uv_index,temperature_2m,shortwave_radiation",
                "timezone": "auto",
                "forecast_days": 2
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    return response.json()
            return None
        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return None

    async def get_forecast(self, lat: float = 12.9716, lng: float = 77.5946, hours_ahead=24):
        """Get high-precision ML forecast"""
        forecast = []
        weather_data = await self.fetch_real_weather(lat, lng)
        
        now = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        for i in range(hours_ahead):
            target_dt = now + timedelta(hours=i)
            h = target_dt.hour
            
            # Default values
            cloud_cover = 20.0
            radiation = 0.0
            temp_c = 25.0
            uv_index = 0.0
            
            # Precision Indexing Logic: Match exact ISO timestamps
            # Open-Meteo 'time' array is ISO format: "2026-02-14T00:00"
            if weather_data and 'hourly' in weather_data:
                target_iso = target_dt.strftime("%Y-%m-%dT%H:00")
                try:
                    # Find exact index for this timestamp
                    idx = -1
                    if 'time' in weather_data['hourly']:
                        for j, t in enumerate(weather_data['hourly']['time']):
                            if t == target_iso:
                                idx = j
                                break
                                
                    if idx != -1:
                        cloud_cover = weather_data['hourly']['cloud_cover'][idx]
                        radiation = weather_data['hourly'].get('shortwave_radiation', [0.0]*idx)[idx]
                        temp_c = weather_data['hourly'].get('temperature_2m', [25.0]*idx)[idx]
                        uv_index = weather_data['hourly'].get('uv_index', [0.0]*idx)[idx]
                except Exception as e:
                    logger.warning(f"Error parsing weather data for ISO {target_iso}: {e}")

            # 3. Predict Solar Efficiency using Radiation
            eff = self.predict_efficiency(h, cloud_cover=cloud_cover, radiation=radiation)
            
            # 4. Calculate Grid Load
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
                    "cloud_cover": cloud_cover,
                    "radiation": radiation,
                    "temp_c": temp_c,
                    "uv_index": uv_index
                }
            })
            
        return forecast

# Singleton instance
solar_ml = SolarMLService()
