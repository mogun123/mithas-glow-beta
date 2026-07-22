# Mobile Camera HTTPS Setup Guide

## 🔒 Problem
Mobile browsers require HTTPS for camera access. Localhost (http://localhost:3000) works on desktop but fails on mobile with "Access Denied" error.

## 🛠️ Solutions

### Option 1: Local HTTPS Development (Recommended)
```bash
# Install mkcert for local SSL certificates
npm install -g mkcert

# Create and install local CA
mkcert -install

# Generate certificate for localhost
mkcert localhost 127.0.0.1 ::1

# Move certificates to project
mv localhost+2.pem ./localhost.pem
mv localhost+2-key.pem ./localhost-key.pem
```

Update your Next.js config:
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: `https://localhost:3000/:path*`,
      },
    ];
  },
  // Add HTTPS support
  experimental: {
    https: {
      key: './localhost-key.pem',
      cert: './localhost.pem',
    },
  },
};

export default nextConfig;
```

### Option 2: Ngrok Tunnel (Quick Setup)
```bash
# Install ngrok
npm install -g ngrok

# Start your dev server first
npm run dev

# In another terminal, create secure tunnel
ngrok http 3000
```

### Option 3: Cloudflare Tunnel (Free & Fast)
```bash
# Install cloudflared
npm install -g cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:3000
```

## 🚀 Quick Start Commands

### For HTTPS Development:
```bash
# 1. Setup certificates (one-time)
npm run setup-https

# 2. Start dev server with HTTPS
npm run dev:https
```

### For Ngrok:
```bash
# 1. Start dev server
npm run dev

# 2. Start ngrok tunnel
npm run tunnel
```

## 📱 Mobile Testing Steps

1. **Start your preferred solution**
2. **Get the secure URL** (https://localhost:3000 or ngrok URL)
3. **Open on mobile device**
4. **Allow camera permissions** when prompted
5. **Test camera functionality**

## 🔧 Package.json Scripts

Add these scripts to your package.json:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:https": "next dev --experimental-https",
    "setup-https": "mkcert localhost 127.0.0.1 ::1 && mv localhost+2.pem ./localhost.pem && mv localhost+2-key.pem ./localhost-key.pem",
    "tunnel": "ngrok http 3000",
    "tunnel:cloudflare": "cloudflared tunnel --url http://localhost:3000"
  }
}
```

## ⚠️ Important Notes

- **mkcert** requires one-time setup but provides best performance
- **ngrok** is easiest for quick testing
- **Cloudflare** is free and reliable
- All solutions provide HTTPS required for mobile camera access
- Remember to trust the certificate on mobile devices

## 🎯 Recommended Approach

For development, use **Option 1 (Local HTTPS)** as it provides:
- ✅ Fastest performance
- ✅ No external dependencies
- ✅ Works offline
- ✅ Perfect for mobile testing
