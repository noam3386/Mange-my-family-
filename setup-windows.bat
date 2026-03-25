@echo off
chcp 65001 > nul
echo.
echo  ========================================
echo   Family Manager App - Windows Setup
echo  ========================================
echo.

SET PROJECT_ID=famliy-app-planning

:: Check Node.js
node --version > nul 2>&1
IF ERRORLEVEL 1 (
  echo  [!] Node.js לא מותקן!
  echo  הורד מ: https://nodejs.org  ^(לחץ "LTS"^)
  echo  אחרי ההתקנה הרץ שוב את הקובץ הזה
  pause
  exit /b 1
)
echo  [v] Node.js מותקן

:: Check npm
npm --version > nul 2>&1
IF ERRORLEVEL 1 (
  echo  [!] npm לא זמין
  pause
  exit /b 1
)

:: Install Firebase CLI
echo.
echo  [1/5] מתקין Firebase CLI...
call npm install -g firebase-tools --quiet
IF ERRORLEVEL 1 (
  echo  [!] שגיאה בהתקנת Firebase CLI
  pause
  exit /b 1
)
echo  [v] Firebase CLI מותקן

:: Login to Firebase
echo.
echo  [2/5] כניסה ל-Firebase...
echo  יפתח דפדפן - התחבר עם חשבון Google שלך
call firebase login
IF ERRORLEVEL 1 (
  echo  [!] כניסה נכשלה
  pause
  exit /b 1
)

:: Get Firebase config
echo.
echo  [3/5] מוריד הגדרות Firebase...
call firebase apps:sdkconfig WEB --project %PROJECT_ID% > firebase-config-temp.txt 2>&1

:: Install dependencies
echo.
echo  [4/5] מתקין חבילות (זה לוקח כדקה)...
call npm install
IF ERRORLEVEL 1 (
  echo  [!] שגיאה בהתקנת חבילות
  pause
  exit /b 1
)

:: Build
echo.
echo  [5/5] בונה את האפליקציה...
call npm run build
IF ERRORLEVEL 1 (
  echo  [!] שגיאה בבנייה
  pause
  exit /b 1
)

:: Deploy
echo.
echo  [6/6] מעלה לאינטרנט...
call firebase deploy --only hosting --project %PROJECT_ID%
IF ERRORLEVEL 1 (
  echo  [!] שגיאה בהעלאה
  pause
  exit /b 1
)

echo.
echo  ========================================
echo   האתר שלך פעיל!
echo.
echo   https://%PROJECT_ID%.web.app
echo  ========================================
echo.
echo  פתח את הכתובת בטלפון ולחץ
echo  "הוסף למסך הבית" לקבל אפליקציה!
echo.
pause
