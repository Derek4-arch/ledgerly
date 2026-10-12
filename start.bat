@echo off
setlocal
title Ledgerly
cd /d "%~dp0"
set "PORT=8080"
set "NODE="
where node >nul 2>nul
if %errorlevel%==0 set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe"
if not defined NODE goto nonode
echo Starting Ledgerly on http://localhost:%PORT% ...
"%NODE%" serve.js %PORT% --open
if errorlevel 1 pause
goto :eof

:nonode
echo.
echo  Node.js was not found, so Ledgerly will open straight from the file instead.
echo  Everything works this way. Install and offline mode need start.bat with Node.js
echo  (free from https://nodejs.org).
echo.
start "" "%~dp0index.html"
pause
