import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Supports SQLite locally and PostgreSQL (Supabase/Neon) in production
# via DATABASE_URL environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./supply_chain.db")

# SQLite requires check_same_thread=False; PostgreSQL does not need it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
