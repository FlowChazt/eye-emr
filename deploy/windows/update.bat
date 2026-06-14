@echo off
REM ==========================================================================
REM update.bat  -  ship a CODE update to an already-installed Eye EMR.
REM Run as Administrator after replacing the app files in this folder
REM (e.g. via 'git pull' or copying the new project over the old one).
REM
REM This NEVER touches C:\ClinicData (patient data) or config.bat
REM (your SESSION_SECRET). It only rebuilds the app.
REM ==========================================================================
setlocal

set "HERE=%~dp0"
pushd "%HERE%..\.." >nul
set "ROOT=%CD%"
popd >nul

echo Updating Eye EMR in %ROOT% ...

echo Stopping any running server...
taskkill /F /IM node.exe >nul 2>&1

echo Installing dependencies...
call npm install --prefix "%ROOT%" || goto :fail

echo Building...
call npm run build --prefix "%ROOT%" || goto :fail

echo Copying static assets...
xcopy /E /I /Y "%ROOT%\.next\static" "%ROOT%\.next\standalone\.next\static" >nul || goto :fail
if exist "%ROOT%\public" xcopy /E /I /Y "%ROOT%\public" "%ROOT%\.next\standalone\public" >nul
if not exist "%ROOT%\.next\standalone\drizzle" xcopy /E /I /Y "%ROOT%\drizzle" "%ROOT%\.next\standalone\drizzle" >nul
if not exist "%ROOT%\.next\standalone\node_modules\better-sqlite3\build" xcopy /E /I /Y "%ROOT%\node_modules\better-sqlite3" "%ROOT%\.next\standalone\node_modules\better-sqlite3" >nul

echo.
echo Update done. New migrations (if any) run automatically on next launch.
echo Double-click the desktop icon to start the updated app.
pause
exit /b 0

:fail
echo.
echo *** Update FAILED. See the error above. The old build is unchanged
echo     except for any files already overwritten. ***
pause
exit /b 1
