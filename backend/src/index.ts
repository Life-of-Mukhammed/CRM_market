import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { connectDB } from './utils/db';
import { authRoutes } from './routes/auth';
import { productRoutes } from './routes/products';
import { categoryRoutes } from './routes/categories';
import { salesRoutes } from './routes/sales';
import { reportsRoutes } from './routes/reports';

const app = Fastify({ logger: true });

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET .env faylida kamida 16 belgidan iborat bo\'lishi kerak.');
  }

  await connectDB();

  await app.register(helmet);

  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
  ];

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow same-origin/non-browser requests (no Origin header) and any
      // configured frontend origin.
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error('CORS: ruxsat etilmagan manba'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 600,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET,
    sign: { expiresIn: '7d' },
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(categoryRoutes, { prefix: '/api/categories' });
  await app.register(salesRoutes, { prefix: '/api/sales' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });

  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  const PORT = parseInt(process.env.PORT || '3001');
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`MARKET Backend running on port ${PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
