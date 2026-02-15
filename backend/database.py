"""
Database helper module for Supabase operations
Handles user authentication and database interactions
"""
import os
import bcrypt
import logging
from supabase import create_client, Client
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from pathlib import Path

logger = logging.getLogger(__name__)

# Load environment variables from parent directory
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

class Database:
    def __init__(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase credentials in environment variables")
            
        # Ensure URL doesn't have trailing slash or extra paths if not needed, 
        # though supabase-py usually handles it.
        
        self.client: Client = create_client(supabase_url, supabase_key)
    
    def hash_password(self, password: str) -> str:
        """Hash a password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify a password against its hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def create_user(
        self, 
        email: str, 
        password: str, 
        full_name: str,
        verification_token: str,
        vehicle_model: str = None,
        battery_capacity: float = None,
        avatar_url: str = None,
        country: str = "India",
        role: str = "user"
    ) -> Dict[str, Any]:
        """Create a new user in Supabase with all fields"""
        try:
            hashed_password = self.hash_password(password)
            
            user_data = {
                "email": email,
                "password_hash": hashed_password,
                "full_name": full_name,
                "verification_token": verification_token,
                "is_verified": False,
                "country": country,
                "role": role
            }
            
            # Add optional fields if provided
            if vehicle_model:
                user_data["vehicle_model"] = vehicle_model
            if battery_capacity is not None:
                user_data["battery_capacity"] = battery_capacity
            if avatar_url:
                user_data["avatar_url"] = avatar_url
            
            response = self.client.table("users").insert(user_data).execute()
            
            if response.data:
                return {"success": True, "user": response.data[0]}
            else:
                return {"success": False, "error": "Failed to create user"}
                
        except Exception as e:
            error_msg = str(e)
            if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
                return {"success": False, "error": "Email already registered"}
            return {"success": False, "error": error_msg}
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            response = self.client.table("users").select("*").eq("email", email).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        try:
            response = self.client.table("users").select("*").eq("id", user_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None

    def add_charger(self, charger_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add a new charger to the database"""
        try:
            response = self.client.table("chargers").insert(charger_data).execute()
            if response.data:
                return {"success": True, "charger": response.data[0]}
            else:
                return {"success": False, "error": "Failed to add charger"}
        except Exception as e:
            logger.error(f"Error adding charger: {e}")
            return {"success": False, "error": str(e)}

    def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user by verification token"""
        try:
            response = self.client.table("users").select("*").eq("verification_token", token).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error fetching user by token: {e}")
            return None
    
    def verify_user(self, token: str) -> bool:
        """Mark user as verified"""
        try:
            response = self.client.table("users").update({
                "is_verified": True
            }).eq("verification_token", token).execute()
            
            return response.data and len(response.data) > 0
        except Exception as e:
            logger.error(f"Error verifying user: {e}")
            return False

    def update_user(self, email: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile data"""
        try:
            # Prevent updating sensitive fields directly
            if "password_hash" in updates:
                del updates["password_hash"]
            if "id" in updates:
                del updates["id"]
            if "email" in updates:
                del updates["email"]
                
            response = self.client.table("users").update(updates).eq("email", email).execute()
            logger.info(f"Supabase Update Response: {response}")
            
            if response.data and len(response.data) > 0:
                return {"success": True, "user": response.data[0]}
            else:
                return {"success": False, "error": "User not found or update failed"}
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return {"success": False, "error": str(e)}

    def get_bookings(self, user_id: str, limit: int = 5) -> Dict[str, Any]:
        """Get upcoming bookings for a user"""
        try:
            # Fetch bookings where end_time is in the future (or all recent ones)
            # For simplicity, we just fetch recent bookings ordered by start_time
            from datetime import datetime
            now = datetime.now().isoformat()
            
            response = self.client.table("bookings")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("end_time", now)\
                .order("start_time", desc=False)\
                .limit(limit)\
                .execute()
            
            if response.data:
                return {"success": True, "bookings": response.data}
            else:
                return {"success": True, "bookings": []} # Return empty list if no bookings
        except Exception as e:
            logger.error(f"Error fetching bookings: {e}")
            return {"success": False, "error": str(e)}

    async def create_booking_if_available(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a booking ONLY IF the slot is available
        Logic:
        1. Check for overlapping bookings for the same charger
        2. If no overlap, insert booking
        """
        try:
            charger_id = booking_data["charger_id"]
            start_time = booking_data["start_time"]
            end_time = booking_data["end_time"]
            
            # Check for overlaps
            # Valid: New Start >= Existing End OR New End <= Existing Start
            # Overlap: New Start < Existing End AND New End > Existing Start
            overlaps = self.client.table("bookings")\
                .select("id")\
                .eq("charger_id", charger_id)\
                .lt("start_time", end_time)\
                .gt("end_time", start_time)\
                .neq("status", "Cancelled")\
                .execute()
                
            if overlaps.data and len(overlaps.data) > 0:
                logger.info(f"Booking overlap found: {overlaps.data}")
                return {
                    "success": False, 
                    "error": "This time slot is already occupied. Please select another time or charger."
                }
            
            # If no overlap, proceed to insert
            response = self.client.table("bookings").insert(booking_data).execute()
            
            if response.data:
                return {"success": True, "booking": response.data[0]}
            else:
                return {"success": False, "error": "Failed to create booking"}
                
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return {"success": False, "error": str(e)}

    def clear_user_history(self, user_id: Any) -> Dict[str, Any]:
        """Delete all Completed or Cancelled bookings for a user"""
        try:
            # Delete bookings with status 'Completed'
            r1 = self.client.table("bookings").delete()\
                .eq("user_id", user_id)\
                .eq("status", "Completed")\
                .execute()
            logger.info(f"Deleted Completed: {len(r1.data) if r1.data else 0}")
            
            # Delete bookings with status 'Cancelled'
            r2 = self.client.table("bookings").delete()\
                .eq("user_id", user_id)\
                .eq("status", "Cancelled")\
                .execute()
            logger.info(f"Deleted Cancelled: {len(r2.data) if r2.data else 0}")
            
            count = 0
            if r1.data: count += len(r1.data)
            if r2.data: count += len(r2.data)
            
            logger.info(f"Total deleted for {user_id}: {count}")
            return {"success": True, "count": count}
        except Exception as e:
            logger.error(f"Error clearing history: {e}")
            return {"success": False, "error": str(e)}

# Create singleton instance
db = Database()
