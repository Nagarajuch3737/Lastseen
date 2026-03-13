#!/bin/bash
# Quick Setup Script for Windows (run in PowerShell)

echo "🚀 LastSeen MySQL Database Setup"
echo "=================================="

# 1. Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your MySQL credentials!"
    echo "   - DB_HOST: Your cloud database host"
    echo "   - DB_USER: Database username"
    echo "   - DB_PASSWORD: Database password"
    echo "   - DB_NAME: lastseen"
else
    echo "✓ .env file exists"
fi

# 2. Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✓ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Edit .env with your MySQL credentials"
echo "   2. Create the database with: mysql -h <host> -u <user> -p < setup-database.sql"
echo "   3. Start server: npm start"
echo ""
