@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  TimeSlot — build, stage and zip for production deployment
::  Output: timeslot-deploy-YYYYMMDD-HHMMSS.zip
:: ============================================================

set ROOT=%~dp0
set FRONTEND=%ROOT%frontend
set BACKEND=%ROOT%backend
set STAGE=%ROOT%_stage
set STAGE_BE=%STAGE%\backend
set STAGE_FE=%STAGE%\frontend

:: Timestamp for the zip name
for /f "tokens=1-3 delims=/" %%a in ("%DATE%") do (
  set MM=%%a& set DD=%%b& set YYYY=%%c
)
for /f "tokens=1-3 delims=:." %%a in ("%TIME: =0%") do (
  set HH=%%a& set MIN=%%b& set SS=%%c
)
set STAMP=%YYYY%%MM%%DD%-%HH%%MIN%%SS%
set ZIPNAME=timeslot-deploy-%STAMP%.zip
set ZIPPATH=%ROOT%%ZIPNAME%

echo.
echo ============================================================
echo  TimeSlot production build
echo ============================================================
echo.

:: ── 1. Clean any previous staging area ──────────────────────
if exist "%STAGE%" (
  echo [1/5] Cleaning previous staging area...
  rmdir /s /q "%STAGE%"
)
echo [1/5] Staging area clean.

:: ── 2. Build frontend ────────────────────────────────────────
echo.
echo [2/5] Installing frontend dependencies...
cd /d "%FRONTEND%"
call npm install --silent
if errorlevel 1 ( echo ERROR: npm install failed for frontend & exit /b 1 )

echo [2/5] Building frontend...
call npm run build
if errorlevel 1 ( echo ERROR: frontend build failed & exit /b 1 )
echo [2/5] Frontend build complete.

:: ── 3. Stage backend files ───────────────────────────────────
echo.
echo [3/5] Staging backend files...
mkdir "%STAGE_BE%\routes"
mkdir "%STAGE_BE%\middleware"
mkdir "%STAGE_BE%\utils"

copy /y "%BACKEND%\server.js"    "%STAGE_BE%\" >nul
copy /y "%BACKEND%\db.js"        "%STAGE_BE%\" >nul
copy /y "%BACKEND%\email.js"     "%STAGE_BE%\" >nul
copy /y "%BACKEND%\package.json" "%STAGE_BE%\" >nul
copy /y "%BACKEND%\package-lock.json" "%STAGE_BE%\" >nul 2>&1

copy /y "%BACKEND%\routes\auth.js"         "%STAGE_BE%\routes\" >nul
copy /y "%BACKEND%\routes\tools.js"        "%STAGE_BE%\routes\" >nul
copy /y "%BACKEND%\routes\reservations.js" "%STAGE_BE%\routes\" >nul
copy /y "%BACKEND%\routes\users.js"        "%STAGE_BE%\routes\" >nul

copy /y "%BACKEND%\middleware\auth.js"     "%STAGE_BE%\middleware\" >nul

copy /y "%BACKEND%\utils\sanitize.js"      "%STAGE_BE%\utils\" >nul
copy /y "%BACKEND%\ecosystem.config.js"   "%STAGE_BE%\" >nul

:: ── 4. (skipped) node_modules are NOT bundled — better-sqlite3 ──
::     contains a native binary that must be compiled on the target
::     OS. Run "npm install --omit=dev" on the server after upload.
echo [3/5] Backend files staged.
echo [4/5] Skipping node_modules (native deps must be built on server).

:: ── 5. Stage frontend dist ───────────────────────────────────
echo.
echo [5/5] Staging frontend dist...
mkdir "%STAGE_FE%\dist"
xcopy /e /i /q "%FRONTEND%\dist" "%STAGE_FE%\dist" >nul
echo [5/5] Frontend dist staged.

:: ── 6. Zip the staging area ──────────────────────────────────
echo.
echo [6/6] Creating archive %ZIPNAME%...
if exist "%ZIPPATH%" del /q "%ZIPPATH%"

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%ZIPPATH%' -CompressionLevel Optimal"
if errorlevel 1 ( echo ERROR: zip failed & exit /b 1 )

:: ── Cleanup staging area ─────────────────────────────────────
rmdir /s /q "%STAGE%"

echo.
echo ============================================================
echo  Done: %ZIPNAME%
echo.
echo  Deploy instructions:
echo    1. Upload %ZIPNAME% to your server
echo    2. Unzip — produces backend\ and frontend\ folders
echo    3. On the server:
echo         sudo apt install -y build-essential python3   (Ubuntu/Debian)
echo         cd backend ^&^& npm install --omit=dev
echo    4. Edit backend/ecosystem.config.js:
echo         - Set JWT_SECRET to a long random string
echo         - Set PORT if not using 3000
echo         - Fill in SMTP_* values if email is needed
echo    5. pm2 start backend/ecosystem.config.js --env production
echo         pm2 save ^&^& pm2 startup
echo ============================================================
echo.

endlocal
