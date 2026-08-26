@echo off
REM NotificationHub Database Initialization Script (Windows)
REM 
REM This script sets up a fresh PostgreSQL database for NotificationHub
REM including creating the database, running migrations, and loading seed data.
REM
REM Usage: init.bat [options]
REM 
REM Options:
REM   --seed          Load demo seed data after migrations
REM   --reset         Drop and recreate database (WARNING: destructive)
REM   --help          Show this help message
REM
REM Environment Variables:
REM   DB_HOST         PostgreSQL host (default: localhost)
REM   DB_PORT         PostgreSQL port (default: 5432)
REM   DB_NAME         Database name (default: notificationhub)
REM   DB_USER         Database user (default: postgres)
REM   DB_PASSWORD     Database password (default: empty)

setlocal enabledelayedexpansion

REM Set defaults
if not defined DB_HOST set DB_HOST=localhost
if not defined DB_PORT set DB_PORT=5432
if not defined DB_NAME set DB_NAME=notificationhub
if not defined DB_USER set DB_USER=postgres
if not defined DB_PASSWORD set DB_PASSWORD=

set LOAD_SEED=false
set RESET=false

REM Parse arguments
:parse_args
if "%1"=="" goto args_done
if "%1"=="--seed" (
  set LOAD_SEED=true
  shift
  goto parse_args
)
if "%1"=="--reset" (
  set RESET=true
  shift
  goto parse_args
)
if "%1"=="--help" (
  echo NotificationHub Database Initialization Script
  echo.
  echo Usage: init.bat [options]
  echo.
  echo Options:
  echo   --seed          Load demo seed data after migrations
  echo   --reset         Drop and recreate database (WARNING: destructive)
  echo   --help          Show this help message
  echo.
  exit /b 0
)
shift
goto parse_args

:args_done
cls

echo.
echo ========================================================
echo  NotificationHub Database Initialization
echo ========================================================
echo.

echo Configuration:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo   Load seed data: %LOAD_SEED%
echo   Reset database: %RESET%
echo.

REM Confirmation for reset
if "%RESET%"=="true" (
  echo WARNING: This will DROP the database '%DB_NAME%'
  set /p confirm="Are you sure? (type 'yes' to confirm): "
  if not "!confirm!"=="yes" (
    echo Cancelled
    exit /b 0
  )
)

echo.

REM Check PostgreSQL connection
echo Checking PostgreSQL connection...
set PGPASSWORD=%DB_PASSWORD%

psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "SELECT 1" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Cannot connect to PostgreSQL at %DB_HOST%:%DB_PORT%
  echo Make sure PostgreSQL is running and credentials are correct.
  exit /b 1
)

echo [OK] PostgreSQL is running

REM Check if database exists
echo Checking if database '%DB_NAME%' exists...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt | findstr /R /C:"^ *%DB_NAME%" >nul
if errorlevel 1 (
  echo [INFO] Database '%DB_NAME%' does not exist
  
  echo Creating database '%DB_NAME%'...
  createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
  if errorlevel 1 (
    echo [ERROR] Failed to create database
    exit /b 1
  )
  echo [OK] Database '%DB_NAME%' created
) else (
  echo [OK] Database '%DB_NAME%' exists
)

REM Handle reset
if "%RESET%"=="true" (
  echo Dropping and recreating database '%DB_NAME%'...
  dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME% >nul 2>&1
  createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
  if errorlevel 1 (
    echo [ERROR] Failed to recreate database
    exit /b 1
  )
  echo [OK] Database '%DB_NAME%' recreated
)

REM Run migrations
echo.
echo Running database migrations...
set DB_HOST=%DB_HOST%
set DB_PORT=%DB_PORT%
set DB_NAME=%DB_NAME%
set DB_USER=%DB_USER%
set DB_PASSWORD=%DB_PASSWORD%
set PGPASSWORD=%DB_PASSWORD%

node migrate.js migrate
if errorlevel 1 (
  echo [ERROR] Migrations failed
  exit /b 1
)
echo [OK] Migrations completed successfully

REM Load seed data
if "%LOAD_SEED%"=="true" (
  echo.
  echo Loading seed data...
  
  if exist seeds (
    for %%F in (seeds\*.sql) do (
      echo Loading seed file: %%~nF
      psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f %%F >nul 2>&1
      if errorlevel 1 (
        echo [ERROR] Failed to load: %%~nF
      ) else (
        echo [OK] Loaded: %%~nF
      )
    )
  ) else (
    echo [WARNING] Seeds directory not found
  )
)

REM Verify installation
echo.
echo Verifying installation...

for /f "usebackq" %%A in (`psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`) do set TABLE_COUNT=%%A

echo [OK] Database has %TABLE_COUNT% tables

REM Check seed data
if "%LOAD_SEED%"=="true" (
  for /f "usebackq" %%A in (`psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM events"`) do set EVENT_COUNT=%%A
  
  if %EVENT_COUNT% gtr 0 (
    echo [OK] Seed data loaded: %EVENT_COUNT% events
  ) else (
    echo [WARNING] No events found in database
  )
)

echo.
echo ========================================================
echo  Database initialization completed successfully!
echo ========================================================
echo.
echo Next steps:
echo   1. Set environment variables in your .env file:
echo      DB_HOST=%DB_HOST%
echo      DB_PORT=%DB_PORT%
echo      DB_NAME=%DB_NAME%
echo      DB_USER=%DB_USER%
echo.
echo   2. Start your application
echo.
echo   3. Verify data: psql -d %DB_NAME% -c "SELECT * FROM farms;"
echo.

endlocal
