@echo off
cd backend_node
echo Installing dependencies (if missing)...
call npm install
echo.
echo Starting Node.js Server (MongoDB)...
node server.js
pause
