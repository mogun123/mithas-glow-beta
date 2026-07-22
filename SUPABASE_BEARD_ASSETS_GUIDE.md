# 🚀 Supabase Beard Assets Setup Guide

## 📋 Overview

This guide explains how to set up Supabase to store and serve beard GLB assets for the AR beard try-on feature.

---

## 🔧 Step 1: Create Beard Styles Table

### Option A: Using Supabase Dashboard (SQL Editor)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `bqfbxyigvhfxwojfwzfg`
3. Navigate to **SQL Editor** in the left sidebar
4. Paste and run the following SQL:

```sql
-- Create beard_styles table
CREATE TABLE IF NOT EXISTS public.beard_styles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  style_name TEXT,
  category TEXT CHECK (category IN ('stubble', 'full', 'goatee', 'trimmed', 'mustache', 'sideburns')),
  density_level INTEGER CHECK (density_level BETWEEN 1 AND 5) DEFAULT 3,
  tone TEXT CHECK (tone IN ('light', 'medium', 'dark')) DEFAULT 'medium',
  
  -- GLB Model URL (from Supabase Storage)
  model_3d_url TEXT NOT NULL,
  
  -- Texture URLs (from Supabase Storage)
  alpha_mask_url TEXT,
  density_map_url TEXT,
  strand_map_url TEXT,
  beard_texture_url TEXT,
  normal_map_url TEXT,
  occlusion_url TEXT,
  
  -- Thumbnail image
  thumbnail_url TEXT,
  image_url TEXT,
  
  -- Metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  style_type TEXT,
  premium BOOLEAN DEFAULT FALSE,
  weighted_score DECIMAL(3,2) DEFAULT 0.5,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_beard_styles_category ON public.beard_styles(category);
CREATE INDEX IF NOT EXISTS idx_beard_styles_premium ON public.beard_styles(premium);
CREATE INDEX IF NOT EXISTS idx_beard_styles_score ON public.beard_styles(weighted_score DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.beard_styles ENABLE ROW LEVEL SECURITY;

-- Allow public read access (beard styles are public assets)
CREATE POLICY "Allow public read access to beard_styles"
  ON public.beard_styles FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert (for admin uploads)
CREATE POLICY "Allow authenticated insert to beard_styles"
  ON public.beard_styles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update (for admin updates)
CREATE POLICY "Allow authenticated update to beard_styles"
  ON public.beard_styles FOR UPDATE
  TO authenticated
  USING (true);
```

---

## 📦 Step 2: Set Up Supabase Storage for GLB Files

### 2.1 Create Storage Bucket

1. In Supabase Dashboard, navigate to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Name it: `beard-assets`
4. Make it **Public** (check "Public bucket")
5. Click **"Create bucket"**

### 2.2 Configure Bucket Policies

Click on the `beard-assets` bucket, then go to **Policies** tab and add:

```sql
-- Allow public read access to beard assets
CREATE POLICY "Allow public read access to beard-assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'beard-assets');

-- Allow authenticated users to upload beard assets
CREATE POLICY "Allow authenticated upload to beard-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'beard-assets');

-- Allow authenticated users to delete beard assets
CREATE POLICY "Allow authenticated delete from beard-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'beard-assets');
```

---

## 📤 Step 3: Upload Beard GLB Files

### 3.1 Prepare Your GLB Files

Ensure your beard GLB files are:
- **Format**: `.glb` (GLTF Binary)
- **Size**: Under 10MB for web performance
- **Optimized**: Compressed with Draco or similar if needed
- **Named**: Descriptive names like `light-stubble.glb`, `full-beard.glb`

### 3.2 Upload via Supabase Dashboard

1. Navigate to **Storage** → **beard-assets** bucket
2. Click **"Upload"** button
3. Select your GLB files
4. Upload them to the bucket

### 3.3 Upload Texture Files

Upload texture files (PNG/JPG) with consistent naming:
- `light-stubble-albedo.png` (color texture)
- `light-stubble-alpha.png` (mask)
- `light-stubble-density.png` (density map)
- `light-stubble-strand.png` (strand map)
- `light-stubble-normal.png` (normal map)

---

## 🔗 Step 4: Get Public URLs

### 4.1 Find Your Supabase Project URL

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy your **Project URL** (e.g., `https://bqfbxyigvhfxwojfwzfg.supabase.co`)

### 4.2 Construct Public URLs

Supabase Storage public URLs follow this pattern:

```
https://<project-url>/storage/v1/object/public/<bucket-name>/<file-path>
```

**Example**:
```
https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble.glb
```

### 4.3 Get URLs Programmatically (Optional)

If you want to get URLs dynamically, use the Supabase JS client:

```typescript
import { supabase } from './lib/supabase';

const { data } = supabase
  .storage
  .from('beard-assets')
  .getPublicUrl('light-stubble.glb');

console.log(data.publicUrl);
// Output: https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble.glb
```

---

## 📝 Step 5: Insert Beard Styles into Database

### 5.1 Via Supabase Dashboard (Table Editor)

1. Navigate to **Table Editor** → **beard_styles**
2. Click **"Insert row"**
3. Fill in the fields:
   - `name`: "Light Stubble"
   - `category`: "stubble"
   - `density_level`: 2
   - `tone`: "medium"
   - `model_3d_url`: `https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble.glb`
   - `alpha_mask_url`: `https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-alpha.png`
   - (other texture URLs...)
   - `thumbnail_url`: `https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stumbnail.png`
   - `premium`: false
   - `weighted_score`: 0.85
4. Click **"Save"**

### 5.2 Via SQL Editor

```sql
INSERT INTO public.beard_styles (
  name,
  style_name,
  category,
  density_level,
  tone,
  model_3d_url,
  alpha_mask_url,
  density_map_url,
  strand_map_url,
  beard_texture_url,
  normal_map_url,
  thumbnail_url,
  premium,
  weighted_score
) VALUES (
  'Light Stubble',
  'Light Stubble',
  'stubble',
  2,
  'medium',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble.glb',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-alpha.png',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-density.png',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-strand.png',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-albedo.png',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-normal.png',
  'https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble-thumbnail.png',
  false,
  0.85
);
```

---

## 🔌 Step 6: Update Backend to Query Supabase

### 6.1 Update `backend/app/api/beard_engine.py`

Replace the mock data with Supabase query:

```python
from fastapi import APIRouter, HTTPException
from typing import Dict, List, Optional
from pydantic import BaseModel
import os
from supabase import create_client, Client

router = APIRouter(prefix="/api/ai/beard", tags=["Beard Intelligence"])

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "https://bqfbxyigvhfxwojfwzfg.supabase.co")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "your-anon-key-here")
supabase: Client = create_client(supabase_url, supabase_key)

@router.post("/recommendation", response_model=BeardRecommendationResponse)
async def recommend_beard_styles(request: BeardRecommendationRequest):
    """
    Generate personalized beard recommendations from Supabase database
    """
    import time
    start_time = time.time()
    
    try:
        # Query beard styles from Supabase
        response = supabase.table('beard_styles').select('*').execute()
        
        if not response.data:
            return {
                "styles": [],
                "total_candidates": 0,
                "processing_time_ms": 0,
                "recommendation_confidence": 0.0
            }
        
        # Apply scoring logic (same as before)
        face_geometry = request.faceGeometry
        user_context = request.userContext
        face_shape = face_geometry.get("faceShape", "oval")
        occasion = user_context.get("occasion", "casual")
        
        scored_styles = []
        for style in response.data:
            score = style.get("weighted_score", 0.5)
            
            # Adjust score based on face shape and occasion
            if face_shape == "round" and style["category"] in ["goatee", "stubble"]:
                score += 0.1
            elif face_shape == "square" and style["category"] in ["full", "stubble"]:
                score += 0.1
            elif face_shape == "oval" and style["category"] in ["full", "goatee"]:
                score += 0.1
            
            if occasion == "office" and style["category"] in ["stubble", "trimmed"]:
                score += 0.15
            elif occasion == "party" and style["category"] in ["full", "goatee"]:
                score += 0.15
            
            if user_context.get("premiumUser", False) and style.get("premium"):
                score += 0.2
            
            scored_styles.append({**style, "weighted_score": min(score, 1.0)})
        
        scored_styles.sort(key=lambda x: x["weighted_score"], reverse=True)
        top_styles = scored_styles[:5]
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "styles": top_styles,
            "total_candidates": len(response.data),
            "processing_time_ms": processing_time,
            "recommendation_confidence": top_styles[0]["weighted_score"] if top_styles else 0.0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Beard recommendation failed: {str(e)}")

@router.get("/styles")
async def get_all_beard_styles():
    """
    Get all beard styles from Supabase for carousel
    """
    try:
        response = supabase.table('beard_styles').select('*').execute()
        return {
            "styles": response.data,
            "total": len(response.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch beard styles: {str(e)}")
```

### 6.2 Add Environment Variables

Create or update `.env` file in backend directory:

```env
SUPABASE_URL=https://bqfbxyigvhfxwojfwzfg.supabase.co
SUPABASE_ANON_KEY=your-anon-key-from-supabase-dashboard
```

Get your anon key from:
- Supabase Dashboard → Settings → API → anon public key

### 6.3 Install Supabase Python Client

```bash
cd backend
pip install supabase
```

---

## ✅ Step 7: Verify Setup

### 7.1 Test Database Query

In Supabase SQL Editor, run:

```sql
SELECT * FROM public.beard_styles LIMIT 5;
```

### 7.2 Test API Endpoint

```bash
curl -X POST http://localhost:8000/api/ai/beard/recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "faceGeometry": {
      "jawWidth": 0.5,
      "cheekboneRatio": 0.8,
      "symmetryScore": 0.9,
      "faceShape": "oval",
      "faceShapeConfidence": 0.85
    },
    "userContext": {
      "occasion": "casual",
      "premiumUser": false
    }
  }'
```

### 7.3 Test GLB URL Access

Open the GLB URL in your browser:
```
https://bqfbxyigvhfxwojfwzfg.supabase.co/storage/v1/object/public/beard-assets/light-stubble.glb
```

It should download the GLB file (not show HTML).

---

## 🎯 Summary

1. **Create `beard_styles` table** in Supabase
2. **Create `beard-assets` storage bucket** (public)
3. **Upload GLB and texture files** to storage
4. **Get public URLs** from Supabase Storage
5. **Insert beard styles** into database with URLs
6. **Update backend** to query Supabase instead of mock data
7. **Test the API** to verify everything works

---

## 📞 Troubleshooting

### GLB URL returns 404
- Check file is in correct bucket
- Verify bucket is public
- Check URL spelling

### API returns empty styles
- Verify database has data
- Check RLS policies allow public read
- Check Supabase credentials in .env

### CORS errors
- Add your domain to Supabase CORS settings
- Settings → API → CORS

### Texture files not loading
- Verify texture URLs are correct
- Check files are in storage bucket
- Ensure texture URLs are not empty strings
