from app.database import Base, engine
from models import user, curriculum, progress, review

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print(f"Database tables created/verified at: {engine.url.database}")
    print("Existing database file was not deleted or overwritten.")
