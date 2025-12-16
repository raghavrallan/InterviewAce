@echo off
echo ========================================
echo    InterviewAce - Starting Application
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/2] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    call npm run install:all
)

echo.
echo [2/2] Starting InterviewAce...
echo.
echo ========================================
echo   Starting Backend and Electron App
echo ========================================
echo.
echo The Electron window will open shortly...
echo Only the Electron app will be visible!
echo.
echo Press Ctrl+C to stop all services
echo ========================================

npm run dev
