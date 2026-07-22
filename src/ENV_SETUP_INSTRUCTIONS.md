# 🔧 Environment Setup Instructions

**You're seeing the "Supabase Not Configured" warning because your `.env.local` file needs real credentials.**

---

## ⚡ Quick Fix (2 minutes)

### Option 1: Set Up Supabase (Recommended)

1. **Go to [supabase.com](https://supabase.com)** and create a free account
2. **Create a new project**:
   - Project name: `mithas-glow`
   - Database password: Generate and save it
   - Region: Choose closest to you
3. **Wait 2 minutes** for project setup
4. **Get your API keys**:
   - Go to Settings → API
   - Copy **Project URL**
   - Copy **anon public** key
5. **Update `.env.local`**:
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
6. **Restart your dev server**:
   ```bash
   npm run dev
   ```

### Option 2: Continue Without Supabase (Demo Mode)

The app will work in demo mode, but authentication features won't function:
- ✅ UI works normally
- ✅ Can navigate all screens
- ❌ Can't create accounts
- ❌ Can't log in
- ❌ No data persistence

**Just click the orange banner's "Setup Guide" button when you're ready to add real auth!**

---

## 📚 Full Setup Guide

For complete instructions, see:
- **Quick Start:** `QUICK_START.md` (15 minutes)
- **Complete Guide:** `SUPABASE_SETUP_GUIDE.md` (30 minutes)

---

## ✅ How to Verify It's Working

Once you've added your credentials:

1. **Restart dev server** (`npm run dev`)
2. **Orange warning banner should disappear**
3. **Console should show**: "✅ Supabase is configured and ready"
4. **Test registration**: Create a test account
5. **Check Supabase dashboard**: User should appear

---

## 🐛 Still Seeing the Warning?

### Common Issues:

**1. File name is wrong**
```bash
# Should be .env.local (not .env or env.local)
ls -la .env.local
```

**2. Restart needed**
```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

**3. Wrong values**
```bash
# Make sure you copied:
# - Project URL (not service URL)
# - anon key (not service_role key)
```

**4. Extra spaces**
```bash
# Don't add quotes or spaces:
# WRONG: VITE_SUPABASE_URL = "https://..."
# RIGHT: VITE_SUPABASE_URL=https://...
```

---

## 🎯 What Each Variable Does

```bash
# Your Supabase project URL
VITE_SUPABASE_URL=https://xxxxx.supabase.co

# Public API key (safe to use in browser)
VITE_SUPABASE_ANON_KEY=eyJhbG...

# App configuration
VITE_APP_ENV=development
VITE_APP_NAME="MITHAS Glow"
VITE_APP_URL=http://localhost:5173
```

---

**Need help? Check `QUICK_START.md` or the troubleshooting section in `SUPABASE_SETUP_GUIDE.md`**
