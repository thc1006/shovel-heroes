@echo off
echo Shovel Heroes - Dependency Installation Script
echo =============================================
echo.

echo Step 1: Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 20+ first.
    exit /b 1
)

echo.
echo Step 2: Installing dependencies with legacy peer deps...
npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Installation failed. Trying with force flag...
    npm install --legacy-peer-deps --force
)

echo.
echo Step 3: Installation complete!
echo.
echo Next steps:
echo - Run "npm run test" to verify test setup
echo - Run "npm run openapi:lint" to validate API spec
echo - Run "npm run dev" to start development server
echo.
pause
