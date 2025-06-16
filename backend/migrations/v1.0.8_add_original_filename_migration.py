"""
Migration: Add original_filename column to raw_data table
Version: v1.0.8
Date: 2025-06-15
"""

import psycopg2
import os
import sys

# Add the parent directory to the path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.config import Config

def migrate_up():
    """Add original_filename column to raw_data table"""
    
    # Parse database URL
    db_url = Config.SQLALCHEMY_DATABASE_URI
    
    # Extract connection parameters from URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', '')
        
    # Split user:password@host:port/database
    auth_host, database = db_url.split('/')
    user_pass, host_port = auth_host.split('@')
    user, password = user_pass.split(':')
    host, port = host_port.split(':') if ':' in host_port else (host_port, '5432')
    
    # Connect to database
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )
    
    cur = conn.cursor()
    
    try:
        # Check if column already exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='raw_data' AND column_name='original_filename'
        """)
        
        if not cur.fetchone():
            # Add original_filename column
            print("Adding original_filename column to raw_data table...")
            cur.execute("""
                ALTER TABLE raw_data 
                ADD COLUMN original_filename VARCHAR(255)
            """)
            print("Successfully added original_filename column")
        else:
            print("original_filename column already exists")
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def migrate_down():
    """Remove original_filename column from raw_data table"""
    
    # Parse database URL
    db_url = Config.SQLALCHEMY_DATABASE_URI
    
    # Extract connection parameters from URL
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', '')
        
    # Split user:password@host:port/database
    auth_host, database = db_url.split('/')
    user_pass, host_port = auth_host.split('@')
    user, password = user_pass.split(':')
    host, port = host_port.split(':') if ':' in host_port else (host_port, '5432')
    
    # Connect to database
    conn = psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )
    
    cur = conn.cursor()
    
    try:
        # Check if column exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='raw_data' AND column_name='original_filename'
        """)
        
        if cur.fetchone():
            # Remove original_filename column
            print("Removing original_filename column from raw_data table...")
            cur.execute("""
                ALTER TABLE raw_data 
                DROP COLUMN original_filename
            """)
            print("Successfully removed original_filename column")
        else:
            print("original_filename column doesn't exist")
        
        conn.commit()
        
    except Exception as e:
        conn.rollback()
        print(f"Error during rollback: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'down':
        migrate_down()
    else:
        migrate_up()