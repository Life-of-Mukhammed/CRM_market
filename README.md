# MARKET

Atir va kitob do'koni uchun boshqaruv tizimi (Next.js frontend + Fastify/MongoDB backend).

## Rollar

- **Direktor** — mahsulot qo'shadi/tahrirlaydi, barcha savdolarni va analitikani ko'radi.
- **Kassir** — faqat sotuv (POS) qiladi va o'zining sotuv tarixini ko'radi.

## Talablar

- Node.js 20+
- MongoDB Atlas ulanish satri (yoki lokal MongoDB)

## Sozlash

```bash
cd backend
cp .env.example .env   # MONGODB_URI ni to'ldiring
npm install
npm run db:seed        # direktor va kassir hisoblarini yaratadi
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:3001

## Muhim: shtrix-kod skaneri HTTPS talab qiladi

Kamera orqali skanerlash (`Skaner` tugmasi) brauzer xavfsizlik siyosatiga ko'ra faqat `localhost` yoki HTTPS ustida ishlaydi. Production'ga chiqarganda frontend'ni HTTPS orqali joylashtiring (Vercel avtomatik beradi). USB shtrix-kod skaneri (klaviatura sifatida ishlaydigan) qidiruv maydoniga fokus qilib, kodni o'qib, Enter bosilganda ham ishlaydi — kamera shart emas.
