#!/bin/bash

echo "🔒 Setting up HTTPS for Mobile Camera Testing..."
echo

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert not found. Installing..."
    npm install -g mkcert
fi

# Install local CA
echo "📋 Installing local Certificate Authority..."
mkcert -install

# Generate certificates for localhost
echo "🔑 Generating SSL certificates..."
mkcert localhost 127.0.0.1 ::1

# Rename certificates
echo "📁 Moving certificates to project root..."
mv localhost+2.pem localhost.pem
mv localhost+2-key.pem localhost-key.pem

echo
echo "✅ HTTPS Setup Complete!"
echo
echo "🚀 Now run: npm run dev:https"
echo "📱 Open https://localhost:5173 on your mobile device"
echo
