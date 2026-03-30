@echo off
cd backend_node
echo Installing dependencies...
call npm install
echo.
echo Initializing Database...
node scripts/init_db.js
echo.
pause
