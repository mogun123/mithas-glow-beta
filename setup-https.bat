@echo off
echo 🔒 Setting up HTTPS for Mobile Camera Testing...
echo.

REM Check if mkcert is installed
mkcert --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ mkcert not found. Installing...
    npm install -g mkcert
)

REM Install local CA
echo 📋 Installing local Certificate Authority...
mkcert -install

REM Generate certificates for localhost
echo 🔑 Generating SSL certificates...
mkcert localhost 127.0.0.1 ::1

REM Rename certificates
echo 📁 Moving certificates to project root...
mv localhost+2.pem localhost.pem
mv localhost+2-key.pem localhost-key.pem

echo.
echo ✅ HTTPS Setup Complete!
echo.
echo 🚀 Now run: npm run dev:https
echo 📱 Open https://localhost:5173 on your mobile device
echo.
pause
