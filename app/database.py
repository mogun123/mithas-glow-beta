import asyncio
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import get_settings

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    future=True,
    pool_size=20,
    max_overflow=0,
    pool_pre_ping=True,
    connect_args={"statement_cache_size": 0},
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base for models
Base = declarative_base()

async def init_db():
    """Initialize database on startup"""
    async with engine.begin() as conn:
        # Create pgvector extension first
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            print("pgvector extension created successfully")
        except Exception as e:
            print(f"Warning: Could not create pgvector extension: {e}")
            print("Vector columns will not work without pgvector extension")
        
        # Create all tables (run migrations in production)
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized successfully")

async def close_db():
    """Close database connection on shutdown"""
    await engine.dispose()
    print("Database closed successfully")

async def get_db() -> AsyncSession:
    """Dependency for getting database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
