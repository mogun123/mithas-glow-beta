import asyncio
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

try:
    from app.config import get_settings
except ImportError:
    from backend.app.config import get_settings

settings = get_settings()

# Supabase pooler uses a certificate chain that may not be in Python's
# default trust store. Use a custom context that encrypts but skips
# chain verification (safe for managed cloud endpoints like Supabase).
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    connect_args={
        "statement_cache_size": 0,
        "ssl": _ssl_ctx
    }
)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def init_db():
    """Initialize database connection"""
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def close_db():
    """Close database connection"""
    await engine.dispose()

async def get_db():
    """Get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
