from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from backend.app.database import init_db, close_db
from backend.app.config import get_settings
from supabase import create_client, Client # Added explicit Supabase import
from backend.app.api import (
    products,
    cart,
    orders,
    feed,
    reels,
    chat,
    ws,
    search,
    community,
    referral,
    mirror,
    bookings,
    wallet,
    notifications,
    file_upload,
    ai_simple,  # Use simplified AI router without ML dependencies
    beard_engine  # Beard Intelligence Engine
)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}

# Include all routers
app.include_router(products.router, prefix="/api/v1/shop")
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(feed.router)
app.include_router(reels.router)
app.include_router(chat.router, prefix="/api")
app.include_router(ws.router)
app.include_router(search.router)
app.include_router(community.router)
app.include_router(referral.router)
app.include_router(mirror.router)
app.include_router(bookings.router, prefix="/api")  # Added bookings router with /api prefix
app.include_router(wallet.router)    # Added wallet router
app.include_router(notifications.router)  # Added notifications router
app.include_router(file_upload.router)    # Added file upload router
app.include_router(ai_simple.router)  # Added simplified AI router (no ML dependencies)
app.include_router(beard_engine.router)  # Added Beard Intelligence Engine

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
