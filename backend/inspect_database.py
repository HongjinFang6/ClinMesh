#!/usr/bin/env python3
"""
Script to inspect the database and show all models and versions.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Model, ModelVersion

def inspect_database():
    """Show all models and their versions."""

    # Create database session
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get all models
        all_models = db.query(Model).all()
        print(f"Total models: {len(all_models)}\n")

        models_with_empty_names = []
        for model in all_models:
            versions = db.query(ModelVersion).filter(ModelVersion.model_id == model.id).all()
            print(f"Model: '{model.name}' (ID: {model.id})")
            print(f"  Description: {model.description or 'None'}")
            print(f"  Versions: {len(versions)}")

            if not model.name or model.name.strip() == '':
                models_with_empty_names.append((model, versions))
                print(f"  ⚠️  WARNING: This model has an empty or blank name!")

            print()

        if models_with_empty_names:
            print(f"\n{'='*60}")
            print(f"Found {len(models_with_empty_names)} model(s) with empty names")
            print(f"{'='*60}\n")

            for model, versions in models_with_empty_names:
                print(f"Model ID: {model.id}")
                print(f"  Versions: {len(versions)}")
                for v in versions:
                    print(f"    - Version {v.version_number} (Status: {v.status})")
                print()

    except Exception as e:
        print(f"\nError: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect_database()
