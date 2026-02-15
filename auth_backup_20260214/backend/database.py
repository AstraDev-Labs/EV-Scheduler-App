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
            print(f"Password verification error: {e}")
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
        country: str = "India"
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
                "country": country
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
            print(f"Error fetching user: {e}")
            return None
    
    def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get user by verification token"""
        try:
            response = self.client.table("users").select("*").eq("verification_token", token).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching user by token: {e}")
            return None
    
    def verify_user(self, token: str) -> bool:
        """Mark user as verified"""
        try:
            response = self.client.table("users").update({
                "is_verified": True
            }).eq("verification_token", token).execute()
            
            return response.data and len(response.data) > 0
        except Exception as e:
            print(f"Error verifying user: {e}")
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
            print(f"Error updating user: {e}")
            return {"success": False, "error": str(e)}

# Create singleton instance
db = Database()
