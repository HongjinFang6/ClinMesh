#!/usr/bin/env python3
"""
Script to keep only the best version of a model and delete the rest.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Model, ModelVersion, ModelVersionStatus

def cleanup_duplicate_versions():
    """Keep only one version per model (preferably READY, or the most recent)."""

    # Create database session
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get all models
        all_models = db.query(Model).all()

        for model in all_models:
            versions = db.query(ModelVersion).filter(
                ModelVersion.model_id == model.id
            ).order_by(ModelVersion.created_at.desc()).all()

            if len(versions) <= 1:
                continue

            print(f"\nModel: '{model.name}' has {len(versions)} versions:")
            for i, v in enumerate(versions, 1):
                print(f"  {i}. Version {v.version_number} - Status: {v.status} - Created: {v.created_at}")

            # Find best version to keep (prefer READY, then most recent)
            ready_versions = [v for v in versions if v.status == ModelVersionStatus.READY]
            if ready_versions:
                version_to_keep = ready_versions[0]  # Most recent READY
                reason = "most recent READY version"
            else:
                version_to_keep = versions[0]  # Most recent overall
                reason = "most recent version"

            versions_to_delete = [v for v in versions if v.id != version_to_keep.id]

            print(f"\n  ✓ KEEPING: Version {version_to_keep.version_number} ({version_to_keep.status}) - {reason}")
            print(f"  ✗ DELETING: {len(versions_to_delete)} other version(s)")

            # Confirm deletion
            response = input(f"\nDelete {len(versions_to_delete)} version(s) for '{model.name}'? (yes/no): ")

            if response.lower() in ['yes', 'y']:
                for v in versions_to_delete:
                    db.delete(v)
                db.commit()
                print(f"  ✓ Deleted {len(versions_to_delete)} version(s)!")
            else:
                print("  Skipped.")

    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicate_versions()
