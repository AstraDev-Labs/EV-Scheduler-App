import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found in .env")
    exit(1)

supabase: Client = create_client(url, key)

print(f"Connecting to Supabase at {url}...")

try:
    # Try to select the 'role' column to see if it exists
    print("Checking if 'role' column exists in 'users' table...")
    response = supabase.table("users").select("role").limit(1).execute()
    print("Success! The 'role' column acts normally.")
    print("Sample data:", response.data)
except Exception as e:
    print("\nXXX Column 'role' likely DOES NOT exist. XXX")
    print(f"Error details: {e}")
    print("\nACTION REQUIRED:")
    print("Please run the following SQL in your Supabase Dashboard SQL Editor:")
    print("-" * 50)
    try:
        with open('../add_role_column.sql', 'r') as f:
            print(f.read())
    except:
        print("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';")
    print("-" * 50)
