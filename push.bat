@echo off
rem ============================================================
rem  push.bat - save this project and upload it to GitHub.
rem  Double-click it and type what you changed,
rem  or run it in a terminal:   push "what you changed"
rem ============================================================
cd /d "%~dp0"
title Push %~dp0

set "msg=%~1"
if "%msg%"=="" set /p "msg=What did you change? (just press Enter for "Update"): "
if "%msg%"=="" set "msg=Update"

echo.
echo === git add .
git add .

echo.
echo === git commit -m "%msg%"
git commit -m "%msg%"
if errorlevel 1 echo (Nothing new to save - uploading anything not pushed yet.)

echo.
echo === git push
git push
if errorlevel 1 (
  echo.
  echo  X  The push didn't go through. Read the message above.
) else (
  echo.
  echo  OK  Done! Your changes are on GitHub.
)

rem keep the window open when it was double-clicked
if "%~1"=="" pause
