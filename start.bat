@echo off
echo Installing dependencies...
call npm install

echo Starting the application...
node server.js
