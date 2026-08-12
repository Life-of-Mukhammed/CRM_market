import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Category } from '../models/Category';
import { authenticate, requireRole } from '../middleware/auth';

const categorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
});

export async function categoryRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate] }, async () => {
    return Category.find({ isActive: true }).sort({ name: 1 });
  });

  app.post('/', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const parsed = categorySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    try {
      const category = await Category.create(parsed.data);
      return category;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return reply.status(409).send({ error: 'Бундай номли категория аллақачон мавжуд' });
      }
      throw err;
    }
  });

  app.put('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = categorySchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    const category = await Category.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!category) return reply.status(404).send({ error: 'Категория топилмади' });
    return category;
  });

  app.delete('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const category = await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!category) return reply.status(404).send({ error: 'Категория топилмади' });
    return { message: "Категория ўчирилди" };
  });
}
