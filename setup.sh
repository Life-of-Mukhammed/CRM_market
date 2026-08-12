#!/bin/bash

echo "╔══════════════════════════════════════════════════════════╗"
echo "║              MARKET Boshqaruv Tizimi - Setup            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}[1/3] Backend dependency'larini o'rnatish...${NC}"
cd backend
npm install

echo ""
echo -e "${BLUE}[2/3] Frontend dependency'larini o'rnatish...${NC}"
cd ../frontend
npm install

echo ""
echo -e "${YELLOW}[3/3] Backend .env fayl yaratish...${NC}"
cd ../backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ .env fayl yaratildi. Iltimos uni tahrirlang!${NC}"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                  SETUP TUGADI!                            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Keyingi qadamlar:"
echo ""
echo -e "${YELLOW}1. backend/.env faylida MONGODB_URI ni to'ldiring${NC}"
echo "   (MongoDB Atlas cluster ulanish satri)"
echo ""
echo -e "${YELLOW}2. Demo hisoblarni yarating (direktor + kassir):${NC}"
echo "   cd backend && npm run db:seed"
echo ""
echo -e "${YELLOW}3. Tizimni ishga tushiring (2 ta terminal):${NC}"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo -e "${BLUE}Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}Backend:  http://localhost:3001${NC}"
