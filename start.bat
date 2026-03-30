@echo off
echo Starting TimeSlot...
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
start "TimeSlot Backend" cmd /k "cd backend && npm start"
timeout /t 2 /nobreak >nul
start "TimeSlot Frontend" cmd /k "cd frontend && npm run dev"
