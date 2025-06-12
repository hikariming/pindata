#!/usr/bin/env python3
"""
Migration: Add hierarchy columns to organizations table
Date: 2025-06-12
Description: Add parent_id, path, level, and sort_order columns to organizations table
"""

import psycopg2
import os
from dotenv import load_dotenv

def run_migration():
    """Add missing hierarchy columns to organizations table"""
    
    # Load environment variables
    load_dotenv()
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in environment variables")
        return False
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Adding hierarchy columns to organizations table...")
        
        # Add parent_id column
        cur.execute("""
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36)
        """)
        
        # Add path column
        cur.execute("""
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS path VARCHAR(1000)
        """)
        
        # Add level column
        cur.execute("""
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1
        """)
        
        # Add sort_order column
        cur.execute("""
            ALTER TABLE organizations 
            ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0
        """)
        
        # Add foreign key constraint for parent_id (check if exists first)
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_organizations_parent_id' 
            AND table_name = 'organizations'
        """)
        
        constraint_exists = cur.fetchone()[0] > 0
        if not constraint_exists:
            cur.execute("""
                ALTER TABLE organizations 
                ADD CONSTRAINT fk_organizations_parent_id 
                FOREIGN KEY (parent_id) REFERENCES organizations(id)
            """)
        
        # Add indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_organizations_parent_id 
            ON organizations(parent_id)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_organizations_path 
            ON organizations(path)
        """)
        
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_organizations_level 
            ON organizations(level)
        """)
        
        # Update existing records to have proper path and level values
        cur.execute("""
            UPDATE organizations 
            SET path = '/' || code, level = 1 
            WHERE path IS NULL
        """)
        
        conn.commit()
        print("✓ Migration completed successfully!")
        
        # Verify the changes
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'organizations' ORDER BY column_name")
        columns = cur.fetchall()
        print("\nCurrent columns in organizations table:")
        for col in columns:
            print(f"  - {col[0]}")
        
        return True
        
    except Exception as e:
        print(f"✗ Migration failed: {str(e)}")
        conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)