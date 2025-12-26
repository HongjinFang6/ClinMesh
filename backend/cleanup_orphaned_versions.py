#!/usr/bin/env python3
"""
Cleanup script to remove orphaned model versions.
This deletes model versions whose parent model no longer exists.
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Model, ModelVersion

def cleanup_orphaned_versions():
    """Find and delete model versions that don't have a valid parent model."""

    # Create database session
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get all model versions
        all_versions = db.query(ModelVersion).all()
        print(f"Total model versions: {len(all_versions)}")

        # Find orphaned versions
        orphaned_versions = []
        for version in all_versions:
            # Check if parent model exists
            parent_model = db.query(Model).filter(Model.id == version.model_id).first()
            if not parent_model:
                orphaned_versions.append(version)
                print(f"  - Orphaned: Version {version.version_number} (ID: {version.id}) - No parent model")
            elif not parent_model.name:
                orphaned_versions.append(version)
                print(f"  - Orphaned: Version {version.version_number} (ID: {version.id}) - Parent model has no name")

        if not orphaned_versions:
            print("\nNo orphaned versions found! Database is clean.")
            return

        # Confirm deletion
        print(f"\n Found {len(orphaned_versions)} orphaned version(s).")
        response = input("Do you want to delete these orphaned versions? (yes/no): ")

        if response.lower() in ['yes', 'y']:
            for version in orphaned_versions:
                db.delete(version)
            db.commit()
            print(f"\n✓ Successfully deleted {len(orphaned_versions)} orphaned version(s)!")
        else:
            print("\nCancelled. No changes made.")

    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_orphaned_versions()
