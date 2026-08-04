# 🔄 Restart Required After Editing .env.local

## ⚠️ Important: Environment Variables Need Server Restart

If you've edited your `.env.local` file but still see warnings, you need to **restart your development server**.

---

## 🚀 How to Restart

### **Step 1: Stop the Dev Server**

Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac) in your terminal

### **Step 2: Start the Dev Server**

```bash
npm run dev
```

### **Step 3: Refresh the Browser**

Hard refresh your browser:
- **Windows/Linux:** `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

---

## 🔍 Check If It Worked

### **Look for these signs:**

✅ **Orange warning banner disappears**
✅ **Diagnostics panel (bottom right) shows green checkmarks**
✅ **Console shows:** "✅ Supabase is configured and ready"
✅ **No more warning messages**

---

## 📊 Use the Diagnostics Panel

**Look at the bottom-right of your screen** - there's a white panel showing:

- ✅ Overall Status
- ✅ VITE_SUPABASE_URL status
- ✅ VITE_SUPABASE_ANON_KEY status
- ✅ Helpful error messages
- ✅ Step-by-step instructions

This panel will tell you **exactly** what's wrong!

---

## 🐛 Common Issues

### **Issue 1: Still showing "placeholder value"**

**Cause:** You have the template values in .env.local

**Fix:** Make sure your `.env.local` looks like this:

```bash
# WRONG - Placeholder values
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# RIGHT - Real values
VITE_SUPABASE_URL=https://abcdefghijk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### **Issue 2: "Not set" in diagnostics panel**

**Cause:** Environment file isn't being loaded

**Fix:**
1. Check file is named `.env.local` (with the dot!)
2. Check it's in the root directory (next to package.json)
3. Restart dev server
4. Try renaming to `.env` temporarily (not recommended for production)

---

### **Issue 3: Values correct but still not working**

**Cause:** Server hasn't restarted since editing

**Fix:**
1. Stop server completely (Ctrl+C)
2. Wait 2 seconds
3. Start again: `npm run dev`
4. Hard refresh browser

---

### **Issue 4: Can't find .env.local file**

**Cause:** File is hidden or doesn't exist

**Fix:**

**Create the file manually:**

1. In your project root directory
2. Create a new file named `.env.local`
3. Add your credentials:

```bash
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

4. Save
5. Restart server

---

## ✅ Verification Checklist

Run through this checklist:

- [ ] .env.local file exists in project root
- [ ] File has correct name (starts with dot)
- [ ] Values are NOT placeholders
- [ ] Values are copied correctly from Supabase
- [ ] No extra quotes around values
- [ ] No spaces before/after equals sign
- [ ] Dev server was restarted AFTER editing
- [ ] Browser was hard refreshed

---

## 🎯 Quick Verification

**Check the diagnostics panel shows:**

```
✅ Overall Status: ✅ Supabase is configured and ready
✅ VITE_SUPABASE_URL: https://yourproject.supabase.co...
✅ VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1N...
```

If you see red X marks, click "Show Debug Info" for more details.

---

## 🆘 Still Having Issues?

### **Try This:**

1. **Check your .env.local format:**
   ```bash
   # Make sure it looks EXACTLY like this (no quotes!)
   VITE_SUPABASE_URL=https://xyzabc.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emFiYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc...
   ```

2. **Verify in Supabase Dashboard:**
   - Go to Settings → API
   - Copy **Project URL** (NOT Service URL)
   - Copy **anon public** key (NOT service_role key)

3. **Test with console:**
   - Open browser console (F12)
   - Type: `import.meta.env.VITE_SUPABASE_URL`
   - Should show your URL (not undefined)

4. **Complete restart:**
   ```bash
   # Kill any Node processes
   # Close terminal
   # Open new terminal
   npm run dev
   ```

---

## 📖 Related Docs

- **ENV_SETUP_INSTRUCTIONS.md** - How to get Supabase credentials
- **QUICK_START.md** - Complete setup guide
- **ERRORS_FIXED.md** - What errors were fixed
- **SUPABASE_SETUP_GUIDE.md** - Detailed Supabase setup

---

## 💡 Pro Tip

The **diagnostics panel at the bottom-right** of your screen is your best friend! It shows:

- ✅ What's working
- ❌ What's broken
- 📋 How to fix it
- 🔍 Debug information

Just look there first - it will tell you exactly what to do!

---

**Remember:** Environment variables only load when the server starts. Always restart after editing .env.local! 🔄
