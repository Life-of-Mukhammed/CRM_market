import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Product } from '../models/Product';
import { authenticate, requireRole } from '../middleware/auth';

const productSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  brand: z.string().optional(),
  author: z.string().optional(),
  barcode: z.string().optional(),
  image: z.string().optional(),
  description: z.string().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  quantity: z.number().min(0).optional(),
  minAlert: z.number().min(0).optional(),
  unit: z.string().default('дона'),
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const query = request.query as {
      search?: string;
      category?: string;
      page?: string;
      limit?: string;
    };
    const page = parseInt(query.page || '1');
    const limit = Math.min(parseInt(query.limit || '50'), 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      where.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { barcode: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (query.category) where.category = query.category;

    const [products, total] = await Promise.all([
      Product.find(where).populate('category', 'name icon').sort({ name: 1 }).skip(skip).limit(limit),
      Product.countDocuments(where),
    ]);

    return { products, total, page, limit };
  });

  app.get('/barcode/:barcode', { preHandler: [authenticate] }, async (request, reply) => {
    const { barcode } = request.params as { barcode: string };
    const product = await Product.findOne({ barcode, isActive: true }).populate('category', 'name icon');
    if (!product) return reply.status(404).send({ error: 'Бундай штрих-кодли товар мавжуд эмас' });
    return product;
  });

  app.get('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await Product.findById(id).populate('category', 'name icon');
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return product;
  });

  app.post('/', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const parsed = productSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    try {
      const product = await Product.create({
        ...parsed.data,
        createdBy: request.user.userId,
      });
      await product.populate('category', 'name icon');
      return product;
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        return reply.status(409).send({ error: 'Бу штрих-код аллақачон мавжуд' });
      }
      throw err;
    }
  });

  app.put('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = productSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Нотўғри маълумот" });

    const product = await Product.findByIdAndUpdate(id, parsed.data, { new: true }).populate(
      'category',
      'name icon'
    );
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return product;
  });

  app.delete('/:id', { preHandler: [requireRole('DIREKTOR')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await Product.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) return reply.status(404).send({ error: 'Маҳсулот топилмади' });
    return { message: "Маҳсулот ўчирилди" };
  });
}
