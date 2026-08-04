from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.models.booking import Booking, ArtistService
from app.models.user import User
from app.schemas.booking import (
    BookingCreate, BookingResponse, BookingUpdate, 
    ArtistServiceCreate, ArtistServiceResponse
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.post("/services", response_model=ArtistServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_artist_service(
    service_data: ArtistServiceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create artist service (artists only)"""
    if not current_user.is_artist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only artists can create services"
        )
    
    new_service = ArtistService(
        artist_id=current_user.id,
        title=service_data.title,
        description=service_data.description,
        price=service_data.price,
        duration_minutes=service_data.duration_minutes,
        availability=service_data.availability or {}
    )
    
    db.add(new_service)
    await db.commit()
    await db.refresh(new_service)
    
    return ArtistServiceResponse.from_orm(new_service)

@router.get("/services/{artist_id}", response_model=list[ArtistServiceResponse])
async def get_artist_services(
    artist_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all services from an artist"""
    result = await db.execute(
        select(ArtistService).where(ArtistService.artist_id == artist_id)
    )
    services = result.scalars().all()
    
    return [ArtistServiceResponse.from_orm(svc) for svc in services]

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a booking with an artist"""
    # Verify artist exists
    artist_result = await db.execute(
        select(User).where(User.id == booking_data.artist_id)
    )
    artist = artist_result.scalars().first()
    
    if not artist or not artist.is_artist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artist not found"
        )
    
    # Verify service exists if provided
    if booking_data.service_id:
        service_result = await db.execute(
            select(ArtistService).where(ArtistService.id == booking_data.service_id)
        )
        service = service_result.scalars().first()
        
        if not service or service.artist_id != booking_data.artist_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )
    else:
        service = None
    
    # Check availability
    booking_date = datetime.fromisoformat(booking_data.booking_date)
    if booking_date < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book for past dates"
        )
    
    # Create booking
    new_booking = Booking(
        user_id=current_user.id,
        artist_id=booking_data.artist_id,
        service_id=booking_data.service_id,
        booking_date=booking_date,
        duration_minutes=booking_data.duration_minutes or (service.duration_minutes if service else 60),
        status="pending",
        payment_status="pending",
        total_price=booking_data.total_price or (service.price if service else 0)
    )
    
    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)
    
    return BookingResponse.from_orm(new_booking)

@router.get("/", response_model=list[BookingResponse])
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's bookings (as customer)"""
    result = await db.execute(
        select(Booking)
        .where(Booking.user_id == current_user.id)
        .order_by(desc(Booking.booking_date))
        .offset(skip)
        .limit(limit)
    )
    bookings = result.scalars().all()
    
    return [BookingResponse.from_orm(booking) for booking in bookings]

@router.get("/artist/schedule", response_model=list[BookingResponse])
async def get_artist_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get artist's incoming bookings"""
    if not current_user.is_artist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only artists can view this"
        )
    
    result = await db.execute(
        select(Booking)
        .where(
            (Booking.artist_id == current_user.id) &
            (Booking.booking_date >= datetime.utcnow())
        )
        .order_by(Booking.booking_date)
    )
    bookings = result.scalars().all()
    
    return [BookingResponse.from_orm(booking) for booking in bookings]

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get booking details"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Only booking customer, artist, or admin can view
    if (booking.user_id != current_user.id and 
        booking.artist_id != current_user.id and 
        not current_user.is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    return BookingResponse.from_orm(booking)

@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: UUID,
    update_data: BookingUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update booking (status changes)"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Only artist or customer can update
    if booking.artist_id != current_user.id and booking.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    # Artists can accept/reject, customers can cancel
    if update_data.status:
        if current_user.id == booking.artist_id and update_data.status in ["accepted", "rejected"]:
            booking.status = update_data.status
        elif current_user.id == booking.user_id and update_data.status == "cancelled":
            booking.status = update_data.status
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status transition"
            )
    
    if update_data.payment_status and current_user.is_admin:
        booking.payment_status = update_data.payment_status
    
    booking.updated_at = datetime.utcnow()
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    
    return BookingResponse.from_orm(booking)

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel booking"""
    result = await db.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    if booking.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    if booking.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel this booking"
        )
    
    booking.status = "cancelled"
    db.add(booking)
    await db.commit()
