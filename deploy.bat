@echo off
chcp 65001 > nul
echo.
echo  ========================================
echo   מעדכן ומעלה את האפליקציה...
echo  ========================================
echo.

cd /d "%~dp0"

echo  [1/3] מוריד עדכונים...
git fetch origin
git reset --hard origin/claude/family-app-planning-KUcbG

echo.
echo  [2/3] בונה...
call npm run build
IF ERRORLEVEL 1 (
  echo  שגיאה בבנייה!
  pause
  exit /b 1
)

echo.
echo  [3/3] מעלה לאינטרנט...
call firebase deploy --only hosting

echo.
echo  ========================================
echo   האתר עודכן! https://famliy-app-planning.web.app
echo  ========================================
pause
