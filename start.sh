#!/bin/bash

echo "MARKET tizimi ishga tushirilmoqda..."

# Start backend
cd backend && npm run dev &
BACKEND_PID=$!

echo "Backend ishga tushdi (PID: $BACKEND_PID)"

# Start frontend
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo "Frontend ishga tushdi (PID: $FRONTEND_PID)"

echo ""
echo "✅ MARKET tizimi ishlayapti!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "To'xtatish uchun: Ctrl+C bosing"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
