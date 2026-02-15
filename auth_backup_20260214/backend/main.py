from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import scheduler
from email_service import email_service
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

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
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
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
def get_solar_forecast():
    return {
        "forecast": [
            {"hour": 10, "watts": 500},
            {"hour": 11, "watts": 1200},
            {"hour": 12, "watts": 2000},
            {"hour": 13, "watts": 1800},
            {"hour": 14, "watts": 900}
        ]
    }

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
            return {"status": "success", "message": "Email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send email")
    except Exception as e:
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

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    vehicle_model: Optional[str] = None
    battery_capacity: Optional[float] = None
    country: Optional[str] = "India"  # Default to India

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
            country=request.country
        )
        
        if not result["success"]:
            raise HTTPException(status_code=409, detail=result["error"])
        
        # Send verification email
        email_sent = email_service.send_verification_email(
            to_email=request.email,
            user_name=request.full_name,
            verification_token=verification_token
        )
        
        if email_sent:
            return {
                "status": "success", 
                "message": "Registration successful. Please check your email to verify your account."
            }
        else:
            # User created but email failed - still return success
            return {
                "status": "success",
                "message": "Registration successful. Email verification pending - check your spam folder."
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {e}")
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
        print(f"Verification error: {e}")
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
                "created_at": user.get("created_at")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VerifySessionRequest(BaseModel):
    email: str

@app.get("/api/currency-rate")
def get_currency_rate(country: str = "India"):
    """Get currency symbol and conversion rate for a country"""
    from currency_data import get_currency_info
    info = get_currency_info(country)
    logger.info(f"Currency Rate Request: country='{country}' -> {info}")
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
                "country": user.get("country")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Session verification error: {e}")
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
        print(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
