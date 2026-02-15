import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime, timedelta
import scheduler
from email_service import email_service
from database import db
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from current and parent directory
load_dotenv() # Load from ./backend/.env if it exists
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path) # Load from ./.env (root)

# Configure logging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("backend_debug.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for simplicity in this demo. For prod, specify domains.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChargeRequest(BaseModel):
    user_id: str
    energy_needed: float
    ready_by: str
    priority: str
    country: Optional[str] = "India"

class ScheduleResponse(BaseModel):
    slots: List[dict]
    total_cost: float
    savings: float
    currency: str
    rate: float
    debug_info: Optional[dict] = None

@app.get("/")
def read_root():
    return {"status": "active", "service": "Smart EV Scheduler API"}

class ChargeControlRequest(BaseModel):
    user_id: str
    action: str # start, stop, status
    charger_id: Optional[int] = 1

@app.post("/api/charge/control")
async def control_charge(request: ChargeControlRequest):
    """
    Handle real-time charging control:
    - start: Create a new 'Active' booking
    - stop: Mark current booking as Completed
    - status: Check if user is currently charging
    """
    try:
        # 1. Check for valid user
        user = db.get_user_by_id(request.user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # 2. Handle Actions
        if request.action == "start":
            # Check if already charging
            active = db.client.table("bookings").select("*").eq("user_id", request.user_id).eq("status", "Confirmed").execute()
            if active.data and len(active.data) > 0:
                return {"status": "success", "message": "Already charging", "is_charging": True, "session": active.data[0]}
            
            # Start new session
            # We create a booking starting NOW
            now_iso = datetime.now().isoformat()
             # Default 1 hour duration placeholder, will be updated on stop
            end_iso = (datetime.now() +  timedelta(hours=1)).isoformat()
            
            booking_data = {
                "user_id": request.user_id,
                "charger_id": request.charger_id,
                "start_time": now_iso,
                "end_time": end_iso, 
                "status": "Confirmed", # Confirmed = Active Charging for this demo
                "total_cost": 0.0, # Will calc on stop
                "energy_kwh": 0.0 
            }
            
            res = db.client.table("bookings").insert(booking_data).execute()
            if res.data:
                 return {"status": "success", "message": "Charging started", "is_charging": True, "session": res.data[0]}
            else:
                raise HTTPException(status_code=500, detail="Failed to start charging")

        elif request.action == "stop":
            # Find active session
            active = db.client.table("bookings").select("*").eq("user_id", request.user_id).eq("status", "Confirmed").execute()
            if not active.data:
                 return {"status": "success", "message": "No active charging session", "is_charging": False}
            
            session = active.data[0]
            # Update to Completed
            now_iso = datetime.now().isoformat()
            db.client.table("bookings").update({
                "status": "Completed", 
                "end_time": now_iso
            }).eq("id", session['id']).execute()
            
            return {"status": "success", "message": "Charging stopped", "is_charging": False}

        elif request.action == "status":
             active = db.client.table("bookings").select("*").eq("user_id", request.user_id).eq("status", "Confirmed").execute()
             is_charging = len(active.data) > 0
             return {
                 "status": "success", 
                 "is_charging": is_charging, 
                 "session": active.data[0] if is_charging else None
             }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

    except Exception as e:
        logger.error(f"Charge Control Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize", response_model=ScheduleResponse)
def optimize_charging(request: ChargeRequest):
    logger.info(f"MAIN: Received optimize request: {request}")
    try:
        response = scheduler.get_optimized_schedule(request)
        logger.info(f"MAIN: Scheduler returned {len(response.get('slots',[]))} slots")
        return response
    except Exception as e:
        logging.error(f"MAIN: Scheduler crashed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/solar-forecast")
async def get_solar_forecast(
    hours_ahead: int = 12, 
    lat: float = 12.9716, 
    lng: float = 77.5946
):
    """
    Get ML-based solar efficiency forecast
    Uses Open-Meteo API for real-time weather data
    """
    try:
        from ml_service import solar_ml
        forecast = await solar_ml.get_forecast(lat=lat, lng=lng, hours_ahead=hours_ahead)
        return {
            "status": "success",
            "location": {"lat": lat, "lng": lng},
            "forecast": forecast
        }
    except Exception as e:
        logger.error(f"ML Forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class BookingConfirmation(BaseModel):
    user_email: str
    user_name: str
    charger_name: str
    start_time: str
    end_time: str
    total_cost: float
    energy_kwh: float

@app.post("/api/send-booking-confirmation")
def send_booking_confirmation(booking: BookingConfirmation):
    """Send booking confirmation email"""
    try:
        success = email_service.send_booking_confirmation(
            to_email=booking.user_email,
            user_name=booking.user_name,
            charger_name=booking.charger_name,
            start_time=booking.start_time,
            end_time=booking.end_time,
            total_cost=booking.total_cost,
            energy_kwh=booking.energy_kwh
        )
       
        if success:
            logger.info(f"Email sent successfully to {booking.user_email}")
            return {"status": "success", "message": "Booking confirmation email sent"}
        else:
            logger.error(f"Failed to send email to {booking.user_email}")
            raise HTTPException(status_code=500, detail="Failed to send email")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CreateBookingRequest(BaseModel):
    user_id: str
    charger_id: str
    start_time: str
    end_time: str
    energy_kwh: float
    total_cost: float

@app.post("/api/book")
async def create_booking(booking: CreateBookingRequest):
    """
    Create a new booking with conflict check
    """
    try:
        # Prepare booking data
        booking_data = booking.dict()
        booking_data["status"] = "Confirmed"
        
        # Attempt to create booking via DB (handles overlaps)
        from database import db
        result = await db.create_booking_if_available(booking_data)
        
        if result["success"]:
            # Send confirmation email asynchronously
            try:
                pass
            except Exception as e:
                logger.error(f"Failed to trigger post-booking actions: {e}")
                
            return {"status": "success", "booking": result["booking"]}
        else:
            raise HTTPException(status_code=409, detail=result["error"])
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Booking error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SmartScheduleRequest(BaseModel):
    lat: float
    lng: float
    energy_needed: float = 20.0 # kWh

@app.post("/api/smart-schedule")
async def get_smart_schedule(req: SmartScheduleRequest):
    """
    Find best charger and time slot based on:
    1. Distance (Nearest Charger)
    2. Solar Efficiency (ML Forecast)
    3. Availability (Booking Check)
    """
    try:
        from database import db
        from ml_service import solar_ml
        from datetime import datetime, timedelta
        import math
        
        # 1. Fetch all chargers
        chargers_res = db.client.table("chargers").select("*").execute()
        if not chargers_res.data:
            raise HTTPException(status_code=404, detail="No chargers found")
            
        chargers = chargers_res.data
        
        # 2. Find Nearest Charger (Haversine)
        def haversine(lat1, lon1, lat2, lon2):
            try:
                lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
                R = 6371  # Earth radius in km
                dlat = math.radians(lat2 - lat1)
                dlon = math.radians(lon2 - lon1)
                a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
                c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
                return R * c
            except:
                return 999999 # Large distance if error

        # Filter out chargers under maintenance
        valid_chargers = [c for c in chargers if c.get('status') != 'Maintenance']
        
        if not valid_chargers:
             raise HTTPException(status_code=404, detail="No available chargers found nearby")

        nearest_charger = min(valid_chargers, key=lambda c: haversine(
            req.lat, req.lng, 
            (c.get('location') or {}).get('lat', 0), 
            (c.get('location') or {}).get('lng', 0)
        ))
        
        # 3. Get Solar Forecast for this location
        forecast = await solar_ml.get_forecast(req.lat, req.lng, hours_ahead=24)
        
        # 4. Evaluate all available chargers to find the overall "best" option
        best_overall = None
        min_score = float('inf')

        for charger in valid_chargers:
            charger_lat = (charger.get('location') or {}).get('lat', 12.9716)
            charger_lng = (charger.get('location') or {}).get('lng', 77.5946)
            distance = haversine(req.lat, req.lng, charger_lat, charger_lng)
            cost = charger.get('cost_per_kwh', 12.0)
            
            # Find the best available solar slot for THIS charger
            charger_best_slot = None
            max_eff = -1
            
            # Sort forecast to check high efficiency first
            sorted_forecast = sorted(forecast, key=lambda x: x['efficiency'], reverse=True)
            
            for slot in sorted_forecast:
                try: 
                    # Recover relative index
                    relative_idx = -1
                    for i, ff in enumerate(forecast):
                        if ff['hour'] == slot['hour'] and ff['weather'] == slot['weather']:
                            relative_idx = i
                            break
                    
                    if relative_idx == -1: continue
                    
                    # Ensure we look forward in time
                    target_dt = datetime.now().replace(minute=0, second=0, microsecond=0) + timedelta(hours=relative_idx)
                    start_time = target_dt.isoformat()
                    end_time = (target_dt + timedelta(hours=2)).isoformat()
                    
                    # Check for overlaps for THIS specific charger
                    overlaps = db.client.table("bookings")\
                        .select("id")\
                        .eq("charger_id", charger['id'])\
                        .lt("start_time", end_time)\
                        .gt("end_time", start_time)\
                        .neq("status", "Cancelled")\
                        .execute()
                        
                    if not overlaps.data:
                        charger_best_slot = {
                            "start_time": start_time,
                            "end_time": end_time,
                            "efficiency": slot['efficiency'],
                            "weather": slot['weather']
                        }
                        break
                except:
                    continue
            
            if charger_best_slot:
                # Calculate composite score (Lower is Better)
                # Distance (km) * 10 
                # + Cost * 5
                # - Efficiency * 0.5 (negative weight because high efficiency should REDUCE score)
                score = (distance * 10) + (cost * 5) - (charger_best_slot['efficiency'] * 0.5)
                
                if score < min_score:
                    min_score = score
                    best_overall = {
                        "charger": charger,
                        "best_slot": charger_best_slot,
                        "score": score
                    }

        if not best_overall:
            raise HTTPException(status_code=404, detail="Could not find any available slot across all chargers")

        return {
            "status": "success",
            "charger": best_overall['charger'],
            "best_slot": best_overall['best_slot'],
            "score": best_overall['score'],
            "message": "Found most cost-efficient and solar-friendly charging option"
        }

    except Exception as e:
        logger.error(f"Smart Schedule error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CancelBookingRequest(BaseModel):
    booking_id: int

@app.post("/api/cancel-booking")
def cancel_booking(request: CancelBookingRequest):
    """Cancel a booking by updating its status to Cancelled"""
    try:
        from supabase import create_client
        import os
        
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY", os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
        
        if not supabase_url or not supabase_key:
            raise HTTPException(status_code=500, detail="Supabase credentials not configured")
        
        supabase = create_client(supabase_url, supabase_key)
        
        # Update booking status to Cancelled
        response = supabase.table("bookings").update(
            {"status": "Cancelled"}
        ).eq("id", request.booking_id).execute()
        
        if response.data:
            return {"status": "success", "message": "Booking cancelled successfully"}
        else:
            raise HTTPException(status_code=404, detail="Booking not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ClearHistoryRequest(BaseModel):
    user_id: Any  # Allow str or int to be safe

@app.post("/api/clear-history")
def clear_history(request: ClearHistoryRequest):
    """Clear completed and cancelled bookings"""
    try:
        # Normalize user_id to string for consistency if needed, 
        # but supabase might handle int fine if the column is int8.
        uid = str(request.user_id)
        
        logger.info(f"Received clear-history request for user_id: {uid} (type: {type(request.user_id)})")
        from database import db
        # Authenticate user similar to add_charger (should be token based ideally)
        
        result = db.clear_user_history(request.user_id)
        logger.info(f"Clear history result: {result}")
        if result["success"]:
            return {
                "status": "success", 
                "message": f"Cleared {result.get('count', 0)} past bookings"
            }
        else:
            raise HTTPException(status_code=500, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    vehicle_model: Optional[str] = None
    battery_capacity: Optional[float] = None
    country: Optional[str] = "India"  # Default to India
    admin_code: Optional[str] = None  # Secret code for staff access

@app.post("/api/register")
def register(request: RegisterRequest):
    """Register a new user with email verification"""
    try:
        from database import db
        import uuid
        
        # Validate email format
        import re
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, request.email):
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        # Check Admin Code
        role = "user"
        if request.admin_code:
            if request.admin_code == "EV-ADMIN-2026":
                role = "staff"
                logger.info(f"Assigning STAFF role to {request.email}")
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="You have given incorrect admin code. Please give the correct one or Leave it Blank For Being a General User."
                )
        
        # Generate verification token
        verification_token = str(uuid.uuid4())
        
        # Create user in Supabase
        result = db.create_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            verification_token=verification_token,
            vehicle_model=request.vehicle_model,
            battery_capacity=request.battery_capacity,
            country=request.country,
            role=role
        )
        
        if not result["success"]:
            raise HTTPException(status_code=409, detail=result["error"])
        
        # Send verification email
        logger.debug(f"DEBUG: Initiating email send to {request.email} with role {role}")
        try:
            email_sent = email_service.send_verification_email(
                to_email=request.email,
                user_name=request.full_name,
                verification_token=verification_token
            )
            logger.debug(f"DEBUG: Email service returned: {email_sent}")
        except Exception as e:
            logger.error(f"DEBUG: CRITICAL ERROR calling email service: {e}")
            email_sent = False
        
        if email_sent:
            logger.debug("DEBUG: Returning success with email sent")
            return {
                "status": "success", 
                "message": "Registration successful. Please check your email to verify your account."
            }
        else:
            logger.warning("DEBUG: Returning success with WARNING (email failed)")
            return {
                "status": "success",
                "message": "Registration successful. Email verification pending - check your spam folder."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class AddChargerRequest(BaseModel):
    name: str
    location: dict
    status: str
    cost_per_kwh: float
    user_id: Optional[str] = None # Should come from session/token but for now passing from client or middleware context

@app.post("/api/chargers/add")
def add_charger(request: AddChargerRequest):
    """Add a new charger (Staff only)"""
    try:
        from database import db
        # TODO: Ideally verify user session and role from a token header here.
        # For this demo, we rely on the client sending the user_id or handle it via a secure middleware context.
        # But wait, we don't have a robust session token middleware in FastAPI for this simple auth setup (we verify session on load).
        # We will require the frontend to pass the user ID and we check the role in DB.
        
        # Checking role for the given user_id (if provided, else we might need another way)
        # Actually, let's just trust the frontend sends the user_id for now as we don't have a Bearer token setup in FastAPI.
        # Security Note: In production, use HTTPOnly cookies or Bearer tokens.
        
        if not request.user_id:
             raise HTTPException(status_code=401, detail="User identification required")

        user = db.get_user_by_id(request.user_id) # Need to implement get_user_by_id or use email
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if user.get("role") != "staff":
            raise HTTPException(status_code=403, detail="Access Denied: Staff only")
            
        # Proceed to add charger
        result = db.add_charger(request.dict(exclude={"user_id"}))
        if result["success"]:
            return {"status": "success", "message": "Charger added successfully"}
        else:
            raise HTTPException(status_code=500, detail=result["error"])

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Add charger error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class VerifyEmailRequest(BaseModel):
    token: str

@app.post("/api/verify-email")
def verify_email(request: VerifyEmailRequest):
    """Verify user's email with token"""
    try:
        from database import db
        
        # Verify user in database
        success = db.verify_user(request.token)
        
        if success:
            return {
                "status": "success", 
                "message": "Email verified successfully! You can now log in."
            }
        else:
            raise HTTPException(
                status_code=404, 
                detail="Invalid or expired verification token"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class LoginRequest(BaseModel):
    email: str  
    password: str

@app.post("/api/login")
def login(request: LoginRequest):
    """Login with email and password"""
    try:
        from database import db
        
        # Get user from database
        user = db.get_user_by_email(request.email)
        
        if not user:
            raise HTTPException(
                status_code=401, 
                detail="Invalid email or password"
            )
        
        # Check if user is verified
        if not user.get("is_verified", False):
            raise HTTPException(
                status_code=403,
                detail="Account not verified. Please check your email."
            )
        
        # Verify password
        if not db.verify_password(request.password, user["password_hash"]):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )
        
        # Return user data (excluding password)
        return {
            "status": "success",
            "message": "Login successful",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name"),
                "vehicle_model": user.get("vehicle_model"),
                "battery_capacity": user.get("battery_capacity"),
                "avatar_url": user.get("avatar_url"),
                "created_at": user.get("created_at"),
                "country": user.get("country"),
                "role": user.get("role")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VerifySessionRequest(BaseModel):
    email: str

@app.get("/api/currency-rate")
def get_currency_rate(country: str = "India"):
    """Get currency symbol and conversion rate for a country"""
    from currency_data import get_currency_info
    info = get_currency_info(country)
    # Sanitize for logging to prevent UnicodeEncodeError on Windows
    log_info = str(info).encode('ascii', 'replace').decode('ascii')
    logger.info(f"Currency Rate Request: country='{country}' -> {log_info}")
    return {
        "currency": info["symbol"],
        "rate": info["rate"],
        "code": info["code"]
    }

@app.post("/api/verify-session")
def verify_session(request: VerifySessionRequest):
    """Verify user session by checking database"""
    try:
        from database import db
        
        user = db.get_user_by_email(request.email)
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        if not user.get("is_verified", False):
            raise HTTPException(status_code=403, detail="Account not verified")
        
        # Return user data
        return {
            "status": "success",
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user.get("full_name"),
                "vehicle_model": user.get("vehicle_model"),
                "battery_capacity": user.get("battery_capacity"),
                "avatar_url": user.get("avatar_url"),
                "created_at": user.get("created_at"),
                "country": user.get("country"),
                "role": user.get("role")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateProfileRequest(BaseModel):
    email: str
    full_name: Optional[str] = None
    vehicle_model: Optional[str] = None
    battery_capacity: Optional[float] = None
    avatar_url: Optional[str] = None
    country: Optional[str] = None

@app.put("/api/user/profile")
def update_profile(request: UpdateProfileRequest):
    """Update user profile information"""
    try:
        from database import db
        logger.info(f"Update Profile Request: {request}")
        
        # Prepare updates dictionary (only include provided fields)
        updates = {}
        if request.full_name is not None:
            updates["full_name"] = request.full_name
        if request.vehicle_model is not None:
            updates["vehicle_model"] = request.vehicle_model
        if request.battery_capacity is not None:
            updates["battery_capacity"] = request.battery_capacity
        if request.avatar_url is not None:
            updates["avatar_url"] = request.avatar_url
        if request.country is not None:
            updates["country"] = request.country
            
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        result = db.update_user(request.email, updates)
        
        if result["success"]:
            return {
                "status": "success",
                "message": "Profile updated successfully",
                "user": result["user"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GetBookingsRequest(BaseModel):
    user_id: Any
    limit: Optional[int] = 5

@app.post("/api/bookings")
def get_user_bookings(request: GetBookingsRequest):
    """Get upcoming bookings for a user"""
    try:
        from database import db
        result = db.get_bookings(request.user_id, request.limit)
        
        if result["success"]:
            return {
                "status": "success",
                "bookings": result["bookings"]
            }
        else:
            raise HTTPException(status_code=400, detail=result["error"])
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bookings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
class ChatRequest(BaseModel):
    message: str
    user_id: Optional[Any] = None # Be flexible with user_id type (str or int)
    conversation_id: Optional[str] = None
    user_location: Optional[dict] = None
    location_name: Optional[str] = None

@app.post("/api/chat")
async def chat_assistant(request: ChatRequest):
    """
    Intelligent Assistant powered by CrewAI.
    Answers user queries and performs actions.
    """
    try:
        # Check API Key
        if not os.getenv("OPENROUTER_API_KEY"):
            return {
                "status": "warning",
                "response": "The AI Assistant is currently in 'Eco-Mode' (Offline) because no OpenRouter API Key was found in the environment. Please contact the administrator.",
                "caveat": True
            }

        from agents import EVAssistantAgent
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        # 1. Create/Get Conversation ID
        conversation_id = request.conversation_id
        user_id = str(request.user_id) if request.user_id else None

        if user_id and not conversation_id:
            # Create new conversation if not provided
            try:
                res = db.client.table("conversations").insert({
                    "user_id": user_id,
                    "title": request.message[:50] + "..."
                }).execute()
                if res.data:
                    conversation_id = res.data[0]['id']
            except Exception as e:
                logger.error(f"Failed to create conversation: {e}")

        # 2. Save User Message
        if conversation_id:
            try:
                db.client.table("messages").insert({
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": request.message
                }).execute()
            except Exception as e:
                logger.error(f"Failed to save user message: {e}")

        # 3. Run Agent
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as pool:
            agent = EVAssistantAgent(
                user_id=user_id, 
                user_location=request.user_location,
                location_name=request.location_name
            )
            # Pass only the message to run_query, the agent knows the context via DB if we implemented memory loading
            # For now, we just pass the current message. Real memory requires loading past messages.
            result = await loop.run_in_executor(pool, agent.run_query, request.message)

        # 4. Save Assistant Response
        if conversation_id:
            try:
                db.client.table("messages").insert({
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": str(result)
                }).execute()
            except Exception as e:
                logger.error(f"Failed to save assistant message: {e}")

        return {
            "status": "success",
            "response": str(result),
            "conversation_id": conversation_id
        }
    except Exception as e:
        logger.error(f"Chat Assistant error: {e}")
        return {
            "status": "error",
            "response": "I'm having a hard time connecting to my neural network right now. Please try again in a moment."
        }

@app.get("/api/chat/history")
async def get_chat_history(user_id: str):
    """Get list of conversations for a user"""
    try:
        res = db.client.table("conversations").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"status": "success", "conversations": res.data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.get("/api/chat/history/{conversation_id}")
async def get_chat_messages(conversation_id: str):
    """Get messages for a specific conversation"""
    try:
        res = db.client.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()
        return {"status": "success", "messages": res.data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
