
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_schema():
    try:
        # 1. Try to select the 'country' column for a user
        # This will fail if the column doesn't exist
        logger.info("Checking if 'country' column exists...")
        try:
            # Get first user
            user = db.client.table("users").select("id, email, country").limit(1).execute()
            logger.info(f"Column check success. Data sample: {user.data}")
        except Exception as e:
            logger.error(f"Column check FAILED. The 'country' column likely does not exist. Error: {e}")
            
        # 2. Try to update the country for a user (using a known email if possible, or just checking permissions)
        # We need a valid email to test update. Let's list users first.
        users_res = db.client.table("users").select("email").limit(1).execute()
        if users_res.data:
            test_email = users_res.data[0]['email']
            logger.info(f"Testing update on user: {test_email}")
            
            # Try update
            update_res = db.client.table("users").update({"country": "United States"}).eq("email", test_email).execute()
            logger.info(f"Update test result: {update_res}")
        else:
            logger.warning("No users found to test update.")

    except Exception as e:
        logger.error(f"Schema check script failed: {e}")

if __name__ == "__main__":
    check_schema()
