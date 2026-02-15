
from database import db
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    try:
        logger.info("Starting migration: Adding 'country' column to 'users' table...")
        
        # SQL command to add country column if it doesn't exist
        sql = """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'country') THEN
                ALTER TABLE public.users ADD COLUMN country TEXT DEFAULT 'India';
            END IF;
        END $$;
        """
        
        # Execute via Supabase RPC or direct SQL if possible
        # Supabase-py client usually doesn't expose raw SQL execution easily unless using rpc
        # But we can try using the postgrest client or just rely on the user running it?
        # WAIT: The Supabase Python client usually exposes .rpc()
        # If we don't have a specific RPC, we might struggle.
        # But we can use `db.client.table('users').select('*').limit(1).execute()` to check connectivity.
        
    # Read SQL file
    try:
        with open('add_role_column.sql', 'r') as f:
            sql_commands = f.read()
            
        # Split commands by semicolon to execute one by one
        commands = [cmd.strip() for cmd in sql_commands.split(';') if cmd.strip()]
        
        print(f"Found {len(commands)} SQL commands to execute")
        
        for i, cmd in enumerate(commands):
            print(f"Executing command {i+1}...")
            # Use the RPC function 'exec_sql' if available, otherwise we might need a workaround for DDL
            # However, standard Supabase-py 'rpc' call is best if the function exists.
            # If not, we can try using raw SQL via a different method or rely on the dashboard.
            # Since we don't have direct SQL access, we will use the same 'rpc' approach as before if it worked,
            # or try to use the 'sql' endpoint if available (but usually not exposed).
            
            # WORKAROUND: For DDL (ALTER TABLE), the python client usually can't execute raw SQL directly
            # unless we have a stored procedure for it.
            # Let's try to use the 'postgres' wrapper or just log it for the user if it fails.
            
            # Actually, standard python client doesn't support raw SQL execution easily.
            # We will use the 'rpc' method 'exec_sql' which we hopefully created before or will create now.
            pass

        # Since we cannot easily execute DDL from the client without an RPC, 
        # let's try to check if we can add the column via the table interface (not possible for schema changes usually).
        
        # ALTERNATIVE: We can use the 'rpc' call if we have an 'exec_sql' function.
        # If not, we have to ask the user to run it in the Supabase Dashboard.
        
        print("IMPORTANT: The Python client cannot execute DDL (ALTER TABLE) directly.")
        print("Please copy the content of 'add_role_column.sql' and run it in your Supabase SQL Editor.")
        
    except Exception as e:
        print(f"Error reading SQL file: {e}")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
