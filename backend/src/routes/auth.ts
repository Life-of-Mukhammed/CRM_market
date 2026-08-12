import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User';
import { authenticate } from '../middleware/auth';

const loginSchema = z.object({
  phone: z.string().min(9),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/login',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Телефон ёки парол нотўғри форматда" });
      }
      const body = parsed.data;

      const user = await User.findOne({ phone: body.phone });
      if (!user || !user.isActive) {
        return reply.status(401).send({ error: "Телефон ёки парол нотўғри" });
      }

      const isValid = await bcrypt.compare(body.password, user.password);
      if (!isValid) {
        return reply.status(401).send({ error: "Телефон ёки парол нотўғри" });
      }

      const token = app.jwt.sign({
        userId: user.id,
        role: user.role,
        name: user.name,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
      };
    }
  );

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const user = await User.findById(request.user.userId);
    if (!user) return reply.status(404).send({ error: 'Фойдаланувчи топилмади' });
    return user;
  });

  app.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = z
      .object({
        oldPassword: z.string(),
        newPassword: z.string().min(6),
      })
      .safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });
    const body = parsed.data;

    const user = await User.findById(request.user.userId);
    if (!user) return reply.status(404).send({ error: 'Фойдаланувчи топилмади' });

    const isValid = await bcrypt.compare(body.oldPassword, user.password);
    if (!isValid) return reply.status(400).send({ error: "Эски парол нотўғри" });

    user.password = await bcrypt.hash(body.newPassword, 12);
    await user.save();

    return { message: "Парол муваффақиятли ўзгартирилди" };
  });
}
