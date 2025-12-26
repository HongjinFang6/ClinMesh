#!/usr/bin/env python3
"""
Script to delete test models and keep only the real ones.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Model, ModelVersion

def delete_test_models():
    """Delete test models while keeping real ones."""

    # Create database session
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Patterns to identify test models
        test_patterns = [
            'Grayscale Converter Test',
            'Test Model',
            'Upload Test',
            'URL Test',
            'Manual Upload Test',
            'test-url-check',
            'upload-test'
        ]

        # Get all models
        all_models = db.query(Model).all()
        print(f"Total models: {len(all_models)}\n")

        # Find test models
        test_models = []
        real_models = []

        for model in all_models:
            is_test = any(pattern.lower() in model.name.lower() for pattern in test_patterns)
            if is_test:
                test_models.append(model)
            else:
                real_models.append(model)

        print(f"Real models (will be KEPT):")
        for model in real_models:
            versions_count = db.query(ModelVersion).filter(ModelVersion.model_id == model.id).count()
            print(f"  ✓ '{model.name}' ({versions_count} versions)")
        print()

        print(f"Test models (will be DELETED):")
        for model in test_models:
            versions_count = db.query(ModelVersion).filter(ModelVersion.model_id == model.id).count()
            print(f"  ✗ '{model.name}' ({versions_count} versions)")
        print()

        if not test_models:
            print("No test models found!")
            return

        # Confirm deletion
        print(f"\nFound {len(test_models)} test model(s) to delete.")
        print(f"This will keep {len(real_models)} real model(s).")
        response = input("\nDo you want to delete all test models? (yes/no): ")

        if response.lower() in ['yes', 'y']:
            deleted_count = 0
            for model in test_models:
                db.delete(model)  # Cascade will delete versions too
                deleted_count += 1

            db.commit()
            print(f"\n✓ Successfully deleted {deleted_count} test model(s)!")
            print(f"✓ Kept {len(real_models)} real model(s).")
        else:
            print("\nCancelled. No changes made.")

    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_test_models()
