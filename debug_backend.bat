@echo off
cd backend_node
echo Installing dependencies...
call npm install
echo.
echo Starting Server...
node server.js
echo.
echo Server stopped. If there is an error above, please take a screenshot.
pause
