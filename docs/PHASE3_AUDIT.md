# MITHAS GLOW — PHASE 3 REPOSITORY AUDIT

## Executive Summary

**Audit Date**: 2026-08-12  
**Repository**: MITHAS GLOW Beauty Marketplace  
**Technology Stack**: Vite + React 18 + TypeScript + Supabase + PostgreSQL + FastAPI  

**Phase Status**:
- ✅ Phase 1 COMPLETE: ArtistDetailScreen fixes, navigation bug resolved
- ✅ Phase 2 COMPLETE: Server-side booking security, price protection, double-booking prevention
- 🔄 Phase 3 IN PROGRESS: Competitive moat, revenue protection, trust systems

---

## A. Current Architecture

### Frontend Architecture
```
Vite (v6.4.3) → React 18.3.1 → TypeScript 5.9.3
├── src/ (Main application code)
│   ├── screens/ (Page-level components)
│   ├── components/ (Reusable UI components)
│   ├── hooks/ (Custom React hooks)
│   ├── store/ (Zustand state management)
│   ├── lib/ (Utilities, Supabase client)
│   └── types/ (TypeScript interfaces)
├── hooks/ (Root-level hooks directory)
├── components/ (Root-level components)
└── app/ (Next.js remnants - deprecated)
```

### Backend Architecture
```
FastAPI (Python) + Supabase
├── backend/main.py (FastAPI server)
├── backend/supabase_functions.sql (Database functions)
└── supabase/migrations/ (Schema migrations)
```

### Database Architecture
```
PostgreSQL (Supabase)
├── profiles (User/Artist profiles)
├── artist_services (Service offerings)
├── bookings (Appointment bookings)
├── reviews (Customer reviews)
├── notifications (User notifications)
├── products (E-commerce products)
├── orders (Order history)
└── [Additional tables for marketplace features]
```

---

## B. Actual Technology Stack

### Confirmed Technologies
| Category | Technology | Version | Status |
|----------|-----------|---------|--------|
| **Build Tool** | Vite | ^6.4.3 | ✅ Active |
| **Framework** | React | ^18.3.1 | ✅ Active |
| **Language** | TypeScript | 5.9.3 | ✅ Active |
| **Backend API** | FastAPI | Latest | ✅ Active |
| **Database** | PostgreSQL (Supabase) | ^2.95.0 | ✅ Active |
| **Auth** | Supabase Auth | ^2.95.0 | ✅ Active |
| **State** | Zustand | Latest | ✅ Active |
| **Routing** | React Router DOM | ^7.11.0 | ✅ Active |
| **Styling** | Tailwind CSS | ^4.1.18 | ✅ Active |
| **UI Components** | Radix UI | Various | ✅ Active |
| **Animations** | Framer Motion | ^12.33.0 | ✅ Active |
| **ML/AR** | TensorFlow.js, MediaPipe, Three.js | Various | ⚠️ Heavy |

### Framework Confusion Identified
⚠️ **ISSUE**: Both Vite AND Next.js configurations present
- `vite.config.ts` exists (active)
- `next.config.mjs` exists (legacy/remnant)
- `app/` directory with Next.js structure (deprecated)
- `src/` directory with Vite structure (active)

**Recommendation**: Remove Next.js remnants to avoid confusion

---

## C. Customer Flow (Current Implementation)

### Discovery → Booking Flow
```
HomeScreen (Artist Discovery)
  ↓ useVerifiedArtists hook
  ↓ Supabase query: profiles + artist_services + reviews
Artist Listing (paginated? ❌ NO - loads all)
  ↓
ArtistDetailScreen
  ↓ useArtistProfile hook
  ↓ useArtistPortfolio hook
  ↓ useArtistReviews hook
Artist Profile + Services + Portfolio + Reviews
  ↓ Service Selection
  ↓ Date Selection
  ↓ Time Selection (get_available_slots RPC)
  ↓ Location (Studio/Home)
  ↓ Special Request
  ↓ Price Preview (client-side)
  ↓ useCreateBooking hook
  ↓ create_booking RPC (server-side calculation)
Booking Confirmation
  ↓
MyBookingsScreen
  ↓ useMyBookings hook
Booking History
```

### Security Gaps Identified
1. ❌ No pagination in artist discovery (loads all artists)
2. ❌ Client-side price preview can be manipulated (fixed server-side in Phase 2)
3. ⚠️ Review system lacks verified booking enforcement
4. ⚠️ No contact/payment bypass protection
5. ⚠️ No duplicate review prevention at database level

---

## D. Artist Flow (Current Implementation)

### Onboarding → Earnings Flow
```
Profile Creation
  ↓ Set account_type = 'professional'
  ↓ Set industry = 'makeup_artist'
  ↓ Complete profile fields
ProfessionalDashboard (if exists)
  ↓ Add Services (artist_services table)
  ↓ Set Pricing
  ↓ Upload Portfolio (artist_portfolio table if exists)
  ↓ Configure Availability (operating_hours JSONB)
  ↓
Booking Requests (bookings table)
  ↓ Accept/Reject (status update)
  ↓ Complete Service
  ↓ Receive Payment
  ↓ Get Review (reviews table)
  ↓ Track Earnings (wallet_transactions if exists)
```

### Missing Features
1. ❌ No formal artist onboarding flow
2. ❌ No service approval workflow
3. ❌ No portfolio upload validation
4. ❌ No earnings/payout tracking
5. ❌ No booking acceptance/rejection UI
6. ❌ No availability management UI

---

## E. Artist Profile Audit (ArtistDetailScreen.tsx)

### Implemented Features ✅
- Artist header with avatar
- Artist name display
- Verification badge (uses is_verified field)
- Rating display (calculated from reviews)
- Review count
- Bio display
- Location display
- Portfolio grid
- Services list with pricing
- Date selection
- Time slot selection (via get_available_slots)
- Studio/Home service toggle
- Special request notes
- Price breakdown (preview)
- Advance payment display
- Booking CTA
- Share functionality (basic)

### Partially Implemented ⚠️
- Social links (instagramLink, youtubeLink - fixed in Phase 1)
- Portfolio featured items (featuredPortfolio - fixed in Phase 1)
- Experience display (depends on experience field)
- Industry display
- Travel charges (hardcoded ₹500 for home_service)
- Cancellation policy (static text)

### UI Only (No Backend) ❌
- Packages (no packages table)
- Add-ons (no add_ons table)
- Response rate metric
- Completion rate metric
- Repeat customer rate
- Portfolio authenticity indicators

### Backend Supported But Not Used 🔶
- operating_hours (exists in profiles but not fully utilized)
- seller_status (exists but not displayed)
- portfolio_link (exists but not shown)
- latitude/longitude (exists but no distance calculation)

### Broken/Risky Issues 🔴
- ❌ No verified booking review indicator
- ❌ No duplicate review prevention
- ❌ No contact information protection
- ❌ No external link blocking
- ❌ Portfolio images can be arbitrary URLs
- ❌ No image size/type validation

---

## F. Booking System Audit

### Current Implementation
```sql
-- Table: bookings
id UUID (PK)
customer_id UUID (FK → profiles)
artist_id UUID (FK → profiles)
service_id UUID (FK → artist_services)
service_name VARCHAR (denormalized)
total_price DECIMAL
booking_date DATE
booking_time TIME
status ENUM (pending, confirmed, completed, cancelled, no_show)
payment_status ENUM (pending, paid, failed, refunded)
payment_id VARCHAR (Razorpay ID if implemented)
notes TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### create_booking RPC (Phase 2 Implementation) ✅
```sql
FUNCTION create_booking(
  p_artist_id UUID,
  p_service_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_notes TEXT
)
RETURNS comprehensive booking details
```

**Security Features Implemented**:
✅ Server-side price calculation from artist_services.price  
✅ Service-to-artist relationship validation  
✅ Customer authentication via auth.uid()  
✅ Atomic double-booking prevention  
✅ Date/time validation (no past dates)  
✅ Partial unique index for active bookings only  
✅ Financial RLS protection  
✅ Check constraint for positive prices  

### Remaining Vulnerabilities
⚠️ No travel fee calculation based on actual distance  
⚠️ No service duration consideration for slot blocking  
⚠️ No buffer time between appointments  
⚠️ No holiday/blocked date handling  
⚠️ No automatic slot release on cancellation  

---

## G. Reviews System Audit

### Current Schema
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  artist_id UUID REFERENCES profiles(id),
  customer_id UUID REFERENCES profiles(id),
  rating INTEGER CHECK (1-5),
  comment TEXT,
  created_at TIMESTAMPTZ
);
```

### Critical Issues 🔴
1. ❌ **No UNIQUE constraint** on (customer_id, artist_id) or (booking_id)
   - Allows duplicate reviews from same customer
2. ❌ **No verified booking check** 
   - Anyone can review any artist without booking
3. ❌ **No completed booking validation**
   - Can review before service completion
4. ❌ **No self-review prevention**
   - Artists could potentially review themselves
5. ❌ **No review response mechanism**
   - Artists cannot respond to reviews
6. ❌ **No review moderation**
   - No approval workflow for inappropriate content
7. ❌ **No is_verified flag**
   - Cannot distinguish verified vs unverified reviews

### useArtistReviews Hook Analysis
```typescript
// Current implementation issues:
- Fetches ALL reviews for artist (no pagination)
- No verification status check
- No booking ownership validation
- No duplicate review detection
- Client-side rating calculation (acceptable for display)
```

### Required Fixes for Phase 3A
1. Add UNIQUE constraint on booking_id (one review per booking)
2. Add is_verified BOOLEAN column with default FALSE
3. Create secure create_review RPC function
4. Validate: customer owns booking, booking is completed, not already reviewed
5. Add RLS policies preventing unauthorized review creation
6. Add review response columns (response, response_at)

---

## H. Marketplace Revenue Protection Audit

### Current Exposure Analysis

#### Contact Information Leakage 🔴 CRITICAL
| Field | Current Protection | Risk Level |
|-------|-------------------|------------|
| profiles.phone | Public SELECT | 🔴 HIGH |
| profiles.email | Public SELECT | 🔴 HIGH |
| profiles.bio | No content filtering | 🔴 HIGH |
| artist_services.description | No content filtering | 🔴 HIGH |
| portfolio captions | No content filtering | 🔴 HIGH |
| social_links array | No validation | 🟡 MEDIUM |

#### External Link Exposure 🔴 CRITICAL
- ❌ Instagram links can be WhatsApp links (wa.me/)
- ❌ YouTube links can be Telegram links (t.me/)
- ❌ Portfolio links can be external booking sites
- ❌ No URL pattern validation

#### Payment Bypass Risks 🔴 CRITICAL
- ❌ No UPI ID detection in bio/descriptions
- ❌ No QR code image detection
- ❌ No external payment link detection
- ❌ No "contact for pricing" enforcement

#### Messaging System
- ❌ No in-platform messaging exists
- ❌ Forces users to exchange external contact info
- ❌ No content monitoring capability

### Current Protection Level: **NONE**

All protection is UI-only or non-existent. Malicious users can easily:
- Share phone numbers in bio
- Share WhatsApp links as "social links"
- Share UPI IDs in service descriptions
- Request direct payment in notes
- Cancel platform booking and rebook directly

### Required Phase 3A Implementation
1. Content safety utility with regex patterns for:
   - Indian phone numbers (+91, 10-digit)
   - Email addresses
   - UPI IDs and links
   - WhatsApp/Telegram links
   - External booking URLs
2. Server-side content validation before save
3. Warning system for artists attempting to share contact info
4. Masking/redaction for detected contact info
5. Risk event logging for repeated attempts
6. In-platform inquiry system (minimal MVP)

---

## I. Payment & Commission Audit

### Current Financial Architecture (Phase 2)

#### create_booking RPC Calculations
```sql
base_price := service.price (from database)
travel_fee := 500 (if home_service category)
platform_fee_rate := 0.15 (15%)
platform_fee := base_price * platform_fee_rate
total_amount := base_price + travel_fee
advance_amount := total_amount * 0.20 (20%)
artist_amount := total_amount - platform_fee
```

#### Stored in Bookings Table
- total_price (DECIMAL)
- payment_status (ENUM)
- payment_id (VARCHAR for Razorpay)

### Missing Financial Infrastructure ❌
1. ❌ No payments table for transaction records
2. ❌ No wallet_transactions table
3. ❌ No artist_earnings tracking
4. ❌ No payout_requests table
5. ❌ No refunds table
6. ❌ No commission_tracking table
7. ❌ No tax calculation
8. ❌ No invoice generation
9. ❌ No payment gateway integration (Razorpay mentioned but not implemented)
10. ❌ No financial audit trail

### Price Manipulation Protection
✅ Server-side calculation (Phase 2)  
✅ Client-provided prices ignored  
✅ Check constraints on total_price  
✅ RLS prevents amount modification  

### Remaining Risks
⚠️ No refund process  
⚠️ No cancellation fee calculation  
⚠️ No dispute resolution mechanism  
⚠️ No payout schedule  
⚠️ No minimum payout threshold  
⚠️ No payment reconciliation  

---

## J. Supabase Database Audit

### Migration Files Inventory
```
supabase/migrations/
├── 20240126_add_product_advanced_features.sql
├── 20240127_advanced_inventory_management.sql
├── 20240131_smart_feed_tables.sql
├── 20240201_reels_schema.sql
├── 20240207_add_cart_enhancements.sql
├── 20240207_add_face_analyses_table.sql
├── 20240207_create_analytics_events_table.sql
├── 20240207_create_analytics_function.sql
├── 20240511_add_profile_completed_column.sql
├── 20260202_add_collaborative_cart.sql
├── 20260202_add_location_discovery.sql
├── 20260202_add_realtime_metrics.sql
├── 20260202_add_skin_tone_matching.sql
├── 20260717_create_scheduled_scans.sql
├── 20260717_fix_save_full_transformation_rpc.sql
├── 20260724_fix_glow_journey_schema.sql
├── 20260728_create_bookings_tables.sql
├── 20260729_complete_booking_flow.sql
├── 20260731_fix_clinical_analyses_columns.sql
├── 20260731_rewards_fields.sql
├── 20260805051114_fix_bookings_schema.sql
└── 20260805120000_phase2_booking_security.sql
```

### Duplicate/Conflicting Files Identified
1. ⚠️ `20260728_create_bookings_tables.sql` vs `20260729_complete_booking_flow.sql`
   - Both create bookings table
   - Latter is superseded by fix migration
2. ⚠️ `20260805051114_fix_bookings_schema.sql` reconciles conflicts
3. ⚠️ Multiple schema files in root:
   - `/workspace/supabase_schema.sql`
   - `/workspace/creator_hub_schema.sql`
   - `/workspace/backend/current_schema.sql`
   - `/workspace/backend/global_data_flow_schema.sql`

### Obsolete Tables (Beauty Marketplace Context)
- feed_items (social feed - not core to bookings)
- reels (video content - not core)
- body_scans (AR feature - heavy, not essential)
- virtual_floors (3D mall concept - not used)
- collaborative_cart (e-commerce feature)
- skin_tone_matching (AI feature - not essential)

### Missing Core Tables
- artist_portfolio (portfolio images)
- artist_availability (detailed availability beyond operating_hours)
- favorites/wishlist (customer saved artists)
- messages (in-platform communication)
- risk_events (marketplace protection)
- artist_verification (verification documents/status)
- payouts (artist payment processing)

### Index Analysis
**Existing Indexes**:
```sql
idx_profiles_artist_filter ON profiles(account_type, industry, seller_status)
idx_bookings_customer ON bookings(customer_id)
idx_bookings_artist_date ON bookings(artist_id, booking_date)
idx_services_artist ON artist_services(artist_id, is_active)
idx_bookings_artist_date_time_active (partial unique) -- Phase 2
```

**Missing Critical Indexes**:
- reviews(artist_id, created_at) - for review fetching
- reviews(booking_id) - for verification lookup
- reviews(customer_id, artist_id) - for duplicate prevention
- artist_services(category, is_active) - for filtering
- bookings(status, booking_date) - for dashboard queries

### Foreign Key Integrity
✅ bookings.customer_id → profiles.id  
✅ bookings.artist_id → profiles.id  
✅ bookings.service_id → artist_services.id  
✅ reviews.booking_id → bookings.id (ON DELETE SET NULL)  
✅ reviews.artist_id → profiles.id  
✅ reviews.customer_id → profiles.id  

### Constraints Analysis
✅ CHECK constraint on ratings (1-5)  
✅ CHECK constraint on total_price > 0 (Phase 2)  
✅ UNIQUE constraint on bookings (partial, active only) (Phase 2)  
❌ MISSING: UNIQUE on reviews.booking_id  
❌ MISSING: UNIQUE on reviews(customer_id, artist_id)  

---

## K. RLS & Security Audit

### Current RLS Policies (from Phase 2 migration)

#### bookings table
```sql
-- INSERT: Users can create own bookings
CHECK (auth.uid() = customer_id AND artist_id IS NOT NULL)

-- SELECT: Users/artists/admins can view related bookings
USING (auth.uid() = customer_id OR auth.uid() = artist_id OR is_admin)

-- UPDATE (Customer): Cannot modify financial fields
WITH CHECK (OLD.total_price = NEW.total_price AND OLD.payment_status = NEW.payment_status)

-- UPDATE (Artist): Cannot modify financial fields
WITH CHECK (OLD.total_price = NEW.total_price)

-- DELETE: Admins only
```

### Missing RLS Policies ❌

#### reviews table
- ❌ No policy preventing fake review creation
- ❌ No policy enforcing booking ownership
- ❌ No policy preventing artist self-reviews
- ❌ No policy preventing duplicate reviews
- ❌ No policy allowing review updates only by author

#### artist_services table
- ⚠️ Artists can modify own services (acceptable)
- ❌ No validation on price changes for existing bookings
- ❌ No policy preventing service deletion with active bookings

#### profiles table
- ⚠️ Users can update own profile (acceptable)
- ❌ No policy preventing account_type change without approval
- ❌ No policy preventing is_verified self-modification

#### artist_portfolio table (if exists)
- ❌ No upload validation
- ❌ No file type/size restrictions at database level
- ❌ No policy preventing inappropriate content

### Security Vulnerabilities

#### Privilege Escalation Risks
🟡 User could potentially set own is_verified = true if RLS allows UPDATE
🟡 User could change account_type to 'professional' without approval
🟡 Artist could set own seller_status to 'verified'

#### Data Access Violations
🟡 No explicit policy preventing customers from viewing other customers' data
🟡 No explicit policy preventing artists from viewing other artists' sensitive data
🟢 bookings table properly restricts access to related parties only

#### Financial Manipulation
✅ Phase 2 fixed price manipulation in bookings
❌ No audit trail for financial changes
❌ No immutable financial records

### Service Role Key Exposure
⚠️ Need to verify: No SERVICE_ROLE key exposed in frontend code
⚠️ Need to verify: All sensitive operations use SECURITY DEFINER functions

---

## L. UI/UX Audit

### Current Design System
**Aesthetic**: Premium light beauty theme
- ✅ White cards with soft shadows
- ✅ Pink/purple gradient accents
- ✅ Clean typography
- ✅ Glassmorphism effects
- ✅ Mobile-first responsive design

### Component Quality
**Strengths**:
- ✅ Consistent button styles
- ✅ Good icon usage (Lucide React)
- ✅ Loading states implemented
- ✅ Error states present
- ✅ Toast notifications working

**Weaknesses**:
- ❌ Touch targets sometimes < 44px
- ❌ Focus states inconsistent
- ❌ Accessibility attributes missing (aria-labels)
- ❌ Color contrast issues in some areas
- ❌ Empty states generic/not helpful

### Navigation
- ✅ Bottom navigation for mobile
- ✅ Protected routes implemented
- ✅ Role-based navigation (customer/artist)
- ⚠️ Circular dependency fixed in Phase 1
- ❌ No breadcrumbs
- ❌ No search within navigation

### Responsive Behavior
- ✅ Works on 320px width
- ✅ Tablet layouts acceptable
- ✅ Desktop layouts functional
- ❌ Some overflow issues on very small screens
- ❌ Image loading not optimized for different screen sizes

### Performance Perception
- ⚠️ Initial load slow due to heavy ML libraries
- ⚠️ No skeleton loaders for artist cards
- ⚠️ Portfolio images load full size
- ❌ No lazy loading for off-screen content
- ❌ No image placeholders

---

## M. 100,000+ Artist Scalability Audit

### Current Discovery Implementation
```typescript
// useVerifiedArtists hook - CRITICAL ISSUE
const { data } = await supabase
  .from('profiles')
  .select('*, artist_services(...), reviews(...)')
  .eq('account_type', 'professional')
  .eq('industry', 'makeup_artist')
  // NO LIMIT BY DEFAULT
  // NO PAGINATION
```

### Scalability Issues 🔴 CRITICAL

#### Query Performance
1. ❌ **No pagination** - loads ALL matching artists
2. ❌ **No cursor-based pagination** - cannot efficiently page through results
3. ❌ **Client-side sorting** - sorts entire dataset in browser
4. ❌ **N+1 queries** - fetches services/reviews separately for each artist
5. ❌ **SELECT *** - fetches unnecessary columns

#### Database Performance
1. ⚠️ Missing composite indexes for common filters
2. ⚠️ No partial indexes for active artists only
3. ⚠️ No materialized views for aggregated data (ratings, review counts)
4. ❌ No query result caching
5. ❌ No read replicas configuration

#### Frontend Performance
1. ❌ Renders all artists at once (no virtualization)
2. ❌ No image lazy loading
3. ❌ No infinite scroll implementation
4. ❌ Large bundle size blocks initial render
5. ❌ No memoization of artist cards

### Projected Performance at Scale

| Artists | Current Approach | With Fixes |
|---------|-----------------|------------|
| 100 | ~500ms | ~100ms |
| 1,000 | ~3000ms | ~150ms |
| 10,000 | ~30000ms (timeout) | ~200ms |
| 100,000 | ❌ CRASH | ~300ms |

### Required Fixes for Phase 3E
1. Implement server-side pagination (LIMIT/OFFSET or cursor)
2. Add composite indexes for filter combinations
3. Create materialized views for artist stats
4. Implement virtualized list rendering
5. Lazy load images with blur placeholders
6. Add query result caching (SWR/React Query)
7. Defer availability checking until artist detail view
8. Implement search with proper indexing

---

## N. Performance Audit

### Bundle Size Analysis

**Heavy Dependencies**:
```json
{
  "@tensorflow/tfjs": "^4.22.0",        // ~500KB gzipped
  "@mediapipe/camera_utils": "^0.3.x",  // ~300KB
  "@mediapipe/face_mesh": "^0.4.x",     // ~800KB
  "three": "^0.169.0",                  // ~600KB
  "@mediapipe/pose": "^0.5.x"           // ~400KB
}
```

**Total ML/AR bundle**: ~2.6MB+ gzipped

### Code Splitting Status
- ❌ No route-based code splitting
- ❌ ML libraries loaded in main bundle
- ❌ AR components not lazy-loaded
- ❌ Dashboard screens not separated
- ✅ Vite build configured but not optimized

### Image Loading
- ❌ No next/image equivalent (using standard <img>)
- ❌ No automatic WebP conversion
- ❌ No responsive image srcset
- ❌ No lazy loading attribute
- ❌ Portfolio images load full resolution

### API/Database Queries
- ❌ No query batching
- ❌ No request deduplication
- ❌ No optimistic updates
- ❌ No background refetching strategy
- ⚠️ SWR available but not consistently used

### React Performance
- ⚠️ Some components re-render unnecessarily
- ❌ No useMemo/useCallback optimization
- ❌ Large component trees without memoization
- ⚠️ Zustand global state causes re-renders

### Recommended Optimizations
1. Lazy load ML/AR libraries only when needed
2. Implement route-based code splitting
3. Add image optimization pipeline
4. Use React.memo for pure components
5. Implement query caching with SWR
6. Add virtual scrolling for long lists
7. Optimize bundle with tree-shaking
8. Add service worker for offline caching

---

## O. Code Quality Audit

### TypeScript Issues

**Unsafe `any` Usage** (found in multiple files):
```typescript
// hooks/use-booking.ts
const ratings = artist.reviews?.map((r: any) => r.rating)

// hooks/useArtistReviews.ts
const transformedReviews: ArtistReview[] = reviewsData?.map((review: any) => ...)
```

**Missing Type Definitions**:
- ❌ API response types not fully defined
- ❌ Event handler types sometimes omitted
- ❌ Some utility functions return `any`

### Dead Code Identified

**Deprecated Directory**:
```
/deprecated/
├── ArtistProfileScreen.tsx
├── booking-screen.tsx
├── my-bookings/
└── artists/
```

**Next.js Remnants**:
```
/app/
├── layout.tsx
├── page.tsx
├── providers.tsx
└── (main)/
```

**Unused SQL Files** (root directory):
- CHECK_RELATIONSHIPS_SQL.sql
- CORRECTED_INVENTORY_SQL.sql
- FIX_ALL_ERRORS.sql
- Multiple debug/diagnostic SQL files

### Console Logs
⚠️ Multiple `console.log()` statements in production code
⚠️ `console.error()` used but errors not always handled

### TODOs/FIXMEs
Need to search for:
- TODO comments
- FIXME comments
- HACK comments
- XXX comments

### Duplicate Logic
- ⚠️ Rating calculation duplicated in multiple hooks
- ⚠️ Artist fetching logic similar across hooks
- ⚠️ Date/time formatting not centralized

### Error Handling Inconsistency
- ✅ Some hooks use try-catch properly
- ❌ Some async operations lack error handling
- ❌ User-facing error messages sometimes technical
- ❌ No centralized error reporting

---

## P. Deprecated / Duplicate Files

### Files Safe to Archive

#### Next.js Legacy (DO NOT USE)
```
/app/ (entire directory)
├── layout.tsx
├── page.tsx
├── providers.tsx
└── (main)/
next.config.mjs
```

#### Deprecated Screens
```
/deprecated/ (entire directory)
├── ArtistProfileScreen.tsx
├── booking-screen.tsx
├── my-bookings/page.tsx
└── artists/
```

#### Debug/Diagnostic SQL (Root Directory)
```
CHECK_RELATIONSHIPS_SQL.sql
CHECK_SELLERS_TABLE.sql
COMPREHENSIVE_SELLER_ANALYSIS.sql
CORRECTED_INVENTORY_SQL.sql
CORRECTED_SELLER_DATABASE_FIX.sql
CRITICAL_SELLER_DATABASE_FIX.sql
ERROR_CHECKING_SQL.sql
FINAL_CORRECTED_INVENTORY_SQL.sql
FIX_ALL_ERRORS.sql
MINIMAL_SELLER_DATABASE_FIX.sql
PRODUCTION_INVENTORY_SQL.sql
SAFE_MINIMAL_SQL.sql
TARGETED_INVENTORY_SQL.sql
ULTIMATE_CORRECTED_INVENTORY_SQL.sql
```

#### Backend Diagnostic Files
```
backend/database_diagnostic.sql
backend/database_diagnostic_fixed.sql
backend/fix_beard_active_status.sql
backend/fix_wallet_schema.sql
backend/migration_safe_schema.sql
backend/migration_safe_schema_final.sql
backend/migration_safe_schema_fixed.sql
backend/minimal_safe_migration.sql
backend/simple_main.py
backend/simple_server.py
backend/stable-dusion-server.py
backend/start_server.py
```

#### PowerShell Scripts (Windows-specific)
```
create_fix.ps1
fix_jsx.ps1
fix_jsx_v2.ps1
fix_jsx_v3.ps1
```

#### Redundant Schema Files
```
supabase_schema.sql
creator_hub_schema.sql
backend/current_schema.sql
backend/global_data_flow_schema.sql
database/init.sql
```

### Files Still Referenced (CANNOT DELETE)
- `/workspace/src/screens/ArtistDetailScreen.tsx` - Core booking flow
- `/workspace/hooks/use-booking.ts` - Active booking hooks
- `/workspace/src/hooks/useArtistReviews.ts` - Active reviews hook
- `/workspace/supabase/migrations/*.sql` - Production migrations
- `/workspace/backend/main.py` - Active FastAPI server
- `/workspace/backend/supabase_functions.sql` - Database functions

---

## Q. Critical Risks Summary

### CRITICAL (Fix Immediately)
1. 🔴 **Reviews system vulnerable to fake reviews** - No booking verification
2. 🔴 **No marketplace revenue protection** - Easy off-platform bypass
3. 🔴 **Artist discovery loads all artists** - Will crash at scale
4. 🔴 **Contact information publicly exposed** - Enables bypass
5. 🔴 **No duplicate review prevention** - Reputation manipulation possible

### HIGH (Fix This Week)
6. 🟠 **Missing RLS policies on reviews** - Unauthorized modifications possible
7. 🟠 **No content filtering for contact info** - Phone/email/UPI leakage
8. 🟠 **No verified booking indicator** - Trust signals weak
9. 🟠 **No artist trust metrics** - Hard to identify quality artists
10. 🟠 **Framework confusion (Vite vs Next.js)** - Deployment risks

### MEDIUM (Fix This Month)
11. 🟡 **No in-platform messaging** - Forces external contact exchange
12. 🟡 **No portfolio validation** - Arbitrary image URLs allowed
13. 🟡 **No risk event tracking** - Cannot detect abuse patterns
14. 🟡 **Missing database indexes** - Query performance degrades
15. 🟡 **No image optimization** - Slow loading, high bandwidth

### LOW (Improve When Possible)
16. ⚪ **Accessibility gaps** - WCAG compliance incomplete
17. ⚪ **Bundle size too large** - ML libraries block initial load
18. ⚪ **No analytics tracking** - Cannot measure user behavior
19. ⚪ **Inconsistent error messages** - Poor UX
20. ⚪ **No automated tests** - Regression risks

---

## R. High Priority Fixes (Phase 3A)

### 1. Verified Booking Review System
**Files to Modify**:
- `supabase/migrations/20260812000000_phase3a_reviews_trust.sql` (NEW)
- `src/hooks/useArtistReviews.ts` (update)
- `src/screens/ArtistDetailScreen.tsx` (add verified indicator)

**Changes**:
- Add UNIQUE constraint on booking_id
- Add is_verified column with trigger to set based on booking status
- Create secure create_review RPC with validation
- Add RLS policies preventing fake reviews
- Update UI to show verified badge

**Risk**: LOW (additive changes, backward compatible)

### 2. Artist Trust Signals
**Files to Modify**:
- `backend/supabase_functions.sql` (add trust score function)
- `hooks/use-booking.ts` (add trust metrics to artist profile)
- `src/screens/ArtistDetailScreen.tsx` (display trust signals)

**Changes**:
- Calculate completed_bookings count
- Calculate cancellation_rate
- Calculate response_rate (if messaging exists)
- Display trust badges on profile
- Show real metrics only (no fake numbers)

**Risk**: LOW (read-only calculations)

### 3. Contact Information Protection
**Files to Modify**:
- `src/lib/content-safety.ts` (NEW utility)
- `backend/main.py` (add content validation endpoint)
- `src/screens/ProfileScreen.tsx` (add validation on save)
- `src/screens/ArtistDetailScreen.tsx` (mask detected contact info)

**Changes**:
- Regex patterns for phone/email/UPI/external links
- Warning UI for artists attempting to share contact info
- Server-side validation before save
- Masking/redaction for public display
- Risk event logging

**Risk**: MEDIUM (may block legitimate content - need careful testing)

### 4. Portfolio Protection
**Files to Modify**:
- `src/components/PortfolioUpload.tsx` (NEW or update)
- `backend/main.py` (add upload validation)
- `supabase/migrations/...` (add portfolio table if missing)

**Changes**:
- File type validation (JPEG, PNG, WebP only)
- File size limits (max 5MB)
- Generate thumbnails
- Add watermark overlay
- Lazy load images
- Prevent arbitrary external URLs

**Risk**: LOW (improves security, minimal breaking changes)

### 5. RLS Policy Updates
**Files to Modify**:
- `supabase/migrations/20260812000001_phase3a_rls_updates.sql` (NEW)

**Changes**:
- Add reviews INSERT policy with booking ownership check
- Add reviews UPDATE/DELETE policy (author only)
- Strengthen profiles UPDATE policy (prevent self-verification)
- Add artist_services DELETE policy (check for active bookings)

**Risk**: HIGH (must test thoroughly to avoid locking out legitimate users)

---

## S. Medium Priority Fixes (Phase 3B-3G)

### Phase 3B: Discovery + Personalization
- Implement server-side pagination
- Add cursor-based navigation
- Create artist ranking algorithm
- Build preference learning system
- Add "Recommended For You" section

### Phase 3C: Add-ons + Travel Intelligence
- Create add_ons table
- Update booking RPC to include add-ons
- Implement distance-based travel fees
- Add service duration buffering
- Create smart availability system

### Phase 3D: Retention + Favorites
- Create customer_favorites table
- Add "Book Again" flow
- Implement rebooking recommendations
- Build booking history view
- Add artist performance dashboard

### Phase 3E: 100k+ Artist Scalability
- Add composite database indexes
- Create materialized views for stats
- Implement virtualized lists
- Add image CDN/lazy loading
- Optimize bundle splitting

### Phase 3F: Performance Optimization
- Lazy load ML/AR libraries
- Implement route-based code splitting
- Add service worker caching
- Optimize image pipeline
- Reduce bundle size

### Phase 3G: Admin/Moderation Foundation
- Create admin_roles table
- Build moderation queue
- Add user reporting system
- Create verification workflow
- Implement refund review process

---

## T. Recommended Implementation Order

### SAFE TO IMPLEMENT FIRST (Low Risk)
1. ✅ Verified booking review system (additive, backward compatible)
2. ✅ Artist trust signals (read-only calculations)
3. ✅ Content safety warnings (UX improvement)
4. ✅ Portfolio upload validation (security improvement)
5. ✅ Database indexes (performance improvement)

### IMPLEMENT WITH CAUTION (Medium Risk)
6. ⚠️ RLS policy updates (test thoroughly)
7. ⚠️ Content masking/redaction (avoid false positives)
8. ⚠️ Review creation RPC (validate all edge cases)
9. ⚠️ Risk event logging (privacy considerations)

### REQUIRES CAREFUL PLANNING (High Risk)
10. 🔴 Pagination implementation (breaking change for existing UI)
11. 🔴 Bundle splitting (requires extensive testing)
12. 🔴 Database schema changes for add-ons/travel
13. 🔴 In-platform messaging (new feature complexity)
14. 🔴 Payment/commission tracking (financial accuracy critical)

---

## U. Files That Must NOT Be Changed Yet

### DO NOT TOUCH (Until Dependencies Understood)
```
/workspace/hooks/use-booking.ts          # Core booking logic (Phase 2 stable)
/workspace/backend/main.py               # FastAPI server (needs audit)
/workspace/backend/supabase_functions.sql # Database functions (needs audit)
/src/store/auth-store.ts                 # Authentication state
/src/App.tsx                             # Main app component (just fixed)
/supabase/migrations/*_phase2*.sql       # Phase 2 migrations (stable)
```

### REQUIRE MIGRATION PLAN
```
reviews table schema                     # Need careful constraint addition
profiles table                           # Core user data
bookings table                           # Financial records
artist_services table                    # Pricing data
RLS policies                             # Security-critical
```

---

## V. Next Recommended Step

**PHASE 3A IMPLEMENTATION** (This Session)

Implement in this order:
1. Create migration for verified reviews (UNIQUE constraint, is_verified column)
2. Create secure create_review RPC function
3. Add RLS policies for reviews table
4. Update useArtistReviews hook to handle verified status
5. Add verified badge to ArtistDetailScreen
6. Create content-safety utility
7. Add basic contact info detection
8. Test all scenarios

**Estimated Time**: 2-3 hours  
**Risk Level**: LOW-MEDIUM  
**Rollback Plan**: Migration can be reversed, RPC can be dropped

---

## W. Conclusion

MITHAS GLOW has a solid foundation with Phase 1 and Phase 2 fixes complete. The booking system is now secure against price manipulation and double-booking. However, critical gaps remain in:

1. **Review system trustworthiness** - Fake reviews possible
2. **Marketplace revenue protection** - Off-platform bypass trivial
3. **Scalability** - Will fail at 10k+ artists without pagination
4. **Artist quality signals** - Hard to identify top performers

Phase 3A addresses the first two critical gaps with minimal risk. Subsequent phases will address scalability and differentiation features.

**Key Success Metric**: Make it harder to bypass MITHAS GLOW than to use it legitimately, while maintaining excellent UX for honest users.
