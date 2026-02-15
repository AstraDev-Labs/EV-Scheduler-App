import os
import json
import asyncio
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from database import db
from ml_service import solar_ml

import requests
from datetime import datetime
from typing import List, Dict, Any, Optional

class EVAssistantTools:
    @staticmethod
    def _get_address(lat, lng):
        """Reverse geocode coordinates to get a readable address"""
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
            headers = {"User-Agent": "SmartEVScheduler/1.0"}
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get("display_name", "Unknown Location")
        except Exception as e:
            print(f"Geocoding error: {e}")
        return f"{lat}, {lng}"

    @staticmethod
    def search_chargers(query: str = "", user_lat: float = None, user_lng: float = None):
        """Search for available EV charging stations. Sorts by distance if user location provided."""
        try:
            res = db.client.table('chargers').select("*").execute()
            chargers = res.data if res.data else []
            
            # Helper for distance
            import math
            def calculate_distance(lat1, lon1, lat2, lon2):
                try:
                    R = 6371 # km
                    dlat = math.radians(lat2 - lat1)
                    dlon = math.radians(lon2 - lon1)
                    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
                    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                    return R * c
                except:
                    return float('inf')

            enriched_chargers = []
            
            for charger in chargers:
                lat = None
                lng = None
                
                # Check for nested location object (e.g. JSON column)
                if 'location' in charger and isinstance(charger['location'], dict):
                    loc = charger['location']
                    lat = loc.get('lat') or loc.get('latitude')
                    lng = loc.get('lng') or loc.get('longitude')
                else:
                    # Fallback to top-level keys
                    lat = charger.get('latitude') or charger.get('lat') or charger.get('Latitude')
                    lng = charger.get('longitude') or charger.get('lng') or charger.get('Longitude')
                
                # Address
                if 'address' not in charger or not charger['address']:
                    if lat and lng:
                        charger['address'] = EVAssistantTools._get_address(lat, lng)
                    else:
                        charger['address'] = "Location details unavailable"

                # Distance Calculation
                dist_info = ""
                dist_val = float('inf')
                
                if user_lat is not None and user_lng is not None and lat and lng:
                    try:
                        dist_val = calculate_distance(float(user_lat), float(user_lng), float(lat), float(lng))
                        dist_info = f"{dist_val:.2f} km away"
                        charger['distance_km'] = round(dist_val, 2)
                        charger['proximity_info'] = dist_info
                    except Exception as e:
                        print(f"Distance calc error: {e}")
                
                # Filter by Query (if provided)
                if query:
                    q = query.lower()
                    text = str(charger).lower()
                    if q not in text:
                        continue

                enriched_chargers.append(charger)

            # Sort by distance if location provided
            if user_lat is not None and user_lng is not None:
                enriched_chargers.sort(key=lambda x: x.get('distance_km', float('inf')))

            print(f"Chargers found: {len(enriched_chargers)}") 
            
            # Return top 5 closest if sorting by distance, else top 5 general
            return json.dumps(enriched_chargers[:5], indent=2)

        except Exception as e:
            return f"Error searching chargers: {str(e)}"

    @staticmethod
    def get_solar_efficiency(lat: float = 12.9716, lng: float = 77.5946):
        """Get the current and future solar efficiency for a specific location (lat, lng)."""
        try:
            # Running async in sync context safely
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            forecast = loop.run_until_complete(solar_ml.get_forecast(lat=lat, lng=lng, hours_ahead=12))
            return json.dumps(forecast, indent=2)
        except Exception as e:
            return f"Error fetching solar forecast: {str(e)}"

    @staticmethod
    def get_user_bookings(user_id: str):
        """Check upcoming bookings for a specific user ID."""
        try:
            # Note: In a real secure env, we'd verify this user_id matches the session
            # For now, the Agent enforces it by passing the session user_id
            res = db.client.table('bookings').select("*, chargers(name)").eq('user_id', user_id).execute()
            return json.dumps(res.data, indent=2)
        except Exception as e:
            return f"Error fetching bookings: {str(e)}"

    @staticmethod
    def create_booking(user_id: str, charger_id: str, start_time: str, end_time: str):
        """Create a new booking for a user."""
        try:
            # 1. Fetch charger details for cost calculation
            charger_res = db.client.table('chargers').select("cost_per_kwh").eq('id', charger_id).execute()
            if not charger_res.data:
                return "Error: Charger not found."
            
            cost_per_kwh = charger_res.data[0].get('cost_per_kwh', 0)
            
            # 2. Calculate duration in hours
            fmt = "%Y-%m-%dT%H:%M:%S"
            # Handle potential timezone offsets or Z suffix if present (simple strip for now)
            s_str = start_time.split('+')[0].split('.')[0].replace('Z', '')
            e_str = end_time.split('+')[0].split('.')[0].replace('Z', '')
            
            start_dt = datetime.fromisoformat(s_str)
            end_dt = datetime.fromisoformat(e_str)
            
            duration_hours = (end_dt - start_dt).total_seconds() / 3600.0
            
            if duration_hours <= 0:
                return "Error: Invalid time range (End time must be after Start time)."

            # 3. Calculate totals
            # Assume average charging speed of 11kW if not specified
            avg_power_kw = 11 
            total_energy = round(duration_hours * avg_power_kw, 2)
            total_cost = round(total_energy * cost_per_kwh, 2)

            # 4. Prepare Booking Data
            booking_data = {
                "user_id": user_id,
                "charger_id": charger_id,
                "start_time": start_time,
                "end_time": end_time,
                "status": "Confirmed",
                "total_cost": total_cost,
                "energy_kwh": total_energy
            }
            
            # Since create_booking_if_available is async, we need to run it in the event loop
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(db.create_booking_if_available(booking_data))
            return json.dumps(result, indent=2)
        except Exception as e:
            return f"Error creating booking: {str(e)}"

# Define tool schemas for LangChain model binding
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "search_chargers",
            "description": "Search for available EV charging stations nearby.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Optional search keyword"},
                    "user_lat": {"type": "number", "description": "User latitude"},
                    "user_lng": {"type": "number", "description": "User longitude"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_solar_efficiency",
            "description": "Get solar efficiency forecast.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number"},
                    "lng": {"type": "number"}
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_bookings",
            "description": "Check upcoming bookings for the current user.",
            "parameters": {
                "type": "object",
                "properties": {}, 
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_booking",
            "description": "Create a new booking. Date format: YYYY-MM-DDTHH:MM:SS",
            "parameters": {
                "type": "object",
                "properties": {
                    "charger_id": {"type": "string", "description": "The ID of the charger to book"},
                    "start_time": {"type": "string", "description": "ISO start time"},
                    "end_time": {"type": "string", "description": "ISO end time"}
                },
                "required": ["charger_id", "start_time", "end_time"]
            },
        },
    }
]

TOOL_MAP = {
    "search_chargers": EVAssistantTools.search_chargers,
    "get_solar_efficiency": EVAssistantTools.get_solar_efficiency,
    "get_user_bookings": EVAssistantTools.get_user_bookings,
    "create_booking": EVAssistantTools.create_booking,
}

class EVAssistantAgent:
    def __init__(self, user_id: str = None, user_location: dict = None, location_name: str = None):
        self.user_id = user_id
        self.user_location = user_location
        self.location_name = location_name
        
        self.model = ChatOpenAI(
            model="deepseek/deepseek-chat", # High performance free/cheap model on OpenRouter
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Smart EV Scheduler"
            }
        ).bind_tools(TOOLS_SCHEMA)

    def run_query(self, user_query: str):
        """Simple Tool-Calling Loop for maximum robustness"""
        try:
            # Build location context string
            loc_context = ""
            if self.user_location and self.location_name:
                loc_context = f"\nUser's Current Location: {self.location_name} (Lat: {self.user_location.get('lat')}, Lng: {self.user_location.get('lng')})\nUse this location for 'get_solar_efficiency' or 'search_chargers' unless specified otherwise."
            elif self.user_location:
                loc_context = f"\nUser's Current Location Coords: Lat: {self.user_location.get('lat')}, Lng: {self.user_location.get('lng')}\nUse these coordinates for location-based queries."

            messages = [
                SystemMessage(content="""You are the 'Smart EV Assistant' for the Smart EV Scheduler platform.
                
                Your Goal: Help users find chargers, check solar efficiency, and manage bookings.
                
                Core Data Access:
                - Use 'search_chargers' to find station locations, pricing, and status.
                - Use 'get_solar_efficiency' for real-time solar panel performance forecasting.
                - Use 'get_user_bookings' to check the current user's schedule.
                
                Tone: Helpful, technical yet accessible, and concise. 
                If a user asks about the best time to charge, ALWAYS check solar efficiency first.
                User ID for tool calls: """ + str(self.user_id) + loc_context),
                HumanMessage(content=user_query)
            ]

            # Multi-step tool execution loop
            max_steps = 5
            step_count = 0
            
            response = self.model.invoke(messages)
            
            while response.tool_calls and step_count < max_steps:
                step_count += 1
                messages.append(response)
                
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]
                    
                    if tool_name in TOOL_MAP:
                        # SECURE TOOL EXECUTION
                        # We inject self.user_id for specific tools
                        if tool_name == "get_user_bookings":
                            result = TOOL_MAP[tool_name](user_id=self.user_id)
                        elif tool_name == "create_booking":
                            # Inject user_id, trust only charger_id/times from model
                            result = TOOL_MAP[tool_name](
                                user_id=self.user_id,
                                charger_id=tool_args.get("charger_id"),
                                start_time=tool_args.get("start_time"),
                                end_time=tool_args.get("end_time")
                            )
                        elif tool_name == "search_chargers":
                            # Inject user location if available
                            lat = tool_args.get("user_lat")
                            lng = tool_args.get("user_lng")
                            
                            if lat is None and self.user_location:
                                lat = self.user_location.get('lat')
                            
                            if lng is None and self.user_location:
                                lng = self.user_location.get('lng')
                                
                            result = TOOL_MAP[tool_name](
                                query=tool_args.get("query", ""),
                                user_lat=lat,
                                user_lng=lng
                            )
                        else:
                            result = TOOL_MAP[tool_name](**tool_args)
                            
                        messages.append(ToolMessage(content=result, tool_call_id=tool_call["id"]))
                
                # Get next response from model
                response = self.model.invoke(messages)

            return response.content if response.content else "I completed the action but have no further details to report."
            
        except Exception as e:
            return f"Agent Error: {str(e)}"
