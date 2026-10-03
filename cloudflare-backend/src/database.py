import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

# Supports SQLite locally and PostgreSQL (Supabase/Neon) in production
# via DATABASE_URL environment variable
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./supply_chain.db")

# SQLite requires check_same_thread=False; PostgreSQL does not need it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

if os.environ.get("CLOUDFLARE_WORKER") == "1":
    from durable_database import Connection
    engine = create_engine("sqlite://", creator=Connection, poolclass=NullPool)
    # Durable Object transactions are isolated by Cloudflare. Its SQLite API
    # rejects SQLite's read_uncommitted PRAGMA, which the dialect probes on
    # its first connection; report the platform's isolation directly.
    engine.dialect.get_isolation_level = lambda connection: "SERIALIZABLE"
    # Cloudflare has no temporary database. Restrict table reflection to the
    # persistent main schema, including the initial empty-database case.
    _table_pragma = engine.dialect._get_table_pragma
    engine.dialect._get_table_pragma = (
        lambda connection, pragma, table_name, schema=None:
        _table_pragma(connection, pragma, table_name, schema="main")
    )
else:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


async def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
