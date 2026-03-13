@echo off
REM Quick Setup Script for Windows (PowerShell)

echo 🚀 LastSeen MySQL Database Setup
echo ==================================

REM 1. Check if .env exists
if not exist .env (
    echo 📝 Creating .env from .env.example...
    copy .env.example .env
    echo ⚠️  Please edit .env with your MySQL credentials!
    echo    - DB_HOST: Your cloud database host
    echo    - DB_USER: Database username
    echo    - DB_PASSWORD: Database password
    echo    - DB_NAME: lastseen
) else (
    echo ✓ .env file exists
)

REM 2. Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

echo.
echo ✓ Setup complete!
echo.
echo 📚 Next steps:
echo    1. Edit .env with your MySQL credentials
echo    2. Create the database by running the SQL from DATABASE_SETUP.md
echo    3. Start server: npm start
echo.
pause
